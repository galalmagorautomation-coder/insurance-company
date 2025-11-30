// Hachshara Elementary Insurance Mapping
// Column mappings for Hachshara elementary insurance data

/**
 * Hachshara Elementary Mapping Configuration
 * 
 * File Structure:
 * - Has 2 files to be processed and summed together
 * - Row 1: Skip (contains "יולי 2024יולי 2025אחוז שינוי")
 * - Row 2: Column headers
 * - Row 3: Grand total "סה"כ" (skip)
 * - Row 4+: Agent data with multiple rows per agent:
 *   - Agent header row: Column A has "agent_number - agent_name" + Column B has first branch name
 *   - Branch detail rows: Column A empty, Column B has branch name
 *   - Agent subtotal row: Column B has "סה"כ עבור [agent]" - SKIP THIS (we insert branches)
 * 
 * We insert ALL branch rows (including the first one in the agent header row)
 * 
 * Tab Name: "Sheet1"
 */

/**
 * Get Hachshara elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getHachsharaElementaryMapping(columns) {
  console.log('Using Hachshara Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Hachshara Elementary - Sales by Agent (Branch Rows)',
    companyName: 'Hachshara',
    sheetName: 'Sheet1',
    
    // Signature columns to identify this format
    signatureColumns: ['סוכן', 'הקבצת ענף מסחרי', 'פרמיה ברוטו'],
    
    // Row configuration
    headerRow: 2,        // Row 2 contains column headers (1-indexed)
    dataStartRow: 4,     // Row 4 is where agent data starts
    skipGrandTotal: true, // Skip row 3 which is grand "סה"כ"
    
    // Special parsing mode
    parseMode: 'AGENT_SUBTOTALS', // Parse branch rows (not subtotals)
    
    // Column mapping (using indices)
    columnMapping: {
      agentString: 0,           // Column A: Agent string (only in header rows)
      branchOrSubtotal: 1,      // Column B: Branch name OR "סה"כ עבור..." for subtotals
      previousGrossPremium: 2,  // Column C: 2024 gross premium
      currentGrossPremium: 4    // Column E: 2025 gross premium
    },
    
    // Agent string parser - same as Ayalon
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "219180 - גל אלמגור ס.לביטוח(2008)בעמ"
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
  getHachsharaElementaryMapping
};