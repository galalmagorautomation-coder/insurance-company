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

    // Check if this is AGENT_MERGED_SUBTOTAL mode (Shirbit new format)
    if (mapping.parseMode === 'AGENT_MERGED_SUBTOTAL') {
      return parseAgentMergedSubtotal(jsonData, companyId, companyName, month, mapping);
    }

    // Check if this is THREE_ROW_GROUPS mode (Shomera)
if (mapping.parseMode === 'THREE_ROW_GROUPS') {
  return parseThreeRowGroups(jsonData, companyId, companyName, month, mapping);
}

    // Standard parsing mode (Ayalon, Harel and others)
    // Iterate through each row. When the upload reads with header:1 (array
    // mode), jsonData[0] IS the header row of the file — honor the mapping's
    // dataStartRow so we skip those header rows instead of parsing them as
    // data. In object mode xlsx consumes the header row itself, so leave the
    // start index at 0 there.
    const isArrayMode = Array.isArray(jsonData[0]);
    const startIdx = isArrayMode ? Math.max(0, (mapping.dataStartRow || 1) - 1) : 0;
    for (let i = startIdx; i < jsonData.length; i++) {
      const row = jsonData[i];
      rowsProcessed++;

      try {
        // Validate row using mapping's validateRow function if available
        if (mapping.validateRow && !mapping.validateRow(mapping.useColumnNames ? row : Object.values(row))) {
          console.log(`Row ${i + 1}: Skipped (validation failed or metadata row)`);
          continue;
        }

        // Get column values by index or by name
        const rowValues = Object.values(row);

        // Handle different agent parsing modes
        let agent_number, agent_name;
        let previousGrossPremium, currentGrossPremium, changes;

        // Special handling for Cooper Nineveh (separate agentId and agentName columns using column names)
        if (mapping.useColumnNames && mapping.columnMapping.agentIdColumn && mapping.columnMapping.agentNameColumn) {
          const agentId = row[mapping.columnMapping.agentIdColumn];
          const agentNameValue = row[mapping.columnMapping.agentNameColumn];

          // Skip if both are missing
          if (!agentId && !agentNameValue) {
            console.log(`Row ${i + 1}: Skipped (no agent info)`);
            continue;
          }

          const parsed = mapping.parseAgent(agentId, agentNameValue);
          agent_number = parsed.agent_number;
          agent_name = parsed.agent_name;

          // Get premium values by column name
          currentGrossPremium = row[mapping.columnMapping.currentGrossPremium];
          previousGrossPremium = mapping.columnMapping.previousGrossPremium
            ? row[mapping.columnMapping.previousGrossPremium]
            : null;
          changes = null; // Not provided by Cooper Nineveh
        }
        // Special handling for Cooper Nineveh (separate agentId and agentName columns using indices - legacy)
        else if (mapping.columnMapping.agentId !== undefined && mapping.columnMapping.agentName !== undefined) {
          const agentId = rowValues[mapping.columnMapping.agentId];
          const agentNameValue = rowValues[mapping.columnMapping.agentName];

          // Skip if both are missing
          if (!agentId && !agentNameValue) {
            console.log(`Row ${i + 1}: Skipped (no agent info)`);
            continue;
          }

          const parsed = mapping.parseAgent(agentId, agentNameValue);
          agent_number = parsed.agent_number;
          agent_name = parsed.agent_name;

          previousGrossPremium = rowValues[mapping.columnMapping.previousGrossPremium];
          currentGrossPremium = rowValues[mapping.columnMapping.currentGrossPremium];
          changes = rowValues[mapping.columnMapping.changes];
        }
        // Special handling for Securities (hardcoded single agent)
        else if (mapping.fixedAgent) {
          agent_number = mapping.fixedAgent.agent_number;
          agent_name = mapping.fixedAgent.agent_name;

          // Use column names if specified, otherwise use indices
          if (mapping.useColumnNames) {
            currentGrossPremium = row[mapping.columnMapping.currentGrossPremium];
            previousGrossPremium = mapping.columnMapping.previousGrossPremium
              ? row[mapping.columnMapping.previousGrossPremium]
              : null;
            changes = null;
          } else {
            previousGrossPremium = rowValues[mapping.columnMapping.previousGrossPremium];
            currentGrossPremium = rowValues[mapping.columnMapping.currentGrossPremium];
            changes = rowValues[mapping.columnMapping.changes];
          }
        }
        // Standard handling (single agentString column)
        else {
          const agentString = rowValues[mapping.columnMapping.agentString];

          // Skip if agent string is missing
          if (!agentString) {
            console.log(`Row ${i + 1}: Skipped (no agent string)`);
            continue;
          }

          const parsed = mapping.parseAgent(agentString);
          agent_number = parsed.agent_number;
          agent_name = parsed.agent_name;

          previousGrossPremium = rowValues[mapping.columnMapping.previousGrossPremium];
          currentGrossPremium = rowValues[mapping.columnMapping.currentGrossPremium];
          changes = rowValues[mapping.columnMapping.changes];
        }

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

            // Harel sometimes writes premiums with a "K" suffix (e.g. "118K", "1.5k", "₪118K", "118K₪").
            // Treat the K/k as ×1000 only for Harel.
            if (companyName === 'Harel' || companyName === 'הראל') {
              const trimmed = cleaned.replace(/[₪\s]/g, '');
              const kMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)[Kk]$/);
              if (kMatch) {
                return parseFloat(kMatch[1]) * 1000;
              }
            }

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

  // VALIDATE COLUMNS BEFORE PROCESSING - Must happen outside the loop!
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
      console.error(` ${errorMsg}`);
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
 * Parse policy aggregation mode (for Clal, Kash, Haklai, etc.)
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
      const cleaned = value.replace(/[,₪\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Check if mapping has column indices (for companies like Haklai with duplicate column names)
  const useColumnIndices = mapping.columnIndices && Object.keys(mapping.columnIndices).length > 0;

  // Process each policy row and insert individually
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    rowsProcessed++;

    try {
      // Validate row
      if (mapping.validateRow && !mapping.validateRow(row, i)) {
        continue;
      }

      let agentNumberStr, agentName;
      let currentPremium, previousPremium;

      // Get row values as array for index-based access
      const rowValues = Object.values(row);

      // Check if mapping has parseAgentInfo function (for Haklai's "number - name" format)
      if (mapping.parseAgentInfo) {
        // Get agent raw value using column index or name
        const agentRawValue = useColumnIndices
          ? rowValues[mapping.columnIndices.agentRaw]
          : row[mapping.columnMapping.agentRaw] || row['סוכנים'];

        if (!agentRawValue) {
          continue;
        }

        const agentInfo = mapping.parseAgentInfo(agentRawValue);
        agentNumberStr = agentInfo.agentNumber;
        agentName = agentInfo.agentName;

        // Get premiums using column indices
        if (useColumnIndices) {
          currentPremium = parseNumeric(rowValues[mapping.columnIndices.currentGrossPremium]);
          previousPremium = parseNumeric(rowValues[mapping.columnIndices.previousGrossPremium]);
        } else {
          currentPremium = parseNumeric(row[mapping.columnMapping.currentGrossPremium]);
          previousPremium = parseNumeric(row[mapping.columnMapping.previousGrossPremium]);
        }
      } else {
        // Standard parsing (Clal, Kash, Migdal, etc.)
        // Two access modes:
        //  - Named columns (default): row[mapping.columnMapping.<field>]
        //  - Indexed (e.g. Clal new format): row[mapping.columnIndices.<field>] where
        //    `row` is an array. Used when header names repeat across columns.
        let agentNumber, agentNameStr, grossPremium;
        if (useColumnIndices && mapping.columnIndices.agentNumber !== undefined) {
          agentNumber = rowValues[mapping.columnIndices.agentNumber];
          agentNameStr = rowValues[mapping.columnIndices.agentName];
          grossPremium = rowValues[mapping.columnIndices.grossPremium];
        } else {
          agentNumber = row[mapping.columnMapping.agentNumber];
          agentNameStr = row[mapping.columnMapping.agentName];
          grossPremium = row[mapping.columnMapping.grossPremium];
        }

        // GUARD: If xlsx returned a Date object (Excel cell wrongly typed as date),
        // try its raw value or skip the row to prevent strings like
        // "Sun May 13 1973 00:00:00 GMT+0800" from polluting raw_data.
        if (agentNumber instanceof Date) {
          const numeric = agentNumber.valueOf();
          if (typeof numeric === 'number' && !isNaN(numeric) && numeric > 0 && numeric < 1e9) {
            agentNumber = String(Math.floor(numeric));
          } else {
            console.warn(`Skipping row ${i}: agent_number is a Date object (${agentNumber.toString()}). Likely an Excel cell-type bug — fix the source file.`);
            continue;
          }
        }

        // Skip if missing essential data
        if (!agentNumber) {
          continue;
        }

        // Parse agent number to string (handle both numeric and string formats)
        agentNumberStr = typeof agentNumber === 'number'
          ? String(Math.floor(agentNumber))  // For numeric agent numbers like 72846.0
          : String(agentNumber);              // For string agent numbers like "1/1/44962"

        // Parse agent name (remove number suffix)
        agentName = mapping.parseAgentName ? mapping.parseAgentName(agentNameStr) : agentNameStr;

        // Parse premium
        currentPremium = parseNumeric(grossPremium);
        previousPremium = null;  // Most companies don't provide previous year data
      }

      // Skip if no agent number
      if (!agentNumberStr) {
        continue;
      }

      // Calculate changes if we have both current and previous
      let changes = null;
      if (currentPremium !== null && previousPremium !== null && previousPremium !== 0) {
        changes = ((currentPremium - previousPremium) / previousPremium) * 100;
      }

      // Insert each policy as a separate row
      results.push({
        company_id: companyId,
        agent_name: agentName,
        agent_number: agentNumberStr,
        month: month,
        current_gross_premium: currentPremium,
        previous_gross_premium: previousPremium,
        changes: changes
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
 * Parse merged-cell agent blocks with a "סה"כ" subtotal row (Shirbit new format).
 *
 * Input shape: jsonData is an array of arrays (read with header:1). For each
 * agent block:
 *  - First row of the block has the agent string in column A (e.g.
 *    "26663 - גל אלמגור...") and the first product line in B/C.
 *  - Subsequent product rows have null in column A (merged cell) and the
 *    product name in B, amount in C.
 *  - The final row of the block has null in A, "סה"כ" in B, and the agent's
 *    total for the month in C — that is the row we keep.
 *  - The very last row of the sheet is a grand-total row with "סה"כ" in
 *    BOTH A and B; we must skip it so the grand total doesn't get re-emitted.
 *
 * One raw_data_elementary row per agent (current_gross_premium = column C of
 * the agent's סה"כ row; previous_gross_premium = null).
 */
function parseAgentMergedSubtotal(jsonData, companyId, companyName, month, mapping) {
  const results = [];
  const errors = [];
  let rowsProcessed = 0;

  console.log(`Using AGENT_MERGED_SUBTOTAL mode for ${companyName}`);

  const idx = mapping.columnIndices;
  const subtotalMarker = mapping.subtotalMarker || 'סה"כ';
  let currentAgent = null;

  const parseNumeric = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[,₪\s]/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Skip the header row(s) — dataStartRow is 1-indexed.
  const startIdx = Math.max(0, (mapping.dataStartRow || 1) - 1);

  for (let i = startIdx; i < jsonData.length; i++) {
    const row = jsonData[i];
    rowsProcessed++;

    if (!Array.isArray(row)) continue;

    try {
      const colA = row[idx.agentString];
      const colB = row[idx.subtotalFlag];
      const colC = row[idx.amount];

      // Update agent state from column A.
      // Non-null + matches "number - name" → new agent block starts here.
      // Non-null + does NOT match (e.g. grand-total row's "סה"כ" in col A) → reset.
      // Null → preserve currentAgent (merged-cell continuation).
      if (colA !== null && colA !== undefined && String(colA).trim() !== '') {
        const parsed = mapping.parseAgent(colA);
        currentAgent = parsed; // null on non-matching rows (grand total)
      }

      // Emit a record only on rows where column B is the subtotal marker
      // and we currently have a valid agent in scope.
      const colBStr = (typeof colB === 'string') ? colB.trim() : '';
      const isSubtotalRow = colBStr === subtotalMarker || colBStr.startsWith(subtotalMarker);
      if (!isSubtotalRow || !currentAgent) continue;

      const premium = parseNumeric(colC);

      results.push({
        company_id: companyId,
        agent_name: currentAgent.agent_name,
        agent_number: currentAgent.agent_number,
        month: month,
        current_gross_premium: premium,
        previous_gross_premium: null,
        changes: null
      });
    } catch (error) {
      const errorMsg = `Row ${i + 1}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  console.log(`Elementary AGENT_MERGED_SUBTOTAL parsing complete: ${results.length} agent rows parsed, ${errors.length} errors`);

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