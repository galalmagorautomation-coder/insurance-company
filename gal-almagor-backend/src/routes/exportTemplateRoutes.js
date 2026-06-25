/**
 * Template-Based Export Routes
 * Generates sophisticated Excel reports with multiple sheets and complex formatting
 */

const express = require('express');
const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');

const router = express.Router();

const LIFE_COMPANY_COLUMNS = {
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
  28: 'meitav_agent_id',
};

const ELEMENTARY_COMPANY_COLUMNS = {
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
  27: 'elementary_id_kash',
};

/**
 * Format an elementary-status boolean for display: true → "פעיל",
 * false → "לא פעיל", null/undefined → "ריק". Matches the agents page.
 */
function formatElementaryStatus(status) {
  if (status === null || status === undefined) return 'ריק';
  return status ? 'פעיל' : 'לא פעיל';
}

/**
 * Format a life-insurance status (agent_data.is_active text) for display.
 * Mirrors the Agents page statusMap so the export and the table agree:
 *   'active' / 'yes' / 'Yes'                 → 'פעיל'
 *   'inactive' / 'no' / 'No'                 → 'לא פעיל'
 *   'employee_gal_amagor'                    → 'עובד בגל אלמגור'
 *   'independent_agent'                      → 'סוכן עצמאי'
 *   'former_employee'                        → 'עובד לשעבר'
 *   'former_independent_agent'               → 'סוכן עצמאי לשעבר'
 *   null / unknown                           → 'ריק'
 */
function formatLifeInsuranceStatus(isActive) {
  if (isActive === null || isActive === undefined || isActive === '') return 'ריק';
  switch (isActive) {
    case 'active':
    case 'yes':
    case 'Yes':
      return 'פעיל';
    case 'inactive':
    case 'no':
    case 'No':
      return 'לא פעיל';
    case 'employee_gal_amagor':         return 'עובד בגל אלמגור';
    case 'independent_agent':           return 'סוכן עצמאי';
    case 'former_employee':             return 'עובד לשעבר';
    case 'former_independent_agent':    return 'סוכן עצמאי לשעבר';
    default:                            return 'ריק';
  }
}

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

  const unmappedAgents = await fetchUnmappedAgents({
    kind: 'life',
    startMonth,
    endMonth,
    company,
    companyMap,
  });

  return {
    filters: {
      dateRange: `${startMonth} - ${endMonth}`,
      company: company === 'all' ? 'All Companies' : companyMap[parseInt(company)] || company,
      department: department === 'all' ? 'All Departments' : department,
      agent: agent === 'all' ? 'All Agents' : agent,
      inspector: inspector === 'all' ? 'All Inspectors' : inspector
    },
    unmappedAgents,
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
      // Sheet 3 info columns. Life-insurance status mirrors the agents page,
      // which reads agent_data.is_active (text) \u2014 not life_insurance_license.
      lifeInsuranceStatus: agent.is_active,
      inspector: agent.inspector,
      department: agent.department,
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

  await createSheet1_SummaryCumulative(workbook, data);
  await createSheet2_MonthlyReport(workbook, data);
  await createSheet3_AgentsReport(workbook, data);
  createUnmappedAgentsSheet(workbook, data.unmappedAgents || [], 'life');

  return workbook;
}

/**
 * Create Sheet 1: summary- cumulative report
 */
