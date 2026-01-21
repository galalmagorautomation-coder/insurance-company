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
      agent_name
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
    const PAGE_SIZE = 1000; // Fixed page size for proper pagination
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
        // Sum values if month already exists (agent has multiple company records)
        if (!agentDataMap[agg.agent_id].current_year_months[agg.month]) {
          agentDataMap[agg.agent_id].current_year_months[agg.month] = {
            pension: 0,
            risk: 0,
            financial: 0,
            pension_transfer: 0
          };
        }
        agentDataMap[agg.agent_id].current_year_months[agg.month].pension += monthData.pension;
        agentDataMap[agg.agent_id].current_year_months[agg.month].risk += monthData.risk;
        agentDataMap[agg.agent_id].current_year_months[agg.month].financial += monthData.financial;
        agentDataMap[agg.agent_id].current_year_months[agg.month].pension_transfer += monthData.pension_transfer;
      } else {
        // Sum values if month already exists (agent has multiple company records)
        if (!agentDataMap[agg.agent_id].previous_year_months[agg.month]) {
          agentDataMap[agg.agent_id].previous_year_months[agg.month] = {
            pension: 0,
            risk: 0,
            financial: 0,
            pension_transfer: 0
          };
        }
        agentDataMap[agg.agent_id].previous_year_months[agg.month].pension += monthData.pension;
        agentDataMap[agg.agent_id].previous_year_months[agg.month].risk += monthData.risk;
        agentDataMap[agg.agent_id].previous_year_months[agg.month].financial += monthData.financial;
        agentDataMap[agg.agent_id].previous_year_months[agg.month].pension_transfer += monthData.pension_transfer;
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
      // Filter by agent if specified
      if (agent_name && agent_name !== 'all' && agents.length > 0) {
        const selectedAgent = agents[0]; // Get the filtered agent
        
        // Collect all company-specific agent IDs for this agent
        const agentNumbers = [];
        if (selectedAgent.ayalon_agent_id) agentNumbers.push(selectedAgent.ayalon_agent_id);
        if (selectedAgent.harel_agent_id) agentNumbers.push(selectedAgent.harel_agent_id);
        if (selectedAgent.migdal_agent_id) agentNumbers.push(selectedAgent.migdal_agent_id);
        if (selectedAgent.menorah_agent_id) agentNumbers.push(selectedAgent.menorah_agent_id);
        if (selectedAgent.phoenix_agent_id) agentNumbers.push(selectedAgent.phoenix_agent_id);
        if (selectedAgent.clal_agent_id) agentNumbers.push(selectedAgent.clal_agent_id);
        if (selectedAgent.altshuler_agent_id) agentNumbers.push(selectedAgent.altshuler_agent_id);
        if (selectedAgent.hachshara_agent_id) agentNumbers.push(selectedAgent.hachshara_agent_id);
        if (selectedAgent.mor_agent_id) agentNumbers.push(selectedAgent.mor_agent_id);
        if (selectedAgent.mediho_agent_id) agentNumbers.push(selectedAgent.mediho_agent_id);
        if (selectedAgent.analyst_agent_id) agentNumbers.push(selectedAgent.analyst_agent_id);

        // Only query if agent has at least one company ID, otherwise return 0
        if (agentNumbers.length > 0) {
          let countQuery = supabase
            .from('raw_data')
            .select('*', { count: 'exact', head: true })
            .in('month', currentYearMonths)
            .in('agent_number', agentNumbers)
            .neq('agent_name', 'No Data - Empty File'); // Exclude placeholder rows

          if (company_id && company_id !== 'all') {
            countQuery = countQuery.eq('company_id', parseInt(company_id));
          }

          const { count, error: countError } = await countQuery;

          if (!countError) {
            totalPolicies = count || 0;
          }
        } else {
          // Agent has no company-specific IDs, so 0 policies
          totalPolicies = 0;
        }
      } else {
        // No agent filter - count all policies
        let countQuery = supabase
          .from('raw_data')
          .select('*', { count: 'exact', head: true })
          .in('month', currentYearMonths)
          .neq('agent_name', 'No Data - Empty File'); // Exclude placeholder rows

        if (company_id && company_id !== 'all') {
          countQuery = countQuery.eq('company_id', parseInt(company_id));
        }

        const { count, error: countError } = await countQuery;

        if (!countError) {
          totalPolicies = count || 0;
        }
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
 * Get unique categories from agent_data (for elementary insurance filtering)
 */
router.get('/elementary/departments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agent_data')
      .select('category')
      .not('category', 'is', null)
      .neq('category', '');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }

    // Get unique values
    const uniqueDepartments = [...new Set(data.map(item => item.category))];

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
      department,
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

    // Step 1: Build query for agent_data with filters and pagination
    let allAgents = [];
    const AGENT_PAGE_SIZE = 1000;
    let agentPage = 0;
    let hasMoreAgents = true;

    while (hasMoreAgents) {
      let agentQuery = supabase
        .from('agent_data')
        .select('*')
        .eq('elementary', true)
        .range(agentPage * AGENT_PAGE_SIZE, (agentPage + 1) * AGENT_PAGE_SIZE - 1);

      // Apply filters (but NOT company_id - we'll filter by aggregation data instead)
      if (department && department !== 'all') {
        agentQuery = agentQuery.eq('category', department);
      }
      if (agent_name && agent_name !== 'all') {
        agentQuery = agentQuery.eq('agent_name', agent_name);
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

    // Step 6: Combine with agent data and filter only agents with aggregation data
    // This respects the actual data in agent_aggregations_elementary rather than the elementary flag
    const result = agents
      .filter(agent => agentTotalsMap[agent.id] && (
        agentTotalsMap[agent.id].cumulative_current > 0 || 
        agentTotalsMap[agent.id].cumulative_previous > 0
      ))
      .map(agent => {
        const totals = agentTotalsMap[agent.id];

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
      department,
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

    // Get total policies count from raw_data_elementary
    let totalPolicies = 0;
    try {
      // First, get matching agents based on filters (not filtering by company_id here)
      let agentQuery = supabase
        .from('agent_data')
        .select('*')
        .eq('elementary', true);

      if (department && department !== 'all') {
        agentQuery = agentQuery.eq('category', department);
      }
      if (agent_name && agent_name !== 'all') {
        agentQuery = agentQuery.eq('agent_name', agent_name);
      }

      const { data: matchingAgents, error: agentsError } = await agentQuery;

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch agents',
          error: agentsError.message
        });
      }

      if (!matchingAgents || matchingAgents.length === 0) {
        return res.json({
          success: true,
          data: {
            totalPolicies: 0
          }
        });
      }

      // Filter by agent if specified
      if (agent_name && agent_name !== 'all') {
        const selectedAgent = matchingAgents[0]; // Get the filtered agent

        // Collect all company-specific elementary agent IDs for this agent
        const agentNumbers = [];
        if (selectedAgent.elementary_id_ayalon) agentNumbers.push(selectedAgent.elementary_id_ayalon);
        if (selectedAgent.elementary_id_hachshara) agentNumbers.push(selectedAgent.elementary_id_hachshara);
        if (selectedAgent.elementary_id_harel) agentNumbers.push(selectedAgent.elementary_id_harel);
        if (selectedAgent.elementary_id_clal) agentNumbers.push(selectedAgent.elementary_id_clal);
        if (selectedAgent.elementary_id_migdal) agentNumbers.push(selectedAgent.elementary_id_migdal);
        if (selectedAgent.elementary_id_menorah) agentNumbers.push(selectedAgent.elementary_id_menorah);
        if (selectedAgent.elementary_id_phoenix) agentNumbers.push(selectedAgent.elementary_id_phoenix);
        if (selectedAgent.elementary_id_shomera) agentNumbers.push(selectedAgent.elementary_id_shomera);
        if (selectedAgent.elementary_id_shlomo) agentNumbers.push(selectedAgent.elementary_id_shlomo);
        if (selectedAgent.elementary_id_shirbit) agentNumbers.push(selectedAgent.elementary_id_shirbit);
        if (selectedAgent.elementary_id_haklai) agentNumbers.push(selectedAgent.elementary_id_haklai);
        if (selectedAgent.elementary_id_mms) agentNumbers.push(selectedAgent.elementary_id_mms);
        if (selectedAgent.elementary_id_kash) agentNumbers.push(selectedAgent.elementary_id_kash);
        if (selectedAgent.elementary_id_passport) agentNumbers.push(selectedAgent.elementary_id_passport);
        if (selectedAgent.elementary_id_cooper_ninova) agentNumbers.push(selectedAgent.elementary_id_cooper_ninova);
        if (selectedAgent.elementary_id_securities) agentNumbers.push(selectedAgent.elementary_id_securities);

        // Only query if agent has at least one company ID, otherwise return 0
        if (agentNumbers.length > 0) {
          let countQuery = supabase
            .from('raw_data_elementary')
            .select('*', { count: 'exact', head: true })
            .in('month', months)
            .in('agent_number', agentNumbers)
            .or('agent_name.is.null,agent_name.neq.No Data - Empty File'); // Include NULL and exclude placeholder rows

          if (company_id && company_id !== 'all') {
            countQuery = countQuery.eq('company_id', parseInt(company_id));
          }

          const { count, error: countError } = await countQuery;

          if (!countError) {
            totalPolicies = count || 0;
          }
        } else {
          // Agent has no company-specific IDs, so 0 policies
          totalPolicies = 0;
        }
      } else {
        // No agent filter - need to get agent numbers for department filter if applied
        if (department && department !== 'all') {
          // Collect all agent numbers from matching agents
          const agentNumbers = [];
          matchingAgents.forEach(agent => {
            if (agent.elementary_id_ayalon) agentNumbers.push(agent.elementary_id_ayalon);
            if (agent.elementary_id_hachshara) agentNumbers.push(agent.elementary_id_hachshara);
            if (agent.elementary_id_harel) agentNumbers.push(agent.elementary_id_harel);
            if (agent.elementary_id_clal) agentNumbers.push(agent.elementary_id_clal);
            if (agent.elementary_id_migdal) agentNumbers.push(agent.elementary_id_migdal);
            if (agent.elementary_id_menorah) agentNumbers.push(agent.elementary_id_menorah);
            if (agent.elementary_id_phoenix) agentNumbers.push(agent.elementary_id_phoenix);
            if (agent.elementary_id_shomera) agentNumbers.push(agent.elementary_id_shomera);
            if (agent.elementary_id_shlomo) agentNumbers.push(agent.elementary_id_shlomo);
            if (agent.elementary_id_shirbit) agentNumbers.push(agent.elementary_id_shirbit);
            if (agent.elementary_id_haklai) agentNumbers.push(agent.elementary_id_haklai);
            if (agent.elementary_id_mms) agentNumbers.push(agent.elementary_id_mms);
            if (agent.elementary_id_kash) agentNumbers.push(agent.elementary_id_kash);
            if (agent.elementary_id_passport) agentNumbers.push(agent.elementary_id_passport);
            if (agent.elementary_id_cooper_ninova) agentNumbers.push(agent.elementary_id_cooper_ninova);
            if (agent.elementary_id_securities) agentNumbers.push(agent.elementary_id_securities);
          });

          if (agentNumbers.length > 0) {
            let countQuery = supabase
              .from('raw_data_elementary')
              .select('*', { count: 'exact', head: true })
              .in('month', months)
              .in('agent_number', agentNumbers)
              .or('agent_name.is.null,agent_name.neq.No Data - Empty File'); // Include NULL and exclude placeholder rows

            if (company_id && company_id !== 'all') {
              countQuery = countQuery.eq('company_id', parseInt(company_id));
            }

            const { count, error: countError } = await countQuery;

            if (!countError) {
              totalPolicies = count || 0;
            }
          } else {
            totalPolicies = 0;
          }
        } else {
          // No department or agent filter - count all policies
          let countQuery = supabase
            .from('raw_data_elementary')
            .select('*', { count: 'exact', head: true })
            .in('month', months)
            .or('agent_name.is.null,agent_name.neq.No Data - Empty File'); // Include NULL and exclude placeholder rows

          if (company_id && company_id !== 'all') {
            countQuery = countQuery.eq('company_id', parseInt(company_id));
          }

          const { count, error: countError } = await countQuery;

          if (!countError) {
            totalPolicies = count || 0;
          }
        }
      }
    } catch (countErr) {
      console.error('Error counting policies:', countErr);
    }

    res.json({
      success: true,
      data: {
        totalPolicies: totalPolicies
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

    console.log(' Received life insurance update request:', JSON.stringify(updates, null, 2));

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
        console.error(' Invalid update:', update);
        return res.status(400).json({
          success: false,
          message: 'Invalid update: agent_id, month, product, and value are required'
        });
      }

      if (!['pension', 'risk', 'financial', 'pension_transfer'].includes(update.product)) {
        console.error(' Invalid product:', update.product);
        return res.status(400).json({
          success: false,
          message: 'Invalid product: must be pension, risk, financial, or pension_transfer'
        });
      }

      // Validate value is a number
      if (typeof update.value !== 'number' || isNaN(update.value)) {
        console.error(' Invalid value:', update.value);
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
          console.error(' Fetch error:', fetchError);
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
            console.error(' Insert error:', insertError);
            errors.push({ update, error: insertError.message });
          } else {
            console.log(' Record created successfully');
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
            console.error(' Update error:', updateError);
            errors.push({ update, error: updateError.message });
          } else {
            console.log(' Record updated successfully');
            results.push({ update, action: 'updated', data: updateData });
          }
        }
      } catch (err) {
        console.error(' Exception during update:', err);
        errors.push({ update, error: err.message });
      }
    }

    console.log('📈 Update summary:', { successCount: results.length, errorCount: errors.length });

    // Return response
    if (errors.length > 0 && results.length === 0) {
      console.error(' All updates failed:', errors);
      return res.status(500).json({
        success: false,
        message: `All ${errors.length} update(s) failed`,
        errors: errors
      });
    }

    console.log(' Update completed successfully');
    res.json({
      success: true,
      message: `${results.length} record(s) updated successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      results: results,
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    console.error(' Fatal error updating life insurance aggregations:', error);
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
    } else if (product === 'פנסיוני' || product === 'פנסיה') {
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
      } else if (product === 'פנסיוני' || product === 'פנסיה') {
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
      department,
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
      agentQuery = agentQuery.eq('category', department);
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

/**
 * GET /aggregate/agent-company-sales
 * Get life insurance sales for a specific agent broken down by company
 */
router.get('/agent-company-sales', async (req, res) => {
  try {
    const { start_month, end_month, agent_id } = req.query;

    // Validate required parameters
    if (!start_month || !end_month || !agent_id) {
      return res.status(400).json({
        success: false,
        message: 'start_month, end_month, and agent_id are required'
      });
    }

    // Step 1: Get all months in the range
    const [startYear, startMonthNum] = start_month.split('-');
    const [endYear, endMonthNum] = end_month.split('-');
    
    const months = [];
    const startMonthIndex = parseInt(startMonthNum);
    const endMonthIndex = parseInt(endMonthNum);
    
    for (let i = startMonthIndex; i <= endMonthIndex; i++) {
      months.push(`${startYear}-${String(i).padStart(2, '0')}`);
    }

    // Step 2: Fetch aggregations for the agent
    const { data: aggregations, error: aggregationsError } = await supabase
      .from('agent_aggregations')
      .select('*')
      .eq('agent_id', agent_id)
      .in('month', months);

    if (aggregationsError) {
      console.error('Error fetching agent aggregations:', aggregationsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agent sales data',
        error: aggregationsError.message
      });
    }

    console.log(`Agent ${agent_id} - Found ${aggregations?.length || 0} aggregation records for months:`, months);

    if (!aggregations || aggregations.length === 0) {
      console.log(`No aggregations found for agent ${agent_id} in months ${months.join(', ')}`);
      return res.json({
        success: true,
        data: []
      });
    }

    // Step 3: Get unique company IDs and fetch company details
    const companyIds = [...new Set(aggregations.map(agg => agg.company_id))];
    
    console.log(`Agent ${agent_id} - Fetching details for companies:`, companyIds);
    
    const { data: companies, error: companiesError } = await supabase
      .from('company')
      .select('id, name, name_en, insurance')
      .in('id', companyIds)
      .eq('insurance', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch company data',
        error: companiesError.message
      });
    }

    console.log(`Agent ${agent_id} - Found ${companies?.length || 0} life insurance companies`);

    // Create a map of company ID to company details
    const companyMap = {};
    companies.forEach(company => {
      companyMap[company.id] = company;
    });

    // Step 4: Group by company and sum up the sales
    const companyTotals = {};

    aggregations.forEach((agg, index) => {
      const companyId = agg.company_id;
      const company = companyMap[companyId];
      
      // Log first aggregation to see structure
      if (index === 0) {
        console.log(`Agent ${agent_id} - Sample aggregation data:`, {
          company_id: agg.company_id,
          pension: agg.pension,
          pension_income: agg.pension_income,
          risk: agg.risk,
          risk_income: agg.risk_income,
          financial: agg.financial,
          financial_income: agg.financial_income,
          pension_transfer: agg.pension_transfer,
          pension_transfer_income: agg.pension_transfer_income,
          total_income: agg.total_income
        });
      }
      
      if (!company) {
        console.log(`Skipping aggregation for company ${companyId} - not found in company map or not a life insurance company`);
        return; // Skip if company not found or not a life insurance company
      }
      
      if (!companyTotals[companyId]) {
        companyTotals[companyId] = {
          company_id: companyId,
          company_name: company.name,
          company_name_en: company.name_en,
          pension: 0,
          risk: 0,
          financial: 0,
          pension_transfer: 0,
          total_income: 0
        };
      }

      // Sum up all product types - try both column name formats
      const pensionValue = agg.pension_income || agg.pension || 0;
      const riskValue = agg.risk_income || agg.risk || 0;
      const financialValue = agg.financial_income || agg.financial || 0;
      const pensionTransferValue = agg.pension_transfer_income || agg.pension_transfer || 0;
      
      companyTotals[companyId].pension += pensionValue;
      companyTotals[companyId].risk += riskValue;
      companyTotals[companyId].financial += financialValue;
      companyTotals[companyId].pension_transfer += pensionTransferValue;
      companyTotals[companyId].total_income += 
        pensionValue + riskValue + financialValue + pensionTransferValue;
    });

    // Convert to array - keep all companies, even with negative or zero sales
    const result = Object.values(companyTotals)
      .sort((a, b) => b.total_income - a.total_income);

    console.log(`Agent ${agent_id} - Returning ${result.length} companies with sales data`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in agent-company-sales:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

/**
 * GET /aggregate/elementary/agent-company-sales
 * Get elementary insurance sales for a specific agent broken down by company
 */
router.get('/elementary/agent-company-sales', async (req, res) => {
  try {
    const { start_month, end_month, agent_id } = req.query;

    // Validate required parameters
    if (!start_month || !end_month || !agent_id) {
      return res.status(400).json({
        success: false,
        message: 'start_month, end_month, and agent_id are required'
      });
    }

    // Step 1: Get all months in the range
    const months = getMonthsInRange(start_month, end_month);

    // Step 2: Fetch aggregations for the agent
    const { data: aggregations, error: aggregationsError } = await supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .eq('agent_id', agent_id)
      .in('month', months);

    if (aggregationsError) {
      console.error('Error fetching elementary agent aggregations:', aggregationsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agent sales data',
        error: aggregationsError.message
      });
    }

    console.log(`Elementary Agent ${agent_id} - Found ${aggregations?.length || 0} aggregation records for months:`, months);

    if (!aggregations || aggregations.length === 0) {
      console.log(`No elementary aggregations found for agent ${agent_id} in months ${months.join(', ')}`);
      return res.json({
        success: true,
        data: []
      });
    }

    // Step 3: Get unique company IDs and fetch company details
    const companyIds = [...new Set(aggregations.map(agg => agg.company_id))];

    console.log(`Elementary Agent ${agent_id} - Fetching details for companies:`, companyIds);

    const { data: companies, error: companiesError } = await supabase
      .from('company')
      .select('id, name, name_en, elementary')
      .in('id', companyIds)
      .eq('elementary', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch company data',
        error: companiesError.message
      });
    }

    console.log(`Elementary Agent ${agent_id} - Found ${companies?.length || 0} elementary companies`);

    // Create a map of company ID to company details
    const companyMap = {};
    companies.forEach(company => {
      companyMap[company.id] = company;
    });

    // Step 4: Group by company and sum up the sales
    const companyTotals = {};

    aggregations.forEach((agg) => {
      const companyId = agg.company_id;
      const company = companyMap[companyId];

      if (!company) {
        console.log(`Skipping aggregation for company ${companyId} - not found in company map or not an elementary company`);
        return; // Skip if company not found or not an elementary company
      }

      if (!companyTotals[companyId]) {
        companyTotals[companyId] = {
          company_id: companyId,
          company_name: company.name,
          company_name_en: company.name_en,
          gross_premium: 0
        };
      }

      // Sum up gross premium
      companyTotals[companyId].gross_premium += parseFloat(agg.gross_premium) || 0;
    });

    // Convert to array - keep all companies, even with negative or zero sales
    const result = Object.values(companyTotals)
      .sort((a, b) => b.gross_premium - a.gross_premium);

    console.log(`Elementary Agent ${agent_id} - Returning ${result.length} companies with sales data`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in elementary agent-company-sales:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

module.exports = router;