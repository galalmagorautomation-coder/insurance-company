const express = require('express');
const supabase = require('../config/supabase');
const { aggregateAfterUpload } = require('../services/aggregationService');
const { aggregateElementaryAfterUpload } = require('../services/elementaryAggregationService');

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
      sub_category,
      life_insurance_sub_category,
      phone,
      email,
      is_active,
      elementary_status,
      insurance,
      elementary,
      ayalon_agent_id,
      harel_agent_id,
      migdal_agent_id,
      menorah_agent_id,
      phoenix_agent_id,
      clal_agent_id,
      altshuler_agent_id,
      hachshara_agent_id,
      mor_agent_id,
      mediho_agent_id,
      analyst_agent_id,
      commission_id_ayalon,
      commission_id_phoenix,
      commission_id_harel,
      commission_id_clal,
      commission_id_migdal,
      commission_id_menorah,
      commission_id_passportcard,
      commission_id_altshuler,
      commission_id_excellence,
      commission_id_hachshara,
      commission_id_mediho,
      commission_id_mor,
      commission_id_analyst,
      elementary_id_ayalon,
      elementary_id_hachshara,
      elementary_id_harel,
      elementary_id_clal,
      elementary_id_migdal,
      elementary_id_menorah,
      elementary_id_phoenix,
      elementary_id_shomera,
      elementary_id_shlomo,
      elementary_id_shirbit,
      elementary_id_haklai,
      elementary_id_mms,
      elementary_id_kash,
      elementary_id_passport,
      elementary_id_cooper_ninova,
      elementary_id_securities,
      notes,
    } = req.body;

    // Validation - only agent_name is required
    if (!agent_name) {
      return res.status(400).json({
        success: false,
        message: 'Agent name is required'
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

    // Check for duplicate company-specific agent IDs
    const companyAgentIds = [
      { field: 'ayalon_agent_id', value: ayalon_agent_id, name: 'Ayalon' },
      { field: 'harel_agent_id', value: harel_agent_id, name: 'Harel' },
      { field: 'migdal_agent_id', value: migdal_agent_id, name: 'Migdal' },
      { field: 'menorah_agent_id', value: menorah_agent_id, name: 'Menorah' },
      { field: 'phoenix_agent_id', value: phoenix_agent_id, name: 'Phoenix' },
      { field: 'clal_agent_id', value: clal_agent_id, name: 'Clal' },
      { field: 'altshuler_agent_id', value: altshuler_agent_id, name: 'Altshuler' },
      { field: 'hachshara_agent_id', value: hachshara_agent_id, name: 'Hachshara' },
      { field: 'mor_agent_id', value: mor_agent_id, name: 'Mor' },
      { field: 'mediho_agent_id', value: mediho_agent_id, name: 'Mediho' },
      { field: 'analyst_agent_id', value: analyst_agent_id, name: 'Analyst' }
    ];

    for (const companyId of companyAgentIds) {
      if (companyId.value) {
        const { data: existing } = await supabase
          .from('agent_data')
          .select('agent_name')
          .eq(companyId.field, companyId.value)
          .single();

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${companyId.name} agent ID "${companyId.value}" already exists for agent: ${existing.agent_name}`
          });
        }
      }
    }

    // Check for duplicate elementary agent IDs
    const elementaryAgentIds = [
      { field: 'elementary_id_ayalon', value: elementary_id_ayalon, name: 'Ayalon Elementary' },
      { field: 'elementary_id_hachshara', value: elementary_id_hachshara, name: 'Hachshara Elementary' },
      { field: 'elementary_id_harel', value: elementary_id_harel, name: 'Harel Elementary' },
      { field: 'elementary_id_clal', value: elementary_id_clal, name: 'Clal Elementary' },
      { field: 'elementary_id_migdal', value: elementary_id_migdal, name: 'Migdal Elementary' },
      { field: 'elementary_id_menorah', value: elementary_id_menorah, name: 'Menorah Elementary' },
      { field: 'elementary_id_phoenix', value: elementary_id_phoenix, name: 'Phoenix Elementary' },
      { field: 'elementary_id_shomera', value: elementary_id_shomera, name: 'Shomera Elementary' },
      { field: 'elementary_id_shlomo', value: elementary_id_shlomo, name: 'Shlomo Elementary' },
      { field: 'elementary_id_shirbit', value: elementary_id_shirbit, name: 'Shirbit Elementary' },
      { field: 'elementary_id_haklai', value: elementary_id_haklai, name: 'Haklai Elementary' },
      { field: 'elementary_id_mms', value: elementary_id_mms, name: 'MMS Elementary' },
      { field: 'elementary_id_kash', value: elementary_id_kash, name: 'Kash Elementary' },
      { field: 'elementary_id_passport', value: elementary_id_passport, name: 'Passport Elementary' },
      { field: 'elementary_id_cooper_ninova', value: elementary_id_cooper_ninova, name: 'Cooper Ninova Elementary' },
      { field: 'elementary_id_securities', value: elementary_id_securities, name: 'Securities Elementary' }
    ];

    for (const elementaryId of elementaryAgentIds) {
      if (elementaryId.value) {
        const { data: existing } = await supabase
          .from('agent_data')
          .select('agent_name')
          .eq(elementaryId.field, elementaryId.value)
          .single();

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${elementaryId.name} ID "${elementaryId.value}" already exists for agent: ${existing.agent_name}`
          });
        }
      }
    }

    // Ensure company_id is an array
    const companyIds = Array.isArray(company_id) ? company_id : [];

    const { data, error } = await supabase
      .from('agent_data')
      .insert([{
        agent_name,
        agent_id: agent_id || null,
        inspector: inspector || null,
        department: department || null,
        company_id: companyIds,
        category: category || null,
        sub_category: sub_category || null,
        life_insurance_sub_category: life_insurance_sub_category || null,
        phone: phone || null,
        email: email || null,
        is_active: is_active || 'yes',
        elementary_status: elementary_status,
        insurance: insurance || false,
        elementary: elementary || false,
        ayalon_agent_id: ayalon_agent_id || null,
        harel_agent_id: harel_agent_id || null,
        migdal_agent_id: migdal_agent_id || null,
        menorah_agent_id: menorah_agent_id || null,
        phoenix_agent_id: phoenix_agent_id || null,
        clal_agent_id: clal_agent_id || null,
        altshuler_agent_id: altshuler_agent_id || null,
        hachshara_agent_id: hachshara_agent_id || null,
        mor_agent_id: mor_agent_id || null,
        mediho_agent_id: mediho_agent_id || null,
        analyst_agent_id: analyst_agent_id || null,
        commission_id_ayalon: commission_id_ayalon || null,
        commission_id_phoenix: commission_id_phoenix || null,
        commission_id_harel: commission_id_harel || null,
        commission_id_clal: commission_id_clal || null,
        commission_id_migdal: commission_id_migdal || null,
        commission_id_menorah: commission_id_menorah || null,
        commission_id_passportcard: commission_id_passportcard || null,
        commission_id_altshuler: commission_id_altshuler || null,
        commission_id_excellence: commission_id_excellence || null,
        commission_id_hachshara: commission_id_hachshara || null,
        commission_id_mediho: commission_id_mediho || null,
        commission_id_mor: commission_id_mor || null,
        commission_id_analyst: commission_id_analyst || null,
        elementary_id_ayalon: elementary_id_ayalon || null,
        elementary_id_hachshara: elementary_id_hachshara || null,
        elementary_id_harel: elementary_id_harel || null,
        elementary_id_clal: elementary_id_clal || null,
        elementary_id_migdal: elementary_id_migdal || null,
        elementary_id_menorah: elementary_id_menorah || null,
        elementary_id_phoenix: elementary_id_phoenix || null,
        elementary_id_shomera: elementary_id_shomera || null,
        elementary_id_shlomo: elementary_id_shlomo || null,
        elementary_id_shirbit: elementary_id_shirbit || null,
        elementary_id_haklai: elementary_id_haklai || null,
        elementary_id_mms: elementary_id_mms || null,
        elementary_id_kash: elementary_id_kash || null,
        elementary_id_passport: elementary_id_passport || null,
        elementary_id_cooper_ninova: elementary_id_cooper_ninova || null,
        elementary_id_securities: elementary_id_securities || null,
        notes: notes || null
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

    // Re-aggregate historical data for companies where agent IDs were provided
    const companyIdFieldMap = {
      1: 'ayalon_agent_id',
      2: 'altshuler_agent_id',
      3: 'analyst_agent_id',
      4: 'hachshara_agent_id',
      5: 'phoenix_agent_id',
      6: 'harel_agent_id',
      7: 'clal_agent_id',
      8: 'migdal_agent_id',
      9: 'mediho_agent_id',
      10: 'mor_agent_id',
      11: 'menorah_agent_id'
    };

    const elementaryIdFieldMap = {
      1: 'elementary_id_ayalon',
      4: 'elementary_id_hachshara',
      5: 'elementary_id_phoenix',
      6: 'elementary_id_harel',
      7: 'elementary_id_clal',
      8: 'elementary_id_migdal',
      11: 'elementary_id_menorah',
      12: 'elementary_id_shomera',
      13: 'elementary_id_shlomo',
      14: 'elementary_id_shirbit',
      15: 'elementary_id_haklai',
      16: 'elementary_id_mms',
      19: 'elementary_id_passport',
      21: 'elementary_id_cooper_ninova',
      23: 'elementary_id_securities',
      27: 'elementary_id_kash'
    };

    const affectedCompanies = [];
    const affectedElementaryCompanies = [];

    // Find companies that have agent IDs (Life Insurance)
    for (const [companyId, fieldName] of Object.entries(companyIdFieldMap)) {
      if (data[0][fieldName]) {
        affectedCompanies.push(parseInt(companyId));
      }
    }

    // Find companies that have elementary IDs
    for (const [companyId, fieldName] of Object.entries(elementaryIdFieldMap)) {
      if (data[0][fieldName]) {
        affectedElementaryCompanies.push(parseInt(companyId));
      }
    }

    // Re-aggregate for each affected company (Life Insurance)
    let reAggregationCount = 0;

    if (affectedCompanies.length > 0) {
      console.log(`Life Insurance Agent IDs provided for companies: ${affectedCompanies.join(', ')}`);

      for (const companyId of affectedCompanies) {
        try {
          // Find all distinct months with raw_data for this company
          const { data: rawDataMonths, error: monthsError } = await supabase
            .from('raw_data')
            .select('month')
            .eq('company_id', companyId);

          if (monthsError) {
            console.error(`Error fetching months for company ${companyId}:`, monthsError);
            continue;
          }

          // Get distinct months
          const distinctMonths = [...new Set(rawDataMonths.map(row => row.month))];

          console.log(`Found ${distinctMonths.length} months for company ${companyId}: ${distinctMonths.join(', ')}`);

          // Re-aggregate for each month
          for (const month of distinctMonths) {
            try {
              await aggregateAfterUpload(companyId, month);
              reAggregationCount++;
              console.log(`Successfully re-aggregated life insurance company ${companyId}, month ${month}`);
            } catch (aggError) {
              console.error(`Error re-aggregating life insurance company ${companyId}, month ${month}:`, aggError);
            }
          }
        } catch (error) {
          console.error(`Error processing life insurance company ${companyId}:`, error);
        }
      }
    }

    // Re-aggregate for each affected company (Elementary)
    let elementaryReAggregationCount = 0;

    if (affectedElementaryCompanies.length > 0) {
      console.log(`Elementary Agent IDs provided for companies: ${affectedElementaryCompanies.join(', ')}`);

      for (const companyId of affectedElementaryCompanies) {
        try {
          // Find all distinct months with raw_data_elementary for this company
          const { data: rawDataMonths, error: monthsError } = await supabase
            .from('raw_data_elementary')
            .select('month')
            .eq('company_id', companyId);

          if (monthsError) {
            console.error(`Error fetching elementary months for company ${companyId}:`, monthsError);
            continue;
          }

          // Get distinct months
          const distinctMonths = [...new Set(rawDataMonths.map(row => row.month))];

          console.log(`Found ${distinctMonths.length} elementary months for company ${companyId}: ${distinctMonths.join(', ')}`);

          // Re-aggregate for each month
          for (const month of distinctMonths) {
            try {
              await aggregateElementaryAfterUpload(companyId, month);
              elementaryReAggregationCount++;
              console.log(`Successfully re-aggregated elementary company ${companyId}, month ${month}`);
            } catch (aggError) {
              console.error(`Error re-aggregating elementary company ${companyId}, month ${month}:`, aggError);
            }
          }
        } catch (error) {
          console.error(`Error processing elementary company ${companyId}:`, error);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: data[0],
      reAggregation: {
        lifeInsurance: {
          companiesAffected: affectedCompanies.length,
          monthsReAggregated: reAggregationCount
        },
        elementary: {
          companiesAffected: affectedElementaryCompanies.length,
          monthsReAggregated: elementaryReAggregationCount
        }
      }
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
      sub_category,
      life_insurance_sub_category,
      phone,
      email,
      is_active,
      elementary_status,
      insurance,
      elementary,
      ayalon_agent_id,
      harel_agent_id,
      migdal_agent_id,
      menorah_agent_id,
      phoenix_agent_id,
      clal_agent_id,
      altshuler_agent_id,
      hachshara_agent_id,
      mor_agent_id,
      mediho_agent_id,
      analyst_agent_id,
      commission_id_ayalon,
      commission_id_phoenix,
      commission_id_harel,
      commission_id_clal,
      commission_id_migdal,
      commission_id_menorah,
      commission_id_passportcard,
      commission_id_altshuler,
      commission_id_excellence,
      commission_id_hachshara,
      commission_id_mediho,
      commission_id_mor,
      commission_id_analyst,
      elementary_id_ayalon,
      elementary_id_hachshara,
      elementary_id_harel,
      elementary_id_clal,
      elementary_id_migdal,
      elementary_id_menorah,
      elementary_id_phoenix,
      elementary_id_shomera,
      elementary_id_shlomo,
      elementary_id_shirbit,
      elementary_id_haklai,
      elementary_id_mms,
      elementary_id_kash,
      elementary_id_passport,
      elementary_id_cooper_ninova,
      elementary_id_securities,
      notes,
    } = req.body;

    // Validation - only agent_name is required
    if (!agent_name) {
      return res.status(400).json({
        success: false,
        message: 'Agent name is required'
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

    // Check for duplicate company-specific agent IDs (excluding current agent)
    const companyAgentIds = [
      { field: 'ayalon_agent_id', value: ayalon_agent_id, name: 'Ayalon' },
      { field: 'harel_agent_id', value: harel_agent_id, name: 'Harel' },
      { field: 'migdal_agent_id', value: migdal_agent_id, name: 'Migdal' },
      { field: 'menorah_agent_id', value: menorah_agent_id, name: 'Menorah' },
      { field: 'phoenix_agent_id', value: phoenix_agent_id, name: 'Phoenix' },
      { field: 'clal_agent_id', value: clal_agent_id, name: 'Clal' },
      { field: 'altshuler_agent_id', value: altshuler_agent_id, name: 'Altshuler' },
      { field: 'hachshara_agent_id', value: hachshara_agent_id, name: 'Hachshara' },
      { field: 'mor_agent_id', value: mor_agent_id, name: 'Mor' },
      { field: 'mediho_agent_id', value: mediho_agent_id, name: 'Mediho' },
      { field: 'analyst_agent_id', value: analyst_agent_id, name: 'Analyst' }
    ];

    for (const companyId of companyAgentIds) {
      if (companyId.value) {
        const { data: existing } = await supabase
          .from('agent_data')
          .select('agent_name, id')
          .eq(companyId.field, companyId.value)
          .neq('id', id)  // Exclude current agent
          .single();

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${companyId.name} agent ID "${companyId.value}" already exists for agent: ${existing.agent_name}`
          });
        }
      }
    }

    // Check for duplicate elementary agent IDs (excluding current agent)
    const elementaryAgentIds = [
      { field: 'elementary_id_ayalon', value: elementary_id_ayalon, name: 'Ayalon Elementary' },
      { field: 'elementary_id_hachshara', value: elementary_id_hachshara, name: 'Hachshara Elementary' },
      { field: 'elementary_id_harel', value: elementary_id_harel, name: 'Harel Elementary' },
      { field: 'elementary_id_clal', value: elementary_id_clal, name: 'Clal Elementary' },
      { field: 'elementary_id_migdal', value: elementary_id_migdal, name: 'Migdal Elementary' },
      { field: 'elementary_id_menorah', value: elementary_id_menorah, name: 'Menorah Elementary' },
      { field: 'elementary_id_phoenix', value: elementary_id_phoenix, name: 'Phoenix Elementary' },
      { field: 'elementary_id_shomera', value: elementary_id_shomera, name: 'Shomera Elementary' },
      { field: 'elementary_id_shlomo', value: elementary_id_shlomo, name: 'Shlomo Elementary' },
      { field: 'elementary_id_shirbit', value: elementary_id_shirbit, name: 'Shirbit Elementary' },
      { field: 'elementary_id_haklai', value: elementary_id_haklai, name: 'Haklai Elementary' },
      { field: 'elementary_id_mms', value: elementary_id_mms, name: 'MMS Elementary' },
      { field: 'elementary_id_kash', value: elementary_id_kash, name: 'Kash Elementary' },
      { field: 'elementary_id_passport', value: elementary_id_passport, name: 'Passport Elementary' },
      { field: 'elementary_id_cooper_ninova', value: elementary_id_cooper_ninova, name: 'Cooper Ninova Elementary' },
      { field: 'elementary_id_securities', value: elementary_id_securities, name: 'Securities Elementary' }
    ];

    for (const elementaryId of elementaryAgentIds) {
      if (elementaryId.value) {
        const { data: existing } = await supabase
          .from('agent_data')
          .select('agent_name, id')
          .eq(elementaryId.field, elementaryId.value)
          .neq('id', id)  // Exclude current agent
          .single();

        if (existing) {
          return res.status(400).json({
            success: false,
            message: `${elementaryId.name} ID "${elementaryId.value}" already exists for agent: ${existing.agent_name}`
          });
        }
      }
    }

    // Ensure company_id is an array
    const companyIds = Array.isArray(company_id) ? company_id : [];

    // Fetch old agent record to compare company-specific IDs
    const { data: oldAgent, error: fetchError } = await supabase
      .from('agent_data')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !oldAgent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    const { data, error } = await supabase
      .from('agent_data')
      .update({
        agent_name,
        agent_id: agent_id || null,
        inspector: inspector || null,
        department: department || null,
        company_id: companyIds,
        category: category || null,
        sub_category: sub_category || null,
        life_insurance_sub_category: life_insurance_sub_category || null,
        phone: phone || null,
        email: email || null,
        is_active: is_active || 'yes',
        elementary_status: elementary_status,
        insurance: insurance || false,
        elementary: elementary || false,
        ayalon_agent_id: ayalon_agent_id || null,
        harel_agent_id: harel_agent_id || null,
        migdal_agent_id: migdal_agent_id || null,
        menorah_agent_id: menorah_agent_id || null,
        phoenix_agent_id: phoenix_agent_id || null,
        clal_agent_id: clal_agent_id || null,
        altshuler_agent_id: altshuler_agent_id || null,
        hachshara_agent_id: hachshara_agent_id || null,
        mor_agent_id: mor_agent_id || null,
        mediho_agent_id: mediho_agent_id || null,
        analyst_agent_id: analyst_agent_id || null,
        commission_id_ayalon: commission_id_ayalon || null,
        commission_id_phoenix: commission_id_phoenix || null,
        commission_id_harel: commission_id_harel || null,
        commission_id_clal: commission_id_clal || null,
        commission_id_migdal: commission_id_migdal || null,
        commission_id_menorah: commission_id_menorah || null,
        commission_id_passportcard: commission_id_passportcard || null,
        commission_id_altshuler: commission_id_altshuler || null,
        commission_id_excellence: commission_id_excellence || null,
        commission_id_hachshara: commission_id_hachshara || null,
        commission_id_mediho: commission_id_mediho || null,
        commission_id_mor: commission_id_mor || null,
        commission_id_analyst: commission_id_analyst || null,
        elementary_id_ayalon: elementary_id_ayalon || null,
        elementary_id_hachshara: elementary_id_hachshara || null,
        elementary_id_harel: elementary_id_harel || null,
        elementary_id_clal: elementary_id_clal || null,
        elementary_id_migdal: elementary_id_migdal || null,
        elementary_id_menorah: elementary_id_menorah || null,
        elementary_id_phoenix: elementary_id_phoenix || null,
        elementary_id_shomera: elementary_id_shomera || null,
        elementary_id_shlomo: elementary_id_shlomo || null,
        elementary_id_shirbit: elementary_id_shirbit || null,
        elementary_id_haklai: elementary_id_haklai || null,
        elementary_id_mms: elementary_id_mms || null,
        elementary_id_kash: elementary_id_kash || null,
        elementary_id_passport: elementary_id_passport || null,
        elementary_id_cooper_ninova: elementary_id_cooper_ninova || null,
        elementary_id_securities: elementary_id_securities || null,
        notes: notes || null
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

    // Re-aggregate data if company-specific agent IDs changed
    const companyIdFieldMap = {
      1: 'ayalon_agent_id',
      2: 'altshuler_agent_id',
      3: 'analyst_agent_id',
      4: 'hachshara_agent_id',
      5: 'phoenix_agent_id',
      6: 'harel_agent_id',
      7: 'clal_agent_id',
      8: 'migdal_agent_id',
      9: 'mediho_agent_id',
      10: 'mor_agent_id',
      11: 'menorah_agent_id'
    };

    // Elementary ID field mapping
    const elementaryIdFieldMap = {
      1: 'elementary_id_ayalon',
      4: 'elementary_id_hachshara',
      5: 'elementary_id_phoenix',
      6: 'elementary_id_harel',
      7: 'elementary_id_clal',
      8: 'elementary_id_migdal',
      11: 'elementary_id_menorah',
      12: 'elementary_id_shomera',
      13: 'elementary_id_shlomo',
      14: 'elementary_id_shirbit',
      15: 'elementary_id_haklai',
      16: 'elementary_id_mms',
      19: 'elementary_id_passport',
      21: 'elementary_id_cooper_ninova',
      23: 'elementary_id_securities',
      27: 'elementary_id_kash'
    };

    const affectedCompanies = [];
    const affectedElementaryCompanies = [];

    // Compare old vs new agent IDs to find affected companies (Life Insurance)
    for (const [companyId, fieldName] of Object.entries(companyIdFieldMap)) {
      const oldValue = oldAgent[fieldName];
      const newValue = data[0][fieldName];

      // Check if the value changed
      if (oldValue !== newValue) {
        affectedCompanies.push(parseInt(companyId));
      }
    }

    // Compare old vs new elementary IDs to find affected companies (Elementary)
    for (const [companyId, fieldName] of Object.entries(elementaryIdFieldMap)) {
      const oldValue = oldAgent[fieldName];
      const newValue = data[0][fieldName];

      // Check if the value changed
      if (oldValue !== newValue) {
        affectedElementaryCompanies.push(parseInt(companyId));
      }
    }

    // Re-aggregate for each affected company (Life Insurance)
    let reAggregationCount = 0;
    let deletedAggregationsCount = 0;

    if (affectedCompanies.length > 0) {
      console.log(`Life Insurance Agent ID changes detected for companies: ${affectedCompanies.join(', ')}`);

      for (const companyId of affectedCompanies) {
        try {
          const fieldName = companyIdFieldMap[companyId];
          const oldValue = oldAgent[fieldName];
          const newValue = data[0][fieldName];

          // If agent ID was removed (changed to null/empty), delete old aggregations
          if (oldValue && !newValue) {
            console.log(`Agent ID for company ${companyId} was removed. Deleting old aggregations for agent ${id}`);
            const { error: deleteError } = await supabase
              .from('agent_aggregations')
              .delete()
              .eq('agent_id', id)
              .eq('company_id', companyId);

            if (deleteError) {
              console.error(`Error deleting aggregations for agent ${id}, company ${companyId}:`, deleteError);
            } else {
              deletedAggregationsCount++;
              console.log(`Successfully deleted aggregations for agent ${id}, company ${companyId}`);
            }
            continue; // Skip re-aggregation since agent no longer has ID for this company
          }

          // Find all distinct months with raw_data for this company
          const { data: rawDataMonths, error: monthsError } = await supabase
            .from('raw_data')
            .select('month')
            .eq('company_id', companyId);

          if (monthsError) {
            console.error(`Error fetching months for company ${companyId}:`, monthsError);
            continue;
          }

          // Get distinct months
          const distinctMonths = [...new Set(rawDataMonths.map(row => row.month))];

          console.log(`Found ${distinctMonths.length} months for company ${companyId}: ${distinctMonths.join(', ')}`);

          // Re-aggregate for each month
          for (const month of distinctMonths) {
            try {
              await aggregateAfterUpload(companyId, month);
              reAggregationCount++;
              console.log(`Successfully re-aggregated life insurance company ${companyId}, month ${month}`);
            } catch (aggError) {
              console.error(`Error re-aggregating life insurance company ${companyId}, month ${month}:`, aggError);
            }
          }
        } catch (error) {
          console.error(`Error processing life insurance company ${companyId}:`, error);
        }
      }
    }

    // Re-aggregate for each affected company (Elementary)
    let elementaryReAggregationCount = 0;
    let deletedElementaryAggregationsCount = 0;

    if (affectedElementaryCompanies.length > 0) {
      console.log(`Elementary Agent ID changes detected for companies: ${affectedElementaryCompanies.join(', ')}`);

      for (const companyId of affectedElementaryCompanies) {
        try {
          const fieldName = elementaryIdFieldMap[companyId];
          const oldValue = oldAgent[fieldName];
          const newValue = data[0][fieldName];

          // If agent ID was removed (changed to null/empty), delete old aggregations
          if (oldValue && !newValue) {
            console.log(`Elementary Agent ID for company ${companyId} was removed. Deleting old aggregations for agent ${id}`);
            const { error: deleteError } = await supabase
              .from('agent_aggregations_elementary')
              .delete()
              .eq('agent_id', id)
              .eq('company_id', companyId);

            if (deleteError) {
              console.error(`Error deleting elementary aggregations for agent ${id}, company ${companyId}:`, deleteError);
            } else {
              deletedElementaryAggregationsCount++;
              console.log(`Successfully deleted elementary aggregations for agent ${id}, company ${companyId}`);
            }
            continue; // Skip re-aggregation since agent no longer has ID for this company
          }

          // Find all distinct months with raw_data_elementary for this company
          const { data: rawDataMonths, error: monthsError } = await supabase
            .from('raw_data_elementary')
            .select('month')
            .eq('company_id', companyId);

          if (monthsError) {
            console.error(`Error fetching elementary months for company ${companyId}:`, monthsError);
            continue;
          }

          // Get distinct months
          const distinctMonths = [...new Set(rawDataMonths.map(row => row.month))];

          console.log(`Found ${distinctMonths.length} elementary months for company ${companyId}: ${distinctMonths.join(', ')}`);

          // Re-aggregate for each month
          for (const month of distinctMonths) {
            try {
              await aggregateElementaryAfterUpload(companyId, month);
              elementaryReAggregationCount++;
              console.log(`Successfully re-aggregated elementary company ${companyId}, month ${month}`);
            } catch (aggError) {
              console.error(`Error re-aggregating elementary company ${companyId}, month ${month}:`, aggError);
            }
          }
        } catch (error) {
          console.error(`Error processing elementary company ${companyId}:`, error);
        }
      }
    }

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: data[0],
      reAggregation: {
        lifeInsurance: {
          companiesAffected: affectedCompanies.length,
          monthsReAggregated: reAggregationCount,
          aggregationsDeleted: deletedAggregationsCount
        },
        elementary: {
          companiesAffected: affectedElementaryCompanies.length,
          monthsReAggregated: elementaryReAggregationCount,
          aggregationsDeleted: deletedElementaryAggregationsCount
        }
      }
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
    const { password } = req.body || {};

    // Verify delete password
    const DELETE_PASSWORD = 'gal2025';
    if (!password || password !== DELETE_PASSWORD) {
      return res.status(403).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // First, check if the agent exists
    const { data: agent, error: fetchError } = await supabase
      .from('agent_data')
      .select('agent_name')
      .eq('id', id)
      .single();

    if (fetchError || !agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Delete related aggregation records first (life insurance)
    const { error: aggDeleteError } = await supabase
      .from('agent_aggregations')
      .delete()
      .eq('agent_id', id);

    if (aggDeleteError) {
      console.error('Error deleting agent aggregations:', aggDeleteError);
      // Continue anyway - the aggregations might not exist
    }

    // Delete related elementary aggregation records
    const { error: elemAggDeleteError } = await supabase
      .from('agent_aggregations_elementary')
      .delete()
      .eq('agent_id', id);

    if (elemAggDeleteError) {
      console.error('Error deleting elementary aggregations:', elemAggDeleteError);
      // Continue anyway - the aggregations might not exist
    }

    // Now delete the agent
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