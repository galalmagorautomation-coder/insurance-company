/**
 * Meitav Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Note: Meitav has three file formats:
 * - Set 1: הפקדות (Pension) - Agent in Column N, Amount in Column M
 * - Set 2: פיננסים (Finance) - Agent in Column F, Amount in Column L
 * - Set 3: ניודי פנסיה (Pension Transfer) - Agent in Column F, Amount in Column L
 *
 * No date filtering needed for any format.
 * No risk products.
 */

const MEITAV_MAPPING_SET1 = {
  companyName: 'Meitav',
  companyNameHebrew: 'מיטב',
  description: 'Meitav Set 1 - Pension (הפקדות)',

  columns: {
    agentNumber: 'מספר סוכן ראשי',       // Column N - Agent Number
    agentName: null,

    output: 'סך הפקדה'                   // Column M - Amount
  },

  fixedCategory: 'PENSION'
};

const MEITAV_MAPPING_SET2 = {
  companyName: 'Meitav',
  companyNameHebrew: 'מיטב',
  description: 'Meitav Set 2 - Finance (פיננסים)',

  columns: {
    agentNumber: 'מספר סוכן ראשי',       // Column F - Agent Number
    agentName: null,

    output: 'סך תנועה'                   // Column L - Amount
  },

  fixedCategory: 'FINANCIAL'
};

const MEITAV_MAPPING_SET3 = {
  companyName: 'Meitav',
  companyNameHebrew: 'מיטב',
  description: 'Meitav Set 3 - Pension Transfer (ניודי פנסיה)',

  columns: {
    agentNumber: 'מספר סוכן ראשי',       // Column F - Agent Number
    agentName: null,

    output: 'סך תנועה'                   // Column L - Amount
  },

  fixedCategory: 'PENSION_TRANSFER'
};

/**
 * Helper function to determine which Meitav mapping to use
 * @param {Array} columns - Array of column names from the Excel file
 * @param {string} sheetName - Optional sheet name
 * @param {string} uploadType - Upload type hint from frontend (pension/finance/pension_transfer)
 * @param {Array} data - Parsed JSON data rows from the Excel file (for data-level detection)
 * @returns {Object} - The appropriate mapping configuration
 */
const getMeitavMapping = (columns, sheetName = null, uploadType = null, data = null) => {
  // Strategy 1: Use uploadType hint if provided
  if (uploadType === 'pension' || uploadType === 'הפקדות') {
    console.log('Detected Meitav Set 1 (Pension) by uploadType');
    return MEITAV_MAPPING_SET1;
  }
  if (uploadType === 'finance' || uploadType === 'פיננסים') {
    console.log('Detected Meitav Set 2 (Finance) by uploadType');
    return MEITAV_MAPPING_SET2;
  }
  if (uploadType === 'pension_transfer' || uploadType === 'ניודי פנסיה') {
    console.log('Detected Meitav Set 3 (Pension Transfer) by uploadType');
    return MEITAV_MAPPING_SET3;
  }

  // Strategy 2: Detect by columns
  // Set 1 has 'סך הפקדה' (Column M), Sets 2 & 3 have 'סך תנועה' (Column L)
  if (columns.includes('סך הפקדה')) {
    console.log('Detected Meitav Set 1 (Pension) by column: סך הפקדה');
    return MEITAV_MAPPING_SET1;
  }

  if (columns.includes('סך תנועה')) {
    // Finance and Pension Transfer have identical columns, so distinguish by data values.
    // PT has 'פנסיה' in the סוג קופה values (e.g. מיטב פנסיה מקיפה),
    // while Finance has גמל/השתלמות (e.g. מיטב השתלמות, מיטב גמל).
    if (data && data.length > 0) {
      const productType = String(data[0]['סוג קופה'] || '');
      if (productType.includes('פנסיה')) {
        console.log(`Detected Meitav Set 3 (Pension Transfer) by סוג קופה: "${productType}"`);
        return MEITAV_MAPPING_SET3;
      }
      console.log(`Detected Meitav Set 2 (Finance) by סוג קופה: "${productType}"`);
      return MEITAV_MAPPING_SET2;
    }

    // Fallback if no data provided
    console.log('Detected Meitav Set 2 (Finance) by column: סך תנועה (no data for further detection)');
    return MEITAV_MAPPING_SET2;
  }

  console.warn('Unable to determine Meitav file format, defaulting to Set 1 (Pension)');
  return MEITAV_MAPPING_SET1;
};

module.exports = {
  MEITAV_MAPPING_SET1,
  MEITAV_MAPPING_SET2,
  MEITAV_MAPPING_SET3,
  getMeitavMapping
};
