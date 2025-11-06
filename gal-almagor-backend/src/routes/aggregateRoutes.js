/**
 * Aggregate Routes
 * Fast endpoints using pre-computed agent_aggregations table
 */

const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * GET /aggregate/agents
 * Fast aggregated agent data from pre-computed table
 */
router.get('/agents', async (req, res) => {
  try {
    const { 
      company_id, 
      start_month, 
      end_month,
      department,
      inspector,
      agent_name 
    } = req.query;

    // Validate required parameters
    if (!start_month || !end_month) {
      return res.status(400).json({
        success: false,
        message: 'start_month and end_month are required'
      });
    }

    // Get months array between start and end
    const months = getMonthsInRange(start_month, end_month);

    // Step 1: Build query for agent_data with filters
    let agentQuery = supabase
      .from('agent_data')
      .select('*');

    // Apply filters
    if (company_id && company_id !== 'all') {
      agentQuery = agentQuery.contains('company_id', [parseInt(company_id)]);
    }
    if (department && department !== 'all') {
      agentQuery = agentQuery.eq('department', department);
    }
    if (inspector && inspector !== 'all') {
      agentQuery = agentQuery.eq('inspector', inspector);
    }
    if (agent_name && agent_name !== 'all') {
      agentQuery = agentQuery.eq('agent_name', agent_name);
    }

    const { data: agents, error: agentsError } = await agentQuery;

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: agentsError.message
      });
    }

    if (!agents || agents.length === 0) {
      return res.json({
        success: true,
        data: [],
        totalPolicies: 0
      });
    }

    // Step 2: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 3: Build aggregations query
    let aggQuery = supabase
      .from('agent_aggregations')
      .select('*')
      .in('agent_id', agentIds)
      .in('month', months);

    // Apply company filter to aggregations if specified
    if (company_id && company_id !== 'all') {
      aggQuery = aggQuery.eq('company_id', parseInt(company_id));
    }

    const { data: aggregations, error: aggError } = await aggQuery;

    if (aggError) {
      console.error('Error fetching aggregations:', aggError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch aggregations',
        error: aggError.message
      });
    }

    // Step 4: Group aggregations by agent and sum across months/companies
    const agentTotalsMap = {};

    (aggregations || []).forEach(agg => {
      if (!agentTotalsMap[agg.agent_id]) {
        agentTotalsMap[agg.agent_id] = {
          פנסיוני: 0,
          סיכונים: 0,
          פיננסים: 0,
          'ניודי פנסיה': 0
        };
      }

      agentTotalsMap[agg.agent_id].פנסיוני += parseFloat(agg.pension) || 0;
      agentTotalsMap[agg.agent_id].סיכונים += parseFloat(agg.risk) || 0;
      agentTotalsMap[agg.agent_id].פיננסים += parseFloat(agg.financial) || 0;
      agentTotalsMap[agg.agent_id]['ניודי פנסיה'] += parseFloat(agg.pension_transfer) || 0;
    });

    // Step 5: Combine with agent data
    const result = agents.map(agent => ({
      ...agent,
      פנסיוני: agentTotalsMap[agent.id]?.פנסיוני || 0,
      סיכונים: agentTotalsMap[agent.id]?.סיכונים || 0,
      פיננסים: agentTotalsMap[agent.id]?.פיננסים || 0,
      'ניודי פנסיה': agentTotalsMap[agent.id]?.['ניודי פנסיה'] || 0
    }));

    // Step 6: Get total policies count from raw_data (optional - keep for now)
    let totalPolicies = 0;
    try {
      let countQuery = supabase
        .from('raw_data')
        .select('*', { count: 'exact', head: true })
        .in('month', months);

      if (company_id && company_id !== 'all') {
        countQuery = countQuery.eq('company_id', parseInt(company_id));
      }

      const { count, error: countError } = await countQuery;
      
      if (!countError) {
        totalPolicies = count || 0;
      }
    } catch (countErr) {
      console.error('Error counting policies:', countErr);
    }

    res.json({
      success: true,
      data: result,
      totalPolicies: totalPolicies
    });

  } catch (error) {
    console.error('Error in aggregated agents:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get array of months between start and end (inclusive)
 */
function getMonthsInRange(startMonth, endMonth) {
  const months = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');

  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

module.exports = router;