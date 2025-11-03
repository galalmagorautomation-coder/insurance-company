const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// Helper function to validate email
const validateEmail = (email) => {
  if (!email) return true; // Email is optional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Helper function to validate phone (Israeli format)
const validatePhone = (phone) => {
  if (!phone) return true; // Phone is optional
  // Israeli phone format: 050-1234567 or 0501234567
  const regex = /^0\d{1,2}-?\d{7,8}$/;
  return regex.test(phone);
};

// GET all agents (or filtered by company)
router.get('/', async (req, res) => {
  try {
    const { company_id } = req.query;
    
    let query = supabase
      .from('agent_data')
      .select('*')
      .order('agent_name', { ascending: true });

    // Filter by company if provided
    if (company_id) {
      // PostgreSQL array contains operator
      query = query.contains('company_id', [parseInt(company_id)]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching agents',
      error: error.message
    });
  }
});
// GET single agent by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agent_data')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching agent',
      error: error.message
    });
  }
});

// POST - Create new agent
router.post('/', async (req, res) => {
  try {
    const { 
      agent_name, 
      agent_id, 
      inspector, 
      department, 
      company_id,
      category,
      phone,
      email,
      is_active,
      insurance_type
    } = req.body;

    // Validation
    if (!agent_name || !agent_id) {
      return res.status(400).json({
        success: false,
        message: 'Agent name and number are required'
      });
    }

    // Validate email format
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone format
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format'
      });
    }

    // Ensure company_id is an array
    const companyIds = Array.isArray(company_id) ? company_id : [];

    const { data, error } = await supabase
      .from('agent_data')
      .insert([{
        agent_name,
        agent_id,
        inspector: inspector || null,
        department: department || null,
        company_id: companyIds,
        category: category || null,
        phone: phone || null,
        email: email || null,
        is_active: is_active || 'yes',
        insurance_type: insurance_type || null
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create agent',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating agent',
      error: error.message
    });
  }
});

// PUT - Update agent
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      agent_name, 
      agent_id, 
      inspector, 
      department, 
      company_id,
      category,
      phone,
      email,
      is_active,
      insurance_type
    } = req.body;

    // Validation
    if (!agent_name || !agent_id) {
      return res.status(400).json({
        success: false,
        message: 'Agent name and number are required'
      });
    }

    // Validate email format
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone format
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format'
      });
    }

    // Ensure company_id is an array
    const companyIds = Array.isArray(company_id) ? company_id : [];

    const { data, error } = await supabase
      .from('agent_data')
      .update({
        agent_name,
        agent_id,
        inspector: inspector || null,
        department: department || null,
        company_id: companyIds,
        category: category || null,
        phone: phone || null,
        email: email || null,
        is_active: is_active || 'yes',
        insurance_type: insurance_type || null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update agent',
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating agent',
      error: error.message
    });
  }
});

// DELETE agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('agent_data')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete agent',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting agent',
      error: error.message
    });
  }
});

module.exports = router;