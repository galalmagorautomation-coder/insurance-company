/**
 * Template-Based Export Routes
 * Generates sophisticated Excel reports with multiple sheets and complex formatting
 */

const express = require('express');
const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * POST /export/template/life-insurance
 * Export Life Insurance data using the comprehensive template
 */
router.post('/life-insurance', async (req, res) => {
  try {
    const {
      startMonth,
      endMonth,
      company,
      department,
      inspector,
      agent
    } = req.body;

    // Validate required parameters
    if (!startMonth || !endMonth) {
      return res.status(400).json({
        success: false,
        message: 'startMonth and endMonth are required'
      });
    }

    // Step 1: Fetch all data needed for the template
    const templateData = await fetchTemplateData({
      startMonth,
      endMonth,
      company,
      department,
      inspector,
      agent
    });

    // Step 2: Generate Excel workbook with 3 sheets
    const workbook = await generateTemplateWorkbook(templateData);

    // Step 3: Send file
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `sales_report_${startMonth}_${endMonth}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export template',
      error: error.message
    });
  }
});

/**
 * Fetch all data needed for the template
 */
async function fetchTemplateData({ startMonth, endMonth, company, department, inspector, agent }) {
  // Parse dates
  const [startYear, startMonthNum] = startMonth.split('-');
  const [endYear, endMonthNum] = endMonth.split('-');
  const currentYear = parseInt(startYear);
  const previousYear = currentYear - 1;

  // Generate month arrays
  const currentYearMonths = [];
  for (let i = parseInt(startMonthNum); i <= parseInt(endMonthNum); i++) {
    currentYearMonths.push(`${currentYear}-${String(i).padStart(2, '0')}`);
  }

  const previousYearMonths = [];
  for (let i = parseInt(startMonthNum); i <= parseInt(endMonthNum); i++) {
    previousYearMonths.push(`${previousYear}-${String(i).padStart(2, '0')}`);
  }

  const lastMonth = currentYearMonths[currentYearMonths.length - 1];

  // Step 1: Fetch agents with filters
  let agentQuery = supabase
    .from('agent_data')
    .select('*')
    .eq('insurance', true);

  if (company && company !== 'all') {
    agentQuery = agentQuery.contains('company_id', [parseInt(company)]);
  }
  if (department && department !== 'all') {
    agentQuery = agentQuery.eq('department', department);
  }
  if (inspector && inspector !== 'all') {
    agentQuery = agentQuery.eq('inspector', inspector);
  }
  if (agent && agent !== 'all') {
    agentQuery = agentQuery.eq('agent_name', agent);
  }

  const { data: agents, error: agentsError } = await agentQuery;

  if (agentsError) {
    throw new Error(`Failed to fetch agents: ${agentsError.message}`);
  }

  if (!agents || agents.length === 0) {
    throw new Error('No agents found matching the criteria');
  }

  const agentIds = agents.map(a => a.id);

  // Pagination settings
  const PAGE_SIZE = 1000;

  let allCurrentYearData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let currentYearQuery = supabase
      .from('agent_aggregations')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Apply company filter if specified
    if (company && company !== 'all') {
      currentYearQuery = currentYearQuery.eq('company_id', parseInt(company));
    }

    const { data: pageData, error: currentError } = await currentYearQuery;

    if (currentError) {
      console.error(`❌ [EXPORT DEBUG] Error fetching page ${page}:`, currentError);
      throw new Error(`Failed to fetch current year data (page ${page}): ${currentError.message}`);
    }

    if (pageData && pageData.length > 0) {
      allCurrentYearData = allCurrentYearData.concat(pageData);
      console.log(`📊 [EXPORT DEBUG] Fetched page ${page}: ${pageData.length} records`);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  const currentYearData = allCurrentYearData;

  // Step 3: Fetch previous year aggregations WITH PAGINATION
  const prevStartMonth = `${previousYear}-${String(startMonthNum).padStart(2, '0')}`;
  const prevEndMonth = `${previousYear}-${String(endMonthNum).padStart(2, '0')}`;

  let allPreviousYearData = [];
  page = 0;
  hasMore = true;

  while (hasMore) {
    let previousYearQuery = supabase
      .from('agent_aggregations')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', prevStartMonth)
      .lte('month', prevEndMonth)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Apply company filter if specified
    if (company && company !== 'all') {
      previousYearQuery = previousYearQuery.eq('company_id', parseInt(company));
    }

    const { data: pageData, error: previousError } = await previousYearQuery;

    if (previousError) {
      console.error(`❌ [EXPORT DEBUG] Error fetching previous year page ${page}:`, previousError);
      throw new Error(`Failed to fetch previous year data (page ${page}): ${previousError.message}`);
    }

    if (pageData && pageData.length > 0) {
      allPreviousYearData = allPreviousYearData.concat(pageData);
      console.log(`📊 [EXPORT DEBUG] Fetched previous year page ${page}: ${pageData.length} records`);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  const previousYearData = allPreviousYearData;

  // Step 4: Fetch targets WITH PAGINATION
  let allTargetsData = [];
  page = 0;
  hasMore = true;

  while (hasMore) {
    const { data: pageData, error: targetsError } = await supabase
      .from('targets')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (targetsError) {
      console.warn(`⚠️ [EXPORT DEBUG] Failed to fetch targets page ${page}:`, targetsError.message);
      break; // Don't fail the entire export if targets fail
    }

    if (pageData && pageData.length > 0) {
      allTargetsData = allTargetsData.concat(pageData);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  const targetsData = allTargetsData;

  // Step 5: Fetch companies
  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('*');

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`);
  }

  // Step 6: Fetch target_percentages
  const { data: targetPercentagesData, error: targetPercentagesError } = await supabase
    .from('target_percentages')
    .select('*');

  if (targetPercentagesError) {
    console.error('❌ [EXPORT DEBUG] Error fetching target_percentages:', targetPercentagesError);
  } else {
    console.log(`📊 [EXPORT DEBUG] Loaded ${targetPercentagesData?.length || 0} target_percentages records`);
  }

  // Step 7: Fetch agent_yearly_goals
  const { data: agentYearlyGoalsData, error: agentYearlyGoalsError } = await supabase
    .from('agent_yearly_goals')
    .select('*');

  if (agentYearlyGoalsError) {
    console.error('❌ [EXPORT DEBUG] Error fetching agent_yearly_goals:', agentYearlyGoalsError);
  } else {
    console.log(`📊 [EXPORT DEBUG] Loaded ${agentYearlyGoalsData?.length || 0} agent_yearly_goals records`);
  }

  // Build lookup maps
  const companyMap = {};
  (companiesData || []).forEach(c => {
    companyMap[c.id] = c.name;
  });

  const agentMap = {};
  agents.forEach(a => {
    agentMap[a.id] = {
      name: a.agent_name,
      department: a.department,
      inspector: a.inspector,
      companyIds: a.company_id || []
    };
  });

  // Process and aggregate data
  const aggregatedData = aggregateTemplateData({
    agents,
    currentYearData: currentYearData || [],
    previousYearData: previousYearData || [],
    targetsData: targetsData || [],
    targetPercentagesData: targetPercentagesData || [],
    agentYearlyGoalsData: agentYearlyGoalsData || [],
    companyMap,
    agentMap,
    currentYearMonths,
    previousYearMonths,
    lastMonth,
    startMonth,
    endMonth
  });

  return {
    filters: {
      dateRange: `${startMonth} - ${endMonth}`,
      company: company === 'all' ? 'All Companies' : companyMap[parseInt(company)] || company,
      department: department === 'all' ? 'All Departments' : department,
      agent: agent === 'all' ? 'All Agents' : agent,
      inspector: inspector === 'all' ? 'All Inspectors' : inspector
    },
    ...aggregatedData
  };
}

/**
 * Aggregate data for template
 */
