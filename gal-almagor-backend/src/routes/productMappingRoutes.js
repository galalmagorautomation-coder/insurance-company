/**
 * Product → Category Mapping Routes
 *
 * For FILTER_BY_PRODUCT companies (Ayalon, Hachshara, Phoenix, Migdal,
 * Menorah, Meitav), the boss can extend the hardcoded product-to-category
 * mapping at runtime through the Upload page UI. These routes are the
 * persistence + re-aggregation glue.
 *
 *   GET  /api/product-mappings/:companyId
 *        → existing mappings for one company (hardcoded + DB merged).
 *
 *   POST /api/product-mappings
 *        → upsert one or more (company_id, product_name, category) rows,
 *          then re-run aggregateAfterUpload for the specified month so
 *          the data the user just uploaded gets re-categorized using
 *          the new mappings.
 */

const express = require('express');
const supabase = require('../config/supabase');
const {
  COMPANY_CONFIGS,
  PRODUCT_CATEGORIES,
} = require('../config/productCategoryMappings');
const { aggregateAfterUpload } = require('../services/aggregationService');

const router = express.Router();

const VALID_CATEGORIES = new Set(Object.values(PRODUCT_CATEGORIES));

/**
 * GET /api/product-mappings/:companyId
 * Returns:
 *   {
 *     success: true,
 *     companyId,
 *     companyType,            // e.g. 'FILTER_BY_PRODUCT' or other
 *     hardcoded: { product: category, ... },  // from productCategoryMappings.js
 *     db:        { product: category, ... },  // user-added from product_category_mappings
 *   }
 */
router.get('/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (!Number.isFinite(companyId)) {
      return res.status(400).json({ success: false, message: 'Invalid companyId' });
    }

    const config = COMPANY_CONFIGS[companyId];
    if (!config) {
      return res.status(404).json({ success: false, message: 'Unknown company' });
    }

    const hardcoded = config.categoryMappings || {};

    const { data, error } = await supabase
      .from('product_category_mappings')
      .select('product_name, category')
      .eq('company_id', companyId);
    if (error) throw error;

    const db = {};
    for (const row of data || []) db[row.product_name] = row.category;

    res.json({
      success: true,
      companyId,
      companyType: config.type,
      categories: Object.values(PRODUCT_CATEGORIES),
      hardcoded,
      db,
    });
  } catch (e) {
    console.error('[productMappings] GET error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/product-mappings
 * Body:
 *   {
 *     companyId,
 *     month,                       // YYYY-MM, optional — if present we re-aggregate
 *     mappings: [{ product_name, category }, ...]
 *   }
 * Returns:
 *   { success, savedCount, reaggregated }
 *
 * Re-aggregation runs synchronously; it's small relative to the original
 * upload (no Excel parse, no raw-insert — just the category-recompute step)
 * and finishes well within Cloudflare's 100s timeout even for Migdal-sized
 * months.
 */
router.post('/', async (req, res) => {
  try {
    const { companyId, month, mappings } = req.body || {};
    const cid = parseInt(companyId, 10);
    if (!Number.isFinite(cid)) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ success: false, message: 'mappings array is required' });
    }

    // Validate each mapping before touching the DB.
    const rows = [];
    for (const m of mappings) {
      if (!m || typeof m.product_name !== 'string' || !m.product_name.trim()) {
        return res.status(400).json({
          success: false,
          message: `Each mapping must have a non-empty product_name`,
        });
      }
      if (!VALID_CATEGORIES.has(m.category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category "${m.category}" for product "${m.product_name}". Must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
        });
      }
      rows.push({
        company_id: cid,
        product_name: m.product_name.trim(),
        category: m.category,
      });
    }

    // Upsert on (company_id, product_name). Existing rows get their
    // category overwritten — that matches the "fix a mistake" workflow.
    const { error: upsertError } = await supabase
      .from('product_category_mappings')
      .upsert(rows, { onConflict: 'company_id,product_name' });
    if (upsertError) throw upsertError;

    let reaggregated = null;
    if (month) {
      try {
        console.log(`[productMappings] re-aggregating company ${cid}, month ${month}`);
        reaggregated = await aggregateAfterUpload(cid, month);
      } catch (aggErr) {
        // Mappings are saved either way; surface the agg error so the
        // user knows their data view may be stale.
        console.error('[productMappings] re-aggregation failed:', aggErr);
        return res.json({
          success: true,
          savedCount: rows.length,
          reaggregated: null,
          reaggregationError: aggErr.message,
        });
      }
    }

    res.json({
      success: true,
      savedCount: rows.length,
      reaggregated,
    });
  } catch (e) {
    console.error('[productMappings] POST error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
