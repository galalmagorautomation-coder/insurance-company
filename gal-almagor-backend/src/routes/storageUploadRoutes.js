/**
 * Storage-Backed Upload Routes
 *
 * Designed to sidestep the Cloudflare 100-second proxy timeout that
 * sits in front of Render. Instead of POST'ing a big multipart file
 * through Cloudflare and waiting synchronously for parse+insert+aggregate
 * to finish, the browser uploads the file directly to Supabase Storage
 * (bypassing Cloudflare entirely), then calls /process-from-storage.
 *
 * /process-from-storage returns within milliseconds with a job_id.
 * The actual heavy work happens server-side in the background while the
 * browser polls /jobs/:id every couple of seconds for status.
 *
 * Endpoints:
 *   POST /api/upload/process-from-storage  → 202 + { jobId }
 *   GET  /api/upload/jobs/:id              → { status, ... }
 */

const express = require('express');
const supabase = require('../config/supabase');
// Pull in the core upload handler so the worker can run it inline,
// avoiding an internal HTTP+multipart roundtrip that doubled memory
// usage on big Migdal uploads and OOM'd Node on Render's 512 MB tier.
const { handleUpload } = require('./uploadRoutes');

const router = express.Router();

const BUCKET = 'uploads';

/**
 * Mark a job row, swallowing the error so the worker doesn't crash if
 * the DB hiccups during status updates. Errors here are logged, not
 * thrown.
 */
async function updateJob(jobId, patch) {
  try {
    const { error } = await supabase
      .from('upload_jobs')
      .update(patch)
      .eq('id', jobId);
    if (error) console.error(`[storageUpload] updateJob ${jobId} failed:`, error.message);
  } catch (e) {
    console.error(`[storageUpload] updateJob ${jobId} threw:`, e.message);
  }
}

/**
 * The actual work. Runs *after* the HTTP response has been sent, so its
 * runtime is not bounded by Cloudflare's 100-second client timeout.
 *
 * Steps:
 *  1. Download the file from the 'uploads' bucket using the service role
 *     (so we can read any path the browser uploaded to).
 *  2. POST it to the existing /api/upload/upload endpoint as a multipart
 *     form. We're talking to ourselves over loopback — no Cloudflare in
 *     the way — so the inner request can take as long as it needs.
 *  3. Mark the job success / failure with the resulting counts.
 *  4. Delete the source file from storage so the bucket doesn't grow.
 */
async function processInBackground(jobId, filePath, meta) {
  console.log(`[storageUpload] job ${jobId} starting (${filePath})`);
  try {
    await updateJob(jobId, { status: 'processing' });

    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(filePath);
    if (downloadError) throw new Error(`storage download failed: ${downloadError.message}`);

    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = meta.fileName || filePath.split('/').pop() || 'upload.xlsx';

    // Run the existing upload handler in-process. handleUpload only
    // reads req.body and req.file.{buffer,originalname,mimetype}, and
    // calls res.status().json() / res.json() — both are stubbed below.
    const fakeReq = {
      body: {
        companyId: String(meta.companyId),
        month: meta.month,
        uploadType: meta.uploadType || 'life-insurance',
      },
      file: {
        buffer,
        originalname: filename,
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    };

    let statusCode = 200;
    let responseBody = null;
    const fakeRes = {
      status(code) { statusCode = code; return fakeRes; },
      json(body) { responseBody = body; return fakeRes; },
      send(body) { responseBody = body; return fakeRes; },
      setHeader() { return fakeRes; },
    };

    await handleUpload(fakeReq, fakeRes);

    if (statusCode >= 400 || (responseBody && responseBody.success === false)) {
      const msg = responseBody?.message || `Internal upload failed (HTTP ${statusCode})`;
      throw new Error(msg);
    }

    const summary = responseBody?.summary || {};
    await updateJob(jobId, {
      status: 'success',
      total_rows: summary.totalRowsInExcel ?? null,
      rows_inserted: summary.rowsInserted ?? null,
      agents_processed: summary.aggregation?.agentsProcessed ?? null,
    });
    console.log(`[storageUpload] job ${jobId} succeeded (${summary.rowsInserted ?? '?'} rows)`);

    // Clean up the source file so the bucket doesn't accumulate.
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (removeError) {
      console.warn(`[storageUpload] job ${jobId} cleanup warning:`, removeError.message);
    }
  } catch (err) {
    console.error(`[storageUpload] job ${jobId} failed:`, err.message);
    await updateJob(jobId, {
      status: 'failed',
      error_message: err.message?.slice(0, 2000) || 'unknown error',
    });
  }
}

/**
 * Kick off processing. Validates inputs, creates a job row, responds
 * immediately so the browser's request closes before Cloudflare can
 * time it out, then fires the worker on the next tick.
 */
router.post('/process-from-storage', async (req, res) => {
  try {
    const { filePath, fileName, companyId, month, uploadType } = req.body || {};

    if (!filePath || !companyId || !month) {
      return res.status(400).json({
        success: false,
        message: 'filePath, companyId, and month are required',
      });
    }

    const { data: job, error: insertError } = await supabase
      .from('upload_jobs')
      .insert({
        status: 'pending',
        company_id: parseInt(companyId, 10),
        month,
        upload_type: uploadType || 'life-insurance',
        file_path: filePath,
        file_name: fileName || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[storageUpload] failed to insert job:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create job',
        error: insertError.message,
      });
    }

    res.status(202).json({ success: true, jobId: job.id });

    // Fire-and-forget. The response above already closed the client
    // connection, so this work survives Cloudflare's 100s cutoff.
    setImmediate(() => {
      processInBackground(job.id, filePath, {
        fileName, companyId, month, uploadType,
      });
    });
  } catch (e) {
    console.error('[storageUpload] /process-from-storage error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Poll endpoint. Browser hits this every couple of seconds until the
 * job is in a terminal state ("success" or "failed").
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, job: data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
