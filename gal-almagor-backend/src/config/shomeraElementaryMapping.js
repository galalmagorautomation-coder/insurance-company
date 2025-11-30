// Shomera Elementary Insurance Mapping
// Column mappings for Shomera elementary insurance data

/**
 * Shomera Elementary Mapping Configuration
 * 
 * File Structure:
 * - Row 1-11: Headers and totals (skip)
 * - Row 12: Column headers for agent section
 * - Row 13+: Agent data in 3-row groups:
 *   - Row 1: Agent header + 2024 data (Column 1: "741101 - בנימין גרניק", Column 3: previous year premium)
 *   - Row 2: 2025 data (Column 1: empty, Column 3: current year premium)
 *   - Row 3: Change % row (skip)
 * 
 * Special 3-row parsing mode
 * 
 * Tab Name: "גיליון1"
 */

/**
 * Get Shomera elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getShomeraElementaryMapping(columns) {
  console.log('Using Shomera Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Shomera Elementary - 3-Row Agent Groups',
    companyName: 'Shomera',
    sheetName: 'גיליון1',
    
    // Signature columns to identify this format
    signatureColumns: ['פריטים', 'זמן', 'סה"כ'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 13,    // Row 13 is where agent data starts
    useNumericIndices: true, // Use numeric column indices
    
    // Special parsing mode
    parseMode: 'THREE_ROW_GROUPS',
    
    // Column mapping (using indices)
    columnMapping: {
      agentString: 0,           // Column A: Agent string (only in first row of group)
      dateColumn: 1,            // Column B: Date/label column
      totalPremium: 2           // Column C: Total premium (סה"כ)
    },
    
    // Agent string parser - format: "741101 - בנימין גרניק"
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "741101 - בנימין גרניק"
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

    // Validation function - determines row type
    validateRow: (row) => {
      const col0 = row[0]; // Agent column
      const col1 = row[1]; // Date/label column
      
      // Skip if both empty
      if (!col0 && !col1) return { shouldProcess: false, rowType: 'empty' };
      
      // Check if this is an agent header row (has agent string in Column A)
      if (col0 && typeof col0 === 'string' && col0.includes(' - ')) {
        return { shouldProcess: false, rowType: 'agent_header', agentString: col0 };
      }
      
      // Check if this is a change % row
      if (col1 && typeof col1 === 'string' && col1.includes('שיעור השינוי')) {
        return { shouldProcess: false, rowType: 'change_row' };
      }
      
      // Check if this is a 2025 data row (Column A empty, Column B has date)
      if (!col0 && col1) {
        const dateStr = String(col1);
        if (dateStr.includes('2025')) {
          return { shouldProcess: true, rowType: 'current_year_data' };
        }
      }
      
      // Default: skip
      return { shouldProcess: false, rowType: 'unknown' };
    }
  };
}

module.exports = {
  getShomeraElementaryMapping
};