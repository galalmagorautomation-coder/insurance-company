/**
 * Meitav Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * File formats:
 * - Set 1: הפקדות (Pension) - Agent in Column N, Amount in Column M
 * - Set 23: פיננסים + ניודי פנסיה combined - Agent in Column F, Amount in Column L,
 *           per-row category via סוג קופה (contains "פנסיה" → PENSION_TRANSFER, else → FINANCIAL).
 *           Covers Feb 2026 onwards. Older months may still ship Set 2/Set 3 as separate files;
 *           those legacy mappings remain below for backward compatibility.
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

// Combined Finance + Pension Transfer file (Feb 2026 onwards).
// Same columns as Set 2/Set 3; no fixedCategory — caller tags each row
// from סוג קופה (D) at insert time.
const MEITAV_MAPPING_SET23 = {
  companyName: 'Meitav',
  companyNameHebrew: 'מיטב',
  description: 'Meitav Set 2+3 - Combined Finance + Pension Transfer',

  columns: {
    agentNumber: 'מספר סוכן ראשי',       // Column F - Agent Number
    agentName: null,

    output: 'סך תנועה',                  // Column L - Amount
    product: 'סוג קופה'                  // Column D - used for per-row category dispatch
  }
};

// Maps a Meitav סוג קופה value to a product category.
// Rule: anything containing "פנסיה" → PENSION_TRANSFER, else → FINANCIAL.
// Covers known products: מיטב גמל, מיטב השתלמות, מיטב גמל להשקעה (→ Finance),
// מיטב פנסיה מקיפה, מיטב פנסיה כללית (→ Pension Transfer).
const classifyMeitavCombinedRow = (productValue) => {
  const text = String(productValue || '');
  return text.includes('פנסיה') ? 'PENSION_TRANSFER' : 'FINANCIAL';
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
    // Feb 2026 onwards: Finance + Pension Transfer ship in one combined file.
    // If any פנסיה rows appear alongside non-פנסיה rows, use the combined mapping
    // (the caller will tag each row's category from סוג קופה at insert time).
    if (data && data.length > 0) {
      let hasPensionRow = false;
      let hasNonPensionRow = false;
      for (const r of data) {
        const productType = String(r['סוג קופה'] || '');
        if (productType.includes('פנסיה')) hasPensionRow = true;
        else if (productType.trim()) hasNonPensionRow = true;
        if (hasPensionRow && hasNonPensionRow) break;
      }

      if (hasPensionRow && hasNonPensionRow) {
        console.log('Detected Meitav Set 2+3 (combined Finance + Pension Transfer) by mixed סוג קופה values');
        return MEITAV_MAPPING_SET23;
      }
      if (hasPensionRow) {
        console.log('Detected Meitav Set 3 (Pension Transfer) — all rows have סוג קופה containing "פנסיה"');
        return MEITAV_MAPPING_SET3;
      }
      console.log('Detected Meitav Set 2 (Finance) — no rows have סוג קופה containing "פנסיה"');
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
  MEITAV_MAPPING_SET23,
  classifyMeitavCombinedRow,
  getMeitavMapping
};
