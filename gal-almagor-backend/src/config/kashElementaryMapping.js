// Kash Elementary Insurance Mapping
// Column mappings for Kash elementary insurance data

/**
 * Kash Elementary Mapping Configuration
 *
 * File Structure:
 * - Single file with policy-level data (one row per policy)
 * - Row 1: Column headers
 * - Row 2+: Policy data
 *   - Column: מס סוכן (Agent Number)
 *   - Column: פרמיה ברוטו (Gross Premium)
 *   - Column: עמלה (Commission)
 * - Last row may contain totals (skip rows with empty agent number)
 *
 * Columns:
 *   מס סוכן | חודש תפוקה | מס ענף | מספר פוליסה | מספר לקוח | שם מבוטח/ת |
 *   מספר רישוי | התחלת פוליסה | סיום פוליסה | פרמיה במזומן | דמי אשראי |
 *   פרמיה ברוטו | עמלה
 *
 * We need to aggregate all policies per agent
 * Only current year data available (previous year will be null)
 */

/**
 * Get Kash elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getKashElementaryMapping(columns) {
  console.log('Using Kash Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Kash Elementary - Policy Level Data (Aggregation Required)',
    companyName: 'Kash',

    // Signature columns to identify this format
    signatureColumns: ['מס סוכן', 'פרמיה ברוטו', 'עמלה'],

    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where policy data starts

    // Special parsing mode - aggregate policies by agent
    parseMode: 'POLICY_AGGREGATION',

    // Column mapping
    columnMapping: {
      agentNumber: 'מס סוכן',           // Agent number
      grossPremium: 'פרמיה ברוטו',      // Gross premium per policy
      // Additional columns for reference (not used in aggregation)
      productionMonth: 'חודש תפוקה',    // Production month
      branchNumber: 'מס ענף',           // Branch number
      policyNumber: 'מספר פוליסה',      // Policy number
      customerNumber: 'מספר לקוח',      // Customer number
      insuredName: 'שם מבוטח/ת',        // Insured name
      licenseNumber: 'מספר רישוי',      // License number
      policyStart: 'התחלת פוליסה',      // Policy start date
      policyEnd: 'סיום פוליסה',         // Policy end date
      cashPremium: 'פרמיה במזומן',      // Cash premium
      creditFee: 'דמי אשראי',           // Credit fee
      commission: 'עמלה'                // Commission
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent number
      const agentNum = row['מס סוכן'];
      if (!agentNum) return false;

      // Skip total/summary rows (usually have no agent number or contain סה"כ)
      if (typeof agentNum === 'string' && agentNum.includes('סה"כ')) return false;

      return true;
    },

    // Parse currency values (remove ₪ symbol and commas)
    parseCurrency: (value) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove currency symbol, commas, and spaces
        const cleaned = value.replace(/[₪,\s]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    }
  };
}

module.exports = {
  getKashElementaryMapping
};
