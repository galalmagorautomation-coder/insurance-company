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

/**
 * GET /aggregate/elementary/departments
 * Get unique departments from agent_data (for elementary insurance filtering)
 */
router.get('/elementary/departments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agent_data')
      .select('department')
      .not('department', 'is', null)
      .neq('department', '');

    if (error) {
      console.error('Error fetching departments:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error.message
      });
    }

    // Get unique values
    const uniqueDepartments = [...new Set(data.map(item => item.department))];

    res.json({
      success: true,
      data: uniqueDepartments.sort()
    });

  } catch (error) {
    console.error('Error in departments endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

/**
 * GET /aggregate/elementary/agents
 * Fast aggregated elementary agent data from pre-computed table
 */
router.get('/elementary/agents', async (req, res) => {
  try {
    const {
      company_id,
      start_month,
      end_month,
      department
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
        data: []
      });
    }

    // Step 2: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 3: Calculate years and generate month ranges
    const [startYear, startMonthNum] = start_month.split('-');
    const [endYear, endMonthNum] = end_month.split('-');
    const currentYear = parseInt(startYear);
    const previousYear = currentYear - 1;

    // Generate months based on the selected date range for current year
    const startMonthIndex = parseInt(startMonthNum);
    const endMonthIndex = parseInt(endMonthNum);

    const allCurrentYearMonths = [];
    for (let i = startMonthIndex; i <= endMonthIndex; i++) {
      allCurrentYearMonths.push(`${currentYear}-${String(i).padStart(2, '0')}`);
    }

    // Generate same months for previous year
    const allPreviousYearMonths = [];
    for (let i = startMonthIndex; i <= endMonthIndex; i++) {
      allPreviousYearMonths.push(`${previousYear}-${String(i).padStart(2, '0')}`);
    }

    // Get last month from selected range for monthly calculations
    const lastMonth = months[months.length - 1];

    // Determine which months to fetch (the selected range)
    const fetchMonths = months;

    // Step 4: Build aggregations query (fetch only selected date range)
    let aggQuery = supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .in('agent_id', agentIds)
      .in('month', fetchMonths);

    // Apply company filter to aggregations if specified
    if (company_id && company_id !== 'all') {
      aggQuery = aggQuery.eq('company_id', parseInt(company_id));
    }

    const { data: aggregations, error: aggError } = await aggQuery;

    if (aggError) {
      console.error('Error fetching elementary aggregations:', aggError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch aggregations',
        error: aggError.message
      });
    }

    // Step 5: Group aggregations by agent with monthly breakdown
    const agentTotalsMap = {};

    (aggregations || []).forEach(agg => {
      if (!agentTotalsMap[agg.agent_id]) {
        agentTotalsMap[agg.agent_id] = {
          cumulative_current: 0,
          cumulative_previous: 0,
          monthly_current: 0,
          monthly_previous: 0,
          months_data: {}, // Store current year data per month
          prev_months_data: {} // Store previous year data per month
        };
      }

      // Current year data from gross_premium column
      agentTotalsMap[agg.agent_id].cumulative_current += parseFloat(agg.gross_premium) || 0;
      agentTotalsMap[agg.agent_id].months_data[agg.month] = parseFloat(agg.gross_premium) || 0;

      // Previous year data from previous_year_gross_premium column (SAME ROW)
      agentTotalsMap[agg.agent_id].cumulative_previous += parseFloat(agg.previous_year_gross_premium) || 0;

      // Map current year month to previous year month for monthly breakdown
      const [year, monthNum] = agg.month.split('-');
      const prevYearMonth = `${parseInt(year) - 1}-${monthNum}`;
      agentTotalsMap[agg.agent_id].prev_months_data[prevYearMonth] = parseFloat(agg.previous_year_gross_premium) || 0;

      // Monthly calculations (last month only)
      if (agg.month === lastMonth) {
        agentTotalsMap[agg.agent_id].monthly_current = parseFloat(agg.gross_premium) || 0;
        agentTotalsMap[agg.agent_id].monthly_previous = parseFloat(agg.previous_year_gross_premium) || 0;
      }
    });

    // Step 6: Combine with agent data and filter only elementary agents
    const result = agents
      .filter(agent => agent.elementary === true)
      .map(agent => {
        const totals = agentTotalsMap[agent.id] || {
          cumulative_current: 0,
          cumulative_previous: 0,
          monthly_current: 0,
          monthly_previous: 0,
          months_data: {},
          prev_months_data: {}
        };

        // Build current year months breakdown (all 12 months)
        const monthsBreakdown = {};
        allCurrentYearMonths.forEach(month => {
          monthsBreakdown[month] = totals.months_data[month] || 0;
        });

        // Build previous year months breakdown (all 12 months)
        const prevMonthsBreakdown = {};
        allPreviousYearMonths.forEach(month => {
          prevMonthsBreakdown[month] = totals.prev_months_data[month] || 0;
        });

        return {
          agent_id: agent.id,
          agent_name: agent.agent_name,
          department: agent.department,
          cumulative_current: totals.cumulative_current,
          cumulative_previous: totals.cumulative_previous,
          monthly_current: totals.monthly_current,
          monthly_previous: totals.monthly_previous,
          months_breakdown: monthsBreakdown,
          prev_months_breakdown: prevMonthsBreakdown,
          gross_premium: totals.cumulative_current // Keep for pie charts
        };
      });

    res.json({
      success: true,
      data: result,
      months: allCurrentYearMonths, // Send all 12 months for current year
      previousYearMonths: allPreviousYearMonths, // Send all 12 months for previous year
      currentYear: currentYear,
      previousYear: previousYear
    });

  } catch (error) {
    console.error('Error in elementary agents aggregation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

/**
 * GET /aggregate/elementary/stats
 * Get elementary insurance statistics
 */
router.get('/elementary/stats', async (req, res) => {
  try {
    const {
      company_id,
      start_month,
      end_month,
      department
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

    // Build query for policies count from raw_data_elementary
    let countQuery = supabase
      .from('raw_data_elementary')
      .select('*', { count: 'exact', head: true })
      .in('month', months);

    if (company_id && company_id !== 'all') {
      countQuery = countQuery.eq('company_id', parseInt(company_id));
    }

    // Apply department filter by joining with agent_data
    if (department && department !== 'all') {
      // We need to get agent_ids that match the department first
      const { data: matchingAgents, error: agentsError } = await supabase
        .from('agent_data')
        .select('id')
        .eq('department', department);

      if (agentsError) {
        console.error('Error fetching agents by department:', agentsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch agents',
          error: agentsError.message
        });
      }

      const agentIds = matchingAgents.map(a => a.id);
      if (agentIds.length > 0) {
        countQuery = countQuery.in('agent_id', agentIds);
      } else {
        // No agents match classification, return 0
        return res.json({
          success: true,
          data: {
            totalPolicies: 0
          }
        });
      }
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting elementary policies:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to count policies',
        error: countError.message
      });
    }

    res.json({
      success: true,
      data: {
        totalPolicies: count || 0
      }
    });

  } catch (error) {
    console.error('Error in elementary stats:', error);
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