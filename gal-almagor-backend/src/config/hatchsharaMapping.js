/**
 * Hachshara Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Note: Hachshara has two life insurance file formats:
 * - Set 1: סיכונים (Risk) - Agent in Column D (סוכן), Amount in Column M (Sum of פרמיה חודשית)
 * - Set 2: פיננסים (Pension) - Agent in Column D (סוכן), Amount in Column O (Sum of הפקדות)
 *
 * Agent column format: "NUMBER - NAME" (e.g. "9569 - גל אלמגור סוכ בטוח בעמ")
 * Need to split and use the number part for matching.
 *
 * No date filtering needed for any format.
 */

const HACHSHARA_MAPPING_SET1 = {
  companyName: 'Hachshara',
  companyNameHebrew: 'הכשרה',
  description: 'Hachshara Set 1 - Risk (סיכונים)',

  columns: {
    agentNumber: 'סוכן',                       // Column D - "NUMBER - NAME" format, split to get number
    agentName: null,

    output: 'Sum of פרמיה חודשית'              // Column M - Amount
  },

  fixedCategory: 'RISK'
};

const HACHSHARA_MAPPING_SET2 = {
  companyName: 'Hachshara',
  companyNameHebrew: 'הכשרה',
  description: 'Hachshara Set 2 - Pension (פיננסים)',

  columns: {
    agentNumber: 'סוכן',                       // Column D - "NUMBER - NAME" format, split to get number
    agentName: null,

    output: 'Sum of הפקדות'                    // Column O - Amount
  },

  fixedCategory: 'PENSION'
};

/**
 * Helper function to determine which Hachshara mapping to use
 * @param {Array} columns - Array of column names from the Excel file
 * @returns {Object} - The appropriate mapping configuration
 */
const getHachsharaMapping = (columns) => {
  // Risk file has 'Sum of פרמיה חודשית', Pension file has 'Sum of הפקדות'
  if (columns.includes('Sum of פרמיה חודשית')) {
    console.log('Detected Hachshara Set 1 (Risk) by column: Sum of פרמיה חודשית');
    return HACHSHARA_MAPPING_SET1;
  }

  if (columns.includes('Sum of הפקדות')) {
    console.log('Detected Hachshara Set 2 (Pension) by column: Sum of הפקדות');
    return HACHSHARA_MAPPING_SET2;
  }

  console.warn('Unable to determine Hachshara file format, defaulting to Set 1 (Risk)');
  return HACHSHARA_MAPPING_SET1;
};

module.exports = {
  HACHSHARA_MAPPING_SET1,
  HACHSHARA_MAPPING_SET2,
  getHachsharaMapping
};
