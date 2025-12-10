/**
 * Aggregate Routes
 * Fast endpoints using pre-computed agent_aggregations table
 */

const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * GET /aggregate/agents
 * Fast aggregated agent data from pre-computed table with monthly breakdown
 */
router.get('/agents', async (req, res) => {
  try {
    const {
      company_id,
      start_month,
      end_month,
      department,
      inspector,
      agent_name,
      limit
    } = req.query;

    // Validate required parameters
    if (!start_month || !end_month) {
      return res.status(400).json({
        success: false,
        message: 'start_month and end_month are required'
      });
    }

    // Step 1: Calculate years and generate month ranges
    const [startYear, startMonthNum] = start_month.split('-');
    const [endYear, endMonthNum] = end_month.split('-');
    const currentYear = parseInt(startYear);
    const previousYear = currentYear - 1;

    // Generate months based on the selected date range for current year
    const startMonthIndex = parseInt(startMonthNum);
    const endMonthIndex = parseInt(endMonthNum);

    const currentYearMonths = [];
    for (let i = startMonthIndex; i <= endMonthIndex; i++) {
      currentYearMonths.push(`${currentYear}-${String(i).padStart(2, '0')}`);
    }

    // Generate same months for previous year
    const previousYearMonths = [];
    for (let i = startMonthIndex; i <= endMonthIndex; i++) {
      previousYearMonths.push(`${previousYear}-${String(i).padStart(2, '0')}`);
    }

    // Combine all months to fetch
    const allMonths = [...currentYearMonths, ...previousYearMonths];

    // Step 2: Build query for agent_data with filters
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
        totalPolicies: 0,
        months: currentYearMonths,
        previousYearMonths: previousYearMonths,
        currentYear: currentYear,
        previousYear: previousYear
      });
    }

    // Step 3: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 4: Build aggregations query with pagination to handle large datasets
    let allAggregations = [];
    const PAGE_SIZE = limit ? parseInt(limit) : 1000; // Use custom limit or default to 1000
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let aggQuery = supabase
        .from('agent_aggregations')
        .select('*')
        .in('agent_id', agentIds)
        .in('month', allMonths)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply company filter to aggregations if specified
      if (company_id && company_id !== 'all') {
        aggQuery = aggQuery.eq('company_id', parseInt(company_id));
      }

      const { data: pageData, error: aggError } = await aggQuery;

      if (aggError) {
        console.error('Error fetching aggregations:', aggError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch aggregations',
          error: aggError.message
        });
      }

      if (pageData && pageData.length > 0) {
        allAggregations = allAggregations.concat(pageData);
        hasMore = pageData.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    const aggregations = allAggregations;

    // Step 5: Group aggregations by agent with monthly breakdown
    const agentDataMap = {};

    (aggregations || []).forEach(agg => {
      if (!agentDataMap[agg.agent_id]) {
        agentDataMap[agg.agent_id] = {
          current_year_months: {},
          previous_year_months: {}
        };
      }

      // Check if this is current year or previous year
      const [year] = agg.month.split('-');
      const isCurrentYear = parseInt(year) === currentYear;

      const monthData = {
        pension: parseFloat(agg.pension) || 0,
        risk: parseFloat(agg.risk) || 0,
        financial: parseFloat(agg.financial) || 0,
        pension_transfer: parseFloat(agg.pension_transfer) || 0
      };

      if (isCurrentYear) {
        agentDataMap[agg.agent_id].current_year_months[agg.month] = monthData;
      } else {
        agentDataMap[agg.agent_id].previous_year_months[agg.month] = monthData;
      }
    });

    // Step 6: Combine with agent data and filter only insurance agents
    const result = agents
      .filter(agent => agent.insurance === true)
      .map(agent => {
        const monthlyData = agentDataMap[agent.id] || {
          current_year_months: {},
          previous_year_months: {}
        };

        // Build current year months breakdown
        const currentYearBreakdown = {};
        currentYearMonths.forEach(month => {
          currentYearBreakdown[month] = monthlyData.current_year_months[month] || {
            pension: 0,
            risk: 0,
            financial: 0,
            pension_transfer: 0
          };
        });

        // Build previous year months breakdown
        const previousYearBreakdown = {};
        previousYearMonths.forEach(month => {
          previousYearBreakdown[month] = monthlyData.previous_year_months[month] || {
            pension: 0,
            risk: 0,
            financial: 0,
            pension_transfer: 0
          };
        });

        // Calculate totals for pie charts
        let totalPension = 0, totalRisk = 0, totalFinancial = 0, totalPensionTransfer = 0;
        currentYearMonths.forEach(month => {
          const data = currentYearBreakdown[month];
          totalPension += data.pension;
          totalRisk += data.risk;
          totalFinancial += data.financial;
          totalPensionTransfer += data.pension_transfer;
        });

        return {
          agent_id: agent.id,
          agent_name: agent.agent_name,
          inspector: agent.inspector,
          department: agent.department,
          category: agent.category,
          current_year_months: currentYearBreakdown,
          previous_year_months: previousYearBreakdown,
          // Keep totals for pie charts
          פנסיוני: totalPension,
          סיכונים: totalRisk,
          פיננסים: totalFinancial,
          'ניודי פנסיה': totalPensionTransfer
        };
      });

    // Step 7: Get total policies count from raw_data
    let totalPolicies = 0;
    try {
      let countQuery = supabase
        .from('raw_data')
        .select('*', { count: 'exact', head: true })
        .in('month', currentYearMonths);

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
      totalPolicies: totalPolicies,
      months: currentYearMonths,
      previousYearMonths: previousYearMonths,
      currentYear: currentYear,
      previousYear: previousYear
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

    // Step 1: Build query for agent_data with filters and pagination
    let allAgents = [];
    const AGENT_PAGE_SIZE = 1000;
    let agentPage = 0;
    let hasMoreAgents = true;

    while (hasMoreAgents) {
      let agentQuery = supabase
        .from('agent_data')
        .select('*')
        .range(agentPage * AGENT_PAGE_SIZE, (agentPage + 1) * AGENT_PAGE_SIZE - 1);

      // Apply filters
      if (company_id && company_id !== 'all') {
        agentQuery = agentQuery.contains('company_id', [parseInt(company_id)]);
      }
      if (department && department !== 'all') {
        agentQuery = agentQuery.eq('department', department);
      }

      const { data: agentPageData, error: agentsError } = await agentQuery;

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch agents',
          error: agentsError.message
        });
      }

      if (agentPageData && agentPageData.length > 0) {
        allAgents = allAgents.concat(agentPageData);
        hasMoreAgents = agentPageData.length === AGENT_PAGE_SIZE;
        agentPage++;
      } else {
        hasMoreAgents = false;
      }
    }

    const agents = allAgents;

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

    // Step 4: Build aggregations query with pagination (fetch only selected date range)
    let allAggregations = [];
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let aggQuery = supabase
        .from('agent_aggregations_elementary')
        .select('*')
        .in('agent_id', agentIds)
        .in('month', fetchMonths)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply company filter to aggregations if specified
      if (company_id && company_id !== 'all') {
        aggQuery = aggQuery.eq('company_id', parseInt(company_id));
      }

      const { data: pageData, error: aggError } = await aggQuery;

      if (aggError) {
        console.error('Error fetching elementary aggregations:', aggError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch aggregations',
          error: aggError.message
        });
      }

      if (pageData && pageData.length > 0) {
        allAggregations = allAggregations.concat(pageData);
        hasMore = pageData.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    const aggregations = allAggregations;

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
          prev_months_data: {}, // Store previous year data per month
          changes: null // Store changes value from database
        };
      }

      // Current year data from gross_premium column
      agentTotalsMap[agg.agent_id].cumulative_current += parseFloat(agg.gross_premium) || 0;
      
      // Sum monthly data instead of overwriting (handle multiple companies per agent)
      if (!agentTotalsMap[agg.agent_id].months_data[agg.month]) {
        agentTotalsMap[agg.agent_id].months_data[agg.month] = 0;
      }
      agentTotalsMap[agg.agent_id].months_data[agg.month] += parseFloat(agg.gross_premium) || 0;

      // Previous year data from previous_year_gross_premium column (SAME ROW)
      agentTotalsMap[agg.agent_id].cumulative_previous += parseFloat(agg.previous_year_gross_premium) || 0;

      // Map current year month to previous year month for monthly breakdown
      const [year, monthNum] = agg.month.split('-');
      const prevYearMonth = `${parseInt(year) - 1}-${monthNum}`;
      
      // Sum previous year monthly data instead of overwriting
      if (!agentTotalsMap[agg.agent_id].prev_months_data[prevYearMonth]) {
        agentTotalsMap[agg.agent_id].prev_months_data[prevYearMonth] = 0;
      }
      agentTotalsMap[agg.agent_id].prev_months_data[prevYearMonth] += parseFloat(agg.previous_year_gross_premium) || 0;

      // Monthly calculations (last month only)
      if (agg.month === lastMonth) {
        agentTotalsMap[agg.agent_id].monthly_current = parseFloat(agg.gross_premium) || 0;
        agentTotalsMap[agg.agent_id].monthly_previous = parseFloat(agg.previous_year_gross_premium) || 0;
        agentTotalsMap[agg.agent_id].changes = agg.changes; // Use changes value from database
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
          prev_months_data: {},
          changes: null
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

        // Use the changes value from database (already in decimal format)
        const changes = totals.changes;

        return {
          agent_id: agent.id,
          agent_name: agent.agent_name,
          department: agent.department,
          cumulative_current: totals.cumulative_current,
          cumulative_previous: totals.cumulative_previous,
          monthly_current: totals.monthly_current,
          monthly_previous: totals.monthly_previous,
          changes: changes, // Decimal format (e.g., 0.25 = 25% increase)
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

/**
 * PUT /aggregate/elementary/agents
 * Update elementary agent aggregation data
 */
router.put('/elementary/agents', async (req, res) => {
  try {
    const { updates } = req.body;

    // Validate request body
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: updates array is required'
      });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.agent_id || !update.month || !update.field || update.value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid update: agent_id, month, field, and value are required'
        });
      }

      if (!['gross_premium', 'previous_year_gross_premium'].includes(update.field)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid field: must be gross_premium or previous_year_gross_premium'
        });
      }

      // Validate value is a number
      if (typeof update.value !== 'number' || isNaN(update.value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value: must be a valid number'
        });
      }
    }

    // Group updates by agent and month to handle both gross_premium and previous_year_gross_premium
    const updatesByKey = {};
    updates.forEach(update => {
      const key = `${update.agent_id}-${update.month}${update.company_id ? `-${update.company_id}` : ''}`;
      if (!updatesByKey[key]) {
        updatesByKey[key] = {
          agent_id: update.agent_id,
          month: update.month,
          company_id: update.company_id
        };
      }
      updatesByKey[key][update.field] = update.value;
    });

    // Process each update
    const results = [];
    const errors = [];

    for (const key of Object.keys(updatesByKey)) {
      const update = updatesByKey[key];

      try {
        // Build query to find the record
        let query = supabase
          .from('agent_aggregations_elementary')
          .select('*')
          .eq('agent_id', update.agent_id)
          .eq('month', update.month);

        if (update.company_id) {
          query = query.eq('company_id', update.company_id);
        }

        // Fetch existing record
        const { data: existingRecords, error: fetchError } = await query;

        if (fetchError) {
          errors.push({ update, error: fetchError.message });
          continue;
        }

        if (!existingRecords || existingRecords.length === 0) {
          // Record doesn't exist - create it
          const newRecord = {
            agent_id: update.agent_id,
            company_id: update.company_id || null,
            month: update.month,
            gross_premium: update.gross_premium || 0,
            previous_year_gross_premium: update.previous_year_gross_premium || 0,
            changes: null
          };

          // Calculate changes
          if (newRecord.previous_year_gross_premium > 0) {
            newRecord.changes = (newRecord.gross_premium - newRecord.previous_year_gross_premium) / newRecord.previous_year_gross_premium;
          } else if (newRecord.gross_premium > 0) {
            newRecord.changes = 1;
          }

          const { data: insertData, error: insertError } = await supabase
            .from('agent_aggregations_elementary')
            .insert([newRecord])
            .select();

          if (insertError) {
            errors.push({ update, error: insertError.message });
          } else {
            results.push({ update, action: 'created', data: insertData });
          }
        } else {
          // Record exists - update it
          const existingRecord = existingRecords[0];

          const updatedRecord = {
            gross_premium: update.gross_premium !== undefined ? update.gross_premium : existingRecord.gross_premium,
            previous_year_gross_premium: update.previous_year_gross_premium !== undefined ? update.previous_year_gross_premium : existingRecord.previous_year_gross_premium
          };

          // Recalculate changes
          if (updatedRecord.previous_year_gross_premium > 0) {
            updatedRecord.changes = (updatedRecord.gross_premium - updatedRecord.previous_year_gross_premium) / updatedRecord.previous_year_gross_premium;
          } else if (updatedRecord.gross_premium > 0) {
            updatedRecord.changes = 1;
          } else {
            updatedRecord.changes = null;
          }

          updatedRecord.updated_at = new Date().toISOString();

          // Update the record
          let updateQuery = supabase
            .from('agent_aggregations_elementary')
            .update(updatedRecord)
            .eq('agent_id', update.agent_id)
            .eq('month', update.month);

          if (update.company_id) {
            updateQuery = updateQuery.eq('company_id', update.company_id);
          }

          const { data: updateData, error: updateError } = await updateQuery.select();

          if (updateError) {
            errors.push({ update, error: updateError.message });
          } else {
            results.push({ update, action: 'updated', data: updateData });
          }
        }
      } catch (err) {
        errors.push({ update, error: err.message });
      }
    }

    // Return response
    if (errors.length > 0 && results.length === 0) {
      return res.status(500).json({
        success: false,
        message: `All ${errors.length} update(s) failed`,
        errors: errors
      });
    }

    res.json({
      success: true,
      message: `${results.length} record(s) updated successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      results: results,
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    console.error('Error updating elementary aggregations:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating',
      error: error.message
    });
  }
});

/**
 * PUT /aggregate/life-insurance/agents
 * Update life insurance agent aggregation data
 */
router.put('/life-insurance/agents', async (req, res) => {
  try {
    const { updates } = req.body;

    console.log('📝 Received life insurance update request:', JSON.stringify(updates, null, 2));

    // Validate request body
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: updates array is required'
      });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.agent_id || !update.month || !update.product || update.value === undefined) {
        console.error('❌ Invalid update:', update);
        return res.status(400).json({
          success: false,
          message: 'Invalid update: agent_id, month, product, and value are required'
        });
      }

      if (!['pension', 'risk', 'financial', 'pension_transfer'].includes(update.product)) {
        console.error('❌ Invalid product:', update.product);
        return res.status(400).json({
          success: false,
          message: 'Invalid product: must be pension, risk, financial, or pension_transfer'
        });
      }

      // Validate value is a number
      if (typeof update.value !== 'number' || isNaN(update.value)) {
        console.error('❌ Invalid value:', update.value);
        return res.status(400).json({
          success: false,
          message: 'Invalid value: must be a valid number'
        });
      }
    }

    // Group updates by agent and month to handle multiple products
    const updatesByKey = {};
    updates.forEach(update => {
      const key = `${update.agent_id}-${update.month}${update.company_id ? `-${update.company_id}` : ''}`;
      if (!updatesByKey[key]) {
        updatesByKey[key] = {
          agent_id: update.agent_id,
          month: update.month,
          company_id: update.company_id,
          products: {}
        };
      }
      updatesByKey[key].products[update.product] = update.value;
    });

    // Process each update
    const results = [];
    const errors = [];

    for (const key of Object.keys(updatesByKey)) {
      const update = updatesByKey[key];

      try {
        // Build query to find the record
        let query = supabase
          .from('agent_aggregations')
          .select('*')
          .eq('agent_id', update.agent_id)
          .eq('month', update.month);

        if (update.company_id) {
          query = query.eq('company_id', update.company_id);
        }

        console.log('🔍 Querying for existing record:', { agent_id: update.agent_id, month: update.month, company_id: update.company_id });

        // Fetch existing record
        const { data: existingRecords, error: fetchError } = await query;

        if (fetchError) {
          console.error('❌ Fetch error:', fetchError);
          errors.push({ update, error: fetchError.message });
          continue;
        }

        console.log('📊 Existing records found:', existingRecords?.length || 0);

        if (!existingRecords || existingRecords.length === 0) {
          // Record doesn't exist - create it
          const newRecord = {
            agent_id: update.agent_id,
            company_id: update.company_id || null,
            month: update.month,
            pension: update.products.pension || 0,
            risk: update.products.risk || 0,
            financial: update.products.financial || 0,
            pension_transfer: update.products.pension_transfer || 0
          };

          console.log('➕ Creating new record:', newRecord);

          const { data: insertData, error: insertError } = await supabase
            .from('agent_aggregations')
            .insert([newRecord])
            .select();

          if (insertError) {
            console.error('❌ Insert error:', insertError);
            errors.push({ update, error: insertError.message });
          } else {
            console.log('✅ Record created successfully');
            results.push({ update, action: 'created', data: insertData });
          }
        } else {
          // Record exists - update it
          const existingRecord = existingRecords[0];

          const updatedRecord = {
            pension: update.products.pension !== undefined ? update.products.pension : existingRecord.pension,
            risk: update.products.risk !== undefined ? update.products.risk : existingRecord.risk,
            financial: update.products.financial !== undefined ? update.products.financial : existingRecord.financial,
            pension_transfer: update.products.pension_transfer !== undefined ? update.products.pension_transfer : existingRecord.pension_transfer,
            updated_at: new Date().toISOString()
          };

          console.log('🔄 Updating existing record:', updatedRecord);

          // Update the record
          let updateQuery = supabase
            .from('agent_aggregations')
            .update(updatedRecord)
            .eq('agent_id', update.agent_id)
            .eq('month', update.month);

          if (update.company_id) {
            updateQuery = updateQuery.eq('company_id', update.company_id);
          }

          const { data: updateData, error: updateError } = await updateQuery.select();

          if (updateError) {
            console.error('❌ Update error:', updateError);
            errors.push({ update, error: updateError.message });
          } else {
            console.log('✅ Record updated successfully');
            results.push({ update, action: 'updated', data: updateData });
          }
        }
      } catch (err) {
        console.error('❌ Exception during update:', err);
        errors.push({ update, error: err.message });
      }
    }

    console.log('📈 Update summary:', { successCount: results.length, errorCount: errors.length });

    // Return response
    if (errors.length > 0 && results.length === 0) {
      console.error('❌ All updates failed:', errors);
      return res.status(500).json({
        success: false,
        message: `All ${errors.length} update(s) failed`,
        errors: errors
      });
    }

    console.log('✅ Update completed successfully');
    res.json({
      success: true,
      message: `${results.length} record(s) updated successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      results: results,
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    console.error('❌ Fatal error updating life insurance aggregations:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating',
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

/**
 * GET /aggregate/total
 * Direct calculation of total output from agent_aggregations table
 * This endpoint provides accurate totals without complex frontend transformations
 */
router.get('/total', async (req, res) => {
  try {
    const {
      company_id,
      start_month,
      end_month,
      department,
      inspector,
      agent_name,
      product
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
      .select('id');

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
        total: 0,
        breakdown: {
          pension: 0,
          risk: 0,
          financial: 0,
          pension_transfer: 0
        }
      });
    }

    // Step 2: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 3: Query agent_aggregations and sum directly with pagination
    let allAggregations = [];
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let aggQuery = supabase
        .from('agent_aggregations')
        .select('pension, risk, financial, pension_transfer')
        .in('agent_id', agentIds)
        .in('month', months)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply company filter if specified
      if (company_id && company_id !== 'all') {
        aggQuery = aggQuery.eq('company_id', parseInt(company_id));
      }

      const { data: pageData, error: aggError } = await aggQuery;

      if (aggError) {
        console.error('Error fetching aggregations:', aggError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch aggregations',
          error: aggError.message
        });
      }

      if (pageData && pageData.length > 0) {
        allAggregations = allAggregations.concat(pageData);
        hasMore = pageData.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    const aggregations = allAggregations;

    // Step 4: Calculate totals directly from database
    let totalPension = 0;
    let totalRisk = 0;
    let totalFinancial = 0;
    let totalPensionTransfer = 0;

    (aggregations || []).forEach(agg => {
      totalPension += parseFloat(agg.pension) || 0;
      totalRisk += parseFloat(agg.risk) || 0;
      totalFinancial += parseFloat(agg.financial) || 0;
      totalPensionTransfer += parseFloat(agg.pension_transfer) || 0;
    });

    // Step 5: Calculate total based on product filter
    let total = 0;
    if (!product || product === 'all') {
      total = totalPension + totalRisk + totalFinancial + totalPensionTransfer;
    } else if (product === 'פנסיוני') {
      total = totalPension;
    } else if (product === 'סיכונים') {
      total = totalRisk;
    } else if (product === 'פיננסים') {
      total = totalFinancial;
    } else if (product === 'ניודי פנסיה') {
      total = totalPensionTransfer;
    }

    res.json({
      success: true,
      total: total,
      breakdown: {
        pension: totalPension,
        risk: totalRisk,
        financial: totalFinancial,
        pension_transfer: totalPensionTransfer
      }
    });

  } catch (error) {
    console.error('Error calculating total:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

/**
 * GET /aggregate/companies/life-insurance
 * Get aggregated data by company for life insurance
 */
router.get('/companies/life-insurance', async (req, res) => {
  try {
    const {
      start_month,
      end_month,
      department,
      inspector,
      agent_name,
      product
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

    // Step 1: Get all companies with insurance = true
    const { data: companies, error: companiesError } = await supabase
      .from('company')
      .select('*')
      .eq('insurance', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch companies',
        error: companiesError.message
      });
    }

    if (!companies || companies.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Step 2: Build query for agent_data with filters
    let agentQuery = supabase
      .from('agent_data')
      .select('id')
      .eq('insurance', true);

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
        data: []
      });
    }

    const agentIds = agents.map(a => a.id);

    // Step 3: Aggregate data by company
    const companyTotals = {};

    for (const company of companies) {
      let allAggregations = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let aggQuery = supabase
          .from('agent_aggregations')
          .select('pension, risk, financial, pension_transfer')
          .in('agent_id', agentIds)
          .in('month', months)
          .eq('company_id', company.id)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        const { data: pageData, error: aggError } = await aggQuery;

        if (aggError) {
          console.error('Error fetching aggregations:', aggError);
          continue;
        }

        if (pageData && pageData.length > 0) {
          allAggregations = allAggregations.concat(pageData);
          hasMore = pageData.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Calculate totals for this company
      let totalPension = 0;
      let totalRisk = 0;
      let totalFinancial = 0;
      let totalPensionTransfer = 0;

      allAggregations.forEach(agg => {
        totalPension += parseFloat(agg.pension) || 0;
        totalRisk += parseFloat(agg.risk) || 0;
        totalFinancial += parseFloat(agg.financial) || 0;
        totalPensionTransfer += parseFloat(agg.pension_transfer) || 0;
      });

      // Calculate total based on product filter
      let total = 0;
      if (!product || product === 'all') {
        total = totalPension + totalRisk + totalFinancial + totalPensionTransfer;
      } else if (product === 'פנסיוני') {
        total = totalPension;
      } else if (product === 'סיכונים') {
        total = totalRisk;
      } else if (product === 'פיננסים') {
        total = totalFinancial;
      } else if (product === 'ניודי פנסיה') {
        total = totalPensionTransfer;
      }

      if (total > 0) {
        companyTotals[company.id] = {
          company_id: company.id,
          company_name: company.name,
          company_name_en: company.name_en,
          total: total,
          breakdown: {
            pension: totalPension,
            risk: totalRisk,
            financial: totalFinancial,
            pension_transfer: totalPensionTransfer
          }
        };
      }
    }

    res.json({
      success: true,
      data: Object.values(companyTotals)
    });

  } catch (error) {
    console.error('Error in companies life insurance aggregation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

/**
 * GET /aggregate/companies/elementary
 * Get aggregated data by company for elementary insurance
 */
router.get('/companies/elementary', async (req, res) => {
  try {
    const {
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

    // Step 1: Get all companies with elementary = true
    const { data: companies, error: companiesError } = await supabase
      .from('company')
      .select('*')
      .eq('elementary', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch companies',
        error: companiesError.message
      });
    }

    if (!companies || companies.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Step 2: Build query for agent_data with filters
    let agentQuery = supabase
      .from('agent_data')
      .select('id')
      .eq('elementary', true);

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

    const agentIds = agents.map(a => a.id);

    // Step 3: Aggregate data by company
    const companyTotals = {};

    for (const company of companies) {
      let allAggregations = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let aggQuery = supabase
          .from('agent_aggregations_elementary')
          .select('gross_premium')
          .in('agent_id', agentIds)
          .in('month', months)
          .eq('company_id', company.id)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        const { data: pageData, error: aggError } = await aggQuery;

        if (aggError) {
          console.error('Error fetching aggregations:', aggError);
          continue;
        }

        if (pageData && pageData.length > 0) {
          allAggregations = allAggregations.concat(pageData);
          hasMore = pageData.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Calculate totals for this company
      let total = 0;

      allAggregations.forEach(agg => {
        total += parseFloat(agg.gross_premium) || 0;
      });

      if (total > 0) {
        companyTotals[company.id] = {
          company_id: company.id,
          company_name: company.name,
          company_name_en: company.name_en,
          total: total
        };
      }
    }

    res.json({
      success: true,
      data: Object.values(companyTotals)
    });

  } catch (error) {
    console.error('Error in companies elementary aggregation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

module.exports = router;