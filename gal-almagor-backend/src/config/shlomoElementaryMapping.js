// Shlomo Elementary Insurance Mapping
// Column mappings for Shlomo elementary insurance data

/**
 * Shlomo Elementary Mapping Configuration
 *
 * File Structure:
 * - Sheet: "גיליון1"
 * - Row 1: Column headers: סוכן | ענף מסחרי | פרמיה ברוטו
 * - Row 2: Grand total "סה"כ" (skip)
 * - Row 3+: Agent + branch rows (agent string repeated on every row in Col A)
 *   - Agent subtotal row: Col B has "סה"כ עבור [agent]" - skip
 */

/**
 * Get Shlomo elementary mapping based on selected month
 * @param {string} selectedMonth - Month in YYYY-MM format (e.g., "2025-07")
 * @returns {Object} Mapping configuration
 */
function getShlomoElementaryMapping(selectedMonth) {
  console.log('Using Shlomo Elementary mapping for month:', selectedMonth);

  return {
    description: 'Shlomo Elementary - Sales by Agent (Branch Rows)',
    companyName: 'Shlomo',
    sheetName: 'גיליון1',

    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where agent data starts
    useNumericIndices: true,
    useMixedMapping: false,

    // Special parsing mode
    parseMode: 'AGENT_SUBTOTALS',

    // Column mapping (all by index)
    // Format: Col A = agent string, Col B = branch, Col C = premium (פרמיה ברוטו)
    columnMapping: {
      agentString: 0,              // Column A: Agent string "301930 - נעמי עדן"
      branchOrSubtotal: 1,         // Column B: Branch name or "סה"כ עבור..."
      currentGrossPremium: 2,      // Column C: פרמיה ברוטו
      previousGrossPremium: null   // Not provided
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