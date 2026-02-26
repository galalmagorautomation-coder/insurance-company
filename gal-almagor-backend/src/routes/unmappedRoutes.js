const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * GET /api/unmapped/:companyId/:month/life
 * Get unmapped agent numbers for life insurance
 */
router.get('/:companyId/:month/life', async (req, res) => {
  try {
    const { companyId, month } = req.params;

    // Company column mapping for life insurance
    const companyColumnMap = {
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
      11: 'menorah_agent_id',
      28: 'meitav_agent_id'
    };

    const agentIdColumn = companyColumnMap[companyId];
    if (!agentIdColumn) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID for life insurance'
      });
    }

    // Get all known agent numbers for this company
    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select(agentIdColumn)
      .contains('company_id', [parseInt(companyId)]);

    if (agentsError) throw agentsError;

    const agentNumbers = [];
    agents.forEach(agent => {
      const agentNumber = agent[agentIdColumn];
      if (agentNumber && agentNumber !== 'UNMAPPED') {
        const ids = agentNumber.split(',').map(id => id.trim());
        agentNumbers.push(...ids);
      }
    });

    // Fetch unmapped raw data
    const { data: unmappedData, error: dataError } = await supabase
      .from('raw_data')
      .select('agent_number, agent_name, output, product')
      .eq('company_id', companyId)
      .eq('month', month)
      .not('agent_number', 'in', `(${agentNumbers.join(',')})`)
      .neq('agent_name', 'No Data - Empty File');

    if (dataError) throw dataError;

    // Group by agent_number and calculate totals
    const unmappedSummary = {};
    unmappedData.forEach(row => {
      const agentNum = row.agent_number || 'NULL';
      if (!unmappedSummary[agentNum]) {
        unmappedSummary[agentNum] = {
          agent_number: agentNum,
          agent_name: row.agent_name || 'Unknown',
          total_output: 0,
          row_count: 0,
          products: []
        };
      }
      unmappedSummary[agentNum].total_output += parseFloat(row.output) || 0;
      unmappedSummary[agentNum].row_count++;
      if (row.product && !unmappedSummary[agentNum].products.includes(row.product)) {
        unmappedSummary[agentNum].products.push(row.product);
      }
    });

    res.json({
      success: true,
      data: Object.values(unmappedSummary),
      total_unmapped_rows: unmappedData.length
    });

  } catch (error) {
    console.error('Error fetching unmapped life insurance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unmapped data',
      error: error.message
    });
  }
});

/**
 * GET /api/unmapped/:companyId/:month/elementary
 * Get unmapped agent numbers for elementary insurance
 */
router.get('/:companyId/:month/elementary', async (req, res) => {
  try {
    const { companyId, month } = req.params;

    // Company column mapping for elementary insurance
    const companyColumnMap = {
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

    const agentIdColumn = companyColumnMap[companyId];
    if (!agentIdColumn) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID for elementary insurance'
      });
    }

    // Get all known agent numbers for this company
    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select(agentIdColumn)
      .contains('company_id', [parseInt(companyId)]);

    if (agentsError) throw agentsError;

    const agentNumbers = [];
    agents.forEach(agent => {
      const agentNumber = agent[agentIdColumn];
      if (agentNumber && agentNumber !== 'UNMAPPED') {
        const ids = agentNumber.split(',').map(id => id.trim());
        agentNumbers.push(...ids);
      }
    });

    // Fetch unmapped raw data
    const { data: unmappedData, error: dataError } = await supabase
      .from('raw_data_elementary')
      .select('agent_number, agent_name, current_gross_premium, previous_gross_premium')
      .eq('company_id', companyId)
      .eq('month', month)
      .not('agent_number', 'in', `(${agentNumbers.join(',')})`)
      .or('agent_name.is.null,agent_name.neq.No Data - Empty File');

    if (dataError) throw dataError;

    // Group by agent_number and calculate totals
    const unmappedSummary = {};
    unmappedData.forEach(row => {
      const agentNum = row.agent_number || 'NULL';
      if (!unmappedSummary[agentNum]) {
        unmappedSummary[agentNum] = {
          agent_number: agentNum,
          agent_name: row.agent_name || 'Unknown',
          total_current_premium: 0,
          total_previous_premium: 0,
          row_count: 0
        };
      }
      unmappedSummary[agentNum].total_current_premium += parseFloat(row.current_gross_premium) || 0;
      unmappedSummary[agentNum].total_previous_premium += parseFloat(row.previous_gross_premium) || 0;
      unmappedSummary[agentNum].row_count++;
    });

    res.json({
      success: true,
      data: Object.values(unmappedSummary),
      total_unmapped_rows: unmappedData.length
    });

  } catch (error) {
    console.error('Error fetching unmapped elementary data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unmapped data',
      error: error.message
    });
  }
});

module.exports = router;
