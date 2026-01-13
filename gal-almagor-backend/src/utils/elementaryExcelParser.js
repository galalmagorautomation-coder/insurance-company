// Elementary Excel Parser
// Parses elementary insurance data from Excel files

const { getElementaryMapping } = require('../config/elementaryMappings');

/**
 * Parse elementary Excel data and transform it to database format
 * @param {Array<Object>} jsonData - Raw data from Excel file
 * @param {number} companyId - Company ID
 * @param {string} companyName - Company name
 * @param {string} month - Month in YYYY-MM format
 * @param {Object} mapping - Optional pre-detected mapping
 * @returns {Object} { success, data, errors, summary }
 */
function parseElementaryExcelData(jsonData, companyId, companyName, month, mapping = null) {
  const results = [];
  const errors = [];
  let rowsProcessed = 0;

  console.log(`Starting elementary parse for ${companyName}, ${jsonData.length} rows`);

  try {
    // Get mapping if not provided
    if (!mapping) {
      const columns = Object.keys(jsonData[0] || {});
      mapping = getElementaryMapping(companyName, columns, month);
    }

    console.log(`Using mapping: ${mapping.description}`);

    // Check if this is AGENT_SUBTOTALS mode (Hachshara, Phoenix)
    if (mapping.parseMode === 'AGENT_SUBTOTALS') {
      return parseAgentSubtotals(jsonData, companyId, companyName, month, mapping);
    }

    // Check if this is POLICY_AGGREGATION mode (Clal)
    if (mapping.parseMode === 'POLICY_AGGREGATION') {
      return parsePolicyAggregation(jsonData, companyId, companyName, month, mapping);
    }

    // Check if this is THREE_ROW_GROUPS mode (Shomera)
if (mapping.parseMode === 'THREE_ROW_GROUPS') {
  return parseThreeRowGroups(jsonData, companyId, companyName, month, mapping);
}

    // Standard parsing mode (Ayalon, Harel and others)
    // Iterate through each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      rowsProcessed++;

      try {
        // Validate row using mapping's validateRow function if available
        if (mapping.validateRow && !mapping.validateRow(Object.values(row))) {
          console.log(`Row ${i + 1}: Skipped (validation failed or metadata row)`);
          continue;
        }

        // Get column values by index
        const rowValues = Object.values(row);
        const agentString = rowValues[mapping.columnMapping.agentString];
        const previousGrossPremium = rowValues[mapping.columnMapping.previousGrossPremium];
        const currentGrossPremium = rowValues[mapping.columnMapping.currentGrossPremium];
        const changes = rowValues[mapping.columnMapping.changes];

        // Skip if agent string is missing
        if (!agentString) {
          console.log(`Row ${i + 1}: Skipped (no agent string)`);
          continue;
        }

        // Parse agent string to extract agent_number and agent_name
        const { agent_number, agent_name } = mapping.parseAgent(agentString);

        // Skip if both agent_number and agent_name are null
        if (!agent_number && !agent_name) {
          console.log(`Row ${i + 1}: Skipped (could not parse agent)`);
          continue;
        }

        // Helper function to parse numeric values
        const parseNumeric = (value) => {
          if (value === null || value === undefined || value === '') return null;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const cleaned = value.replace(/,/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        // Build the row object for raw_data_elementary table
        const parsedRow = {
          company_id: companyId,
          agent_name: agent_name,
          agent_number: agent_number,
          month: month,
          current_gross_premium: parseNumeric(currentGrossPremium),
          previous_gross_premium: parseNumeric(previousGrossPremium),
          changes: parseNumeric(changes)
        };

        // Log parsed row for first few rows (for debugging)
        if (i < 3) {
          console.log(`Row ${i + 1} parsed:`, parsedRow);
        }

        results.push(parsedRow);

      } catch (error) {
        const errorMsg = `Row ${i + 1}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Elementary parsing complete: ${results.length} rows parsed, ${errors.length} errors`);

    return {
      success: results.length > 0,
      data: results,
      errors: errors,
      summary: {
        totalRows: jsonData.length,
        rowsProcessed: rowsProcessed,
        rowsInserted: results.length,
        errorsCount: errors.length
      }
    };

  } catch (error) {
    console.error('Elementary parsing error:', error);
    return {
      success: false,
      data: [],
      errors: [error.message],
      summary: {
        totalRows: jsonData.length,
        rowsProcessed: rowsProcessed,
        rowsInserted: 0,
        errorsCount: errors.length + 1
      }
    };
  }
}

/**
 * Parse agent subtotals mode (for Hachshara, Phoenix)
 * This mode processes files where each agent has multiple rows
 * We insert each BRANCH row (not subtotals)
 */
function parseAgentSubtotals(jsonData, companyId, companyName, month, mapping) {
  const results = [];
  const errors = [];
  let rowsProcessed = 0;
  let currentAgentString = null;

  console.log(`Using AGENT_SUBTOTALS mode for ${companyName}`);
  console.log(`Column mapping:`, mapping.columnMapping);

  // ✅ VALIDATE COLUMNS BEFORE PROCESSING - Must happen outside the loop!
  if (mapping.useMixedMapping && jsonData.length > 0) {
    const availableColumns = Object.keys(jsonData[0]);
    const currentColumnName = mapping.columnMapping.currentGrossPremium;
    const previousColumnName = mapping.columnMapping.previousGrossPremium;
    
    console.log(`📋 Available columns in Excel:`, availableColumns);
    console.log(`🔍 Looking for current year column: "${currentColumnName}"`);
    console.log(`🔍 Looking for previous year column: "${previousColumnName}"`);
    
    // STRICT VALIDATION: Current year column MUST exist
    if (!availableColumns.includes(currentColumnName)) {
      const errorMsg = `Column "${currentColumnName}" not found in Excel file. Available columns: ${availableColumns.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        data: [],
        errors: [errorMsg],
        summary: {
          totalRows: jsonData.length,
          rowsProcessed: 0,
          rowsInserted: 0,
          errorsCount: 1
        }
      };
    }
    
    // Previous year column warning only
    if (!availableColumns.includes(previousColumnName)) {
      console.warn(
        `⚠️ Column "${previousColumnName}" not found in Excel file. ` +
        `Previous year data will be null.`
      );
    }
  }

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    rowsProcessed++;

    try {
      // Handle mixed mapping mode (indices for agent/branch, column names for premiums)
      let rowValues;
      let agentValue, branchValue, currentGrossPremium, previousGrossPremium;
      
      if (mapping.useMixedMapping) {
        // Get row as both array (for indices) and object (for column names)
        rowValues = Object.values(row);
        
        // Agent and branch by index
        agentValue = rowValues[mapping.columnMapping.agentString];
        branchValue = rowValues[mapping.columnMapping.branchOrSubtotal];
        
        // Premiums by column name (already validated above)
        const currentColumnName = mapping.columnMapping.currentGrossPremium;
        const previousColumnName = mapping.columnMapping.previousGrossPremium;
        
        // Extract premium values by exact column name match
        currentGrossPremium = row[currentColumnName];
        previousGrossPremium = row[previousColumnName];
        
        // Build validation array with agent and branch at positions 0 and 1
        rowValues = [agentValue, branchValue, currentGrossPremium, previousGrossPremium];
      } else {
        // Legacy: all by index
        rowValues = Object.values(row);
        currentGrossPremium = rowValues[mapping.columnMapping.currentGrossPremium];
        previousGrossPremium = rowValues[mapping.columnMapping.previousGrossPremium];
      }
      
      // Validate row and get its type
      const validation = mapping.validateRow(rowValues, currentAgentString);
      
      if (!validation) {
        continue;
      }

      // If this is a subtotal row, skip it and reset agent
      if (validation.isSubtotal) {
        console.log(`Row ${i + 1}: Subtotal row skipped`);
        currentAgentString = null; // Reset for next agent
        continue;
      }

      // If this is an agent header row, store the agent string
      if (validation.isAgentHeader) {
        currentAgentString = validation.agentString;
        console.log(`Row ${i + 1}: Agent header found - ${currentAgentString}`);
        
        // Check if this agent header row ALSO has branch data (first branch)
        // If shouldProcess is true, this row has premium data and should be inserted
        if (validation.shouldProcess) {
          // This is the first branch row (agent header + branch data)
          // Process it as a branch row below
          console.log(`Row ${i + 1}: Also has branch data, processing as branch`);
        } else {
          // Just a header, no data to insert
          continue;
        }
      }

      // This is a branch row - process it if we have agent info
      if (!validation.shouldProcess) {
        continue;
      }

      if (!currentAgentString) {
        console.warn(`Row ${i + 1}: Found branch row but no agent header`);
        continue;
      }

      // Premium values already extracted above

      // Parse agent string
      const { agent_number, agent_name } = mapping.parseAgent(currentAgentString);

      if (!agent_number && !agent_name) {
        console.log(`Row ${i + 1}: Skipped (could not parse agent from: ${currentAgentString})`);
        continue;
      }

      // Helper function to parse numeric values
      const parseNumeric = (value) => {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const cleaned = value.replace(/,/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const prevPremium = parseNumeric(previousGrossPremium);
      const currPremium = parseNumeric(currentGrossPremium);

      // Calculate changes
      let changes = null;
      if (prevPremium !== null && prevPremium !== 0 && currPremium !== null) {
        changes = (currPremium - prevPremium) / prevPremium;
      } else if (prevPremium === 0 && currPremium > 0) {
        changes = 1; // 100% growth from 0
      }

      // Build the row object for this branch
      const parsedRow = {
        company_id: companyId,
        agent_name: agent_name,
        agent_number: agent_number,
        month: month,
        current_gross_premium: currPremium,
        previous_gross_premium: prevPremium,
        changes: changes
      };

      if (results.length < 5) {
        console.log(`Row ${i + 1} branch parsed:`, parsedRow);
      }

      results.push(parsedRow);

    } catch (error) {
      const errorMsg = `Row ${i + 1}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`Elementary AGENT_SUBTOTALS parsing complete: ${results.length} branch rows parsed, ${errors.length} errors`);

  return {
    success: results.length > 0,
    data: results,
    errors: errors,
    summary: {
      totalRows: jsonData.length,
      rowsProcessed: rowsProcessed,
      rowsInserted: results.length,
      errorsCount: errors.length
    }
  };
}

/**
 * Parse policy aggregation mode (for Clal)
 * This mode processes policy-level data - inserts each policy as a separate row
 */
function parsePolicyAggregation(jsonData, companyId, companyName, month, mapping) {
  const results = [];
  const errors = [];
  let rowsProcessed = 0;

  console.log(`Using POLICY_AGGREGATION mode for ${companyName}`);

  // Helper function to parse numeric values
  const parseNumeric = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Process each policy row and insert individually
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    rowsProcessed++;

    try {
      // Validate row
      if (mapping.validateRow && !mapping.validateRow(row)) {
        continue;
      }

      const agentNumber = row[mapping.columnMapping.agentNumber];
      const agentNameStr = row[mapping.columnMapping.agentName];
      const grossPremium = row[mapping.columnMapping.grossPremium];

      // Skip if missing essential data
      if (!agentNumber) {
        continue;
      }

     
      // Parse agent number to string (handle both numeric and string formats)
const agentNumberStr = typeof agentNumber === 'number' 
? String(Math.floor(agentNumber))  // For numeric agent numbers like 72846.0
: String(agentNumber);              // For string agent numbers like "1/1/44962"

      // Parse agent name (remove number suffix)
      const agentName = mapping.parseAgentName ? mapping.parseAgentName(agentNameStr) : agentNameStr;

      // Parse premium
      const premium = parseNumeric(grossPremium);

      // Insert each policy as a separate row
      results.push({
        company_id: companyId,
        agent_name: agentName,
        agent_number: agentNumberStr,
        month: month,
        current_gross_premium: premium,
        previous_gross_premium: null,  // Clal doesn't provide previous year data
        changes: null  // Can't calculate without previous year data
      });

    } catch (error) {
      const errorMsg = `Row ${i + 1}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`Elementary POLICY_AGGREGATION complete: ${results.length} policy rows parsed, ${errors.length} errors`);

  return {
    success: results.length > 0,
    data: results,
    errors: errors,
    summary: {
      totalRows: jsonData.length,
      rowsProcessed: rowsProcessed,
      rowsInserted: results.length,
      errorsCount: errors.length
    }
  };
}



/**
 * Parse three-row groups mode (for Shomera)
 * Each agent has 3 rows: agent+2024, 2025, change%
 */
function parseThreeRowGroups(jsonData, companyId, companyName, month, mapping) {
  const results = [];
  const errors = [];
  let rowsProcessed = 0;
  let currentAgentString = null;
  let previousYearPremium = null;

  console.log(`Using THREE_ROW_GROUPS mode for ${companyName}`);

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    rowsProcessed++;

    try {
      const rowValues = Object.values(row);

      // Debug: Log first few rows to understand structure
      if (i < 15) {
        console.log(`Row ${i + 1} raw data - Col0: "${rowValues[0]}", Col1: "${rowValues[1]}", Col2: "${rowValues[2]}"`);
      }

      // Validate row and get its type
      const validation = mapping.validateRow(rowValues);

      // Debug validation results for key rows
      if (i >= 9 && i < 15) {
        console.log(`Row ${i + 1} validation:`, validation);
      }

      if (!validation) {
        continue;
      }

      // If this is an agent header row, store agent info and previous year premium
      if (validation.rowType === 'agent_header') {
        currentAgentString = validation.agentString;
        previousYearPremium = rowValues[mapping.columnMapping.totalPremium];
        console.log(`Row ${i + 1}: Agent header found - ${currentAgentString}, 2024 premium: ${previousYearPremium}`);
        continue;
      }

      // If this is current year data row, process it
      if (validation.shouldProcess && validation.rowType === 'current_year_data') {
        if (!currentAgentString) {
          console.warn(`Row ${i + 1}: Found 2025 data but no agent header`);
          continue;
        }

        const currentYearPremium = rowValues[mapping.columnMapping.totalPremium];

        // Parse agent string
        const { agent_number, agent_name } = mapping.parseAgent(currentAgentString);

        if (!agent_number && !agent_name) {
          console.log(`Row ${i + 1}: Skipped (could not parse agent from: ${currentAgentString})`);
          continue;
        }

        // Helper function to parse numeric values
        const parseNumeric = (value) => {
          if (value === null || value === undefined || value === '') return null;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const cleaned = value.replace(/,/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        const prevPremium = parseNumeric(previousYearPremium);
        const currPremium = parseNumeric(currentYearPremium);

        // Calculate changes
        let changes = null;
        if (prevPremium !== null && prevPremium !== 0 && currPremium !== null) {
          changes = (currPremium - prevPremium) / prevPremium;
        } else if (prevPremium === 0 && currPremium > 0) {
          changes = 1; // 100% growth from 0
        }

        // Build the row object
        const parsedRow = {
          company_id: companyId,
          agent_name: agent_name,
          agent_number: agent_number,
          month: month,
          current_gross_premium: currPremium,
          previous_gross_premium: prevPremium,
          changes: changes
        };

        console.log(`Row ${i + 1} parsed:`, parsedRow);
        results.push(parsedRow);

        // Reset for next agent
        currentAgentString = null;
        previousYearPremium = null;
      }

    } catch (error) {
      const errorMsg = `Row ${i + 1}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`Elementary THREE_ROW_GROUPS parsing complete: ${results.length} agents parsed, ${errors.length} errors`);

  return {
    success: results.length > 0,
    data: results,
    errors: errors,
    summary: {
      totalRows: jsonData.length,
      rowsProcessed: rowsProcessed,
      rowsInserted: results.length,
      errorsCount: errors.length
    }
  };
}

module.exports = {
  parseElementaryExcelData
};