// M.M.S Elementary Insurance Mapping
// Column mappings for M.M.S elementary insurance data

/**
 * M.M.S Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file with policy-level data (one row per policy)
 * - Row 1: Column headers
 * - Row 2+: Policy data (~47 policies)
 *   - Column 7: Group number (מס' קבוצה) - acts as agent number
 *   - Column 8: Group name (שם קבוצה) - acts as agent name
 *   - Column 2: Premium (מחיר הסכם)
 * - No total rows
 * 
 * We insert each policy as a separate row
 * Only current year data available (previous year will be null)
 * 
 * Tab Name: "Memci_2799 (8)" (or similar - starts with "Memci_")
 */

/**
 * Get M.M.S elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getMMSElementaryMapping(columns) {
  console.log('Using M.M.S Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'M.M.S Elementary - Policy Level Data (All Policies)',
    companyName: 'M.M.S',
    sheetName: null, // Will use first sheet that starts with "Memci_"
    
    // Signature columns to identify this format
    signatureColumns: ['מס\' קבוצה', 'שם קבוצה', 'מחיר הסכם'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts
    
    // Special parsing mode - insert all policy rows
    parseMode: 'POLICY_AGGREGATION',
    
    // Column mapping
    columnMapping: {
      agentNumber: 'מס\' קבוצה',      // Column 7: Group number (agent number)
      agentName: 'שם קבוצה',          // Column 8: Group name (agent name)
      grossPremium: 'תשלום ע"י המנוי'       // Column 2: Premium per policy
    },
    
    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no group number
      if (!row['מס\' קבוצה']) return false;
      
      return true;
    }
  };
}

module.exports = {
  getMMSElementaryMapping
};