// Harel Elementary Insurance Mapping
// Column mappings for Harel elementary insurance data

/**
 * Harel Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file
 * - Row 1: Column headers (but columns A and B are empty)
 * - Row 2+: Direct agent data (one row per agent)
 *   - Column A: Group name (not used)
 *   - Column B: Agent "code - name" format
 *   - Column C: Current year premium
 *   - Column D: Previous year premium
 *   - Column E: Difference amount (not used)
 *   - Column F: Change % (already calculated)
 * - Last 2 rows: Grand total "סה"כ" (skip)
 * 
 * Simple one-row-per-agent structure
 * 
 * Tab Name: "Sheet 1" (with space)
 */

/**
 * Get Harel elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getHarelElementaryMapping(columns) {
  console.log('Using Harel Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Harel Elementary - Direct Agent Data',
    companyName: 'Harel',
    sheetName: 'Sheet 1',  // Note: with space
    
    // Signature columns to identify this format
    signatureColumns: ['פרמיה שנה נוכחית', 'פרמיה אשתקד', 'הפרש פרמיה מול אשתקד'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where agent data starts
    useNumericIndices: true, // Use numeric column indices instead of names
    
    // Column mapping (using indices since columns A and B have no headers)
    columnMapping: {
      groupName: 0,             // Column A: Group name (not used)
      agentString: 1,           // Column B: "code - name"
      currentGrossPremium: 2,   // Column C: Current year premium
      previousGrossPremium: 3,  // Column D: Previous year premium
      changes: 5                // Column F: Change % (already calculated)
    },
    
    // Agent string parser - format: "1419 - פחימה דני"
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "1419 - פחימה דני"
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
    validateRow: (row) => {
      // Skip if no data in agent column
      if (!row[1]) return false;
      
      // Skip total rows "סה"כ"
      if (typeof row[1] === 'string' && row[1].includes('סה"כ')) return false;
      
      return true;
    }
  };
}

module.exports = {
  getHarelElementaryMapping
};