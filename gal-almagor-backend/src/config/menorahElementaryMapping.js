// Menorah Elementary Insurance Mapping
// Column mappings for Menorah elementary insurance data

/**
 * Menorah Elementary Mapping Configuration
 * 
 * File Structure:
 * - File 1: Agent-level data (use this)
 * - File 2: Category breakdown (skip - not agents)
 * - Row 1: Column headers
 * - Row 2: Grand total "סה"כ" (skip)
 * - Row 3+: Agent data (one row per agent)
 *   - Column 1: Agent string "904399 גל אלמגור -דאוד סוכ לבי"
 *   - Column 2: Current year premium (2025)
 *   - Column 3: Previous year premium (2024)
 *   - Column 4: Change % (already calculated)
 * 
 * Standard one-row-per-agent structure
 * 
 * Tab Name: "Sheet1"
 */

/**
 * Get Menorah elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getMenorahElementaryMapping(columns) {
  console.log('Using Menorah Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Menorah Elementary - Direct Agent Data',
    companyName: 'Menorah',
    sheetName: 'Sheet1',
    
    // Signature columns to identify this format
    signatureColumns: ['שם סוכן משנה', 'פרמיה ברוטו יולי -  יולי 2025', 'פרמיה ברוטו \nיולי -  יולי 2024'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 3,     // Row 3 is where agent data starts (skip row 2 which is total)
    useNumericIndices: true, // Use numeric column indices
    
    // Column mapping (using indices)
    columnMapping: {
      agentString: 0,           // Column A: "904399 גל אלמגור -דאוד סוכ לבי"
      currentGrossPremium: 1,   // Column B: Current year premium
      previousGrossPremium: 2,  // Column C: Previous year premium
      changes: 3                // Column D: Change %
    },
    
    // Agent string parser - format: "904399 גל אלמגור -דאוד סוכ לבי"
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "904399 גל אלמגור -דאוד סוכ לבי"
      // Split by first space
      const firstSpaceIndex = agentString.indexOf(' ');
      
      if (firstSpaceIndex === -1) {
        return {
          agent_number: null,
          agent_name: agentString.trim()
        };
      }

      const agent_number = agentString.substring(0, firstSpaceIndex).trim();
      const agent_name = agentString.substring(firstSpaceIndex + 1).trim();

      return {
        agent_number: agent_number || null,
        agent_name: agent_name || null
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no data in agent column
      if (!row[0]) return false;
      
      // Skip total row "סה"כ"
      if (typeof row[0] === 'string' && row[0].includes('סה"כ')) return false;
      
      return true;
    }
  };
}

module.exports = {
  getMenorahElementaryMapping
};