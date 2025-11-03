const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * GET /api/companies
 * Fetch all companies from the database
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('company')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to fetch companies',
        error: error.message 
      });
    }

    res.json({ 
      success: true,
      data: data 
    });

  } catch (error) {
    console.error('Companies route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while fetching companies',
      error: error.message 
    });
  }
});

module.exports = router;