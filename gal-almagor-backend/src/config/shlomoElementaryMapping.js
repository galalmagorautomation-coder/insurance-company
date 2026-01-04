// Shlomo Elementary Insurance Mapping
// Column mappings for Shlomo elementary insurance data

/**
 * Shlomo Elementary Mapping Configuration
 * 
 * NEW FORMAT (2025):
 * - Row 1: Column headers (ינואר 2025, פברואר 2025, מרץ 2025...)
 * - Row 2+: Agent data with multiple rows per agent:
 *   - Agent header row: Column A has "301930 - נעמי עדן" + Column B has first branch
 *   - Branch detail rows: Column A empty, Column B has branch name
 *   - Agent subtotal row: Column B has "סה"כ עבור [agent]" - SKIP THIS (we insert branches)
 * 
 * We insert ALL branch rows (including the first one in the agent header row)
 * 
 * Tab Name: "Sheet1"
 */

// Month name mappings: English to Hebrew
const MONTH_HEBREW = {
  1: 'ינואר',    // January
  2: 'פברואר',   // February
  3: 'מרץ',      // March
  4: 'אפריל',    // April
  5: 'מאי',      // May
  6: 'יוני',     // June
  7: 'יולי',     // July
  8: 'אוגוסט',   // August
  9: 'ספטמבר',   // September
  10: 'אוקטובר', // October
  11: 'נובמבר',  // November
  12: 'דצמבר'    // December
};

/**
 * Get Shlomo elementary mapping based on selected month
 * @param {string} selectedMonth - Month in YYYY-MM format (e.g., "2025-07")
 * @returns {Object} Mapping configuration
 */
function getShlomoElementaryMapping(selectedMonth) {
  console.log('Using Shlomo Elementary mapping for month:', selectedMonth);
  
  // Parse the selected month
  const [year, monthNum] = selectedMonth.split('-');
  const currentYear = parseInt(year);
  const previousYear = currentYear - 1;
  const month = parseInt(monthNum);
  
  // Get Hebrew month name
  const hebrewMonth = MONTH_HEBREW[month];
  
  if (!hebrewMonth) {
    throw new Error(`Invalid month number: ${month}. Must be between 1-12.`);
  }
  
  // Build EXACT column names for strict matching
  // Format: "יולי 2025" (space between month and year)
  const currentYearColumn = `${hebrewMonth} ${currentYear}`;
  const previousYearColumn = `${hebrewMonth} ${previousYear}`;
  
  console.log(`📅 Strict column matching required:`);
  console.log(`   Current year: "${currentYearColumn}"`);
  console.log(`   Previous year: "${previousYearColumn}"`);
  console.log(`⚠️  If Excel file doesn't have these EXACT columns, upload will fail.`);

  return {
    description: `Shlomo Elementary - Sales by Agent (${hebrewMonth} ${currentYear} vs ${previousYear})`,
    companyName: 'Shlomo',
    sheetName: 'Sheet1',
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where agent data starts
    useNumericIndices: false, // Use column header names for premium columns
    useMixedMapping: true,    // Mix of indices (agent/branch) and names (premiums)
    
    // Special parsing mode
    parseMode: 'AGENT_SUBTOTALS', // Parse branch rows (not subtotals)
    
    // Column mapping (mixed: indices for agent/branch, names for premiums)
    columnMapping: {
      agentString: 0,                      // Column A: Agent string (by index)
      branchOrSubtotal: 1,                 // Column B: Branch name (by index)
      currentGrossPremium: currentYearColumn,   // By column name: "יולי 2025"
      previousGrossPremium: previousYearColumn  // By column name: "יולי 2024"
    },
    
    // Agent string parser - format: "301930 - נעמי עדן"
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "301930 - נעמי עדן"
      const firstDashIndex = agentString.indexOf(' - ');
      
      if (firstDashIndex === -1) {
        return {
          agent_number: null,
          agent_name: agentString.trim()
        };
      }

      const agent_number = agentString.substring(0, firstDashIndex).trim();
      const agent_name = agentString.substring(firstDashIndex + 3).trim();

      return {
        agent_number: agent_number || null,
        agent_name: agent_name || null
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row, previousAgentString = null) => {
      const columnA = row[0];
      const columnB = row[1];
      
      // Skip if no data
      if (!columnA && !columnB) {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
      }
      
      // Check if this is grand total row
      if (columnA === 'סה"כ') {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
      }
      
      // Check if Column B contains "סה"כ עבור" (agent subtotal row) - SKIP IT
      if (columnB && typeof columnB === 'string' && columnB.includes('סה"כ עבור')) {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: true };
      }
      
      // Check if this is an agent header row (has agent number - name in column A)
      if (columnA && typeof columnA === 'string' && columnA.includes(' - ')) {
        // This is an agent header row
        // Check if it ALSO has branch data (Column B has a branch name)
        const hasBranchData = columnB && typeof columnB === 'string' && !columnB.includes('סה"כ');
        
        return { 
          shouldProcess: hasBranchData,  // TRUE if this row also has branch data
          isAgentHeader: true, 
          isSubtotal: false,
          agentString: columnA 
        };
      }
      
      // This is a branch detail row (Column A empty, Column B has branch name)
      if (!columnA && columnB && typeof columnB === 'string' && !columnB.includes('סה"כ')) {
        return { shouldProcess: true, isAgentHeader: false, isSubtotal: false };
      }
      
      // Default: skip
      return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
    }
  };
}

module.exports = {
  getShlomoElementaryMapping
};