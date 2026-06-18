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
const { aggregateAfterUpload } = require('../services/aggregationService');

const router = express.Router();

const BUCKET = 'uploads';

// In-flight job IDs so the SIGTERM handler can mark them as failed
// before the process exits during a deploy.
const inFlightJobs = new Set();

/**
 * Return a short string with current heap/rss in MB, for stamping into
 * the progress log so we can see if memory ran away before a crash.
 */
function memSnapshot() {
  const m = process.memoryUsage();
  return `heap=${Math.round(m.heapUsed / 1024 / 1024)}MB rss=${Math.round(m.rss / 1024 / 1024)}MB`;
}

/**
 * Append a timestamped progress note (with memory snapshot) to the job
 * row and bump last_heartbeat_at. Best-effort: never throws — if the DB
 * call itself fails we just log to console and keep going.
 */
async function noteProgress(jobId, message) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${memSnapshot()} | ${message}`;
  console.log(`[storageUpload] ${jobId} ${line}`);
  try {
    const { data } = await supabase
      .from('upload_jobs')
      .select('progress_log')
      .eq('id', jobId)
      .single();
    const existing = data?.progress_log || '';
    await supabase
      .from('upload_jobs')
      .update({
        progress_log: existing ? existing + '\n' + line : line,
        last_heartbeat_at: stamp,
      })
      .eq('id', jobId);
  } catch (e) {
    console.warn(`[storageUpload] noteProgress(${jobId}) failed:`, e.message);
  }
}

/**
 * Tick the heartbeat column on the job every few seconds while it's
 * being worked on. Lets us tell "the worker is alive and busy" from
 * "the worker died and left the row stuck in 'processing'".
 */
function startHeartbeat(jobId, intervalMs = 5000) {
  const tick = async () => {
    try {
      await supabase
        .from('upload_jobs')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', jobId);
    } catch (_) { /* swallow — we don't want the worker to die for this */ }
  };
  // Fire one immediately so the gap from creation to first heartbeat is small
  tick();
  return setInterval(tick, intervalMs);
}

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
  inFlightJobs.add(jobId);
  let heartbeatTimer = null;
  console.log(`[storageUpload] job ${jobId} starting (${filePath})`);
  try {
    await updateJob(jobId, { status: 'processing' });
    await noteProgress(jobId, `worker started for ${filePath}`);
    heartbeatTimer = startHeartbeat(jobId);

    await noteProgress(jobId, 'downloading file from storage');
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(filePath);
    if (downloadError) throw new Error(`storage download failed: ${downloadError.message}`);

    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = meta.fileName || filePath.split('/').pop() || 'upload.xlsx';
    await noteProgress(jobId, `downloaded ${buffer.length} bytes, calling handleUpload`);

    // Run the existing upload handler in-process WITHOUT aggregation.
    // skipAggregation tells handleUpload to return after raw_data insert
    // so its parsed-Excel + insert-batch buffers can fall out of scope
    // before we run the aggregation step below — that's the only way
    // the whole pipeline fits inside Render free's 512 MB cap for
    // Migdal-sized files.
    let fakeReq = {
      body: {
        companyId: String(meta.companyId),
        month: meta.month,
        uploadType: meta.uploadType || 'life-insurance',
        skipAggregation: true,
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
    await noteProgress(jobId, `handleUpload returned HTTP ${statusCode} (raw insert phase)`);

    if (statusCode >= 400 || (responseBody && responseBody.success === false)) {
      const msg = responseBody?.message || `Internal upload failed (HTTP ${statusCode})`;
      throw new Error(msg);
    }

    const summary = responseBody?.summary || {};

    // Aggregation runs in a fresh stack frame so handleUpload's parsed-
    // Excel arrays and insert response buffers can be GC'd before we
    // load raw_data + previous-month aggregations for the cumulative-
    // to-monthly conversion. Explicitly null the file buffer too so the
    // 2+ MB Migdal payload isn't pinned by our closure.
    fakeReq.file.buffer = null;
    fakeReq = null;
    if (global.gc) {
      try { global.gc(); } catch (_) {}
    }
    // One event-loop tick gives V8 a chance to reclaim memory before
    // we kick off the next heavy phase.
    await new Promise((resolve) => setImmediate(resolve));
    await noteProgress(jobId, 'starting deferred aggregation step');

    let aggregationResult = null;
    try {
      aggregationResult = await aggregateAfterUpload(
        parseInt(meta.companyId, 10),
        meta.month
      );
      await noteProgress(
        jobId,
        `aggregation done (${aggregationResult?.agentsProcessed ?? '?'} agents)`
      );
    } catch (aggErr) {
      // raw_data is already committed — aggregation failure shouldn't
      // wipe that. Record it as a partial success so the operator knows
      // to re-run aggregation manually.
      await noteProgress(jobId, `aggregation FAILED: ${aggErr.message}`);
      throw new Error(
        `Raw rows inserted but aggregation failed: ${aggErr.message}`
      );
    }
    await updateJob(jobId, {
      status: 'success',
      total_rows: summary.totalRowsInExcel ?? null,
      rows_inserted: summary.rowsInserted ?? null,
      agents_processed: aggregationResult?.agentsProcessed ?? null,
    });
    await noteProgress(jobId, `success (${summary.rowsInserted ?? '?'} rows inserted)`);
    console.log(`[storageUpload] job ${jobId} succeeded (${summary.rowsInserted ?? '?'} rows)`);

    // Clean up the source file so the bucket doesn't accumulate.
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (removeError) {
      await noteProgress(jobId, `cleanup warning: ${removeError.message}`);
      console.warn(`[storageUpload] job ${jobId} cleanup warning:`, removeError.message);
    }
  } catch (err) {
    console.error(`[storageUpload] job ${jobId} failed:`, err.message);
    await noteProgress(jobId, `FAILED: ${err.message?.slice(0, 500)}`);
    await updateJob(jobId, {
      status: 'failed',
      error_message: err.message?.slice(0, 2000) || 'unknown error',
    });
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    inFlightJobs.delete(jobId);
  }
}

/**
 * Mark every in-flight job as failed before the process exits. Render
 * sends SIGTERM ~30 seconds before killing the process during a deploy
 * or scale-down — that's enough time to flush a few small UPDATEs so
 * the jobs don't sit stuck in 'processing' forever.
 */
async function gracefullyFailInFlightJobs(signal) {
  if (inFlightJobs.size === 0) return;
  console.warn(`[storageUpload] received ${signal}; marking ${inFlightJobs.size} in-flight job(s) as failed`);
  const reason =
    `Worker process received ${signal} before job completed ` +
    `(likely Render deploy, scale-down, or OOM). Check raw_data and ` +
    `agent_aggregations for partial state; re-run upload or aggregate manually.`;
  await Promise.all(
    [...inFlightJobs].map((jobId) =>
      updateJob(jobId, { status: 'failed', error_message: reason })
    )
  );
}

// Hook SIGTERM (Render deploy signal) and SIGINT (Ctrl+C in dev) once
// when the module is required. Only register once per process.
if (!global.__storageUploadSignalsRegistered) {
  global.__storageUploadSignalsRegistered = true;
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
      try { await gracefullyFailInFlightJobs(signal); } catch (_) {}
      // Don't exit ourselves — let Express's own shutdown finish.
    });
  }
  process.on('uncaughtException', (err) => {
    console.error('[storageUpload] uncaughtException:', err.stack || err.message);
    gracefullyFailInFlightJobs('uncaughtException').catch(() => {});
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[storageUpload] unhandledRejection:', reason);
  });
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