async function createSheet1_SummaryCumulative(workbook, data) {
  const sheet = workbook.addWorksheet('דוח מצטבר');

  // Enable RTL (Right to Left) for Hebrew content
  sheet.views = [{
    rightToLeft: true
  }];

  // Set column widths (increased for better readability)
  sheet.columns = Array(25).fill({ width: 25 });

  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'מחלקה:';
  sheet.getCell('B5').value = data.filters.department || '';
  sheet.getCell('A6').value = 'סוכן:';
  sheet.getCell('B6').value = data.filters.agent || '';
  sheet.getCell('A7').value = 'מפקח:';
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
  const sheet = workbook.addWorksheet('דוח חודשי');

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

  sheet.getCell('A3').value = 'טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'מחלקה:';
  sheet.getCell('B5').value = data.filters.department || '';
  sheet.getCell('A6').value = 'סוכן:';
  sheet.getCell('B6').value = data.filters.agent || '';
  sheet.getCell('A7').value = 'מפקח:';
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
  const sheet = workbook.addWorksheet('דוח סוכנים');

  // Enable RTL (Right to Left) for Hebrew content
  sheet.views = [{
    rightToLeft: true
  }];

  // Set column widths for 50 columns (A-AO) - increased for better readability
  sheet.columns = Array(50).fill({ width: 25 });

  // Row 3: Main Section Headers
  // Columns A-D are agent identity (name, status, inspector, department).
  // Monthly section spans E-AB; cumulative section spans AD-BA.
  sheet.mergeCells('A3:AB3');
  sheet.getCell('A3').value = 'חודשי - החודש האחרון בטווח';
  sheet.getCell('A3').font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  sheet.mergeCells('AD3:BA3');
  sheet.getCell('AD3').value = 'מצטבר';
  sheet.getCell('AD3').font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell('AD3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('AD3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

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
  sheet.getCell(`A${startRow}`).value = 'חברות';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Group headers (row 11) - 3 separate tables
  const groupRow = startRow + 1;
  sheet.mergeCells(`A${groupRow}:E${groupRow}`);
  sheet.getCell(`A${groupRow}`).value = 'מכירות';
  sheet.getCell(`A${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${groupRow}:O${groupRow}`);
  sheet.getCell(`G${groupRow}`).value = 'יעדים';
  sheet.getCell(`G${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${groupRow}:Y${groupRow}`);
  sheet.getCell(`Q${groupRow}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`Q${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Sub-headers (row 13)
  const subRow = startRow + 3;
  const label = dataType === 'cumulative' ? 'מצטבר' : 'חודשי';
  sheet.mergeCells(`A${subRow}:E${subRow}`);
  sheet.getCell(`A${subRow}`).value = label;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets section - not relevant for companies
  sheet.mergeCells(`G${subRow}:J${subRow}`);
  sheet.getCell(`G${subRow}`).value = 'לא רלוונטי';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${subRow}:O${subRow}`);
  sheet.getCell(`L${subRow}`).value = 'לא רלוונטי';
  sheet.getCell(`L${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year section
  sheet.mergeCells(`Q${subRow}:T${subRow}`);
  sheet.getCell(`Q${subRow}`).value = 'שנה שעברה - מצטבר';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'שינוי לעומת אשתקד %';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 14)
  const headerRow = startRow + 4;
  ['שם חברה', 'פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A, B, C, D, E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q, R, S, T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
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
    // Mediho note: "זה לא ריסק, זה ריידרים"
    const displayName = company.name === 'מדיהו' ? 'מדיהו (זה לא ריסק, זה ריידרים)' : company.name;
    sheet.getCell(`A${dataRow}`).value = displayName;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`Q${dataRow}`).value = company.lastYear.pension !== null ? company.lastYear.pension : 'אין נתונים';
    sheet.getCell(`R${dataRow}`).value = company.lastYear.risk !== null ? company.lastYear.risk : 'אין נתונים';
    sheet.getCell(`S${dataRow}`).value = company.lastYear.finance !== null ? company.lastYear.finance : 'אין נתונים';
    sheet.getCell(`T${dataRow}`).value = company.lastYear.pensionTransfer !== null ? company.lastYear.pensionTransfer : 'אין נתונים';

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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  sheet.getCell(`A${startRow}`).value = 'מחלקות';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 22: Department options note (built from the actual department
  // values the agents have — not hardcoded — so newly-added departments
  // appear here without a code change.)
  const noteRow = startRow + 1;
  const deptNames = departments
    .map(d => d.name)
    .filter(n => n && n !== 'Unknown')
    .sort((a, b) => a.localeCompare(b, 'he'));
  const deptOptions = deptNames.length > 0 ? deptNames.join(', ') : '—';
  sheet.getCell(`A${noteRow}`).value = `אפשרויות למחלקות: ${deptOptions}`;
  sheet.getCell(`A${noteRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // Sub-headers (row 23)
  const subRow = startRow + 2;
  const saleLabel = dataType === 'cumulative' ? 'מצטבר' : 'חודשי';
  const targetLabel = dataType === 'cumulative' ? 'יעדים - מצטבר' : 'יעדים - חודשי';
  const achieveLabel = dataType === 'cumulative' ? 'השגת יעד - מצטבר %' : 'השגת יעד - חודשי %';

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
  sheet.getCell(`Q${subRow}`).value = 'שנה שעברה - מצטבר';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'שינוי לעומת אשתקד %';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 24)
  const headerRow = startRow + 3;
  ['שם מחלקה', 'פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A-E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(71 + i); // G-J
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(76 + i); // L-O
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q-T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
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

    sheet.getCell(`Q${dataRow}`).value = dept.lastYear.pension !== null ? dept.lastYear.pension : 'אין נתונים';
    sheet.getCell(`R${dataRow}`).value = dept.lastYear.risk !== null ? dept.lastYear.risk : 'אין נתונים';
    sheet.getCell(`S${dataRow}`).value = dept.lastYear.finance !== null ? dept.lastYear.finance : 'אין נתונים';
    sheet.getCell(`T${dataRow}`).value = dept.lastYear.pensionTransfer !== null ? dept.lastYear.pensionTransfer : 'אין נתונים';

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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  sheet.getCell(`A${startRow}`).value = 'מפקחים';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 31: Inspector options note (built dynamically from actual
  // inspector values — newly-added inspectors appear here without a
  // code change).
  const noteRow = startRow + 1;
  const inspNames = inspectors
    .map(i => i.name)
    .filter(n => n && n !== 'Unknown')
    .sort((a, b) => a.localeCompare(b, 'he'));
  const inspOptions = inspNames.length > 0 ? inspNames.join(', ') : '—';
  sheet.getCell(`A${noteRow}`).value = `אפשרויות למפקחים: ${inspOptions}`;
  sheet.getCell(`A${noteRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };

  // Sub-headers (row 32)
  const subRow = startRow + 2;
  const saleLabel = dataType === 'cumulative' ? 'מצטבר' : 'חודשי';
  const targetLabel = dataType === 'cumulative' ? 'יעדים - מצטבר' : 'יעדים - חודשי';
  const achieveLabel = dataType === 'cumulative' ? 'השגת יעד - מצטבר %' : 'השגת יעד - חודשי %';

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
  sheet.getCell(`Q${subRow}`).value = 'שנה שעברה - מצטבר';
  sheet.getCell(`Q${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Q${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Q${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`V${subRow}:Y${subRow}`);
  sheet.getCell(`V${subRow}`).value = 'שינוי לעומת אשתקד %';
  sheet.getCell(`V${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`V${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`V${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row 33)
  const headerRow = startRow + 3;
  ['שם מפקח', 'פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(65 + i); // A-E
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(71 + i); // G-J
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(76 + i); // L-O
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
    const col = String.fromCharCode(81 + i); // Q-T
    sheet.getCell(`${col}${headerRow}`).value = header;
    sheet.getCell(`${col}${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'].forEach((header, i) => {
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

    sheet.getCell(`Q${dataRow}`).value = insp.lastYear.pension !== null ? insp.lastYear.pension : 'אין נתונים';
    sheet.getCell(`R${dataRow}`).value = insp.lastYear.risk !== null ? insp.lastYear.risk : 'אין נתונים';
    sheet.getCell(`S${dataRow}`).value = insp.lastYear.finance !== null ? insp.lastYear.finance : 'אין נתונים';
    sheet.getCell(`T${dataRow}`).value = insp.lastYear.pensionTransfer !== null ? insp.lastYear.pensionTransfer : 'אין נתונים';

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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  // Columns A-D are agent identity (name, status, inspector, department);
  // product columns start at E. Group headers shifted +2 from the prior layout.
  // Monthly section
  sheet.mergeCells(`E${row}:H${row}`);
  sheet.getCell(`E${row}`).value = 'מכירות';
  sheet.getCell(`E${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`J${row}:R${row}`);
  sheet.getCell(`J${row}`).value = 'יעדים';
  sheet.getCell(`J${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`J${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`J${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`T${row}:AB${row}`);
  sheet.getCell(`T${row}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`T${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`T${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`T${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Cumulative section
  sheet.mergeCells(`AD${row}:AG${row}`);
  sheet.getCell(`AD${row}`).value = 'מכירות';
  sheet.getCell(`AD${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AD${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AD${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AI${row}:AQ${row}`);
  sheet.getCell(`AI${row}`).value = 'יעדים';
  sheet.getCell(`AI${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AI${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AI${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AS${row}:BA${row}`);
  sheet.getCell(`AS${row}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`AS${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`AS${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AS${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
}

function addAgentSubHeaders(sheet, row) {
  // All product blocks shifted +2 to leave room for the new C (inspector)
  // and D (department) info columns.
  // Monthly section sub-headers
  sheet.mergeCells(`E${row}:H${row}`);
  sheet.getCell(`E${row}`).value = 'חודשי - מכירות';
  sheet.getCell(`E${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`E${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`J${row}:M${row}`);
  sheet.getCell(`J${row}`).value = 'יעדים - חודשי';
  sheet.getCell(`J${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`J${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`J${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`O${row}:R${row}`);
  sheet.getCell(`O${row}`).value = 'השגת יעד - חודשי %';
  sheet.getCell(`O${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`O${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`O${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`T${row}:W${row}`);
  sheet.getCell(`T${row}`).value = 'שנה שעברה - חודשי';
  sheet.getCell(`T${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`T${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`T${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Y${row}:AB${row}`);
  sheet.getCell(`Y${row}`).value = 'שינוי לעומת אשתקד %';
  sheet.getCell(`Y${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`Y${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`Y${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Cumulative section sub-headers
  sheet.mergeCells(`AD${row}:AG${row}`);
  sheet.getCell(`AD${row}`).value = 'מצטבר - מכירות';
  sheet.getCell(`AD${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AD${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AD${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AI${row}:AL${row}`);
  sheet.getCell(`AI${row}`).value = 'יעדים - מצטבר';
  sheet.getCell(`AI${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AI${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AI${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AN${row}:AQ${row}`);
  sheet.getCell(`AN${row}`).value = 'השגת יעד - מצטבר %';
  sheet.getCell(`AN${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AN${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AN${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AS${row}:AV${row}`);
  sheet.getCell(`AS${row}`).value = 'שנה שעברה - מצטבר';
  sheet.getCell(`AS${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AS${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AS${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AX${row}:BA${row}`);
  sheet.getCell(`AX${row}`).value = 'שינוי לעומת אשתקד %';
  sheet.getCell(`AX${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AX${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AX${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
}

function addAgentColumnHeaders(sheet, row) {
  const categories = ['פנסיה', 'ריסק', 'פיננסי', 'ניוד פנסיה'];

  const titleCell = (col, label) => {
    sheet.getCell(`${col}${row}`).value = label;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  };

  // Agent identity columns
  titleCell('A', 'שם סוכן');
  titleCell('B', 'סטטוס ביטוח חיים');  // populated per-row from agent.lifeInsuranceStatus
  titleCell('C', 'מפקח');               // agent.inspector
  titleCell('D', 'מחלקה');              // agent.department

  // Product blocks shifted +2 from the prior layout to leave room for C and D.
  const groups = [
    ['E','F','G','H'],   // monthly sales
    ['J','K','L','M'],   // monthly targets
    ['O','P','Q','R'],   // monthly achievement
    ['T','U','V','W'],   // monthly last year
    ['Y','Z','AA','AB'], // monthly change
    ['AD','AE','AF','AG'], // cumulative sales
    ['AI','AJ','AK','AL'], // cumulative targets
    ['AN','AO','AP','AQ'], // cumulative achievement
    ['AS','AT','AU','AV'], // cumulative last year
    ['AX','AY','AZ','BA'], // cumulative change
  ];
  groups.forEach(cols => cols.forEach((col, i) => titleCell(col, categories[i])));
}

function addAgentDataRow(sheet, row, agent) {
  // Agent identity columns (A-D)
  sheet.getCell(`A${row}`).value = agent.name;
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  sheet.getCell(`B${row}`).value = formatLifeInsuranceStatus(agent.lifeInsuranceStatus);
  sheet.getCell(`B${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  sheet.getCell(`B${row}`).alignment = { horizontal: 'center' };

  sheet.getCell(`C${row}`).value = agent.inspector || '';
  sheet.getCell(`C${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  sheet.getCell(`D${row}`).value = agent.department || '';
  sheet.getCell(`D${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  // Product columns shifted +2 from the prior layout.
  // Monthly sales (E-H)
  sheet.getCell(`E${row}`).value = agent.monthly.sales.pension;
  sheet.getCell(`F${row}`).value = agent.monthly.sales.risk;
  sheet.getCell(`G${row}`).value = agent.monthly.sales.finance;
  sheet.getCell(`H${row}`).value = agent.monthly.sales.pensionTransfer;

  // I is separator column

  // Monthly targets (J-M)
  sheet.getCell(`J${row}`).value = agent.monthly.targets.pension;
  sheet.getCell(`K${row}`).value = agent.monthly.targets.risk;
  sheet.getCell(`L${row}`).value = agent.monthly.targets.finance;
  sheet.getCell(`M${row}`).value = agent.monthly.targets.pensionTransfer;

  // N is separator column

  // Monthly achievement formulas (O-R): Monthly Sales / Monthly Target
  sheet.getCell(`O${row}`).value = { formula: `IF(J${row}=0,"",E${row}/J${row})` };
  sheet.getCell(`P${row}`).value = { formula: `IF(K${row}=0,"",F${row}/K${row})` };
  sheet.getCell(`Q${row}`).value = { formula: `IF(L${row}=0,"",G${row}/L${row})` };
  sheet.getCell(`R${row}`).value = { formula: `IF(M${row}=0,"",H${row}/M${row})` };

  // S is separator column

  // Monthly last year (T-W)
  sheet.getCell(`T${row}`).value = agent.monthly.lastYear.pension !== null ? agent.monthly.lastYear.pension : 'אין נתונים';
  sheet.getCell(`U${row}`).value = agent.monthly.lastYear.risk !== null ? agent.monthly.lastYear.risk : 'אין נתונים';
  sheet.getCell(`V${row}`).value = agent.monthly.lastYear.finance !== null ? agent.monthly.lastYear.finance : 'אין נתונים';
  sheet.getCell(`W${row}`).value = agent.monthly.lastYear.pensionTransfer !== null ? agent.monthly.lastYear.pensionTransfer : 'אין נתונים';

  // X is separator column

  // Monthly change (Y-AB)
  sheet.getCell(`Y${row}`).value = agent.monthly.change.pension;
  sheet.getCell(`Z${row}`).value = agent.monthly.change.risk;
  sheet.getCell(`AA${row}`).value = agent.monthly.change.finance;
  sheet.getCell(`AB${row}`).value = agent.monthly.change.pensionTransfer;

  // AC is separator column

  // Cumulative sales (AD-AG)
  sheet.getCell(`AD${row}`).value = agent.cumulative.sales.pension;
  sheet.getCell(`AE${row}`).value = agent.cumulative.sales.risk;
  sheet.getCell(`AF${row}`).value = agent.cumulative.sales.finance;
  sheet.getCell(`AG${row}`).value = agent.cumulative.sales.pensionTransfer;

  // AH is separator column

  // Cumulative targets (AI-AL)
  sheet.getCell(`AI${row}`).value = agent.cumulative.targets.pension;
  sheet.getCell(`AJ${row}`).value = agent.cumulative.targets.risk;
  sheet.getCell(`AK${row}`).value = agent.cumulative.targets.finance;
  sheet.getCell(`AL${row}`).value = agent.cumulative.targets.pensionTransfer;

  // AM is separator column

  // Cumulative achievement formulas (AN-AQ): Cumulative Sales / Cumulative Target
  sheet.getCell(`AN${row}`).value = { formula: `IF(AI${row}=0,"",AD${row}/AI${row})` };
  sheet.getCell(`AO${row}`).value = { formula: `IF(AJ${row}=0,"",AE${row}/AJ${row})` };
  sheet.getCell(`AP${row}`).value = { formula: `IF(AK${row}=0,"",AF${row}/AK${row})` };
  sheet.getCell(`AQ${row}`).value = { formula: `IF(AL${row}=0,"",AG${row}/AL${row})` };

  // AR is separator column

  // Cumulative last year (AS-AV)
  sheet.getCell(`AS${row}`).value = agent.cumulative.lastYear.pension !== null ? agent.cumulative.lastYear.pension : 'אין נתונים';
  sheet.getCell(`AT${row}`).value = agent.cumulative.lastYear.risk !== null ? agent.cumulative.lastYear.risk : 'אין נתונים';
  sheet.getCell(`AU${row}`).value = agent.cumulative.lastYear.finance !== null ? agent.cumulative.lastYear.finance : 'אין נתונים';
  sheet.getCell(`AV${row}`).value = agent.cumulative.lastYear.pensionTransfer !== null ? agent.cumulative.lastYear.pensionTransfer : 'אין נתונים';

  // AW is separator column

  // Cumulative change (AX-BA)
  sheet.getCell(`AX${row}`).value = agent.cumulative.change.pension;
  sheet.getCell(`AY${row}`).value = agent.cumulative.change.risk;
  sheet.getCell(`AZ${row}`).value = agent.cumulative.change.finance;
  sheet.getCell(`BA${row}`).value = agent.cumulative.change.pensionTransfer;

  // Apply yellow fill to product data columns (separators: I, N, S, X, AC, AH, AM, AR, AW)
  const dataCols = ['E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'Y', 'Z', 'AA', 'AB',
                    'AD', 'AE', 'AF', 'AG', 'AI', 'AJ', 'AK', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AS', 'AT', 'AU', 'AV', 'AX', 'AY', 'AZ', 'BA'];
  dataCols.forEach(col => {
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  });

  // Apply number formatting
  // Amount columns: Sales, Targets, and Last Year
  ['E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'AD', 'AE', 'AF', 'AG', 'AI', 'AJ', 'AK', 'AL'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Last Year columns (can be number or "not yet")
  ['T', 'U', 'V', 'W', 'AS', 'AT', 'AU', 'AV'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Percentage columns: Achievement and Change
  ['O', 'P', 'Q', 'R', 'Y', 'Z', 'AA', 'AB', 'AN', 'AO', 'AP', 'AQ', 'AX', 'AY', 'AZ', 'BA'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

function addAgentSummaryRow(sheet, row, agentCount, agents) {
  const startRow = 8;
  const endRow = 8 + agentCount - 1;

  sheet.getCell(`A${row}`).value = 'סה"כ';
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

  // Product blocks shifted +2 from the prior layout to leave room for C (inspector)
  // and D (department) info columns added to each data row.

  // Monthly sales (E-H) - Write calculated values with formulas as backup
  sheet.getCell(`E${row}`).value = totals.monthly.sales.pension;
  sheet.getCell(`E${row}`).formula = `SUM(E${startRow}:E${endRow})`;
  sheet.getCell(`F${row}`).value = totals.monthly.sales.risk;
  sheet.getCell(`F${row}`).formula = `SUM(F${startRow}:F${endRow})`;
  sheet.getCell(`G${row}`).value = totals.monthly.sales.finance;
  sheet.getCell(`G${row}`).formula = `SUM(G${startRow}:G${endRow})`;
  sheet.getCell(`H${row}`).value = totals.monthly.sales.pensionTransfer;
  sheet.getCell(`H${row}`).formula = `SUM(H${startRow}:H${endRow})`;

  ['E', 'F', 'G', 'H'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly targets (J-M) - Write calculated values with formulas
  sheet.getCell(`J${row}`).value = totals.monthly.targets.pension;
  sheet.getCell(`J${row}`).formula = `SUM(J${startRow}:J${endRow})`;
  sheet.getCell(`K${row}`).value = totals.monthly.targets.risk;
  sheet.getCell(`K${row}`).formula = `SUM(K${startRow}:K${endRow})`;
  sheet.getCell(`L${row}`).value = totals.monthly.targets.finance;
  sheet.getCell(`L${row}`).formula = `SUM(L${startRow}:L${endRow})`;
  sheet.getCell(`M${row}`).value = totals.monthly.targets.pensionTransfer;
  sheet.getCell(`M${row}`).formula = `SUM(M${startRow}:M${endRow})`;

  ['J', 'K', 'L', 'M'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly achievement (O-R) - Calculate and write values with formulas
  const monthlyAchievement = {
    pension: totals.monthly.targets.pension > 0 ? totals.monthly.sales.pension / totals.monthly.targets.pension : null,
    risk: totals.monthly.targets.risk > 0 ? totals.monthly.sales.risk / totals.monthly.targets.risk : null,
    finance: totals.monthly.targets.finance > 0 ? totals.monthly.sales.finance / totals.monthly.targets.finance : null,
    pensionTransfer: totals.monthly.targets.pensionTransfer > 0 ? totals.monthly.sales.pensionTransfer / totals.monthly.targets.pensionTransfer : null
  };

  sheet.getCell(`O${row}`).value = monthlyAchievement.pension;
  sheet.getCell(`O${row}`).formula = `IF(J${row}=0,"",E${row}/J${row})`;
  sheet.getCell(`P${row}`).value = monthlyAchievement.risk;
  sheet.getCell(`P${row}`).formula = `IF(K${row}=0,"",F${row}/K${row})`;
  sheet.getCell(`Q${row}`).value = monthlyAchievement.finance;
  sheet.getCell(`Q${row}`).formula = `IF(L${row}=0,"",G${row}/L${row})`;
  sheet.getCell(`R${row}`).value = monthlyAchievement.pensionTransfer;
  sheet.getCell(`R${row}`).formula = `IF(M${row}=0,"",H${row}/M${row})`;

  ['O', 'P', 'Q', 'R'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Monthly last year (T-W) - SUM (using SUMIF to ignore text)
  ['T', 'U', 'V', 'W'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUMIF(${col}${startRow}:${col}${endRow},"<>אין נתונים")` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Monthly change (Y-AB) - AVERAGE
  ['Y', 'Z', 'AA', 'AB'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `AVERAGE(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Cumulative sales (AD-AG)
  sheet.getCell(`AD${row}`).value = totals.cumulative.sales.pension;
  sheet.getCell(`AD${row}`).formula = `SUM(AD${startRow}:AD${endRow})`;
  sheet.getCell(`AE${row}`).value = totals.cumulative.sales.risk;
  sheet.getCell(`AE${row}`).formula = `SUM(AE${startRow}:AE${endRow})`;
  sheet.getCell(`AF${row}`).value = totals.cumulative.sales.finance;
  sheet.getCell(`AF${row}`).formula = `SUM(AF${startRow}:AF${endRow})`;
  sheet.getCell(`AG${row}`).value = totals.cumulative.sales.pensionTransfer;
  sheet.getCell(`AG${row}`).formula = `SUM(AG${startRow}:AG${endRow})`;

  ['AD', 'AE', 'AF', 'AG'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative targets (AI-AL)
  sheet.getCell(`AI${row}`).value = totals.cumulative.targets.pension;
  sheet.getCell(`AI${row}`).formula = `SUM(AI${startRow}:AI${endRow})`;
  sheet.getCell(`AJ${row}`).value = totals.cumulative.targets.risk;
  sheet.getCell(`AJ${row}`).formula = `SUM(AJ${startRow}:AJ${endRow})`;
  sheet.getCell(`AK${row}`).value = totals.cumulative.targets.finance;
  sheet.getCell(`AK${row}`).formula = `SUM(AK${startRow}:AK${endRow})`;
  sheet.getCell(`AL${row}`).value = totals.cumulative.targets.pensionTransfer;
  sheet.getCell(`AL${row}`).formula = `SUM(AL${startRow}:AL${endRow})`;

  ['AI', 'AJ', 'AK', 'AL'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative achievement (AN-AQ)
  const cumulativeAchievement = {
    pension: totals.cumulative.targets.pension > 0 ? totals.cumulative.sales.pension / totals.cumulative.targets.pension : null,
    risk: totals.cumulative.targets.risk > 0 ? totals.cumulative.sales.risk / totals.cumulative.targets.risk : null,
    finance: totals.cumulative.targets.finance > 0 ? totals.cumulative.sales.finance / totals.cumulative.targets.finance : null,
    pensionTransfer: totals.cumulative.targets.pensionTransfer > 0 ? totals.cumulative.sales.pensionTransfer / totals.cumulative.targets.pensionTransfer : null
  };

  sheet.getCell(`AN${row}`).value = cumulativeAchievement.pension;
  sheet.getCell(`AN${row}`).formula = `IF(AI${row}=0,"",AD${row}/AI${row})`;
  sheet.getCell(`AO${row}`).value = cumulativeAchievement.risk;
  sheet.getCell(`AO${row}`).formula = `IF(AJ${row}=0,"",AE${row}/AJ${row})`;
  sheet.getCell(`AP${row}`).value = cumulativeAchievement.finance;
  sheet.getCell(`AP${row}`).formula = `IF(AK${row}=0,"",AF${row}/AK${row})`;
  sheet.getCell(`AQ${row}`).value = cumulativeAchievement.pensionTransfer;
  sheet.getCell(`AQ${row}`).formula = `IF(AL${row}=0,"",AG${row}/AL${row})`;

  ['AN', 'AO', 'AP', 'AQ'].forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });

  // Cumulative last year (AS-AV) - SUM (using SUMIF to ignore text)
  ['AS', 'AT', 'AU', 'AV'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUMIF(${col}${startRow}:${col}${endRow},"<>אין נתונים")` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });

  // Cumulative change (AX-BA) - AVERAGE
  ['AX', 'AY', 'AZ', 'BA'].forEach(col => {
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
      // The "קטגוריות" section in the elementary export was historically
      // grouped by agent_data.category (3 values), but the Agents sheet
      // column D shows agent_data.department (the column boss actually
      // edits, 5+ values). Boss flagged the mismatch — switch the
      // grouping source to `department` so the section labels match
      // what he sees in column D.
      category: a.department || 'Unknown',
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

  const unmappedAgents = await fetchUnmappedAgents({
    kind: 'elementary',
    startMonth,
    endMonth,
    company,
    companyMap,
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
    unmappedAgents,
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
      // Match by department to mirror the agentMap rewrite above —
      // the section grouping is now keyed off the department column,
      // not the legacy category column.
      if ((agent.department || 'Unknown') === name) {
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
      // Sheet 3 info columns (Elementary report).
      elementaryStatus: agent.elementary_status,
      inspector: agent.inspector,
      department: agent.department,
      subCategory: agent.sub_category,
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
  createUnmappedAgentsSheet(workbook, data.unmappedAgents || [], 'elementary');

  return workbook;
}

/**
 * Create Elementary Sheet 1: summary - cumulative report
 */
async function createElementarySheet1_SummaryCumulative(workbook, data) {
  const sheet = workbook.addWorksheet('דוח מצטבר');

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(25).fill({ width: 50 });

  // Get month names for labels
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
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

  sheet.getCell('A3').value = 'טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'קטגוריה:';
  sheet.getCell('B5').value = data.filters.category || '';
  sheet.getCell('A6').value = 'תת-קטגוריה:';
  sheet.getCell('B6').value = data.filters.sub_category || '';
  sheet.getCell('A7').value = 'סוכן:';
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
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const startMonth = data.startMonth || '';
  const lastMonth = data.lastMonth || '';
  const [startYear, startMonthNum] = startMonth.split('-');
  const [year, monthNum] = lastMonth.split('-');
  const startMonthName = startMonthNum ? monthNames[parseInt(startMonthNum) - 1] : 'Jan';
  const endMonthName = monthNum ? monthNames[parseInt(monthNum) - 1] : '';
  const monthInfo = { startMonthName, endMonthName };

  const sheetTitle = endMonthName ? `דוח חודשי - ${endMonthName} ${year}` : 'דוח חודשי';

  const sheet = workbook.addWorksheet(sheetTitle);

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(25).fill({ width: 50 });

  // Row 2-7: Filter Section
  sheet.getCell('A2').value = '🔍 פילטרים';
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FF2E7D8A' } };

  sheet.getCell('A3').value = 'טווח תאריכים:';
  sheet.getCell('B3').value = data.filters.dateRange || '';
  sheet.getCell('A4').value = 'חברה:';
  sheet.getCell('B4').value = data.filters.company || '';
  sheet.getCell('A5').value = 'קטגוריה:';
  sheet.getCell('B5').value = data.filters.category || '';
  sheet.getCell('A6').value = 'תת-קטגוריה:';
  sheet.getCell('B6').value = data.filters.sub_category || '';
  sheet.getCell('A7').value = 'סוכן:';
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
  const sheet = workbook.addWorksheet('דוח סוכנים');

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = Array(50).fill({ width: 35 });

  // Get month names for labels
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const startMonth = data.startMonth || '';
  const lastMonth = data.lastMonth || '';
  const [startYear, startMonthNum] = startMonth.split('-');
  const [endYear, endMonthNum] = lastMonth.split('-');
  const startMonthName = startMonthNum ? monthNames[parseInt(startMonthNum) - 1] : 'Jan';
  const endMonthName = endMonthNum ? monthNames[parseInt(endMonthNum) - 1] : 'End';

  // Layout (after adding identity columns A-E):
  // A(name), B(status), C(inspector), D(department), E(sub-dept) |
  //   Monthly:    F(sales) | G(sep) | H(target), I(achievement%) | J(sep) | K(lastYear), L(change%)
  //   | M(sep) |
  //   Cumulative: N(sales) | O(sep) | P(target), Q(achievement%) | R(sep) | S(lastYear), T(change%)

  // Row 3: Main Section Headers (Monthly spans A-L, Cumulative spans N-T)
  sheet.mergeCells('A3:L3');
  sheet.getCell('A3').value = `חודשי (${endMonthName})`;
  sheet.getCell('A3').font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  sheet.mergeCells('N3:T3');
  sheet.getCell('N3').value = `מצטבר (${startMonthName} עד ${endMonthName})`;
  sheet.getCell('N3').font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell('N3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('N3').fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Row 4: Group Headers under Monthly (shifted +3 to make room for C/D/E identity cols)
  sheet.getCell('F4').value = 'מכירות';
  sheet.getCell('F4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('F4').alignment = { horizontal: 'center' };
  sheet.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('H4:I4');
  sheet.getCell('H4').value = 'יעדים';
  sheet.getCell('H4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('H4').alignment = { horizontal: 'center' };
  sheet.getCell('H4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('K4:L4');
  sheet.getCell('K4').value = 'לעומת שנה שעברה';
  sheet.getCell('K4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('K4').alignment = { horizontal: 'center' };
  sheet.getCell('K4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Row 4: Group Headers under Cumulative (shifted +3)
  sheet.getCell('N4').value = 'מכירות';
  sheet.getCell('N4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('N4').alignment = { horizontal: 'center' };
  sheet.getCell('N4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('P4:Q4');
  sheet.getCell('P4').value = 'יעדים';
  sheet.getCell('P4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('P4').alignment = { horizontal: 'center' };
  sheet.getCell('P4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells('S4:T4');
  sheet.getCell('S4').value = 'לעומת שנה שעברה';
  sheet.getCell('S4').font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell('S4').alignment = { horizontal: 'center' };
  sheet.getCell('S4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Row 5: Column-level headers
  const elemTitleCell = (col, label) => {
    sheet.getCell(`${col}5`).value = label;
    sheet.getCell(`${col}5`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}5`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  };

  // Identity columns (A-E)
  elemTitleCell('A', 'שם סוכן');
  elemTitleCell('B', 'סטטוס אלמנטרי');     // from agent.elementaryStatus
  elemTitleCell('C', 'מפקח');               // agent.inspector
  elemTitleCell('D', 'מחלקה');              // agent.department
  elemTitleCell('E', 'תת-מחלקה');           // agent.subCategory

  // Monthly (shifted +3: F=sales, H=target, I=achievement, K=lastYear, L=change)
  elemTitleCell('F', 'פרמיה ברוטו');
  elemTitleCell('H', 'יעד');
  elemTitleCell('I', 'השגת יעד %');
  elemTitleCell('K', 'שנה שעברה');
  elemTitleCell('L', 'שינוי %');

  // Cumulative (shifted +3: N=sales, P=target, Q=achievement, S=lastYear, T=change)
  elemTitleCell('N', 'פרמיה ברוטו');
  elemTitleCell('P', 'יעד');
  elemTitleCell('Q', 'השגת יעד %');
  elemTitleCell('S', 'שנה שעברה');
  elemTitleCell('T', 'שינוי %');

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
  sheet.getCell(`A${startRow}`).value = 'חברות';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Group headers (row startRow+1) - 3 groups
  const groupRow = startRow + 1;
  sheet.mergeCells(`A${groupRow}:B${groupRow}`);
  sheet.getCell(`A${groupRow}`).value = 'מכירות';
  sheet.getCell(`A${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`D${groupRow}:E${groupRow}`);
  sheet.getCell(`D${groupRow}`).value = 'יעדים';
  sheet.getCell(`D${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${groupRow}:H${groupRow}`);
  sheet.getCell(`G${groupRow}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`G${groupRow}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${groupRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${groupRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Sub-headers (row startRow+2) - directly under group headers, no empty row
  const subRow = startRow + 2;
  const label = dataType === 'cumulative'
    ? `מצטבר (${startMonthName} עד ${endMonthName})`
    : `חודשי (${endMonthName})`;
  sheet.mergeCells(`A${subRow}:B${subRow}`);
  sheet.getCell(`A${subRow}`).value = label;
  sheet.getCell(`A${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets - not relevant for companies
  sheet.mergeCells(`D${subRow}:E${subRow}`);
  sheet.getCell(`D${subRow}`).value = 'לא רלוונטי';
  sheet.getCell(`D${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`D${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`D${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year sub-header
  sheet.getCell(`G${subRow}`).value = 'שנה שעברה';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell(`H${subRow}`).value = 'שינוי %';
  sheet.getCell(`H${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`H${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+3)
  const headerRow = startRow + 3;
  sheet.getCell(`A${headerRow}`).value = 'שם חברה';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`B${headerRow}`).value = 'פרמיה ברוטו';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.getCell(`G${headerRow}`).value = 'פרמיה ברוטו';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'שינוי %';
  sheet.getCell(`H${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`H${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Data rows (row startRow+4)
  let dataRow = startRow + 4;
  const firstDataRow = dataRow;

  companies.forEach(company => {
    const salesValue = dataType === 'cumulative' ? company.cumulative : company.monthly;
    // Mediho note: "זה לא ריסק, זה ריידרים"
    const displayName = company.name === 'מדיהו' ? 'מדיהו (זה לא ריסק, זה ריידרים)' : company.name;
    sheet.getCell(`A${dataRow}`).value = displayName;
    sheet.getCell(`B${dataRow}`).value = salesValue;

    sheet.getCell(`G${dataRow}`).value = company.lastYear !== null ? company.lastYear : 'אין נתונים';
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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  sheet.getCell(`A${startRow}`).value = 'קטגוריות';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Sub-headers (row startRow+1)
  const subRow = startRow + 1;
  const saleLabel = dataType === 'cumulative'
    ? `מצטבר (${startMonthName} עד ${endMonthName})`
    : `חודשי (${endMonthName})`;
  const targetLabel = dataType === 'cumulative'
    ? `יעדים - מצטבר (${startMonthName} עד ${endMonthName})`
    : `יעדים - חודשי (${endMonthName})`;

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
  sheet.getCell(`G${subRow}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+2) - same as departments in life insurance but for single metric
  const headerRow = startRow + 2;
  // Sales group
  sheet.getCell(`A${headerRow}`).value = 'שם קטגוריה';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  sheet.getCell(`B${headerRow}`).value = 'פרמיה ברוטו';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets group
  sheet.getCell(`D${headerRow}`).value = 'יעד';
  sheet.getCell(`D${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`D${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`E${headerRow}`).value = 'השגת יעד %';
  sheet.getCell(`E${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`E${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year group
  sheet.getCell(`G${headerRow}`).value = 'שנה שעברה';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'שינוי %';
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

    sheet.getCell(`G${dataRow}`).value = cat.lastYear !== null ? cat.lastYear : 'אין נתונים';
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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  sheet.getCell(`A${startRow}`).value = 'תתי-קטגוריות';
  sheet.getCell(`A${startRow}`).font = { name: 'Arial', size: 48, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${startRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };

  // Sub-headers (row startRow+1)
  const subRow = startRow + 1;
  const saleLabel = dataType === 'cumulative'
    ? `מצטבר (${startMonthName} עד ${endMonthName})`
    : `חודשי (${endMonthName})`;
  const targetLabel = dataType === 'cumulative'
    ? `יעדים - מצטבר (${startMonthName} עד ${endMonthName})`
    : `יעדים - חודשי (${endMonthName})`;

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
  sheet.getCell(`G${subRow}`).value = 'לעומת שנה שעברה';
  sheet.getCell(`G${subRow}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${subRow}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${subRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Column headers (row startRow+2)
  const headerRow = startRow + 2;
  // Sales group
  sheet.getCell(`A${headerRow}`).value = 'שם תת-קטגוריה';
  sheet.getCell(`A${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`A${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 2 } };
  sheet.getCell(`B${headerRow}`).value = 'פרמיה ברוטו';
  sheet.getCell(`B${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`B${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Targets group
  sheet.getCell(`D${headerRow}`).value = 'יעד';
  sheet.getCell(`D${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`D${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`E${headerRow}`).value = 'השגת יעד %';
  sheet.getCell(`E${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`E${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // Last year group
  sheet.getCell(`G${headerRow}`).value = 'שנה שעברה';
  sheet.getCell(`G${headerRow}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
  sheet.getCell(`G${headerRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  sheet.getCell(`H${headerRow}`).value = 'שינוי %';
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

    sheet.getCell(`G${dataRow}`).value = subCat.lastYear !== null ? subCat.lastYear : 'אין נתונים';
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
  sheet.getCell(`A${totalRow}`).value = 'סה"כ';
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
  // Identity columns (A-E)
  sheet.getCell(`A${row}`).value = agent.name;
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  sheet.getCell(`B${row}`).value = formatElementaryStatus(agent.elementaryStatus);
  sheet.getCell(`B${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  sheet.getCell(`B${row}`).alignment = { horizontal: 'center' };

  sheet.getCell(`C${row}`).value = agent.inspector || '';
  sheet.getCell(`C${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  sheet.getCell(`D${row}`).value = agent.department || '';
  sheet.getCell(`D${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  sheet.getCell(`E${row}`).value = agent.subCategory || '';
  sheet.getCell(`E${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };

  // Monthly data (shifted +3: F=sales, H=target, I=achievement, K=lastYear, L=change)
  sheet.getCell(`F${row}`).value = agent.monthly.sales;
  // G is separator
  sheet.getCell(`H${row}`).value = agent.monthly.target;
  sheet.getCell(`I${row}`).value = { formula: `IF(H${row}=0,"",F${row}/H${row})` };
  // J is separator
  sheet.getCell(`K${row}`).value = agent.monthly.lastYear !== null ? agent.monthly.lastYear : 'אין נתונים';
  sheet.getCell(`L${row}`).value = agent.monthly.change;

  // M is separator between Monthly and Cumulative

  // Cumulative data (shifted +3: N=sales, P=target, Q=achievement, S=lastYear, T=change)
  sheet.getCell(`N${row}`).value = agent.cumulative.sales;
  // O is separator
  sheet.getCell(`P${row}`).value = agent.cumulative.target;
  sheet.getCell(`Q${row}`).value = { formula: `IF(P${row}=0,"",N${row}/P${row})` };
  // R is separator
  sheet.getCell(`S${row}`).value = agent.cumulative.lastYear !== null ? agent.cumulative.lastYear : 'אין נתונים';
  sheet.getCell(`T${row}`).value = agent.cumulative.change;

  // Apply yellow fill to data columns
  const dataCols = ['F', 'H', 'I', 'K', 'L', 'N', 'P', 'Q', 'S', 'T'];
  dataCols.forEach(col => {
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  });

  // Number formatting - amount columns
  ['F', 'H', 'N', 'P'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Last year columns (can be number or "not yet")
  ['K', 'S'].forEach(col => {
    if (typeof sheet.getCell(`${col}${row}`).value === 'number') {
      sheet.getCell(`${col}${row}`).numFmt = '#,##0';
    }
  });
  // Percentage columns
  ['I', 'L', 'Q', 'T'].forEach(col => {
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

  sheet.getCell(`A${row}`).value = 'סה"כ';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

  // Identity columns A-E are populated per agent on data rows; summary leaves them blank.
  // Monthly: F=Sales, H=Target, I=Achievement, K=LastYear, L=Change
  sheet.getCell(`F${row}`).value = { formula: `SUM(F${startRow}:F${endRow})` };
  sheet.getCell(`H${row}`).value = { formula: `SUM(H${startRow}:H${endRow})` };
  sheet.getCell(`I${row}`).value = { formula: `IF(H${row}=0,"",F${row}/H${row})` };
  sheet.getCell(`K${row}`).value = { formula: `SUMIF(K${startRow}:K${endRow},"<>אין נתונים")` };
  sheet.getCell(`L${row}`).value = { formula: `AVERAGE(L${startRow}:L${endRow})` };

  // Cumulative: N=Sales, P=Target, Q=Achievement, S=LastYear, T=Change
  sheet.getCell(`N${row}`).value = { formula: `SUM(N${startRow}:N${endRow})` };
  sheet.getCell(`P${row}`).value = { formula: `SUM(P${startRow}:P${endRow})` };
  sheet.getCell(`Q${row}`).value = { formula: `IF(P${row}=0,"",N${row}/P${row})` };
  sheet.getCell(`S${row}`).value = { formula: `SUMIF(S${startRow}:S${endRow},"<>אין נתונים")` };
  sheet.getCell(`T${row}`).value = { formula: `AVERAGE(T${startRow}:T${endRow})` };

  // Apply styling
  const allCols = ['F', 'H', 'I', 'K', 'L', 'N', 'P', 'Q', 'S', 'T'];
  allCols.forEach(col => {
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  ['F', 'H', 'K', 'N', 'P', 'S'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '#,##0';
  });
  ['I', 'L', 'Q', 'T'].forEach(col => {
    sheet.getCell(`${col}${row}`).numFmt = '0.00%';
  });
}

/**
 * Fetch unmapped agent rows for a date range. For each company we
 * collect the known agent-number list out of agent_data, then pull
 * raw rows in that range whose agent_number is NOT in that list.
 * Returns one entry per (company, agent_number) with totals.
 */
async function fetchUnmappedAgents({ kind, startMonth, endMonth, company, companyMap }) {
  const isElementary = kind === 'elementary';
  const columnMap = isElementary ? ELEMENTARY_COMPANY_COLUMNS : LIFE_COMPANY_COLUMNS;
  const rawTable = isElementary ? 'raw_data_elementary' : 'raw_data';

  const companyIds = (company && company !== 'all')
    ? [parseInt(company)].filter(id => columnMap[id])
    : Object.keys(columnMap).map(Number);

  const results = [];
  const PAGE_SIZE = 1000;

  for (const cid of companyIds) {
    const agentIdColumn = columnMap[cid];

    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select(agentIdColumn)
      .contains('company_id', [cid]);

    if (agentsError) {
      console.error(`[UNMAPPED EXPORT] Failed to load agents for company ${cid}:`, agentsError.message);
      continue;
    }

    const known = new Set();
    (agents || []).forEach(a => {
      const v = a[agentIdColumn];
      if (!v || v === 'UNMAPPED') return;
      v.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).forEach(s => known.add(s));
    });

    let rawRows = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const selectCols = isElementary
        ? 'agent_number, agent_name, current_gross_premium, previous_gross_premium, month'
        : 'agent_number, agent_name, output, month';

      let q = supabase
        .from(rawTable)
        .select(selectCols)
        .eq('company_id', cid)
        .gte('month', startMonth)
        .lte('month', endMonth)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (isElementary) {
        q = q.or('agent_name.is.null,agent_name.neq.No Data - Empty File');
      } else {
        q = q.neq('agent_name', 'No Data - Empty File');
      }

      if (known.size > 0) {
        q = q.not('agent_number', 'in', `(${[...known].join(',')})`);
      }

      const { data, error } = await q;
      if (error) {
        console.error(`[UNMAPPED EXPORT] Failed to load raw rows for company ${cid} page ${page}:`, error.message);
        break;
      }

      if (data && data.length > 0) {
        rawRows = rawRows.concat(data);
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }

    const grouped = {};
    rawRows.forEach(r => {
      const key = r.agent_number == null ? 'NULL' : String(r.agent_number);
      if (!grouped[key]) {
        grouped[key] = {
          company_id: cid,
          company_name: companyMap[cid] || `Company ${cid}`,
          agent_number: key,
          agent_name: r.agent_name || 'Unknown',
          row_count: 0,
          total_current: 0,
          total_previous: 0,
          months: new Set(),
        };
      }
      const g = grouped[key];
      g.row_count++;
      if (isElementary) {
        g.total_current += parseFloat(r.current_gross_premium) || 0;
        g.total_previous += parseFloat(r.previous_gross_premium) || 0;
      } else {
        g.total_current += parseFloat(r.output) || 0;
      }
      if (r.month) g.months.add(r.month);
      if (g.agent_name === 'Unknown' && r.agent_name) g.agent_name = r.agent_name;
    });

    Object.values(grouped).forEach(g => {
      results.push({
        company_name: g.company_name,
        agent_number: g.agent_number,
        agent_name: g.agent_name,
        row_count: g.row_count,
        total_current: g.total_current,
        total_previous: g.total_previous,
        months: [...g.months].sort().join(', '),
      });
    });
  }

  results.sort((a, b) => {
    if (a.company_name !== b.company_name) return a.company_name.localeCompare(b.company_name, 'he');
    return b.total_current - a.total_current;
  });

  return results;
}

/**
 * Create the "סוכנים לא מוקצים" sheet listing every agent_number that
 * appeared in the raw data for the range but is not registered under
 * any agent_data row for that company.
 */
function createUnmappedAgentsSheet(workbook, unmappedRows, kind) {
  const isElementary = kind === 'elementary';
  const sheet = workbook.addWorksheet('סוכנים לא מוקצים');
  sheet.views = [{ rightToLeft: true }];

  const headers = isElementary
    ? ['חברה', 'מספר סוכן', 'שם סוכן (מהקובץ)', 'מספר רשומות', 'פרמיה שנה נוכחית', 'פרמיה שנה קודמת', 'חודשים']
    : ['חברה', 'מספר סוכן', 'שם סוכן (מהקובץ)', 'מספר רשומות', 'סכום כולל', 'חודשים'];

  sheet.columns = headers.map(() => ({ width: 28 }));

  sheet.getCell('A1').value = 'סוכנים לא מוקצים - מספרי סוכן שמופיעים בקבצי הגלם אך אינם רשומים';
  sheet.getCell('A1').font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF2E7D8A' } };
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' };

  const headerRow = 3;
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  const moneyCols = isElementary ? [5, 6] : [5];
  let dataRowIndex = headerRow + 1;

  unmappedRows.forEach(r => {
    const row = isElementary
      ? [r.company_name, r.agent_number, r.agent_name, r.row_count, r.total_current, r.total_previous, r.months]
      : [r.company_name, r.agent_number, r.agent_name, r.row_count, r.total_current, r.months];

    row.forEach((val, i) => {
      const cell = sheet.getCell(dataRowIndex, i + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      if (moneyCols.includes(i + 1)) cell.numFmt = '#,##0.00';
    });
    dataRowIndex++;
  });

  if (unmappedRows.length > 0) {
    const totalRow = dataRowIndex;
    const totalCurrent = unmappedRows.reduce((s, r) => s + (r.total_current || 0), 0);
    const totalPrevious = unmappedRows.reduce((s, r) => s + (r.total_previous || 0), 0);
    const totalRowCount = unmappedRows.reduce((s, r) => s + (r.row_count || 0), 0);

    const summary = isElementary
      ? ['סה"כ', '', '', totalRowCount, totalCurrent, totalPrevious, '']
      : ['סה"כ', '', '', totalRowCount, totalCurrent, ''];

    summary.forEach((val, i) => {
      const cell = sheet.getCell(totalRow, i + 1);
      cell.value = val;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F6' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      if (moneyCols.includes(i + 1)) cell.numFmt = '#,##0.00';
    });
  } else {
    const cell = sheet.getCell(dataRowIndex, 1);
    cell.value = 'לא נמצאו רשומות לא מוקצות בטווח התאריכים שנבחר';
    sheet.mergeCells(dataRowIndex, 1, dataRowIndex, headers.length);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = { italic: true, color: { argb: 'FF666666' } };
  }

  return sheet;
}

module.exports = router;
