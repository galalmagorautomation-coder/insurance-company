// Shirbit Elementary Insurance Mapping
// Column mappings for Shirbit elementary insurance data

/**
 * Shirbit Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file with policy-level data (one row per policy)
 * - Row 1: Column headers
 * - Row 2+: Policy data (485 policies)
 *   - Column 4: Agent name (סוכן)
 *   - Column 19: Agent number (מספר סוכן)
 *   - Column 7: Gross premium (פרמיה ברוטו)
 * - No total rows
 * 
 * We insert each policy as a separate row
 * Only current year data available (previous year will be null)
 * 
 * Tab Name: "דוח פרודוקציית סוכנים מפורט"
 */

/**
 * Get Shirbit elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getShirbitElementaryMapping(columns) {
  console.log('Using Shirbit Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Shirbit Elementary - Policy Level Data (All Policies)',
    companyName: 'Shirbit',
    sheetName: 'דוח פרודוקציית סוכנים מפורט',
    
    // Signature columns to identify this format
    signatureColumns: ['סוכן', 'מספר סוכן', 'פרמיה ברוטו'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts
    
    // Special parsing mode - insert all policy rows
    parseMode: 'POLICY_AGGREGATION',
    
    // Column mapping
    columnMapping: {
      agentNumber: 'מספר סוכן',      // Column 19: Agent number
      agentName: 'סוכן',             // Column 4: Agent name
      grossPremium: 'פרמיה ברוטו'    // Column 7: Premium per policy
    },
    
    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent number
      const agentNum = row['מספר סוכן'];
      if (!agentNum) return false;
      
      return true;
    }
  };
}

module.exports = {
  getShirbitElementaryMapping
};