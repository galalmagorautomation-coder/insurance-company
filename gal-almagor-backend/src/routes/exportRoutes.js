/**
 * Export Routes
 * Endpoints for exporting data to Excel format
 */

const express = require('express');
const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * POST /export/life-insurance
 * Export Life Insurance data to Excel
 */
router.post('/life-insurance', async (req, res) => {
  try {
    const {
      dataScope,      // 'Finance', 'Pension', 'Pension Transfer', 'Risk', or 'all'
      startMonth,
      endMonth,
      company,        // 'All Companies' or company ID
      department,     // 'All Departments' or specific
      inspector,      // 'All Inspectors' or specific
      agent,          // 'All Agents' or specific agent name
      format          // 'excel' (for v1)
    } = req.body;

    // Validate required parameters
    if (!startMonth || !endMonth) {
      return res.status(400).json({
        success: false,
        message: 'startMonth and endMonth are required'
      });
    }

    // Step 1: Build query for agent_data with filters
    let agentQuery = supabase
      .from('agent_data')
      .select('*')
      .eq('insurance', true); // Only agents who work with life insurance

    // Apply filters
    if (company && company !== 'all' && company !== 'All Companies') {
      agentQuery = agentQuery.contains('company_id', [parseInt(company)]);
    }
    if (department && department !== 'all' && department !== 'All Departments') {
      agentQuery = agentQuery.eq('department', department);
    }
    if (inspector && inspector !== 'all' && inspector !== 'All Inspectors') {
      agentQuery = agentQuery.eq('inspector', inspector);
    }
    if (agent && agent !== 'all' && agent !== 'All Agents') {
      agentQuery = agentQuery.eq('agent_name', agent);
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
      return res.status(404).json({
        success: false,
        message: 'No agents found matching the criteria'
      });
    }

    // Step 2: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 3: Fetch aggregated data (without joins)
    let aggregateQuery = supabase
      .from('agent_aggregations')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', startMonth)
      .lte('month', endMonth);

    // Apply company filter to aggregations
    if (company && company !== 'all' && company !== 'All Companies') {
      aggregateQuery = aggregateQuery.eq('company_id', parseInt(company));
    }

    const { data: aggregatedData, error: aggregateError } = await aggregateQuery;

    if (aggregateError) {
      console.error('Error fetching aggregated data:', aggregateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch aggregated data',
        error: aggregateError.message
      });
    }

    // Step 4: Fetch company data separately
    const companyIds = [...new Set(aggregatedData.map(row => row.company_id))];
    const { data: companiesData, error: companiesError } = await supabase
      .from('company')
      .select('*')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
    }

    // Create company lookup map
    const companyMap = {};
    (companiesData || []).forEach(c => {
      companyMap[c.id] = c.name;
    });

    // Create agent lookup map
    const agentMap = {};
    agents.forEach(a => {
      agentMap[a.id] = {
        name: a.agent_name,
        department: a.department,
        inspector: a.inspector
      };
    });

    // Step 5: Format data for Excel
    const excelData = aggregatedData.map(row => {
      const agent = agentMap[row.agent_id] || {};
      const baseData = {
        agent_name: agent.name || '',
        company_name: companyMap[row.company_id] || '',
        department: agent.department || '',
        inspector: agent.inspector || '',
        month: row.month
      };

      // Add product columns based on dataScope
      if (dataScope === 'Finance' || dataScope === 'all') {
        baseData.financial = row.financial || 0;
      }
      if (dataScope === 'Pension' || dataScope === 'all') {
        baseData.pension = row.pension || 0;
      }
      if (dataScope === 'Pension Transfer' || dataScope === 'all') {
        baseData.pension_transfer = row.pension_transfer || 0;
      }
      if (dataScope === 'Risk' || dataScope === 'all') {
        baseData.risk = row.risk || 0;
      }

      // Calculate total
      baseData.total = (row.pension || 0) + (row.risk || 0) + (row.financial || 0) + (row.pension_transfer || 0);

      return baseData;
    });

    // Step 6: Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Life Insurance Data');

    // Define columns
    const columns = [
      { header: 'Agent Name', key: 'agent_name', width: 30 },
      { header: 'Company', key: 'company_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Inspector', key: 'inspector', width: 20 },
      { header: 'Month', key: 'month', width: 15 }
    ];

    // Add product-specific columns
    if (dataScope === 'Finance' || dataScope === 'all') {
      columns.push({ header: 'Finance', key: 'financial', width: 15 });
    }
    if (dataScope === 'Pension' || dataScope === 'all') {
      columns.push({ header: 'Pension', key: 'pension', width: 15 });
    }
    if (dataScope === 'Pension Transfer' || dataScope === 'all') {
      columns.push({ header: 'Pension Transfer', key: 'pension_transfer', width: 20 });
    }
    if (dataScope === 'Risk' || dataScope === 'all') {
      columns.push({ header: 'Risk', key: 'risk', width: 15 });
    }

    columns.push({ header: 'Total', key: 'total', width: 15 });

    worksheet.columns = columns;

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    excelData.forEach(row => {
      worksheet.addRow(row);
    });

    // Format number columns as currency
    const numberColumns = ['financial', 'pension', 'pension_transfer', 'risk', 'total'];
    numberColumns.forEach(colKey => {
      const colIndex = columns.findIndex(c => c.key === colKey);
      if (colIndex !== -1) {
        const column = worksheet.getColumn(colIndex + 1);
        column.numFmt = '₪#,##0.00';
        column.alignment = { horizontal: 'right' };
      }
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    const filename = `life_insurance_export_${startMonth}_${endMonth}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting life insurance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

/**
 * POST /export/elementary
 * Export Elementary Insurance data to Excel
 */
router.post('/elementary', async (req, res) => {
  try {
    const {
      startMonth,
      endMonth,
      company,        // 'All Companies' or company ID
      department,     // 'All Departments' or specific
      agent,          // 'All Agents' or specific agent name
      format          // 'excel' (for v1)
    } = req.body;

    // Validate required parameters
    if (!startMonth || !endMonth) {
      return res.status(400).json({
        success: false,
        message: 'startMonth and endMonth are required'
      });
    }

    // Step 1: Build query for agent_data with filters
    let agentQuery = supabase
      .from('agent_data')
      .select('*')
      .eq('elementary', true); // Only agents who work with elementary insurance

    // Apply filters
    if (company && company !== 'all' && company !== 'All Companies') {
      agentQuery = agentQuery.contains('company_id', [parseInt(company)]);
    }
    if (department && department !== 'all' && department !== 'All Departments') {
      agentQuery = agentQuery.eq('department', department);
    }
    if (agent && agent !== 'all' && agent !== 'All Agents') {
      agentQuery = agentQuery.eq('agent_name', agent);
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
      return res.status(404).json({
        success: false,
        message: 'No agents found matching the criteria'
      });
    }

    // Step 2: Get agent IDs
    const agentIds = agents.map(a => a.id);

    // Step 3: Fetch aggregated elementary data (without joins)
    let aggregateQuery = supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .in('agent_id', agentIds)
      .gte('month', startMonth)
      .lte('month', endMonth);

    // Apply company filter to aggregations
    if (company && company !== 'all' && company !== 'All Companies') {
      aggregateQuery = aggregateQuery.eq('company_id', parseInt(company));
    }

    const { data: aggregatedData, error: aggregateError } = await aggregateQuery;

    if (aggregateError) {
      console.error('Error fetching aggregated data:', aggregateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch aggregated data',
        error: aggregateError.message
      });
    }

    // Step 4: Fetch company data separately
    const companyIds = [...new Set(aggregatedData.map(row => row.company_id))];
    const { data: companiesData, error: companiesError } = await supabase
      .from('company')
      .select('*')
      .in('id', companyIds);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
    }

    // Create company lookup map
    const companyMap = {};
    (companiesData || []).forEach(c => {
      companyMap[c.id] = c.name;
    });

    // Create agent lookup map
    const agentMap = {};
    agents.forEach(a => {
      agentMap[a.id] = {
        name: a.agent_name,
        department: a.department
      };
    });

    // Step 5: Format data for Excel
    const excelData = aggregatedData.map(row => {
      const agent = agentMap[row.agent_id] || {};
      return {
        agent_name: agent.name || '',
        company_name: companyMap[row.company_id] || '',
        department: agent.department || '',
        month: row.month,
        gross_premium: row.gross_premium || 0,
        previous_gross_premium: row.previous_year_gross_premium || 0,
        changes: row.changes || 0
      };
    });

    // Step 6: Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Elementary Insurance Data');

    // Define columns
    worksheet.columns = [
      { header: 'Agent Name', key: 'agent_name', width: 30 },
      { header: 'Company', key: 'company_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Current Gross Premium', key: 'gross_premium', width: 22 },
      { header: 'Previous Year Gross Premium', key: 'previous_gross_premium', width: 28 },
      { header: 'Change %', key: 'changes', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    excelData.forEach(row => {
      worksheet.addRow(row);
    });

    // Format number columns
    worksheet.getColumn(5).numFmt = '₪#,##0.00'; // gross_premium
    worksheet.getColumn(5).alignment = { horizontal: 'right' };
    worksheet.getColumn(6).numFmt = '₪#,##0.00'; // previous_gross_premium
    worksheet.getColumn(6).alignment = { horizontal: 'right' };
    worksheet.getColumn(7).numFmt = '0.00%';      // changes
    worksheet.getColumn(7).alignment = { horizontal: 'right' };

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    const filename = `elementary_export_${startMonth}_${endMonth}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting elementary data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

module.exports = router;
