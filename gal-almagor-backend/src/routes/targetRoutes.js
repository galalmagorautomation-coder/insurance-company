const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * Target Routes
 * API endpoints for managing targets
 */

// GET /api/targets - Placeholder
router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'Targets API - Ready for implementation'
  });
});

// GET /api/targets/percentages - Get all target percentages
router.get('/percentages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('target_percentages')
      .select('*')
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching all target percentages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching target percentages',
      error: error.message
    });
  }
});

// GET /api/targets/yearly-goals - Get all agent yearly goals
router.get('/yearly-goals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agent_yearly_goals')
      .select('*')
      .order('year', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching agent yearly goals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent yearly goals',
      error: error.message
    });
  }
});

// GET /api/targets/percentages/:year - Get target percentages for a specific year
router.get('/percentages/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { type } = req.query; // 'life' or 'elementary'

    // Validate year
    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year parameter'
      });
    }

    // Determine which table to query
    const tableName = type === 'elementary' ? 'target_percentages_elementary' : 'target_percentages';

    // Fetch data from Supabase
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('year', year)
      .order('month', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Return data (empty array if no data exists)
    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching target percentages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching target percentages',
      error: error.message
    });
  }
});

// PUT /api/targets/percentages - Update target percentages
router.put('/percentages', async (req, res) => {
  try {
    const { updates, type } = req.body; // type: 'life' or 'elementary'

    // Validate request body
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Expected { updates: [...], type: "life"|"elementary" }'
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No updates provided'
      });
    }

    // Validate that totals don't exceed 100% for each product
    const productTotals = type === 'elementary'
      ? { elementary_monthly: 0 }
      : {
          pension_monthly: 0,
          risk_monthly: 0,
          financial_monthly: 0,
          pension_transfer_monthly: 0
        };

    updates.forEach(update => {
      if (type === 'elementary') {
        productTotals.elementary_monthly += parseFloat(update.elementary_monthly) || 0;
      } else {
        productTotals.pension_monthly += parseFloat(update.pension_monthly) || 0;
        productTotals.risk_monthly += parseFloat(update.risk_monthly) || 0;
        productTotals.financial_monthly += parseFloat(update.financial_monthly) || 0;
        productTotals.pension_transfer_monthly += parseFloat(update.pension_transfer_monthly) || 0;
      }
    });

    // Check if any total exceeds 100%
    for (const [product, total] of Object.entries(productTotals)) {
      if (total > 100) {
        return res.status(400).json({
          success: false,
          message: `Total ${product.replace('_monthly', '')} percentage (${total.toFixed(2)}%) exceeds 100%`
        });
      }
    }

    // Determine which table to use
    const tableName = type === 'elementary' ? 'target_percentages_elementary' : 'target_percentages';

    // Upsert all records (insert or update if exists)
    const { data, error } = await supabase
      .from(tableName)
      .upsert(updates, {
        onConflict: 'year,month'
      });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    res.json({
      success: true,
      message: 'Target percentages updated successfully',
      data: {
        updated: updates.length
      }
    });
  } catch (error) {
    console.error('Error updating target percentages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update target percentages',
      error: error.message
    });
  }
});

module.exports = router;
