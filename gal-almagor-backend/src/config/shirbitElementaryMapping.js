// Shirbit Elementary Insurance Mapping
// Column mappings for Shirbit elementary insurance data

/**
 * Two formats supported:
 *
 * OLD format (per-policy .xls files):
 *   - Sheet: "דוח פרודוקציית סוכנים מפורט"
 *   - Row 1: headers, Row 2+: one row per policy
 *   - Columns: סוכן (agent name), מספר סוכן (agent number), פרמיה ברוטו (premium)
 *   - Aggregation happens downstream
 *
 * NEW format (per-agent merged-subtotal .xlsx files, Jan 2026 onwards):
 *   - Sheet: "Sheet 1" (with space)
 *   - Row 1: header row
 *   - Column A: agent string "code - name" — merged across that agent's
 *     product rows AND its subtotal row, so cells after the first are null
 *   - Column B: product name OR literal "סה"כ" on the subtotal row
 *   - Column C: amount (current-year premium)
 *   - Columns D, E: previous-year premium / change ratio — ignored
 *   - Final row is a grand-total row with "סה"כ" in BOTH columns A and B —
 *     it must be skipped or it would double-count the file's total.
 *
 *   Only the per-agent subtotal row contributes to raw_data_elementary
 *   (one row per agent, regardless of how many product lines that agent has).
 */

const SHIRBIT_NEW_SHEET = 'Sheet 1';

const OLD_MAPPING = {
  description: 'Shirbit Elementary - Policy Level Data (All Policies)',
  companyName: 'Shirbit',
  sheetName: 'דוח פרודוקציית סוכנים מפורט',

  signatureColumns: ['סוכן', 'מספר סוכן', 'פרמיה ברוטו'],

  headerRow: 1,
  dataStartRow: 2,

  parseMode: 'POLICY_AGGREGATION',

  columnMapping: {
    agentNumber: 'מספר סוכן',
    agentName: 'סוכן',
    grossPremium: 'פרמיה ברוטו'
  },

  validateRow: (row) => {
    const agentNum = row['מספר סוכן'];
    if (!agentNum) return false;
    return true;
  }
};

const NEW_MAPPING = {
  description: 'Shirbit Elementary - New Format (merged-cell agent blocks, סה"כ row totals)',
  companyName: 'Shirbit',
  sheetName: SHIRBIT_NEW_SHEET,

  headerRow: 1,
  dataStartRow: 2,

  // The upload route reads this sheet with header:1 (rows are arrays).
  parseMode: 'AGENT_MERGED_SUBTOTAL',

  columnIndices: {
    agentString: 0,   // Excel column A — "26663 - גל אלמגור..." (merged)
    subtotalFlag: 1,  // Excel column B — product name or "סה"כ"
    amount: 2         // Excel column C — current year premium
  },

  // "26663 - גל אלמגור סוכ'/רביד מרי/שירביט" → { number: "26663", name: "גל אלמגור..." }
  // Returns null for grand-total rows (where col A is "סה"כ").
  parseAgent: (agentString) => {
    if (!agentString || typeof agentString !== 'string') return null;
    const match = agentString.match(/^\s*(\d+)\s*-\s*(.+)\s*$/);
    if (!match) return null;
    return { agent_number: match[1], agent_name: match[2].trim() };
  },

  // The literal subtotal marker in column B.
  subtotalMarker: 'סה"כ'
};

/**
 * Get Shirbit elementary mapping based on the workbook's available sheets.
 * @param {Array<string>} columnsOrSheetList - Sheet names from the workbook
 *        (legacy callers pass column headers; we still return OLD in that case
 *        since the column headers won't include "Sheet 1").
 * @returns {Object} Mapping configuration
 */
function getShirbitElementaryMapping(columnsOrSheetList) {
  if (Array.isArray(columnsOrSheetList) && columnsOrSheetList.includes(SHIRBIT_NEW_SHEET)) {
    console.log('Using Shirbit Elementary mapping (NEW format — merged-cell agent subtotals)');
    return NEW_MAPPING;
  }
  console.log('Using Shirbit Elementary mapping (OLD format — per-policy rows)');
  return OLD_MAPPING;
}

module.exports = {
  getShirbitElementaryMapping,
  SHIRBIT_NEW_SHEET
};
