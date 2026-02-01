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

    console.log('Template export request:', { startMonth, endMonth, company, department, inspector, agent });

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

  if (company && company !== 'all' && company !== 'All Companies' && company !== 'כל החברות') {
    agentQuery = agentQuery.contains('company_id', [parseInt(company)]);
  }
  if (department && department !== 'all' && department !== 'All Departments' && department !== 'כל המחלקות') {
    agentQuery = agentQuery.eq('department', department);
  }
  if (inspector && inspector !== 'all' && inspector !== 'All Inspectors' && inspector !== 'כל הבודקים') {
    agentQuery = agentQuery.eq('inspector', inspector);
  }
  if (agent && agent !== 'all' && agent !== 'All Agents' && agent !== 'כל הסוכנים') {
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

  // Step 2: Fetch current year aggregations
  const { data: currentYearData, error: currentError } = await supabase
    .from('agent_aggregations')
    .select('*')
    .in('agent_id', agentIds)
    .in('month', currentYearMonths);

  if (currentError) {
    throw new Error(`Failed to fetch current year data: ${currentError.message}`);
  }

  // Step 3: Fetch previous year aggregations
  const { data: previousYearData, error: previousError } = await supabase
    .from('agent_aggregations')
    .select('*')
    .in('agent_id', agentIds)
    .in('month', previousYearMonths);

  if (previousError) {
    throw new Error(`Failed to fetch previous year data: ${previousError.message}`);
  }

  // Step 4: Fetch targets
  const { data: targetsData, error: targetsError } = await supabase
    .from('targets')
    .select('*')
    .in('agent_id', agentIds)
    .in('month', currentYearMonths);

  if (targetsError) {
    console.warn('Failed to fetch targets:', targetsError.message);
  }

  // Step 5: Fetch companies
  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('*');

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`);
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
    companyMap,
    agentMap,
    currentYearMonths,
    previousYearMonths,
    lastMonth
  });

  return {
    filters: {
      dateRange: `${startMonth} - ${endMonth}`,
      company: company === 'all' ? 'All Companies' : companyMap[company] || company,
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
  companyMap,
  agentMap,
  currentYearMonths,
  previousYearMonths,
  lastMonth
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

  // Process current year data
  currentYearData.forEach(record => {
    const agent = agentMap[record.agent_id];
    if (!agent) return;

    const companyName = companyMap[record.company_id] || 'Unknown';
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

    // Add to monthly if last month
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

    return {
      name,
      cumulative,
      monthly,
      targets: { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 }, // Companies don't have targets
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  const departments = Object.keys(departmentsAgg).map(name => {
    const cumulative = sumValues(departmentsAgg[name].cumulative);
    const monthly = sumValues(departmentsAgg[name].monthly);
    const targets = targetsAgg.departments[name] ? sumTargets(targetsAgg.departments[name]) : null;
    const lastYear = previousYearAgg.departments[name] ? sumValues(previousYearAgg.departments[name]) : null;

    return {
      name,
      cumulative,
      monthly,
      targets: targets || { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 },
      achievement: calculateAchievement(cumulative, targets),
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  const inspectors = Object.keys(inspectorsAgg).map(name => {
    const cumulative = sumValues(inspectorsAgg[name].cumulative);
    const monthly = sumValues(inspectorsAgg[name].monthly);
    const targets = targetsAgg.inspectors[name] ? sumTargets(targetsAgg.inspectors[name]) : null;
    const lastYear = previousYearAgg.inspectors[name] ? sumValues(previousYearAgg.inspectors[name]) : null;

    return {
      name,
      cumulative,
      monthly,
      targets: targets || { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 },
      achievement: calculateAchievement(cumulative, targets),
      lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
      changePercent: calculateChangePercent(cumulative, lastYear)
    };
  });

  const agentsArray = Object.keys(agentsAgg).map(name => {
    const cumulative = sumValues(agentsAgg[name].cumulative);
    const monthly = sumValues(agentsAgg[name].monthly);
    const targets = targetsAgg.agents[name] ? sumTargets(targetsAgg.agents[name]) : null;
    const lastYear = previousYearAgg.agents[name] ? sumValues(previousYearAgg.agents[name]) : null;

    return {
      name,
      monthly: {
        sales: monthly,
        targets: targets || { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 },
        achievement: calculateAchievement(monthly, targets),
        lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
        change: calculateChangePercent(monthly, lastYear)
      },
      cumulative: {
        sales: cumulative,
        targets: targets || { pension: 0, risk: 0, finance: 0, pensionTransfer: 0 },
        achievement: calculateAchievement(cumulative, targets),
        lastYear: lastYear || { pension: null, risk: null, finance: null, pensionTransfer: null },
        change: calculateChangePercent(cumulative, lastYear)
      }
    };
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

  // Set column widths
  sheet.columns = Array(25).fill({ width: 12 });

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

  // Set column widths
  sheet.columns = Array(25).fill({ width: 12 });

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

  // Set column widths for 50 columns (A-AX)
  sheet.columns = Array(50).fill({ width: 11 });

  // Row 3: Main Section Headers
  sheet.mergeCells('A3:Y3');
  sheet.getCell('A3').value = 'Monthly (last month in range) - חודשי - החודש האחרון בטווח שסומן';
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
  addAgentSummaryRow(sheet, currentRow, data.agents.length);

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
  const label = dataType === 'cumulative' ? ' מצטבר - Cumulative - Jan-picked month' : ' חודשי - monthly - Jan-picked month';
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
  sheet.getCell(`Q${subRow}`).value = 'Last year - cumulative - Jan-picked month';
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

    dataRow++;
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
  const saleLabel = dataType === 'cumulative' ? 'מצטבר - Cumulative - Jan-picked month' : 'חודשי - monthly - Jan-picked month';
  const targetLabel = dataType === 'cumulative' ? 'Targets - Cumulative - Jan-picked month' : 'Targets - monthly - Jan-picked month';
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
  sheet.getCell(`Q${subRow}`).value = 'Last year - cumulative - Jan-picked month';
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
  departments.forEach(dept => {
    const data = dept[dataType];
    sheet.getCell(`A${dataRow}`).value = dept.name;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`G${dataRow}`).value = dept.targets.pension;
    sheet.getCell(`H${dataRow}`).value = dept.targets.risk;
    sheet.getCell(`I${dataRow}`).value = dept.targets.finance;
    sheet.getCell(`J${dataRow}`).value = dept.targets.pensionTransfer;

    sheet.getCell(`L${dataRow}`).value = dept.achievement.pension;
    sheet.getCell(`M${dataRow}`).value = dept.achievement.risk;
    sheet.getCell(`N${dataRow}`).value = dept.achievement.finance;
    sheet.getCell(`O${dataRow}`).value = dept.achievement.pensionTransfer;

    sheet.getCell(`Q${dataRow}`).value = dept.lastYear.pension !== null ? dept.lastYear.pension : 'not yet';
    sheet.getCell(`R${dataRow}`).value = dept.lastYear.risk !== null ? dept.lastYear.risk : 'not yet';
    sheet.getCell(`S${dataRow}`).value = dept.lastYear.finance !== null ? dept.lastYear.finance : 'not yet';
    sheet.getCell(`T${dataRow}`).value = dept.lastYear.pensionTransfer !== null ? dept.lastYear.pensionTransfer : 'not yet';

    sheet.getCell(`V${dataRow}`).value = dept.changePercent.pension;
    sheet.getCell(`W${dataRow}`).value = dept.changePercent.risk;
    sheet.getCell(`X${dataRow}`).value = dept.changePercent.finance;
    sheet.getCell(`Y${dataRow}`).value = dept.changePercent.pensionTransfer;

    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    dataRow++;
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
  const saleLabel = dataType === 'cumulative' ? 'מצטבר - Cumulative - Jan-picked month' : 'חודשי - monthly - Jan-picked month';
  const targetLabel = dataType === 'cumulative' ? 'Targets - Cumulative - Jan-picked month' : 'Targets - monthly - Jan-picked month';
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
  sheet.getCell(`Q${subRow}`).value = 'Last year - cumulative - Jan-picked month';
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
  inspectors.forEach(insp => {
    const data = insp[dataType];
    sheet.getCell(`A${dataRow}`).value = insp.name;
    sheet.getCell(`B${dataRow}`).value = data.pension;
    sheet.getCell(`C${dataRow}`).value = data.risk;
    sheet.getCell(`D${dataRow}`).value = data.finance;
    sheet.getCell(`E${dataRow}`).value = data.pensionTransfer;

    sheet.getCell(`G${dataRow}`).value = insp.targets.pension;
    sheet.getCell(`H${dataRow}`).value = insp.targets.risk;
    sheet.getCell(`I${dataRow}`).value = insp.targets.finance;
    sheet.getCell(`J${dataRow}`).value = insp.targets.pensionTransfer;

    sheet.getCell(`L${dataRow}`).value = insp.achievement.pension;
    sheet.getCell(`M${dataRow}`).value = insp.achievement.risk;
    sheet.getCell(`N${dataRow}`).value = insp.achievement.finance;
    sheet.getCell(`O${dataRow}`).value = insp.achievement.pensionTransfer;

    sheet.getCell(`Q${dataRow}`).value = insp.lastYear.pension !== null ? insp.lastYear.pension : 'not yet';
    sheet.getCell(`R${dataRow}`).value = insp.lastYear.risk !== null ? insp.lastYear.risk : 'not yet';
    sheet.getCell(`S${dataRow}`).value = insp.lastYear.finance !== null ? insp.lastYear.finance : 'not yet';
    sheet.getCell(`T${dataRow}`).value = insp.lastYear.pensionTransfer !== null ? insp.lastYear.pensionTransfer : 'not yet';

    sheet.getCell(`V${dataRow}`).value = insp.changePercent.pension;
    sheet.getCell(`W${dataRow}`).value = insp.changePercent.risk;
    sheet.getCell(`X${dataRow}`).value = insp.changePercent.finance;
    sheet.getCell(`Y${dataRow}`).value = insp.changePercent.pensionTransfer;

    ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'].forEach(col => {
      sheet.getCell(`${col}${dataRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      sheet.getCell(`${col}${dataRow}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
    });

    dataRow++;
  });
}

function addAgentGroupHeaders(sheet, row) {
  // Monthly section
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = 'sales - מכירות';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 28, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

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
  sheet.mergeCells(`A${row}:E${row}`);
  sheet.getCell(`A${row}`).value = 'חודשי - monthly - Jan-picked month - Sales';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`G${row}:J${row}`);
  sheet.getCell(`G${row}`).value = 'Targets - monthly - Jan-picked month';
  sheet.getCell(`G${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`G${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`L${row}:O${row}`);
  sheet.getCell(`L${row}`).value = 'Monthly Achievement % / השגת יעד';
  sheet.getCell(`L${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`L${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`L${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`Q${row}:T${row}`);
  sheet.getCell(`Q${row}`).value = 'Last year - montly - Jan-picked month';
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
  sheet.getCell(`AF${row}`).value = 'Targets - cumulative - Jan-picked month';
  sheet.getCell(`AF${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AF${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AF${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AK${row}:AN${row}`);
  sheet.getCell(`AK${row}`).value = 'Achievement Cumlative % / השגת יעד';
  sheet.getCell(`AK${row}`).font = { name: 'Arial', size: 18, bold: true, color: { theme: 1 } };
  sheet.getCell(`AK${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`AK${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  sheet.mergeCells(`AP${row}:AS${row}`);
  sheet.getCell(`AP${row}`).value = 'Last year - cumulative - Jan-picked month';
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

  // Monthly targets (G-J)
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(71 + i); // G, H, I, J
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly achievement (L-O)
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(76 + i); // L, M, N, O
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly last year (Q-T)
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(81 + i); // Q, R, S, T
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Monthly change (V-Y)
  categories.forEach((cat, i) => {
    const col = String.fromCharCode(86 + i); // V, W, X, Y
    sheet.getCell(`${col}${row}`).value = cat;
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative sales (AA-AD)
  ['AA', 'AB', 'AC', 'AD'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative targets (AF-AI)
  ['AF', 'AG', 'AH', 'AI'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative achievement (AK-AN)
  ['AK', 'AL', 'AM', 'AN'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative last year (AP-AS)
  ['AP', 'AQ', 'AR', 'AS'].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = categories[i];
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true, underline: true, color: { theme: 1 } };
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  });

  // Cumulative change (AU-AX)
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

  sheet.getCell(`G${row}`).value = agent.monthly.targets.pension;
  sheet.getCell(`H${row}`).value = agent.monthly.targets.risk;
  sheet.getCell(`I${row}`).value = agent.monthly.targets.finance;
  sheet.getCell(`J${row}`).value = agent.monthly.targets.pensionTransfer;

  sheet.getCell(`L${row}`).value = agent.monthly.achievement.pension;
  sheet.getCell(`M${row}`).value = agent.monthly.achievement.risk;
  sheet.getCell(`N${row}`).value = agent.monthly.achievement.finance;
  sheet.getCell(`O${row}`).value = agent.monthly.achievement.pensionTransfer;

  sheet.getCell(`Q${row}`).value = agent.monthly.lastYear.pension !== null ? agent.monthly.lastYear.pension : 'not yet';
  sheet.getCell(`R${row}`).value = agent.monthly.lastYear.risk !== null ? agent.monthly.lastYear.risk : 'not yet';
  sheet.getCell(`S${row}`).value = agent.monthly.lastYear.finance !== null ? agent.monthly.lastYear.finance : 'not yet';
  sheet.getCell(`T${row}`).value = agent.monthly.lastYear.pensionTransfer !== null ? agent.monthly.lastYear.pensionTransfer : 'not yet';

  sheet.getCell(`V${row}`).value = agent.monthly.change.pension;
  sheet.getCell(`W${row}`).value = agent.monthly.change.risk;
  sheet.getCell(`X${row}`).value = agent.monthly.change.finance;
  sheet.getCell(`Y${row}`).value = agent.monthly.change.pensionTransfer;

  // Cumulative data
  sheet.getCell(`AA${row}`).value = agent.cumulative.sales.pension;
  sheet.getCell(`AB${row}`).value = agent.cumulative.sales.risk;
  sheet.getCell(`AC${row}`).value = agent.cumulative.sales.finance;
  sheet.getCell(`AD${row}`).value = agent.cumulative.sales.pensionTransfer;

  sheet.getCell(`AF${row}`).value = agent.cumulative.targets.pension;
  sheet.getCell(`AG${row}`).value = agent.cumulative.targets.risk;
  sheet.getCell(`AH${row}`).value = agent.cumulative.targets.finance;
  sheet.getCell(`AI${row}`).value = agent.cumulative.targets.pensionTransfer;

  sheet.getCell(`AK${row}`).value = agent.cumulative.achievement.pension;
  sheet.getCell(`AL${row}`).value = agent.cumulative.achievement.risk;
  sheet.getCell(`AM${row}`).value = agent.cumulative.achievement.finance;
  sheet.getCell(`AN${row}`).value = agent.cumulative.achievement.pensionTransfer;

  sheet.getCell(`AP${row}`).value = agent.cumulative.lastYear.pension !== null ? agent.cumulative.lastYear.pension : 'not yet';
  sheet.getCell(`AQ${row}`).value = agent.cumulative.lastYear.risk !== null ? agent.cumulative.lastYear.risk : 'not yet';
  sheet.getCell(`AR${row}`).value = agent.cumulative.lastYear.finance !== null ? agent.cumulative.lastYear.finance : 'not yet';
  sheet.getCell(`AS${row}`).value = agent.cumulative.lastYear.pensionTransfer !== null ? agent.cumulative.lastYear.pensionTransfer : 'not yet';

  sheet.getCell(`AU${row}`).value = agent.cumulative.change.pension;
  sheet.getCell(`AV${row}`).value = agent.cumulative.change.risk;
  sheet.getCell(`AW${row}`).value = agent.cumulative.change.finance;
  sheet.getCell(`AX${row}`).value = agent.cumulative.change.pensionTransfer;

  // Apply yellow fill
  const dataCols = ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y',
                    'AA', 'AB', 'AC', 'AD', 'AF', 'AG', 'AH', 'AI', 'AK', 'AL', 'AM', 'AN', 'AP', 'AQ', 'AR', 'AS', 'AU', 'AV', 'AW', 'AX'];
  dataCols.forEach(col => {
    sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, color: { theme: 1 } };
  });
}

function addAgentSummaryRow(sheet, row, agentCount) {
  const startRow = 8;
  const endRow = 8 + agentCount - 1;

  sheet.getCell(`A${row}`).value = 'TOTAL';
  sheet.getCell(`A${row}`).font = { name: 'Arial', size: 18, bold: true };

  // SUM formulas for cumulative sales (AA-AD)
  ['AA', 'AB', 'AC', 'AD'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUM(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
  });

  // SUM formulas for cumulative targets (AF-AI)
  ['AF', 'AG', 'AH', 'AI'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUM(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
  });

  // AVG formulas for cumulative achievement (AK-AN)
  ['AK', 'AL', 'AM', 'AN'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `AVERAGE(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
  });

  // SUM formulas for cumulative last year (AP-AS)
  ['AP', 'AQ', 'AR', 'AS'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `SUM(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
  });

  // AVG formulas for cumulative change (AU-AX)
  ['AU', 'AV', 'AW', 'AX'].forEach(col => {
    sheet.getCell(`${col}${row}`).value = { formula: `AVERAGE(${col}${startRow}:${col}${endRow})` };
    sheet.getCell(`${col}${row}`).font = { name: 'Arial', size: 18, bold: true };
  });
}

module.exports = router;
