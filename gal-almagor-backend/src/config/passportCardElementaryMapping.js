// Passport Elementary Insurance Mapping
// Column mappings for Passport elementary insurance data

/**
 * Passport Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file with policy-level data (one row per insured person)
 * - Row 1: Column headers
 * - Row 2+: Policy data (807 policies)
 *   - Column 20: Agent name (שם סוכן מוכר)
 *   - Column 23: Agent number (מספר סוכן) - format: "1/1/44962"
 *   - Column 6: Premium paid (סה״כ פרמיה ששולמה(₪))
 * - No total rows
 * 
 * We insert each policy as a separate row
 * Only current year data available (previous year will be null)
 * 
 * Tab Name: "Premium"
 */

/**
 * Get Passport elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getPassportCardElementaryMapping(columns) {
  console.log('Using Passport Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Passport Elementary - Policy Level Data (All Policies)',
    companyName: 'Passport',
    sheetName: 'Premium',
    
    // Signature columns to identify this format
    signatureColumns: ['שם סוכן מוכר', 'מספר סוכן', 'סה״כ פרמיה ששולמה(₪)'],
    
    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts
    
    // Special parsing mode - insert all policy rows
    parseMode: 'POLICY_AGGREGATION',
    
    // Column mapping
    columnMapping: {
      agentNumber: 'מספר סוכן',           // Column 23: Agent number (format: "1/1/44962")
      agentName: 'שם סוכן מוכר',          // Column 20: Agent name
      grossPremium: 'סה״כ פרמיה ששולמה(₪)'  // Column 6: Premium per policy
    },
    
    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent number
      const agentNum = row['מספר סוכן'];
      if (!agentNum || agentNum === '-') return false;
      
      return true;
    }
  };
}

module.exports = {
  getPassportCardElementaryMapping  // Make sure this matches!
};