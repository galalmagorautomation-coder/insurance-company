// Clal Elementary Insurance Mapping
// Column mappings for Clal elementary insurance data

/**
 * Clal Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file with policy-level data (one row per policy)
 * - Row 1: Column headers
 * - Row 2+: Policy data
 *   - Column 2: Agent number (מס' סוכן)
 *   - Column 3: Agent name (שם סוכן) - format "name-number"
 *   - Column 15: Gross premium (פרמיה ברוטו)
 * - Last 2 rows: Grand total "סה''כ" (skip)
 * 
 * We need to aggregate all policies per agent
 * Only current year data available (previous year will be null)
 * 
 * Tab Name: "excel.csv (1)"
 */

/**
 * Get Clal elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getClalElementaryMapping(columns) {
  console.log('Using Clal Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Clal Elementary - Policy Level Data (Aggregation Required)',
    companyName: 'Clal',
    sheetName: 'excel.csv (1)',
    
    // Signature columns to identify this format
    signatureColumns: ['מס\' סוכן', 'שם סוכן', 'פרמיה ברוטו'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts
    
    // Special parsing mode - aggregate policies by agent
    parseMode: 'POLICY_AGGREGATION',
    
    // Column mapping
    columnMapping: {
      agentNumber: 'מס\' סוכן',      // Column 2: Agent number
      agentName: 'שם סוכן',          // Column 3: Agent name
      grossPremium: 'פרמיה ברוטו'    // Column 15: Premium per policy
    },
    
    // Parse agent name - format: "וסים חאטר-72846"
    parseAgentName: (agentNameStr) => {
      if (!agentNameStr || typeof agentNameStr !== 'string') {
        return null;
      }
      
      // Remove the agent number suffix if present
      const dashIndex = agentNameStr.lastIndexOf('-');
      if (dashIndex !== -1) {
        return agentNameStr.substring(0, dashIndex).trim();
      }
      
      return agentNameStr.trim();
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent number
      if (!row['מס\' סוכן']) return false;
      
      // Skip total rows
      const sniaf = row['סניף'];
      if (sniaf && typeof sniaf === 'string' && sniaf.includes('סה\'\'כ')) return false;
      
      return true;
    }
  };
}

module.exports = {
  getClalElementaryMapping
};