function aggregateTemplateData({
  agents,
  currentYearData,
  previousYearData,
  targetsData,
  targetPercentagesData,
  agentYearlyGoalsData,
  companyMap,
  agentMap,
  currentYearMonths,
  previousYearMonths,
  lastMonth,
  startMonth,
  endMonth
}) {
  // Initialize aggregation structures
  const companiesAgg = {};
  const departmentsAgg = {};
  const inspectorsAgg = {};
  const agentsAgg = {};

  // Helper function to sum values
  const sumValues = (data) => {
    return {
      pension: data.reduce((sum, d) => sum + (parseFloat(d.pension) || 0), 0),
      risk: data.reduce((sum, d) => sum + (parseFloat(d.risk) || 0), 0),
      finance: data.reduce((sum, d) => sum + (parseFloat(d.financial) || 0), 0),
      pensionTransfer: data.reduce((sum, d) => sum + (parseFloat(d.pension_transfer) || 0), 0)
    };
  };

  // Build target_percentages lookup map by year and month
  const targetPercentagesMap = {};
  (targetPercentagesData || []).forEach(tp => {
    const key = `${tp.year}-${String(tp.month).padStart(2, '0')}`;
    targetPercentagesMap[key] = {
      pension: tp.pension_monthly || 0,
      risk: tp.risk_monthly || 0,
      financial: tp.financial_monthly || 0,
      pensionTransfer: tp.pension_transfer_monthly || 0
    };
  });

  // Build agent_yearly_goals lookup map by agent_id and year
  const agentYearlyGoalsMap = {};
  (agentYearlyGoalsData || []).forEach(goal => {
    const key = `${goal.agent_id}-${goal.year}`;
    agentYearlyGoalsMap[key] = {
      pension: goal.pension_goal || 0,
      risk: goal.risk_goal || 0,
      financial: goal.financial_goal || 0,
      pensionTransfer: goal.pension_transfer_goal || 0
    };
  });

  // Calculate targets for agents based on date range
  const calculateAgentTargets = (agentId, year, isMonthly) => {
    const goalKey = `${agentId}-${year}`;
    const yearlyGoals = agentYearlyGoalsMap[goalKey];

    if (!yearlyGoals) {
      return { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
    }

    if (isMonthly) {
      // Monthly Target = Annual Goal × (Last Month Percentage ÷ 100)
      const lastMonthPercentages = targetPercentagesMap[lastMonth];
      if (!lastMonthPercentages) {
        return { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
      }

      return {
        pension: yearlyGoals.pension * (lastMonthPercentages.pension / 100),
        risk: yearlyGoals.risk * (lastMonthPercentages.risk / 100),
        finance: yearlyGoals.financial * (lastMonthPercentages.financial / 100),
        pensionTransfer: yearlyGoals.pensionTransfer * (lastMonthPercentages.pensionTransfer / 100)
      };
    } else {
      // Cumulative Target = Annual Goal × (Sum of Monthly Percentages ÷ 100)
      const [startYear, startMonthNum] = startMonth.split('-');
      const [endYear, endMonthNum] = endMonth.split('-');

      let cumulativePercentages = { pension: 0, risk: 0, financial: 0, pensionTransfer: 0 };

      for (let i = parseInt(startMonthNum); i <= parseInt(endMonthNum); i++) {
        const monthKey = `${year}-${String(i).padStart(2, '0')}`;
        const monthPercentages = targetPercentagesMap[monthKey];

        if (monthPercentages) {
          cumulativePercentages.pension += monthPercentages.pension;
          cumulativePercentages.risk += monthPercentages.risk;
          cumulativePercentages.financial += monthPercentages.financial;
          cumulativePercentages.pensionTransfer += monthPercentages.pensionTransfer;
        }
      }

      return {
        pension: yearlyGoals.pension * (cumulativePercentages.pension / 100),
        risk: yearlyGoals.risk * (cumulativePercentages.risk / 100),
        finance: yearlyGoals.financial * (cumulativePercentages.financial / 100),
        pensionTransfer: yearlyGoals.pensionTransfer * (cumulativePercentages.pensionTransfer / 100)
      };
    }
  };


  // Process current year data
  let skippedRecords = 0;
  let skippedReasons = { noAgent: 0, unknownCompany: 0 };

  currentYearData.forEach(record => {
    const agent = agentMap[record.agent_id];
    if (!agent) {
      skippedRecords++;
      skippedReasons.noAgent++;
      console.warn(`⚠️ [EXPORT DEBUG] Skipping record - agent_id ${record.agent_id} not found in agentMap`);
      return;
    }

    const companyName = companyMap[record.company_id] || 'Unknown';
    if (companyName === 'Unknown') {
      skippedReasons.unknownCompany++;
      console.warn(`⚠️ [EXPORT DEBUG] Unknown company_id ${record.company_id} for agent ${agent.name}`);
    }

    const dept = agent.department || 'Unknown';
    const insp = agent.inspector || 'Unknown';

    // Initialize if needed
    if (!companiesAgg[companyName]) {
      companiesAgg[companyName] = { cumulative: [], monthly: [] };
    }
    if (!departmentsAgg[dept]) {
      departmentsAgg[dept] = { cumulative: [], monthly: [] };
    }
    if (!inspectorsAgg[insp]) {
      inspectorsAgg[insp] = { cumulative: [], monthly: [] };
    }
    if (!agentsAgg[agent.name]) {
      agentsAgg[agent.name] = { cumulative: [], monthly: [], agentData: agent };
    }

    // Add to cumulative
    companiesAgg[companyName].cumulative.push(record);
    departmentsAgg[dept].cumulative.push(record);
    inspectorsAgg[insp].cumulative.push(record);
    agentsAgg[agent.name].cumulative.push(record);

    // Add to monthly only if last month in the selected range
    if (record.month === lastMonth) {
      companiesAgg[companyName].monthly.push(record);
      departmentsAgg[dept].monthly.push(record);
      inspectorsAgg[insp].monthly.push(record);
      agentsAgg[agent.name].monthly.push(record);
    }
  });


  // Process previous year data
  const previousYearAgg = {
    companies: {},
    departments: {},
    inspectors: {},
    agents: {}
  };

  previousYearData.forEach(record => {
    const agent = agentMap[record.agent_id];
    if (!agent) return;

    const companyName = companyMap[record.company_id] || 'Unknown';
    const dept = agent.department || 'Unknown';
    const insp = agent.inspector || 'Unknown';

    if (!previousYearAgg.companies[companyName]) {
      previousYearAgg.companies[companyName] = [];
    }
    if (!previousYearAgg.departments[dept]) {
      previousYearAgg.departments[dept] = [];
    }
    if (!previousYearAgg.inspectors[insp]) {
      previousYearAgg.inspectors[insp] = [];
    }
    if (!previousYearAgg.agents[agent.name]) {
      previousYearAgg.agents[agent.name] = [];
    }

    previousYearAgg.companies[companyName].push(record);
    previousYearAgg.departments[dept].push(record);
    previousYearAgg.inspectors[insp].push(record);
    previousYearAgg.agents[agent.name].push(record);
  });

  // Process targets
  const targetsAgg = {
    departments: {},
    inspectors: {},
    agents: {}
  };

  targetsData.forEach(target => {
    const agent = agentMap[target.agent_id];
    if (!agent) return;

    const dept = agent.department || 'Unknown';
    const insp = agent.inspector || 'Unknown';

    if (!targetsAgg.departments[dept]) {
      targetsAgg.departments[dept] = [];
    }
    if (!targetsAgg.inspectors[insp]) {
      targetsAgg.inspectors[insp] = [];
    }
    if (!targetsAgg.agents[agent.name]) {
      targetsAgg.agents[agent.name] = [];
    }

    targetsAgg.departments[dept].push(target);
    targetsAgg.inspectors[insp].push(target);
    targetsAgg.agents[agent.name].push(target);
  });

  // Build final output structures
  const companies = Object.keys(companiesAgg).map(name => {
    const cumulative = sumValues(companiesAgg[name].cumulative);
    const monthly = sumValues(companiesAgg[name].monthly);
    const lastYear = previousYearAgg.companies[name] ? sumValues(previousYearAgg.companies[name]) : null;

    // Roll up targets from all agents in this company
    const [year] = startMonth.split('-');
    let monthlyTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
    let cumulativeTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };

    // Find company ID for this company name
    const companyId = Object.keys(companyMap).find(id => companyMap[id] === name);

    if (companyId) {
      agents.forEach(agent => {
        // Check if agent belongs to this company
        if (agent.company_id && agent.company_id.includes(parseInt(companyId))) {
          const agentMonthlyTargets = calculateAgentTargets(agent.id, parseInt(year), true);
          const agentCumulativeTargets = calculateAgentTargets(agent.id, parseInt(year), false);

          monthlyTargets.pension += agentMonthlyTargets.pension;
          monthlyTargets.risk += agentMonthlyTargets.risk;
          monthlyTargets.finance += agentMonthlyTargets.finance;
          monthlyTargets.pensionTransfer += agentMonthlyTargets.pensionTransfer;

          cumulativeTargets.pension += agentCumulativeTargets.pension;
          cumulativeTargets.risk += agentCumulativeTargets.risk;
          cumulativeTargets.finance += agentCumulativeTargets.finance;
          cumulativeTargets.pensionTransfer += agentCumulativeTargets.pensionTransfer;
        }
      });
    }

    // Debug loggin

    return {
      name,
      cumulative,
      monthly,
      targets: cumulativeTargets,
      monthlyTargets: monthlyTargets,
      achievement: calculateAchievement(cumulative, cumulativeTargets),
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  // Calculate and log grand total
  let grandTotalPension = 0, grandTotalRisk = 0, grandTotalFinance = 0, grandTotalPensionTransfer = 0;
  companies.forEach(company => {
    grandTotalPension += company.cumulative.pension;
    grandTotalRisk += company.cumulative.risk;
    grandTotalFinance += company.cumulative.finance;
    grandTotalPensionTransfer += company.cumulative.pensionTransfer;
  });
  const grandTotal = grandTotalPension + grandTotalRisk + grandTotalFinance + grandTotalPensionTransfer;

  const departments = Object.keys(departmentsAgg).map(name => {
    const cumulative = sumValues(departmentsAgg[name].cumulative);
    const monthly = sumValues(departmentsAgg[name].monthly);
    const lastYear = previousYearAgg.departments[name] ? sumValues(previousYearAgg.departments[name]) : null;

    // Roll up targets from all agents in this department
    const [year] = startMonth.split('-');
    let monthlyTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
    let cumulativeTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };

    agents.forEach(agent => {
      if ((agent.department || 'Unknown') === name) {
        const agentMonthlyTargets = calculateAgentTargets(agent.id, parseInt(year), true);
        const agentCumulativeTargets = calculateAgentTargets(agent.id, parseInt(year), false);

        monthlyTargets.pension += agentMonthlyTargets.pension;
        monthlyTargets.risk += agentMonthlyTargets.risk;
        monthlyTargets.finance += agentMonthlyTargets.finance;
        monthlyTargets.pensionTransfer += agentMonthlyTargets.pensionTransfer;

        cumulativeTargets.pension += agentCumulativeTargets.pension;
        cumulativeTargets.risk += agentCumulativeTargets.risk;
        cumulativeTargets.finance += agentCumulativeTargets.finance;
        cumulativeTargets.pensionTransfer += agentCumulativeTargets.pensionTransfer;
      }
    });

    return {
      name,
      cumulative,
      monthly,
      targets: cumulativeTargets,
      monthlyTargets: monthlyTargets,
      achievement: calculateAchievement(cumulative, cumulativeTargets),
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  const inspectors = Object.keys(inspectorsAgg).map(name => {
    const cumulative = sumValues(inspectorsAgg[name].cumulative);
    const monthly = sumValues(inspectorsAgg[name].monthly);
    const lastYear = previousYearAgg.inspectors[name] ? sumValues(previousYearAgg.inspectors[name]) : null;

    // Roll up targets from all agents under this inspector
    const [year] = startMonth.split('-');
    let monthlyTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
    let cumulativeTargets = { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };

    agents.forEach(agent => {
      const agentInspector = agent.inspector || 'Unknown';

      if (agentInspector === name) {
        const agentMonthlyTargets = calculateAgentTargets(agent.id, parseInt(year), true);
        const agentCumulativeTargets = calculateAgentTargets(agent.id, parseInt(year), false);

        monthlyTargets.pension += agentMonthlyTargets.pension;
        monthlyTargets.risk += agentMonthlyTargets.risk;
        monthlyTargets.finance += agentMonthlyTargets.finance;
        monthlyTargets.pensionTransfer += agentMonthlyTargets.pensionTransfer;

        cumulativeTargets.pension += agentCumulativeTargets.pension;
        cumulativeTargets.risk += agentCumulativeTargets.risk;
        cumulativeTargets.finance += agentCumulativeTargets.finance;
        cumulativeTargets.pensionTransfer += agentCumulativeTargets.pensionTransfer;
      }
    });

    return {
      name,
      cumulative,
      monthly,
      targets: cumulativeTargets,
      monthlyTargets: monthlyTargets,
      achievement: calculateAchievement(cumulative, cumulativeTargets),
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  // Include ALL agents, even those with zero sales
  const agentsArray = agents.map(agent => {
    const name = agent.agent_name;
    const hasData = agentsAgg[name];

    // If agent has data, use it; otherwise use zeros
    const cumulative = hasData ? sumValues(agentsAgg[name].cumulative) : { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };
    const monthly = hasData ? sumValues(agentsAgg[name].monthly) : { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 };

    // Calculate targets based on target_percentages and agent_yearly_goals
    const [year] = startMonth.split('-');
    const monthlyTargets = calculateAgentTargets(agent.id, parseInt(year), true);
    const cumulativeTargets = calculateAgentTargets(agent.id, parseInt(year), false);

    // Last year cumulative (all months in the selected range)
    const lastYearCumulative = previousYearAgg.agents[name] ? sumValues(previousYearAgg.agents[name]) : null;

    // Last year monthly (only the equivalent month from last year)
    const prevLastMonth = `${parseInt(year) - 1}-${lastMonth.split('-')[1]}`;
    const lastYearMonthly = previousYearAgg.agents[name]
      ? sumValues(previousYearAgg.agents[name].filter(r => r.month === prevLastMonth))
      : null;

    return {
      name,
      agentId: agent.id, // Add agent ID for debugging
      monthly: {
        sales: monthly,
        targets: monthlyTargets,
        achievement: calculateAchievement(monthly, monthlyTargets),
        lastYear: lastYearMonthly || { pension: null, risk: null, finance: null, pensionTransfer: null },
        change: calculateChangePercent(monthly, lastYearMonthly)
      },
      cumulative: {
        sales: cumulative,
        targets: cumulativeTargets,
        achievement: calculateAchievement(cumulative, cumulativeTargets),
        lastYear: lastYearCumulative || { pension: null, risk: null, finance: null, pensionTransfer: null },
        change: calculateChangePercent(cumulative, lastYearCumulative)
      }
    };
  }).sort((a, b) => {
    // Extract only Hebrew letters for sorting (ignore punctuation, spaces, etc.)
    const hebrewOnly = (str) => str.replace(/[^\u0590-\u05FF]/g, '');
    return hebrewOnly(a.name).localeCompare(hebrewOnly(b.name), 'he');
  });

  return {
    companies,
    departments,
    inspectors,
    agents: agentsArray
  };
}

/**
 * Helper: Sum targets
 */
function sumTargets(targetsArray) {
  return {
    pension: targetsArray.reduce((sum, t) => sum + (parseFloat(t.pension_target) || 0), 0),
    risk: targetsArray.reduce((sum, t) => sum + (parseFloat(t.risk_target) || 0), 0),
    finance: targetsArray.reduce((sum, t) => sum + (parseFloat(t.financial_target) || 0), 0),
    pensionTransfer: targetsArray.reduce((sum, t) => sum + (parseFloat(t.pension_transfer_target) || 0), 0)
  };
}

/**
 * Helper: Calculate achievement percentage
 */
function calculateAchievement(sales, targets) {
  if (!targets) {
    return { pension: '%', risk: '%', finance: '%', pensionTransfer: '%' };
  }

  return {
    pension: targets.pension > 0 ? `${((sales.pension / targets.pension) * 100).toFixed(1)}%` : '%',
    risk: targets.risk > 0 ? `${((sales.risk / targets.risk) * 100).toFixed(1)}%` : '%',
    finance: targets.finance > 0 ? `${((sales.finance / targets.finance) * 100).toFixed(1)}%` : '%',
    pensionTransfer: targets.pensionTransfer > 0 ? `${((sales.pensionTransfer / targets.pensionTransfer) * 100).toFixed(1)}%` : '%'
  };
}

/**
 * Helper: Calculate change percentage
 */
function calculateChangePercent(current, lastYear) {
  if (!lastYear) {
    return { pension: '%', risk: '%', finance: '%', pensionTransfer: '%' };
  }

  return {
    pension: lastYear.pension > 0 ? `${(((current.pension - lastYear.pension) / lastYear.pension) * 100).toFixed(1)}%` : '%',
    risk: lastYear.risk > 0 ? `${(((current.risk - lastYear.risk) / lastYear.risk) * 100).toFixed(1)}%` : '%',
    finance: lastYear.finance > 0 ? `${(((current.finance - lastYear.finance) / lastYear.finance) * 100).toFixed(1)}%` : '%',
    pensionTransfer: lastYear.pensionTransfer > 0 ? `${(((current.pensionTransfer - lastYear.pensionTransfer) / lastYear.pensionTransfer) * 100).toFixed(1)}%` : '%'
  };
}

/**
 * Generate Excel workbook with 3 sheets
 */
async function generateTemplateWorkbook(data) {
  const workbook = new ExcelJS.Workbook();

  // Force Excel to recalculate formulas on open
  workbook.calcProperties.fullCalcOnLoad = true;

  // Create 3 sheets
  await createSheet1_SummaryCumulative(workbook, data);
  await createSheet2_MonthlyReport(workbook, data);
  await createSheet3_AgentsReport(workbook, data);

  return workbook;
}

/**
 * Create Sheet 1: summary- cumulative report
 */
async function createSheet1_SummaryCumulative(workbook, data) {
  const sheet = workbook.addWorksheet('summary- cumulative report');

  // Enable RTL (Right to Left) for Hebrew content
  sheet.views = [{
    rightToLeft: true
  }];

  // Set column widths (increased for better readability)
  sheet.columns = Array(25).fill({ width: 25 });

  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'Date Range / טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'Company / חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'Department / מחלקה:';
  sheet.getCell('B5').value = data.filters.department || '';
  sheet.getCell('A6').value = 'Agent / סוכן:';
  sheet.getCell('B6').value = data.filters.agent || '';
  sheet.getCell('A7').value = 'Inspector / מפקח:';
  sheet.getCell('B7').value = data.filters.inspector || '';

  // Companies Section starts at row 10
  // Structure: header(1) + group headers(1) + empty(1) + sub-headers(1) + column headers(1) + data rows + gap(2)
  addCompaniesSection(sheet, data.companies, 10, 'cumulative');

  // Departments Section (adjust row based on companies count)
  // Companies: rows 10-14 are headers (5 rows), 15+ is data
  const deptStartRow = 10 + 5 + data.companies.length + 2;
  addDepartmentsSection(sheet, data.departments, deptStartRow, 'cumulative');

  // Inspectors Section
  // Departments: header(1) + note(1) + sub-headers(1) + column headers(1) + data rows + gap(2)
  const inspStartRow = deptStartRow + 4 + data.departments.length + 2;
  addInspectorsSection(sheet, data.inspectors, inspStartRow, 'cumulative');

  return sheet;
}

/**
 * Create Sheet 2: monthly report
 */
async function createSheet2_MonthlyReport(workbook, data) {
  const sheet = workbook.addWorksheet('monthly report');

  // Enable RTL (Right to Left) for Hebrew content
  sheet.views = [{
    rightToLeft: true
  }];

  // Set column widths (increased for better readability)
  sheet.columns = Array(25).fill({ width: 25 });

  // Same structure as Sheet 1, but using 'monthly' data
  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'Date Range / טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'Company / חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'Department / מחלקה:';
  sheet.getCell('B5').value = data.filters.department || '';
  sheet.getCell('A6').value = 'Agent / סוכן:';
  sheet.getCell('B6').value = data.filters.agent || '';
  sheet.getCell('A7').value = 'Inspector / מפקח:';
  sheet.getCell('B7').value = data.filters.inspector || '';

  // Companies Section starts at row 10
  addCompaniesSection(sheet, data.companies, 10, 'monthly');

  // Departments Section (adjust row based on companies count)
  const deptStartRow = 10 + 5 + data.companies.length + 2;
  addDepartmentsSection(sheet, data.departments, deptStartRow, 'monthly');

  // Inspectors Section
  const inspStartRow = deptStartRow + 4 + data.departments.length + 2;
  addInspectorsSection(sheet, data.inspectors, inspStartRow, 'monthly');

  return sheet;
}

/**
 * Create Sheet 3: agents reports
 */
async function createSheet3_AgentsReport(workbook, data) {
  const sheet = workbook.addWorksheet('agents reports');

  // Enable RTL (Right to Left) for Hebrew content
  sheet.views = [{
    rightToLeft: true
  }];

  // Set column widths for 50 columns (A-AO) - increased for better readability
  sheet.columns = Array(50).fill({ width: 25 });

  // Row 3: Main Section Headers
  sheet.mergeCells('A3:Y3');
  sheet.getCell('A3').value = 'Monthly (last month in range) - חודשי - החודש האחרון בטווח';
  sheet.getCell('A3').font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  sheet.mergeCells('AA3:AX3');
  sheet.getCell('AA3').value = 'Cumulative - מצטבר';
  sheet.getCell('AA3').font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell('AA3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('AA3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 4: Group Headers
  addAgentGroupHeaders(sheet, 4);

  // Row 6: Sub-Headers
  addAgentSubHeaders(sheet, 6);

  // Row 7: Column Headers
  addAgentColumnHeaders(sheet, 7);

  // Row 8+: Agent data
  let currentRow = 8;
  data.agents.forEach(agent => {
    addAgentDataRow(sheet, currentRow, agent);
    currentRow++;
  });

  // Summary row
  addAgentSummaryRow(sheet, currentRow, data.agents.length, data.agents);

  return sheet;
}

/**
 * Helper functions for adding sections
 */
function addCompaniesSection(sheet, companies, startRow, dataType) {
  // Section header (row 10)
  sheet.mergeCells(`A${startRow}:Y${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'חברות - Companies';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Group headers (row 11) - 3 separate tables
  const groupRow = startRow + 1;
  sheet.mergeCells(`A${groupRow}:E${groupRow}`);
  sheet.getCell(`A${groupRow}`).value = 'sales - מכירות';
  sheet.getCell(`A${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${groupRow}:O${groupRow}`);
  sheet.getCell(`G${groupRow}`).value = 'Targets - יעדים';
  sheet.getCell(`G${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${groupRow}:Y${groupRow}`);
  sheet.getCell(`Q${groupRow}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`Q${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Sub-headers (row 13)
  const subRow = startRow + 3;
  const label = dataType === 'cumulative' ? ' מצטבר - Cumulative (Jan to End)' : ' חודשי - Monthly (Last Month)';
  sheet.mergeCells(`A${subRow}:E${subRow}`);
  sheet.getCell(`A${subRow}`).value = label;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets section - not relevant for companies
  sheet.mergeCells(`G${subRow}:J${subRow}`);
  sheet.getCell(`G${subRow}`).value = 'non - לא רלוונטי';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${subRow}:O${subRow}`);
  sheet.getCell(`L${subRow}`).value = 'non - לא רלוונטי';
  sheet.getCell(`L${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year section
  sheet.mergeCells(`Q${subRow}:T${subRow}`);
  sheet.getCell(`Q${subRow}`).value = 'Last year - Cumulative (Jan to End)';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'change versus last year % / שינוי לעומת אשתקד';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 14)
  const headerRow = startRow + 4;
  ['company name', 'pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A, B, C, D, E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q, R, S, T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(86 + i); // V, W, X, Y
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Data rows (row 15+)
  let dataRow = startRow + 5;
  const firstDataRow = dataRow;

  companies.forEach(company => {
    const data = company[dataType];
    sheet.getCell(`A${dataRow}`).value = company.name;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`Q${dataRow}`).value = company.lastYear.pension !== null ? company.lastYear.pension : 'not yet';
    sheet.getCell(`R${dataRow}`).value = company.lastYear.risk !== null ? company.lastYear.risk : 'not yet';
    sheet.getCell(`S${dataRow}`).value = company.lastYear.finance !== null ? company.lastYear.finance : 'not yet';
    sheet.getCell(`T${dataRow}`).value = company.lastYear.pensionTransfer !== null ? company.lastYear.pensionTransfer : 'not yet';

    sheet.getCell(`V${dataRow}`).value = company.changePercent.pension;
    sheet.getCell(`W${dataRow}`).value = company.changePercent.risk;
    sheet.getCell(`X${dataRow}`).value = company.changePercent.finance;
    sheet.getCell(`Y${dataRow}`).value = company.changePercent.pensionTransfer;

    // Apply yellow fill to data cells
    ['B', 'C', 'D', 'E', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    // Apply number formatting
    // Sales columns
    ['B', 'C', 'D', 'E'].forEach(col => {
      if (typeof sheet.getCell(`${col}${dataRow}`).value === 'number') {
        sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
      }
    });
    // Last year columns (can be number or "not yet")
    ['Q', 'R', 'S', 'T'].forEach(col => {
      if (typeof sheet.getCell(`${col}${dataRow}`).value === 'number') {
        sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
      }
    });
    // Change percent columns
    ['V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).numFmt = '0.00%';
    });

    dataRow++;
  });

  // Add TOTAL row at the bottom
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // SUM formulas for each product column
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };
  sheet.getCell(`C${totalRow}`).value = { formula: `SUM(C${firstDataRow}:C${dataRow - 1})` };
  sheet.getCell(`D${totalRow}`).value = { formula: `SUM(D${firstDataRow}:D${dataRow - 1})` };
  sheet.getCell(`E${totalRow}`).value = { formula: `SUM(E${firstDataRow}:E${dataRow - 1})` };

  // Apply styling to total row
  ['A', 'B', 'C', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });

  // Apply number formatting to total row
  ['B', 'C', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });
}

function addDepartmentsSection(sheet, departments, startRow, dataType) {
  // Section header (row 21)
  sheet.mergeCells(`A${startRow}:Y${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'מחלקות - Departments';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 22: Department options note
  const noteRow = startRow + 1;
  sheet.getCell(`A${noteRow}`).value = 'options for departments (שותפים, סוכנים,ישירים, פרמיום)';
  sheet.getCell(`A${noteRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // Sub-headers (row 23)
  const subRow = startRow + 2;
  const saleLabel = dataType === 'cumulative' ? 'מצטבר - Cumulative (Jan to End)' : 'חודשי - Monthly (Last Month)';
  const targetLabel = dataType === 'cumulative' ? 'Targets - Cumulative (Jan to End)' : 'Targets - Monthly';
  const achieveLabel = dataType === 'cumulative' ? 'Cumulative Achievement % / השגת יעד' : 'Monthly Achievement % / השגת יעד';

  sheet.mergeCells(`A${subRow}:E${subRow}`);
  sheet.getCell(`A${subRow}`).value = saleLabel;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${subRow}:J${subRow}`);
  sheet.getCell(`G${subRow}`).value = targetLabel;
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${subRow}:O${subRow}`);
  sheet.getCell(`L${subRow}`).value = achieveLabel;
  sheet.getCell(`L${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${subRow}:T${subRow}`);
  sheet.getCell(`Q${subRow}`).value = 'Last year - Cumulative (Jan to End)';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'change versus last year % / שינוי לעומת אשתקד';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 24)
  const headerRow = startRow + 3;
  ['deparment name', 'pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A-E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(71 + i); // G-J
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(76 + i); // L-O
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q-T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(86 + i); // V-Y
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Data rows (row 25+)
  let dataRow = startRow + 4;
  const firstDataRow = dataRow;

  departments.forEach(dept => {
    const data = dept[dataType];
    // Use monthlyTargets for monthly report, cumulativeTargets for cumulative report
    const targets = dataType === 'monthly' ? dept.monthlyTargets : dept.targets;

    sheet.getCell(`A${dataRow}`).value = dept.name;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`G${dataRow}`).value = targets.pension;
    sheet.getCell(`H${dataRow}`).value = targets.risk;
    sheet.getCell(`I${dataRow}`).value = targets.finance;
    sheet.getCell(`J${dataRow}`).value = targets.pensionTransfer;

    // Achievement formulas: Sales / Target (as percentage)
    sheet.getCell(`L${dataRow}`).value = { formula: `IF(G${dataRow}=0,"",B${dataRow}/G${dataRow})` };
    sheet.getCell(`M${dataRow}`).value = { formula: `IF(H${dataRow}=0,"",C${dataRow}/H${dataRow})` };
    sheet.getCell(`N${dataRow}`).value = { formula: `IF(I${dataRow}=0,"",D${dataRow}/I${dataRow})` };
    sheet.getCell(`O${dataRow}`).value = { formula: `IF(J${dataRow}=0,"",E${dataRow}/J${dataRow})` };

    sheet.getCell(`Q${dataRow}`).value = dept.lastYear.pension !== null ? dept.lastYear.pension : 'not yet';
    sheet.getCell(`R${dataRow}`).value = dept.lastYear.risk !== null ? dept.lastYear.risk : 'not yet';
    sheet.getCell(`S${dataRow}`).value = dept.lastYear.finance !== null ? dept.lastYear.finance : 'not yet';
    sheet.getCell(`T${dataRow}`).value = dept.lastYear.pensionTransfer !== null ? dept.lastYear.pensionTransfer : 'not yet';

    sheet.getCell(`V${dataRow}`).value = dept.changePercent.pension;
    sheet.getCell(`W${dataRow}`).value = dept.changePercent.risk;
    sheet.getCell(`X${dataRow}`).value = dept.changePercent.finance;
    sheet.getCell(`Y${dataRow}`).value = dept.changePercent.pensionTransfer;

    // Apply yellow fill and font to all data columns
    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    // Apply number formatting
    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
    });
    ['L', 'M', 'N', 'O', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).numFmt = '0.00%';
    });
    ['Q', 'R', 'S', 'T'].forEach(col => {
      if (typeof sheet.getCell(`${col}${dataRow}`).value === 'number') {
        sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
      }
    });

    dataRow++;
  });

  // Add TOTAL row at the bottom
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // SUM formulas for each section
  // Sales (B-E)
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };
  sheet.getCell(`C${totalRow}`).value = { formula: `SUM(C${firstDataRow}:C${dataRow - 1})` };
  sheet.getCell(`D${totalRow}`).value = { formula: `SUM(D${firstDataRow}:D${dataRow - 1})` };
  sheet.getCell(`E${totalRow}`).value = { formula: `SUM(E${firstDataRow}:E${dataRow - 1})` };

  // Targets (G-J)
  sheet.getCell(`G${totalRow}`).value = { formula: `SUM(G${firstDataRow}:G${dataRow - 1})` };
  sheet.getCell(`H${totalRow}`).value = { formula: `SUM(H${firstDataRow}:H${dataRow - 1})` };
  sheet.getCell(`I${totalRow}`).value = { formula: `SUM(I${firstDataRow}:I${dataRow - 1})` };
  sheet.getCell(`J${totalRow}`).value = { formula: `SUM(J${firstDataRow}:J${dataRow - 1})` };

  // Achievement (L-O) - Formula: Total Sales / Total Target (as percentage)
  sheet.getCell(`L${totalRow}`).value = { formula: `IF(G${totalRow}=0,"",B${totalRow}/G${totalRow})` };
  sheet.getCell(`M${totalRow}`).value = { formula: `IF(H${totalRow}=0,"",C${totalRow}/H${totalRow})` };
  sheet.getCell(`N${totalRow}`).value = { formula: `IF(I${totalRow}=0,"",D${totalRow}/I${totalRow})` };
  sheet.getCell(`O${totalRow}`).value = { formula: `IF(J${totalRow}=0,"",E${totalRow}/J${totalRow})` };

  // Apply styling to total row
  ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });

  // Apply number formatting to total row
  ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });
  ['L', 'M', 'N', 'O'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).numFmt = '0.00%';
  });
}

function addInspectorsSection(sheet, inspectors, startRow, dataType) {
  // Section header (row 30)
  sheet.mergeCells(`A${startRow}:Y${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'מפקחים - Inspectors';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 31: Inspector options note
  const noteRow = startRow + 1;
  sheet.getCell(`A${noteRow}`).value = 'options for inspectors (יוסי אביב, ערן גירוני, איתי אדן)';
  sheet.getCell(`A${noteRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // Sub-headers (row 32)
  const subRow = startRow + 2;
  const saleLabel = dataType === 'cumulative' ? 'מצטבר - Cumulative (Jan to End)' : 'חודשי - Monthly (Last Month)';
  const targetLabel = dataType === 'cumulative' ? 'Targets - Cumulative (Jan to End)' : 'Targets - Monthly';
  const achieveLabel = dataType === 'cumulative' ? 'Cumulative Achievement % / השגת יעד' : 'Monthly Achievement % / השגת יעד';

  sheet.mergeCells(`A${subRow}:E${subRow}`);
  sheet.getCell(`A${subRow}`).value = saleLabel;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${subRow}:J${subRow}`);
  sheet.getCell(`G${subRow}`).value = targetLabel;
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${subRow}:O${subRow}`);
  sheet.getCell(`L${subRow}`).value = achieveLabel;
  sheet.getCell(`L${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${subRow}:T${subRow}`);
  sheet.getCell(`Q${subRow}`).value = 'Last year - Cumulative (Jan to End)';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'change versus last year % / שינוי לעומת אשתקד';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 33)
  const headerRow = startRow + 3;
  ['inspector name', 'pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A-E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(71 + i); // G-J
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(76 + i); // L-O
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q-T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['pension', 'risk', 'finance', 'pension transfer'].forEach((header, i) => {
    const col = String.fromCharCode(86 + i); // V-Y
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Data rows (row 34+)
  let dataRow = startRow + 4;
  const firstDataRow = dataRow;

  inspectors.forEach(insp => {
    const data = insp[dataType];
    // Use monthlyTargets for monthly report, cumulativeTargets for cumulative report
    const targets = dataType === 'monthly' ? insp.monthlyTargets : insp.targets;

    sheet.getCell(`A${dataRow}`).value = insp.name;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`G${dataRow}`).value = targets.pension;
    sheet.getCell(`H${dataRow}`).value = targets.risk;
    sheet.getCell(`I${dataRow}`).value = targets.finance;
    sheet.getCell(`J${dataRow}`).value = targets.pensionTransfer;

    // Achievement formulas: Sales / Target (as percentage)
    sheet.getCell(`L${dataRow}`).value = { formula: `IF(G${dataRow}=0,"",B${dataRow}/G${dataRow})` };
    sheet.getCell(`M${dataRow}`).value = { formula: `IF(H${dataRow}=0,"",C${dataRow}/H${dataRow})` };
    sheet.getCell(`N${dataRow}`).value = { formula: `IF(I${dataRow}=0,"",D${dataRow}/I${dataRow})` };
    sheet.getCell(`O${dataRow}`).value = { formula: `IF(J${dataRow}=0,"",E${dataRow}/J${dataRow})` };

    sheet.getCell(`Q${dataRow}`).value = insp.lastYear.pension !== null ? insp.lastYear.pension : 'not yet';
    sheet.getCell(`R${dataRow}`).value = insp.lastYear.risk !== null ? insp.lastYear.risk : 'not yet';
    sheet.getCell(`S${dataRow}`).value = insp.lastYear.finance !== null ? insp.lastYear.finance : 'not yet';
    sheet.getCell(`T${dataRow}`).value = insp.lastYear.pensionTransfer !== null ? insp.lastYear.pensionTransfer : 'not yet';

    sheet.getCell(`V${dataRow}`).value = insp.changePercent.pension;
    sheet.getCell(`W${dataRow}`).value = insp.changePercent.risk;
    sheet.getCell(`X${dataRow}`).value = insp.changePercent.finance;
    sheet.getCell(`Y${dataRow}`).value = insp.changePercent.pensionTransfer;

    // Apply yellow fill and font to all data columns
    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    // Apply number formatting
    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
    });
    ['L', 'M', 'N', 'O', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).numFmt = '0.00%';
    });
    ['Q', 'R', 'S', 'T'].forEach(col => {
      if (typeof sheet.getCell(`${col}${dataRow}`).value === 'number') {
        sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0';
      }
    });

    dataRow++;
  });

  // Add TOTAL row at the bottom
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // SUM formulas for each section
  // Sales (B-E)
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };
  sheet.getCell(`C${totalRow}`).value = { formula: `SUM(C${firstDataRow}:C${dataRow - 1})` };
  sheet.getCell(`D${totalRow}`).value = { formula: `SUM(D${firstDataRow}:D${dataRow - 1})` };
  sheet.getCell(`E${totalRow}`).value = { formula: `SUM(E${firstDataRow}:E${dataRow - 1})` };

  // Targets (G-J)
  sheet.getCell(`G${totalRow}`).value = { formula: `SUM(G${firstDataRow}:G${dataRow - 1})` };
  sheet.getCell(`H${totalRow}`).value = { formula: `SUM(H${firstDataRow}:H${dataRow - 1})` };
  sheet.getCell(`I${totalRow}`).value = { formula: `SUM(I${firstDataRow}:I${dataRow - 1})` };
  sheet.getCell(`J${totalRow}`).value = { formula: `SUM(J${firstDataRow}:J${dataRow - 1})` };

  // Achievement (L-O) - Formula: Total Sales / Total Target (as percentage)
  sheet.getCell(`L${totalRow}`).value = { formula: `IF(G${totalRow}=0,"",B${totalRow}/G${totalRow})` };
  sheet.getCell(`M${totalRow}`).value = { formula: `IF(H${totalRow}=0,"",C${totalRow}/H${totalRow})` };
  sheet.getCell(`N${totalRow}`).value = { formula: `IF(I${totalRow}=0,"",D${totalRow}/I${totalRow})` };
  sheet.getCell(`O${totalRow}`).value = { formula: `IF(J${totalRow}=0,"",E${totalRow}/J${totalRow})` };

  // Apply styling to total row
  ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });

  // Apply number formatting to total row
  ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });
  ['L', 'M', 'N', 'O'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).numFmt = '0.00%';
  });
}

function addAgentGroupHeaders(sheet, row) {
  // Monthly section
  sheet.mergeCells(`B${row}:E${row}`);
  sheet.getCell(`B${row}`).value = 'sales - מכירות';
  sheet.getCell(`B${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`B${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${row}:O${row}`);
  sheet.getCell(`G${row}`).value = 'Targets - יעדים';
  sheet.getCell(`G${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${row}:Y${row}`);
  sheet.getCell(`Q${row}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`Q${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Cumulative section
  sheet.mergeCells(`AA${row}:AD${row}`);
  sheet.getCell(`AA${row}`).value = 'מכירות - Sales';
  sheet.getCell(`AA${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AA${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AA${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AF${row}:AN${row}`);
  sheet.getCell(`AF${row}`).value = 'Targets - יעדים';
  sheet.getCell(`AF${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AF${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AF${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AP${row}:AX${row}`);
  sheet.getCell(`AP${row}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`AP${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AP${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AP${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
}

function addAgentSubHeaders(sheet, row) {
  // Monthly section sub-headers
  sheet.mergeCells(`B${row}:E${row}`);
  sheet.getCell(`B${row}`).value = 'חודשי - Monthly (Last Month) - Sales';
  sheet.getCell(`B${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`B${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${row}:J${row}`);
  sheet.getCell(`G${row}`).value = 'Targets - Monthly';
  sheet.getCell(`G${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${row}:O${row}`);
  sheet.getCell(`L${row}`).value = 'Monthly Achievement % / השגת יעד';
  sheet.getCell(`L${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${row}:T${row}`);
  sheet.getCell(`Q${row}`).value = 'Last year - Monthly';
  sheet.getCell(`Q${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${row}:Y${row}`);
  sheet.getCell(`V${row}`).value = 'change versus last year % / שינוי לעומת אשתקד';
  sheet.getCell(`V${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Cumulative section sub-headers
  sheet.mergeCells(`AA${row}:AD${row}`);
  sheet.getCell(`AA${row}`).value = 'מצטבר - Cumulative - Sales';
  sheet.getCell(`AA${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AA${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AA${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AF${row}:AI${row}`);
  sheet.getCell(`AF${row}`).value = 'Targets - Cumulative (Jan to End)';
  sheet.getCell(`AF${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AF${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AF${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AK${row}:AN${row}`);
  sheet.getCell(`AK${row}`).value = 'Achievement Cumulative % / השגת יעד';
  sheet.getCell(`AK${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AK${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AK${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AP${row}:AS${row}`);
  sheet.getCell(`AP${row}`).value = 'Last year - Cumulative (Jan to End)';
  sheet.getCell(`AP${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AP${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AP${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AU${row}:AX${row}`);
  sheet.getCell(`AU${row}`).value = 'change versus last year % / שינוי לעומת אשתקד';
  sheet.getCell(`AU${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AU${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AU${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
}

function addAgentColumnHeaders(sheet, row) {
  const categories = ['pension', 'risk', 'finance', 'pension transfer'];

  // Agent name
  sheet.getCell(`A${row}`).value = 'agent name';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Monthly sales (B-E)
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(66 + i); // B, C, D, E
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly targets (G-J) - shifted
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(71 + i); // G, H, I, J
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly achievement (L-O) - shifted
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(76 + i); // L, M, N, O
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly last year (Q-T) - shifted
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(81 + i); // Q, R, S, T
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly change (V-Y) - shifted
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(86 + i); // V, W, X, Y
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative sales (AA-AD) - shifted
  ['AA', 'AB', 'AC', 'AD'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative targets (AF-AI) - shifted
  ['AF', 'AG', 'AH', 'AI'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative achievement (AK-AN) - shifted
  ['AK', 'AL', 'AM', 'AN'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative last year (AP-AS) - shifted
  ['AP', 'AQ', 'AR', 'AS'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative change (AU-AX) - shifted
  ['AU', 'AV', 'AW', 'AX'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });
}

function addAgentDataRow(sheet, row, agent) {
  // Agent name
  sheet.getCell(`A${row}`).value = agent.name;
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  // Monthly data
  sheet.getCell(`B${row}`).value = agent.monthly.sales.pension;
  sheet.getCell(`C${row}`).value = agent.monthly.sales.risk;
  sheet.getCell(`D${row}`).value = agent.monthly.sales.finance;
  sheet.getCell(`E${row}`).value = agent.monthly.sales.pensionTransfer;

  // F is separator column

  sheet.getCell(`G${row}`).value = agent.monthly.targets.pension;
  sheet.getCell(`H${row}`).value = agent.monthly.targets.risk;
  sheet.getCell(`I${row}`).value = agent.monthly.targets.finance;
  sheet.getCell(`J${row}`).value = agent.monthly.targets.pensionTransfer;

  // K is separator column

  // Monthly achievement formulas: Monthly Sales / Monthly Target
  sheet.getCell(`L${row}`).value = { formula: `IF(G${row}=0,"",B${row}/G${row})` };
  sheet.getCell(`M${row}`).value = { formula: `IF(H${row}=0,"",C${row}/H${row})` };
  sheet.getCell(`N${row}`).value = { formula: `IF(I${row}=0,"",D${row}/I${row})` };
  sheet.getCell(`O${row}`).value = { formula: `IF(J${row}=0,"",E${row}/J${row})` };

  // P is separator column

  sheet.getCell(`Q${row}`).value = agent.monthly.lastYear.pension !== null ? agent.monthly.lastYear.pension : 'not yet';
  sheet.getCell(`R${row}`).value = agent.monthly.lastYear.risk !== null ? agent.monthly.lastYear.risk : 'not yet';
  sheet.getCell(`S${row}`).value = agent.monthly.lastYear.finance !== null ? agent.monthly.lastYear.finance : 'not yet';
  sheet.getCell(`T${row}`).value = agent.monthly.lastYear.pensionTransfer !== null ? agent.monthly.lastYear.pensionTransfer : 'not yet';

  // U is separator column

  sheet.getCell(`V${row}`).value = agent.monthly.change.pension;
  sheet.getCell(`W${row}`).value = agent.monthly.change.risk;
  sheet.getCell(`X${row}`).value = agent.monthly.change.finance;
  sheet.getCell(`Y${row}`).value = agent.monthly.change.pensionTransfer;

  // Z is separator column

  // Cumulative data
  sheet.getCell(`AA${row}`).value = agent.cumulative.sales.pension;
  sheet.getCell(`AB${row}`).value = agent.cumulative.sales.risk;
  sheet.getCell(`AC${row}`).value = agent.cumulative.sales.finance;
  sheet.getCell(`AD${row}`).value = agent.cumulative.sales.pensionTransfer;

  // AE is separator column

  sheet.getCell(`AF${row}`).value = agent.cumulative.targets.pension;
  sheet.getCell(`AG${row}`).value = agent.cumulative.targets.risk;
  sheet.getCell(`AH${row}`).value = agent.cumulative.targets.finance;
  sheet.getCell(`AI${row}`).value = agent.cumulative.targets.pensionTransfer;

  // AJ is separator column

  // Cumulative achievement formulas: Cumulative Sales / Cumulative Target
  sheet.getCell(`AK${row}`).value = { formula: `IF(AF${row}=0,"",AA${row}/AF${row})` };
  sheet.getCell(`AL${row}`).value = { formula: `IF(AG${row}=0,"",AB${row}/AG${row})` };
  sheet.getCell(`AM${row}`).value = { formula: `IF(AH${row}=0,"",AC${row}/AH${row})` };
  sheet.getCell(`AN${row}`).value = { formula: `IF(AI${row}=0,"",AD${row}/AI${row})` };

  // AO is separator column

  sheet.getCell(`AP${row}`).value = agent.cumulative.lastYear.pension !== null ? agent.cumulative.lastYear.pension : 'not yet';
  sheet.getCell(`AQ${row}`).value = agent.cumulative.lastYear.risk !== null ? agent.cumulative.lastYear.risk : 'not yet';
  sheet.getCell(`AR${row}`).value = agent.cumulative.lastYear.finance !== null ? agent.cumulative.lastYear.finance : 'not yet';
  sheet.getCell(`AS${row}`).value = agent.cumulative.lastYear.pensionTransfer !== null ? agent.cumulative.lastYear.pensionTransfer : 'not yet';

  // AT is separator column

  sheet.getCell(`AU${row}`).value = agent.cumulative.change.pension;
  sheet.getCell(`AV${row}`).value = agent.cumulative.change.risk;
  sheet.getCell(`AW${row}`).value = agent.cumulative.change.finance;
  sheet.getCell(`AX${row}`).value = agent.cumulative.change.pensionTransfer;

  // Apply yellow fill to all data columns (excluding separator columns F, K, P, U, Z, AE, AJ, AO, AT)
  const dataCols = ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y',
                    'AA', 'AB', 'AC', 'AD', 'AF', 'AG', 'AH', 'AI', 'AK', 'AL', 'AM', 'AN', 'AP', 'AQ', 'AR', 'AS', 'AU', 'AV', 'AW', 'AX'];
  dataCols.forEach(col => {
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  });

  // Apply number formatting
  // Amount columns: Sales, Targets, and Last Year
  ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'AA', 'AB', 'AC', 'AD', 'AF', 'AG', 'AH', 'AI'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Last Year columns (can be number or "not yet")
  ['Q', 'R', 'S', 'T', 'AP', 'AQ', 'AR', 'AS'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Percentage columns: Achievement and Change
  ['L', 'M', 'N', 'O', 'V', 'W', 'X', 'Y', 'AK', 'AL', 'AM', 'AN', 'AU', 'AV', 'AW', 'AX'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

function addAgentSummaryRow(sheet, row, agentCount, agents) {
  const startRow = 8;
  const endRow = 8 + agentCount - 1;

  sheet.getCell(`A${row}`).value = 'TOTAL';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

  // Calculate totals from agents data
  const totals = {
    monthly: { sales: { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 }, targets: { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 } },
    cumulative: { sales: { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 }, targets: { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 } }
  };

  agents.forEach(agent => {
    totals.monthly.sales.pension += agent.monthly.sales.pension || 0;
    totals.monthly.sales.risk += agent.monthly.sales.risk || 0;
    totals.monthly.sales.finance += agent.monthly.sales.finance || 0;
    totals.monthly.sales.pensionTransfer += agent.monthly.sales.pensionTransfer || 0;

    totals.monthly.targets.pension += agent.monthly.targets.pension || 0;
    totals.monthly.targets.risk += agent.monthly.targets.risk || 0;
    totals.monthly.targets.finance += agent.monthly.targets.finance || 0;
    totals.monthly.targets.pensionTransfer += agent.monthly.targets.pensionTransfer || 0;

    totals.cumulative.sales.pension += agent.cumulative.sales.pension || 0;
    totals.cumulative.sales.risk += agent.cumulative.sales.risk || 0;
    totals.cumulative.sales.finance += agent.cumulative.sales.finance || 0;
    totals.cumulative.sales.pensionTransfer += agent.cumulative.sales.pensionTransfer || 0;

    totals.cumulative.targets.pension += agent.cumulative.targets.pension || 0;
    totals.cumulative.targets.risk += agent.cumulative.targets.risk || 0;
    totals.cumulative.targets.finance += agent.cumulative.targets.finance || 0;
    totals.cumulative.targets.pensionTransfer += agent.cumulative.targets.pensionTransfer || 0;
  });

  // Monthly sales (B-E) - Write calculated values with formulas as backup
  sheet.getCell(`B${row}`).value = totals.monthly.sales.pension;
  sheet.getCell(`B${row}`).formula = `SUM(B${startRow}:B${endRow})`;
  sheet.getCell(`C${row}`).value = totals.monthly.sales.risk;
  sheet.getCell(`C${row}`).formula = `SUM(C${startRow}:C${endRow})`;
  sheet.getCell(`D${row}`).value = totals.monthly.sales.finance;
  sheet.getCell(`D${row}`).formula = `SUM(D${startRow}:D${endRow})`;
  sheet.getCell(`E${row}`).value = totals.monthly.sales.pensionTransfer;
  sheet.getCell(`E${row}`).formula = `SUM(E${startRow}:E${endRow})`;

  ['B', 'C', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly targets (G-J) - Write calculated values with formulas
  sheet.getCell(`G${row}`).value = totals.monthly.targets.pension;
  sheet.getCell(`G${row}`).formula = `SUM(G${startRow}:G${endRow})`;
  sheet.getCell(`H${row}`).value = totals.monthly.targets.risk;
  sheet.getCell(`H${row}`).formula = `SUM(H${startRow}:H${endRow})`;
  sheet.getCell(`I${row}`).value = totals.monthly.targets.finance;
  sheet.getCell(`I${row}`).formula = `SUM(I${startRow}:I${endRow})`;
  sheet.getCell(`J${row}`).value = totals.monthly.targets.pensionTransfer;
  sheet.getCell(`J${row}`).formula = `SUM(J${startRow}:J${endRow})`;

  ['G', 'H', 'I', 'J'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly achievement (L-O) - Calculate and write values with formulas
  const monthlyAchievement = {
    pension: totals.monthly.targets.pension > 0 ? totals.monthly.sales.pension / totals.monthly.targets.pension : null,
    risk: totals.monthly.targets.risk > 0 ? totals.monthly.sales.risk / totals.monthly.targets.risk : null,
    finance: totals.monthly.targets.finance > 0 ? totals.monthly.sales.finance / totals.monthly.targets.finance : null,
    pensionTransfer: totals.monthly.targets.pensionTransfer > 0 ? totals.monthly.sales.pensionTransfer / totals.monthly.targets.pensionTransfer : null
  };

  sheet.getCell(`L${row}`).value = monthlyAchievement.pension;
  sheet.getCell(`L${row}`).formula = `IF(G${row}=0,"",B${row}/G${row})`;
  sheet.getCell(`M${row}`).value = monthlyAchievement.risk;
  sheet.getCell(`M${row}`).formula = `IF(H${row}=0,"",C${row}/H${row})`;
  sheet.getCell(`N${row}`).value = monthlyAchievement.finance;
  sheet.getCell(`N${row}`).formula = `IF(I${row}=0,"",D${row}/I${row})`;
  sheet.getCell(`O${row}`).value = monthlyAchievement.pensionTransfer;
  sheet.getCell(`O${row}`).formula = `IF(J${row}=0,"",E${row}/J${row})`;

  ['L', 'M', 'N', 'O'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Monthly last year (Q-T) - SUM - shifted (using SUMIF to ignore text)
  ['Q', 'R', 'S', 'T'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUMIF(${col}${startRow}:${col}${endRow},"<>not yet")` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly change (V-Y) - AVERAGE - shifted
  ['V', 'W', 'X', 'Y'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `AVERAGE(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Cumulative sales (AA-AD) - Write calculated values with formulas
  sheet.getCell(`AA${row}`).value = totals.cumulative.sales.pension;
  sheet.getCell(`AA${row}`).formula = `SUM(AA${startRow}:AA${endRow})`;
  sheet.getCell(`AB${row}`).value = totals.cumulative.sales.risk;
  sheet.getCell(`AB${row}`).formula = `SUM(AB${startRow}:AB${endRow})`;
  sheet.getCell(`AC${row}`).value = totals.cumulative.sales.finance;
  sheet.getCell(`AC${row}`).formula = `SUM(AC${startRow}:AC${endRow})`;
  sheet.getCell(`AD${row}`).value = totals.cumulative.sales.pensionTransfer;
  sheet.getCell(`AD${row}`).formula = `SUM(AD${startRow}:AD${endRow})`;

  ['AA', 'AB', 'AC', 'AD'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative targets (AF-AI) - Write calculated values with formulas
  sheet.getCell(`AF${row}`).value = totals.cumulative.targets.pension;
  sheet.getCell(`AF${row}`).formula = `SUM(AF${startRow}:AF${endRow})`;
  sheet.getCell(`AG${row}`).value = totals.cumulative.targets.risk;
  sheet.getCell(`AG${row}`).formula = `SUM(AG${startRow}:AG${endRow})`;
  sheet.getCell(`AH${row}`).value = totals.cumulative.targets.finance;
  sheet.getCell(`AH${row}`).formula = `SUM(AH${startRow}:AH${endRow})`;
  sheet.getCell(`AI${row}`).value = totals.cumulative.targets.pensionTransfer;
  sheet.getCell(`AI${row}`).formula = `SUM(AI${startRow}:AI${endRow})`;

  ['AF', 'AG', 'AH', 'AI'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative achievement (AK-AN) - Calculate and write values with formulas
  const cumulativeAchievement = {
    pension: totals.cumulative.targets.pension > 0 ? totals.cumulative.sales.pension / totals.cumulative.targets.pension : null,
    risk: totals.cumulative.targets.risk > 0 ? totals.cumulative.sales.risk / totals.cumulative.targets.risk : null,
    finance: totals.cumulative.targets.finance > 0 ? totals.cumulative.sales.finance / totals.cumulative.targets.finance : null,
    pensionTransfer: totals.cumulative.targets.pensionTransfer > 0 ? totals.cumulative.sales.pensionTransfer / totals.cumulative.targets.pensionTransfer : null
  };

  sheet.getCell(`AK${row}`).value = cumulativeAchievement.pension;
  sheet.getCell(`AK${row}`).formula = `IF(AF${row}=0,"",AA${row}/AF${row})`;
  sheet.getCell(`AL${row}`).value = cumulativeAchievement.risk;
  sheet.getCell(`AL${row}`).formula = `IF(AG${row}=0,"",AB${row}/AG${row})`;
  sheet.getCell(`AM${row}`).value = cumulativeAchievement.finance;
  sheet.getCell(`AM${row}`).formula = `IF(AH${row}=0,"",AC${row}/AH${row})`;
  sheet.getCell(`AN${row}`).value = cumulativeAchievement.pensionTransfer;
  sheet.getCell(`AN${row}`).formula = `IF(AI${row}=0,"",AD${row}/AI${row})`;

  ['AK', 'AL', 'AM', 'AN'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Cumulative last year (AP-AS) - SUM - shifted (using SUMIF to ignore text)
  ['AP', 'AQ', 'AR', 'AS'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUMIF(${col}${startRow}:${col}${endRow},"<>not yet")` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative change (AU-AX) - AVERAGE - shifted
  ['AU', 'AV', 'AW', 'AX'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `AVERAGE(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

/**
 * POST /export/template/elementary
 * Export Elementary Insurance data using the comprehensive template
 */
router.post('/elementary', async (req, res) => {
  try {
    const {
      startMonth,
      endMonth,
      company,
      department,     // This is actually 'category' for elementary
      sub_category,
      agent
    } = req.body;

    // Validate required parameters
    if (!startMonth || !endMonth) {
      return res.status(400).json({
        success: false,
        message: 'startMonth and endMonth are required'
      });
    }

    // Step 1: Fetch all data needed for the template
    const templateData = await fetchElementaryTemplateData({
      startMonth,
      endMonth,
      company,
      category: department,  // frontend sends 'department' but it's actually category for elementary
      sub_category,
      agent
    });

    // Step 2: Generate Excel workbook with 3 sheets
    const workbook = await generateElementaryTemplateWorkbook(templateData);

    // Step 3: Send file
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `elementary_report_${startMonth}_${endMonth}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting elementary template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export elementary template',
      error: error.message
    });
  }
});

/**
 * Fetch all data needed for the elementary template
 */
async function fetchElementaryTemplateData({ startMonth, endMonth, company, category, sub_category, agent }) {
  // Parse dates
  const [startYear, startMonthNum] = startMonth.split('-');
  const [endYear, endMonthNum] = endMonth.split('-');
  const currentYear = parseInt(startYear);
  const previousYear = currentYear - 1;

  // Generate month arrays
  const currentYearMonths = [];
  for (let i = parseInt(startMonthNum); i <= parseInt(endMonthNum); i++) {
    currentYearMonths.push(`${currentYear}-${String(i).padStart(2, '0')}`);
  }

  const lastMonth = currentYearMonths[currentYearMonths.length - 1];

  // Step 1: Fetch agents with filters
  let agentQuery = supabase
    .from('agent_data')
    .select('*')
    .eq('elementary', true);

  if (company && company !== 'all') {
    agentQuery = agentQuery.contains('company_id', [parseInt(company)]);
  }
  if (category && category !== 'all') {
    agentQuery = agentQuery.eq('category', category);
  }
  if (sub_category && sub_category !== 'all') {
    agentQuery = agentQuery.eq('sub_category', sub_category);
  }
  if (agent && agent !== 'all') {
    agentQuery = agentQuery.eq('agent_name', agent);
  }

  const { data: agents, error: agentsError } = await agentQuery;

  if (agentsError) {
    throw new Error(`Failed to fetch agents: ${agentsError.message}`);
  }

  if (!agents || agents.length === 0) {
    throw new Error('No agents found matching the criteria');
  }

  const agentIds = agents.map(a => a.id);

  // Pagination settings
  const PAGE_SIZE = 1000;

  // Step 2: Fetch current year aggregations with pagination
  let allCurrentYearData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let currentYearQuery = supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (company && company !== 'all') {
      currentYearQuery = currentYearQuery.eq('company_id', parseInt(company));
    }

    const { data: pageData, error: currentError } = await currentYearQuery;

    if (currentError) {
      throw new Error(`Failed to fetch current year data (page ${page}): ${currentError.message}`);
    }

    if (pageData && pageData.length > 0) {
      allCurrentYearData = allCurrentYearData.concat(pageData);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  const currentYearData = allCurrentYearData;

  // Step 3: Fetch previous year aggregations with pagination
  const prevStartMonth = `${previousYear}-${String(startMonthNum).padStart(2, '0')}`;
  const prevEndMonth = `${previousYear}-${String(endMonthNum).padStart(2, '0')}`;

  let allPreviousYearData = [];
  page = 0;
  hasMore = true;

  while (hasMore) {
    let previousYearQuery = supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', prevStartMonth)
      .lte('month', prevEndMonth)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (company && company !== 'all') {
      previousYearQuery = previousYearQuery.eq('company_id', parseInt(company));
    }

    const { data: pageData, error: previousError } = await previousYearQuery;

    if (previousError) {
      throw new Error(`Failed to fetch previous year data (page ${page}): ${previousError.message}`);
    }

    if (pageData && pageData.length > 0) {
      allPreviousYearData = allPreviousYearData.concat(pageData);
      hasMore = pageData.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  const previousYearData = allPreviousYearData;

  // Step 4: Fetch companies
  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('*');

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`);
  }

  // Step 5: Fetch agent_yearly_goals
  const { data: agentYearlyGoalsData, error: agentYearlyGoalsError } = await supabase
    .from('agent_yearly_goals')
    .select('*');

  if (agentYearlyGoalsError) {
    console.error('Error fetching agent_yearly_goals:', agentYearlyGoalsError);
  }

  // Build lookup maps
  const companyMap = {};
  (companiesData || []).forEach(c => {
    companyMap[c.id] = c.name;
  });

  const agentMap = {};
  agents.forEach(a => {
    agentMap[a.id] = {
      name: a.agent_name,
      category: a.category || 'Unknown',
      sub_category: a.sub_category || 'Unknown',
      companyIds: a.company_id || []
    };
  });

  // Process and aggregate data
  const aggregatedData = aggregateElementaryTemplateData({
    agents,
    currentYearData: currentYearData || [],
    previousYearData: previousYearData || [],
    agentYearlyGoalsData: agentYearlyGoalsData || [],
    companyMap,
    agentMap,
    currentYearMonths,
    lastMonth,
    startMonth,
    endMonth
  });

  return {
    filters: {
      dateRange: `${startMonth} - ${endMonth}`,
      company: company === 'all' ? 'All Companies' : companyMap[parseInt(company)] || company,
      category: category === 'all' ? 'All Categories' : category,
      sub_category: sub_category === 'all' ? 'All Sub-Categories' : sub_category,
      agent: agent === 'all' ? 'All Agents' : agent
    },
    startMonth,
    lastMonth,
    ...aggregatedData
  };
}

/**
 * Aggregate elementary data for template
 */
function aggregateElementaryTemplateData({
  agents,
  currentYearData,
  previousYearData,
  agentYearlyGoalsData,
  companyMap,
  agentMap,
  currentYearMonths,
  lastMonth,
  startMonth,
  endMonth
}) {
  const companiesAgg = {};
  const categoriesAgg = {};
  const subCategoriesAgg = {};
  const agentsAgg = {};

  // Helper to sum gross_premium
  const sumGrossPremium = (data) => {
    return data.reduce((sum, d) => sum + (parseFloat(d.gross_premium) || 0), 0);
  };

  // Build agent_yearly_goals lookup map
  const agentYearlyGoalsMap = {};
  (agentYearlyGoalsData || []).forEach(goal => {
    const key = `${goal.agent_id}-${goal.year}`;
    agentYearlyGoalsMap[key] = goal.elementary_goal || 0;
  });

  // Calculate elementary targets for an agent
  const calculateElementaryTargets = (agentId, year, isMonthly) => {
    const goalKey = `${agentId}-${year}`;
    const yearlyGoal = agentYearlyGoalsMap[goalKey];

    if (!yearlyGoal) return 0;

    if (isMonthly) {
      // Monthly target = annual goal / 12
      return yearlyGoal / 12;
    } else {
      // Cumulative target = annual goal * (months_in_range / 12)
      const monthCount = currentYearMonths.length;
      return yearlyGoal * (monthCount / 12);
    }
  };

  // Process current year data
  currentYearData.forEach(record => {
    const agent = agentMap[record.agent_id];
    if (!agent) return;

    const companyName = companyMap[record.company_id] || 'Unknown';
    const cat = agent.category || 'Unknown';
    const subCat = agent.sub_category || 'Unknown';

    // Initialize if needed
    if (!companiesAgg[companyName]) {
      companiesAgg[companyName] = { cumulative: [], monthly: [] };
    }
    if (!categoriesAgg[cat]) {
      categoriesAgg[cat] = { cumulative: [], monthly: [] };
    }
    if (!subCategoriesAgg[subCat]) {
      subCategoriesAgg[subCat] = { cumulative: [], monthly: [] };
    }
    if (!agentsAgg[agent.name]) {
      agentsAgg[agent.name] = { cumulative: [], monthly: [], agentData: agent };
    }

    // Add to cumulative
    companiesAgg[companyName].cumulative.push(record);
    categoriesAgg[cat].cumulative.push(record);
    subCategoriesAgg[subCat].cumulative.push(record);
    agentsAgg[agent.name].cumulative.push(record);

    // Add to monthly only if last month in the selected range
    if (record.month === lastMonth) {
      companiesAgg[companyName].monthly.push(record);
      categoriesAgg[cat].monthly.push(record);
      subCategoriesAgg[subCat].monthly.push(record);
      agentsAgg[agent.name].monthly.push(record);
    }
  });

  // Process previous year data
  const previousYearAgg = {
    companies: {},
    categories: {},
    subCategories: {},
    agents: {}
  };

  previousYearData.forEach(record => {
    const agent = agentMap[record.agent_id];
    if (!agent) return;

    const companyName = companyMap[record.company_id] || 'Unknown';
    const cat = agent.category || 'Unknown';
    const subCat = agent.sub_category || 'Unknown';

    if (!previousYearAgg.companies[companyName]) previousYearAgg.companies[companyName] = [];
    if (!previousYearAgg.categories[cat]) previousYearAgg.categories[cat] = [];
    if (!previousYearAgg.subCategories[subCat]) previousYearAgg.subCategories[subCat] = [];
    if (!previousYearAgg.agents[agent.name]) previousYearAgg.agents[agent.name] = [];

    previousYearAgg.companies[companyName].push(record);
    previousYearAgg.categories[cat].push(record);
    previousYearAgg.subCategories[subCat].push(record);
    previousYearAgg.agents[agent.name].push(record);
  });

  // Helper: Calculate elementary achievement
  const calcAchievement = (sales, target) => {
    if (!target || target === 0) return '%';
    return `${((sales / target) * 100).toFixed(1)}%`;
  };

  // Helper: Calculate change percent
  const calcChange = (current, lastYear) => {
    if (!lastYear || lastYear === 0) return '%';
    return `${(((current - lastYear) / lastYear) * 100).toFixed(1)}%`;
  };

  // Build final output structures
  const [year] = startMonth.split('-');

  const companies = Object.keys(companiesAgg).map(name => {
    const cumulative = sumGrossPremium(companiesAgg[name].cumulative);
    const monthly = sumGrossPremium(companiesAgg[name].monthly);
    const lastYear = previousYearAgg.companies[name] ? sumGrossPremium(previousYearAgg.companies[name]) : null;

    // Roll up targets from all agents in this company
    let monthlyTarget = 0;
    let cumulativeTarget = 0;
    const companyId = Object.keys(companyMap).find(id => companyMap[id] === name);

    if (companyId) {
      agents.forEach(agent => {
        if (agent.company_id && agent.company_id.includes(parseInt(companyId))) {
          monthlyTarget += calculateElementaryTargets(agent.id, parseInt(year), true);
          cumulativeTarget += calculateElementaryTargets(agent.id, parseInt(year), false);
        }
      });
    }

    return {
      name,
      cumulative,
      monthly,
      cumulativeTarget,
      monthlyTarget,
      achievement: calcAchievement(cumulative, cumulativeTarget),
      lastYear,
      changePercent: calcChange(cumulative, lastYear)
    };
  });

  const categories = Object.keys(categoriesAgg).map(name => {
    const cumulative = sumGrossPremium(categoriesAgg[name].cumulative);
    const monthly = sumGrossPremium(categoriesAgg[name].monthly);
    const lastYear = previousYearAgg.categories[name] ? sumGrossPremium(previousYearAgg.categories[name]) : null;

    let monthlyTarget = 0;
    let cumulativeTarget = 0;

    agents.forEach(agent => {
      if ((agent.category || 'Unknown') === name) {
        monthlyTarget += calculateElementaryTargets(agent.id, parseInt(year), true);
        cumulativeTarget += calculateElementaryTargets(agent.id, parseInt(year), false);
      }
    });

    return {
      name,
      cumulative,
      monthly,
      cumulativeTarget,
      monthlyTarget,
      achievement: calcAchievement(cumulative, cumulativeTarget),
      lastYear,
      changePercent: calcChange(cumulative, lastYear)
    };
  });

  const subCategories = Object.keys(subCategoriesAgg).map(name => {
    const cumulative = sumGrossPremium(subCategoriesAgg[name].cumulative);
    const monthly = sumGrossPremium(subCategoriesAgg[name].monthly);
    const lastYear = previousYearAgg.subCategories[name] ? sumGrossPremium(previousYearAgg.subCategories[name]) : null;

    let monthlyTarget = 0;
    let cumulativeTarget = 0;

    agents.forEach(agent => {
      if ((agent.sub_category || 'Unknown') === name) {
        monthlyTarget += calculateElementaryTargets(agent.id, parseInt(year), true);
        cumulativeTarget += calculateElementaryTargets(agent.id, parseInt(year), false);
      }
    });

    return {
      name,
      cumulative,
      monthly,
      cumulativeTarget,
      monthlyTarget,
      achievement: calcAchievement(cumulative, cumulativeTarget),
      lastYear,
      changePercent: calcChange(cumulative, lastYear)
    };
  });

  // Build agents array (include all agents, even with zero sales)
  const agentsArray = agents.map(agent => {
    const name = agent.agent_name;
    const hasData = agentsAgg[name];

    const cumulative = hasData ? sumGrossPremium(agentsAgg[name].cumulative) : 0;
    const monthly = hasData ? sumGrossPremium(agentsAgg[name].monthly) : 0;

    const monthlyTarget = calculateElementaryTargets(agent.id, parseInt(year), true);
    const cumulativeTarget = calculateElementaryTargets(agent.id, parseInt(year), false);

    const lastYearCumulative = previousYearAgg.agents[name] ? sumGrossPremium(previousYearAgg.agents[name]) : null;

    // For monthly last year, filter previous year data to only the equivalent last month
    const prevLastMonth = `${parseInt(year) - 1}-${lastMonth.split('-')[1]}`;
    const lastYearMonthly = previousYearAgg.agents[name]
      ? sumGrossPremium(previousYearAgg.agents[name].filter(r => r.month === prevLastMonth))
      : null;

    return {
      name,
      agentId: agent.id,
      monthly: {
        sales: monthly,
        target: monthlyTarget,
        achievement: calcAchievement(monthly, monthlyTarget),
        lastYear: lastYearMonthly,
        change: calcChange(monthly, lastYearMonthly)
      },
      cumulative: {
        sales: cumulative,
        target: cumulativeTarget,
        achievement: calcAchievement(cumulative, cumulativeTarget),
        lastYear: lastYearCumulative,
        change: calcChange(cumulative, lastYearCumulative)
      }
    };
  }).sort((a, b) => {
    // Extract only Hebrew letters for sorting (ignore punctuation, spaces, etc.)
    const hebrewOnly = (str) => str.replace(/[^\u0590-\u05FF]/g, '');
    return hebrewOnly(a.name).localeCompare(hebrewOnly(b.name), 'he');
  });

  return {
    companies,
    categories,
    subCategories,
    agents: agentsArray
  };
}

/**
 * Generate Elementary Excel workbook with 3 sheets
 */
async function generateElementaryTemplateWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;

  await createElementarySheet1_SummaryCumulative(workbook, data);
  await createElementarySheet2_MonthlyReport(workbook, data);
  await createElementarySheet3_AgentsReport(workbook, data);

  return workbook;
}

/**
 * Create Elementary Sheet 1: summary - cumulative report
 */
async function createElementarySheet1_SummaryCumulative(workbook, data) {
  const sheet = workbook.addWorksheet('summary- cumulative report');

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(25).fill({ width: 50 });

  // Get month names for labels
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const startMonth = data.startMonth || '';
  const lastMonth = data.lastMonth || '';
  const [startYear, startMonthNum] = startMonth.split('-');
  const [endYear, endMonthNum] = lastMonth.split('-');
  const startMonthName = startMonthNum ? monthNames[parseInt(startMonthNum) - 1] : 'Jan';
  const endMonthName = endMonthNum ? monthNames[parseInt(endMonthNum) - 1] : 'End';
  const monthInfo = { startMonthName, endMonthName };

  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'Date Range / טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'Company / חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'Category / קטגוריה:';
  sheet.getCell('B5').value = data.filters.category || '';
  sheet.getCell('A6').value = 'Sub-Category / תת-קטגוריה:';
  sheet.getCell('B6').value = data.filters.sub_category || '';
  sheet.getCell('A7').value = 'Agent / סוכן:';
  sheet.getCell('B7').value = data.filters.agent || '';

  // Companies Section starts at row 10
  addElementaryCompaniesSection(sheet, data.companies, 10, 'cumulative', monthInfo);

  // Categories Section (replaces Departments)
  const catStartRow = 10 + 4 + data.companies.length + 2;
  addElementaryCategoriesSection(sheet, data.categories, catStartRow, 'cumulative', monthInfo);

  // Sub-Categories Section (replaces Inspectors)
  const subCatStartRow = catStartRow + 4 + data.categories.length + 2;
  addElementarySubCategoriesSection(sheet, data.subCategories, subCatStartRow, 'cumulative', monthInfo);

  return sheet;
}

/**
 * Create Elementary Sheet 2: monthly report
 */
async function createElementarySheet2_MonthlyReport(workbook, data) {
  // Get month names for labels and sheet title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const startMonth = data.startMonth || '';
  const lastMonth = data.lastMonth || '';
  const [startYear, startMonthNum] = startMonth.split('-');
  const [year, monthNum] = lastMonth.split('-');
  const startMonthName = startMonthNum ? monthNames[parseInt(startMonthNum) - 1] : 'Jan';
  const endMonthName = monthNum ? monthNames[parseInt(monthNum) - 1] : '';
  const monthInfo = { startMonthName, endMonthName };

  const sheetTitle = endMonthName ? `monthly report - ${endMonthName} ${year}` : 'monthly report';

  const sheet = workbook.addWorksheet(sheetTitle);

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(25).fill({ width: 50 });

  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'Date Range / טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'Company / חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'Category / קטגוריה:';
  sheet.getCell('B5').value = data.filters.category || '';
  sheet.getCell('A6').value = 'Sub-Category / תת-קטגוריה:';
  sheet.getCell('B6').value = data.filters.sub_category || '';
  sheet.getCell('A7').value = 'Agent / סוכן:';
  sheet.getCell('B7').value = data.filters.agent || '';

  // Companies Section starts at row 10
  addElementaryCompaniesSection(sheet, data.companies, 10, 'monthly', monthInfo);

  // Categories Section
  const catStartRow = 10 + 4 + data.companies.length + 2;
  addElementaryCategoriesSection(sheet, data.categories, catStartRow, 'monthly', monthInfo);

  // Sub-Categories Section
  const subCatStartRow = catStartRow + 4 + data.categories.length + 2;
  addElementarySubCategoriesSection(sheet, data.subCategories, subCatStartRow, 'monthly', monthInfo);

  return sheet;
}

/**
 * Create Elementary Sheet 3: agents reports
 */
async function createElementarySheet3_AgentsReport(workbook, data) {
  const sheet = workbook.addWorksheet('agents reports');

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(50).fill({ width: 35 });

  // Get month names for labels
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const startMonth = data.startMonth || '';
  const lastMonth = data.lastMonth || '';
  const [startYear, startMonthNum] = startMonth.split('-');
  const [endYear, endMonthNum] = lastMonth.split('-');
  const startMonthName = startMonthNum ? monthNames[parseInt(startMonthNum) - 1] : 'Jan';
  const endMonthName = endMonthNum ? monthNames[parseInt(endMonthNum) - 1] : 'End';

  // Layout:
  // Monthly:    A(name), B(sales) | C(sep) | D(target), E(achievement%) | F(sep) | G(lastYear), H(change%)
  // Cumulative: I(sep) | J(sales) | K(sep) | L(target), M(achievement%) | N(sep) | O(lastYear), P(change%)

  // Row 3: Main Section Headers
  sheet.mergeCells('A3:H3');
  sheet.getCell('A3').value = `Monthly (${endMonthName}) - חודשי`;
  sheet.getCell('A3').font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  sheet.mergeCells('J3:P3');
  sheet.getCell('J3').value = `Cumulative (${startMonthName} to ${endMonthName}) - מצטבר`;
  sheet.getCell('J3').font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell('J3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('J3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 4: Group Headers under Monthly
  sheet.getCell('B4').value = 'Sales - מכירות';
  sheet.getCell('B4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('B4').alignment = { horizontal: 'center' };
  sheet.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('D4:E4');
  sheet.getCell('D4').value = 'Targets - יעדים';
  sheet.getCell('D4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('D4').alignment = { horizontal: 'center' };
  sheet.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('G4:H4');
  sheet.getCell('G4').value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell('G4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('G4').alignment = { horizontal: 'center' };
  sheet.getCell('G4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Row 4: Group Headers under Cumulative
  sheet.getCell('J4').value = 'Sales - מכירות';
  sheet.getCell('J4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('J4').alignment = { horizontal: 'center' };
  sheet.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('L4:M4');
  sheet.getCell('L4').value = 'Targets - יעדים';
  sheet.getCell('L4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('L4').alignment = { horizontal: 'center' };
  sheet.getCell('L4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('O4:P4');
  sheet.getCell('O4').value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell('O4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('O4').alignment = { horizontal: 'center' };
  sheet.getCell('O4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Row 5: Column-level headers (directly under group headers, no empty row)
  // Agent name
  sheet.getCell('A5').value = 'agent name';
  sheet.getCell('A5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Monthly
  sheet.getCell('B5').value = 'gross premium';
  sheet.getCell('B5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('D5').value = 'target';
  sheet.getCell('D5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('E5').value = 'achievement %';
  sheet.getCell('E5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('G5').value = 'last year';
  sheet.getCell('G5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('H5').value = 'change %';
  sheet.getCell('H5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('H5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Cumulative
  sheet.getCell('J5').value = 'gross premium';
  sheet.getCell('J5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('L5').value = 'target';
  sheet.getCell('L5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('L5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('M5').value = 'achievement %';
  sheet.getCell('M5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('M5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('O5').value = 'last year';
  sheet.getCell('O5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('O5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell('P5').value = 'change %';
  sheet.getCell('P5').font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell('P5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Row 6+: Agent data
  let currentRow = 6;
  data.agents.forEach(agent => {
    addElementaryAgentDataRow(sheet, currentRow, agent);
    currentRow++;
  });

  // Summary row
  addElementaryAgentSummaryRow(sheet, currentRow, data.agents.length, data.agents);

  return sheet;
}

/**
 * Elementary: Add Companies Section (single metric)
 * Layout: A=Name, B=Sales | (C=sep) | D=Target, E=Achievement% | (F=sep) | G=LastYear, H=Change%
 */
function addElementaryCompaniesSection(sheet, companies, startRow, dataType, monthInfo = {}) {
  const { startMonthName = 'Jan', endMonthName = 'End' } = monthInfo;

  // Section header
  sheet.mergeCells(`A${startRow}:H${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'חברות - Companies';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Group headers (row startRow+1) - 3 groups
  const groupRow = startRow + 1;
  sheet.mergeCells(`A${groupRow}:B${groupRow}`);
  sheet.getCell(`A${groupRow}`).value = 'Sales - מכירות';
  sheet.getCell(`A${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`D${groupRow}:E${groupRow}`);
  sheet.getCell(`D${groupRow}`).value = 'Targets - יעדים';
  sheet.getCell(`D${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${groupRow}:H${groupRow}`);
  sheet.getCell(`G${groupRow}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`G${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Sub-headers (row startRow+2) - directly under group headers, no empty row
  const subRow = startRow + 2;
  const label = dataType === 'cumulative'
    ? `מצטבר - Cumulative (${startMonthName} to ${endMonthName})`
    : `חודשי - Monthly (${endMonthName})`;
  sheet.mergeCells(`A${subRow}:B${subRow}`);
  sheet.getCell(`A${subRow}`).value = label;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets - not relevant for companies
  sheet.mergeCells(`D${subRow}:E${subRow}`);
  sheet.getCell(`D${subRow}`).value = 'non - לא רלוונטי';
  sheet.getCell(`D${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year sub-header
  sheet.getCell(`G${subRow}`).value = 'Last year';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell(`H${subRow}`).value = 'change % / שינוי';
  sheet.getCell(`H${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`H${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+3)
  const headerRow = startRow + 3;
  sheet.getCell(`A${headerRow}`).value = 'company name';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`B${headerRow}`).value = 'gross premium';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell(`G${headerRow}`).value = 'gross premium';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'change %';
  sheet.getCell(`H${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`H${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Data rows (row startRow+4)
  let dataRow = startRow + 4;
  const firstDataRow = dataRow;

  companies.forEach(company => {
    const salesValue = dataType === 'cumulative' ? company.cumulative : company.monthly;
    sheet.getCell(`A${dataRow}`).value = company.name;
    sheet.getCell(`B${dataRow}`).value = salesValue;

    sheet.getCell(`G${dataRow}`).value = company.lastYear !== null ? company.lastYear : 'not yet';
    sheet.getCell(`H${dataRow}`).value = company.changePercent;

    // Apply styling
    ['B', 'G', 'H'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    sheet.getCell(`B${dataRow}`).numFmt = '#,##0';
    if (typeof sheet.getCell(`G${dataRow}`).value === 'number') {
      sheet.getCell(`G${dataRow}`).numFmt = '#,##0';
    }
    sheet.getCell(`H${dataRow}`).numFmt = '0.00%';

    dataRow++;
  });

  // Total row
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };

  ['A', 'B'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });
  sheet.getCell(`B${totalRow}`).numFmt = '#,##0';
}

/**
 * Elementary: Add Categories Section (replaces Departments)
 * Layout: A=Name, B=Sales | (C=sep) | D=Target, E=Achievement% | (F=sep) | G=LastYear, H=Change%
 */
function addElementaryCategoriesSection(sheet, categories, startRow, dataType, monthInfo = {}) {
  const { startMonthName = 'Jan', endMonthName = 'End' } = monthInfo;

  // Section header
  sheet.mergeCells(`A${startRow}:H${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'קטגוריות - Categories (Departments)';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Sub-headers (row startRow+1)
  const subRow = startRow + 1;
  const saleLabel = dataType === 'cumulative'
    ? `מצטבר - Cumulative (${startMonthName} to ${endMonthName})`
    : `חודשי - Monthly (${endMonthName})`;
  const targetLabel = dataType === 'cumulative'
    ? `Targets - Cumulative (${startMonthName} to ${endMonthName})`
    : `Targets - Monthly (${endMonthName})`;

  sheet.mergeCells(`A${subRow}:B${subRow}`);
  sheet.getCell(`A${subRow}`).value = saleLabel;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`D${subRow}:E${subRow}`);
  sheet.getCell(`D${subRow}`).value = targetLabel;
  sheet.getCell(`D${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${subRow}:H${subRow}`);
  sheet.getCell(`G${subRow}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+2) - same as departments in life insurance but for single metric
  const headerRow = startRow + 2;
  // Sales group
  sheet.getCell(`A${headerRow}`).value = 'category name';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  sheet.getCell(`B${headerRow}`).value = 'gross premium';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets group
  sheet.getCell(`D${headerRow}`).value = 'target';
  sheet.getCell(`D${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`D${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`E${headerRow}`).value = 'achievement %';
  sheet.getCell(`E${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`E${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year group
  sheet.getCell(`G${headerRow}`).value = 'last year';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'change %';
  sheet.getCell(`H${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`H${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Data rows (row startRow+3)
  let dataRow = startRow + 3;
  const firstDataRow = dataRow;

  categories.forEach(cat => {
    const salesValue = dataType === 'cumulative' ? cat.cumulative : cat.monthly;
    const targetValue = dataType === 'cumulative' ? cat.cumulativeTarget : cat.monthlyTarget;

    sheet.getCell(`A${dataRow}`).value = cat.name;
    sheet.getCell(`B${dataRow}`).value = salesValue;

    sheet.getCell(`D${dataRow}`).value = targetValue;
    sheet.getCell(`E${dataRow}`).value = { formula: `IF(D${dataRow}=0,"",B${dataRow}/D${dataRow})` };

    sheet.getCell(`G${dataRow}`).value = cat.lastYear !== null ? cat.lastYear : 'not yet';
    sheet.getCell(`H${dataRow}`).value = cat.changePercent;

    // Apply styling
    ['B', 'D', 'E', 'G', 'H'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    ['B', 'D'].forEach(col => { sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0'; });
    sheet.getCell(`E${dataRow}`).numFmt = '0.00%';
    if (typeof sheet.getCell(`G${dataRow}`).value === 'number') {
      sheet.getCell(`G${dataRow}`).numFmt = '#,##0';
    }
    sheet.getCell(`H${dataRow}`).numFmt = '0.00%';

    dataRow++;
  });

  // Total row
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };
  sheet.getCell(`D${totalRow}`).value = { formula: `SUM(D${firstDataRow}:D${dataRow - 1})` };
  sheet.getCell(`E${totalRow}`).value = { formula: `IF(D${totalRow}=0,"",B${totalRow}/D${totalRow})` };

  ['A', 'B', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });
  ['B', 'D'].forEach(col => { sheet.getCell(`${col}${totalRow}`).numFmt = '#,##0'; });
  sheet.getCell(`E${totalRow}`).numFmt = '0.00%';
}

/**
 * Elementary: Add Sub-Categories Section (replaces Inspectors)
 * Layout: A=Name, B=Sales | (C=sep) | D=Target, E=Achievement% | (F=sep) | G=LastYear, H=Change%
 */
function addElementarySubCategoriesSection(sheet, subCategories, startRow, dataType, monthInfo = {}) {
  const { startMonthName = 'Jan', endMonthName = 'End' } = monthInfo;

  // Section header
  sheet.mergeCells(`A${startRow}:H${startRow}`);
  sheet.getCell(`A${startRow}`).value = 'תתי-קטגוריות - Sub-Categories';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Sub-headers (row startRow+1)
  const subRow = startRow + 1;
  const saleLabel = dataType === 'cumulative'
    ? `מצטבר - Cumulative (${startMonthName} to ${endMonthName})`
    : `חודשי - Monthly (${endMonthName})`;
  const targetLabel = dataType === 'cumulative'
    ? `Targets - Cumulative (${startMonthName} to ${endMonthName})`
    : `Targets - Monthly (${endMonthName})`;

  sheet.mergeCells(`A${subRow}:B${subRow}`);
  sheet.getCell(`A${subRow}`).value = saleLabel;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`D${subRow}:E${subRow}`);
  sheet.getCell(`D${subRow}`).value = targetLabel;
  sheet.getCell(`D${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${subRow}:H${subRow}`);
  sheet.getCell(`G${subRow}`).value = 'Versus last year - לעומת שנה שעברה';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+2)
  const headerRow = startRow + 2;
  // Sales group
  sheet.getCell(`A${headerRow}`).value = 'sub-category name';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  sheet.getCell(`B${headerRow}`).value = 'gross premium';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets group
  sheet.getCell(`D${headerRow}`).value = 'target';
  sheet.getCell(`D${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`D${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`E${headerRow}`).value = 'achievement %';
  sheet.getCell(`E${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`E${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year group
  sheet.getCell(`G${headerRow}`).value = 'last year';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'change %';
  sheet.getCell(`H${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`H${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Data rows (row startRow+3)
  let dataRow = startRow + 3;
  const firstDataRow = dataRow;

  subCategories.forEach(subCat => {
    const salesValue = dataType === 'cumulative' ? subCat.cumulative : subCat.monthly;
    const targetValue = dataType === 'cumulative' ? subCat.cumulativeTarget : subCat.monthlyTarget;

    sheet.getCell(`A${dataRow}`).value = subCat.name;
    sheet.getCell(`B${dataRow}`).value = salesValue;

    sheet.getCell(`D${dataRow}`).value = targetValue;
    sheet.getCell(`E${dataRow}`).value = { formula: `IF(D${dataRow}=0,"",B${dataRow}/D${dataRow})` };

    sheet.getCell(`G${dataRow}`).value = subCat.lastYear !== null ? subCat.lastYear : 'not yet';
    sheet.getCell(`H${dataRow}`).value = subCat.changePercent;

    // Apply styling
    ['B', 'D', 'E', 'G', 'H'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    ['B', 'D'].forEach(col => { sheet.getCell(`${col}${dataRow}`).numFmt = '#,##0'; });
    sheet.getCell(`E${dataRow}`).numFmt = '0.00%';
    if (typeof sheet.getCell(`G${dataRow}`).value === 'number') {
      sheet.getCell(`G${dataRow}`).numFmt = '#,##0';
    }
    sheet.getCell(`H${dataRow}`).numFmt = '0.00%';

    dataRow++;
  });

  // Total row
  const totalRow = dataRow;
  sheet.getCell(`A${totalRow}`).value = 'TOTAL';
  sheet.getCell(`A${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  sheet.getCell(`B${totalRow}`).value = { formula: `SUM(B${firstDataRow}:B${dataRow - 1})` };
  sheet.getCell(`D${totalRow}`).value = { formula: `SUM(D${firstDataRow}:D${dataRow - 1})` };
  sheet.getCell(`E${totalRow}`).value = { formula: `IF(D${totalRow}=0,"",B${totalRow}/D${totalRow})` };

  ['A', 'B', 'D', 'E'].forEach(col => {
    sheet.getCell(`${col}${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${totalRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  });
  ['B', 'D'].forEach(col => { sheet.getCell(`${col}${totalRow}`).numFmt = '#,##0'; });
  sheet.getCell(`E${totalRow}`).numFmt = '0.00%';
}

/**
 * Elementary: Add agent data row (single metric)
 * Monthly: B=Sales | (C=sep) | D=Target, E=Achievement% | (F=sep) | G=LastYear, H=Change%
 * Cumulative: (I=sep) | J=Sales | (K=sep) | L=Target, M=Achievement% | (N=sep) | O=LastYear, P=Change%
 */
function addElementaryAgentDataRow(sheet, row, agent) {
  sheet.getCell(`A${row}`).value = agent.name;
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  // Monthly data
  sheet.getCell(`B${row}`).value = agent.monthly.sales;
  // C is separator
  sheet.getCell(`D${row}`).value = agent.monthly.target;
  sheet.getCell(`E${row}`).value = { formula: `IF(D${row}=0,"",B${row}/D${row})` };
  // F is separator
  sheet.getCell(`G${row}`).value = agent.monthly.lastYear !== null ? agent.monthly.lastYear : 'not yet';
  sheet.getCell(`H${row}`).value = agent.monthly.change;

  // I is separator between Monthly and Cumulative

  // Cumulative data
  sheet.getCell(`J${row}`).value = agent.cumulative.sales;
  // K is separator
  sheet.getCell(`L${row}`).value = agent.cumulative.target;
  sheet.getCell(`M${row}`).value = { formula: `IF(L${row}=0,"",J${row}/L${row})` };
  // N is separator
  sheet.getCell(`O${row}`).value = agent.cumulative.lastYear !== null ? agent.cumulative.lastYear : 'not yet';
  sheet.getCell(`P${row}`).value = agent.cumulative.change;

  // Apply yellow fill to data columns
  const dataCols = ['B', 'D', 'E', 'G', 'H', 'J', 'L', 'M', 'O', 'P'];
  dataCols.forEach(col => {
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  });

  // Number formatting - amount columns
  ['B', 'D', 'J', 'L'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Last year columns (can be number or "not yet")
  ['G', 'O'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Percentage columns
  ['E', 'H', 'M', 'P'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

/**
 * Elementary: Add agent summary row
 * Columns match addElementaryAgentDataRow layout
 */
function addElementaryAgentSummaryRow(sheet, row, agentCount, agents) {
  const startRow = 6;
  const endRow = 6 + agentCount - 1;

  sheet.getCell(`A${row}`).value = 'TOTAL';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

  // Monthly: B=Sales, D=Target, E=Achievement, G=LastYear, H=Change
  sheet.getCell(`B${row}`).value = { formula: `SUM(B${startRow}:B${endRow})` };
  sheet.getCell(`D${row}`).value = { formula: `SUM(D${startRow}:D${endRow})` };
  sheet.getCell(`E${row}`).value = { formula: `IF(D${row}=0,"",B${row}/D${row})` };
  sheet.getCell(`G${row}`).value = { formula: `SUMIF(G${startRow}:G${endRow},"<>not yet")` };
  sheet.getCell(`H${row}`).value = { formula: `AVERAGE(H${startRow}:H${endRow})` };

  // Cumulative: J=Sales, L=Target, M=Achievement, O=LastYear, P=Change
  sheet.getCell(`J${row}`).value = { formula: `SUM(J${startRow}:J${endRow})` };
  sheet.getCell(`L${row}`).value = { formula: `SUM(L${startRow}:L${endRow})` };
  sheet.getCell(`M${row}`).value = { formula: `IF(L${row}=0,"",J${row}/L${row})` };
  sheet.getCell(`O${row}`).value = { formula: `SUMIF(O${startRow}:O${endRow},"<>not yet")` };
  sheet.getCell(`P${row}`).value = { formula: `AVERAGE(P${startRow}:P${endRow})` };

  // Apply styling
  const allCols = ['B', 'D', 'E', 'G', 'H', 'J', 'L', 'M', 'O', 'P'];
  allCols.forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  ['B', 'D', 'G', 'J', 'L', 'O'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });
  ['E', 'H', 'M', 'P'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

module.exports = router;
