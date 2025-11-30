// Migdal Elementary Insurance Mapping
// Column mappings for Migdal elementary insurance data

/**
 * Migdal Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file with policy-level data (one row per policy)
 * - Row 1: Column headers
 * - Row 2+: Policy data (3,168 policies)
 *   - Column 1: Agent number (מספר סוכן)
 *   - Column 2: Agent name (שם סוכן)
 *   - Column 19: Gross premium (פרמיה ברוטו)
 * - No total rows
 * 
 * We insert each policy as a separate row
 * Only current year data available (previous year will be null)
 * 
 * Tab Name: "דוח תפוקה חדש"
 */

/**
 * Get Migdal elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getMigdalElementaryMapping(columns) {
  console.log('Using Migdal Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Migdal Elementary - Policy Level Data (All Policies)',
    companyName: 'Migdal',
    sheetName: 'דוח תפוקה חדש',
    
    // Signature columns to identify this format
    signatureColumns: ['מספר סוכן', 'שם סוכן', 'פרמיה ברוטו'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts
    
    // Special parsing mode - insert all policy rows
    parseMode: 'POLICY_AGGREGATION',
    
    // Column mapping
    columnMapping: {
      agentNumber: 'מספר סוכן',      // Column 1: Agent number
      agentName: 'שם סוכן',          // Column 2: Agent name
      grossPremium: 'פרמיה ברוטו'    // Column 19: Premium per policy
    },
    
    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent number
      if (!row['מספר סוכן']) return false;
      
      return true;
    }
  };
}

module.exports = {
  getMigdalElementaryMapping
};