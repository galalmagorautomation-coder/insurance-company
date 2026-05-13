// Clal Elementary Insurance Mapping
// Column mappings for Clal elementary insurance data

/**
 * Clal Elementary Mapping Configuration
 *
 * Two formats supported:
 *
 * OLD format (≤ Dec 2025 issue + Feb/Mar 2026 .xls files):
 *   - Single sheet "Sheet1" with Windows-1255 Hebrew encoding
 *   - Row 1: headers, Row 2+: one row per policy
 *   - Columns: מס' סוכן (agent #), שם סוכן (name "name-number"), פרמיה ברוטו
 *   - Aggregation happens downstream (one row per policy → sum by agent)
 *
 * NEW format (Jan 2026 "corrected" report + going forward):
 *   - Workbook has two sheets — target sheet: "כמות, פרמיות למספר סוכן"
 *   - Row 5: headers, Row 6+: one row per agent (already aggregated by Clal)
 *   - Used range starts at column B (Excel A is empty)
 *   - Column D ("מספר סוכן") = agent number
 *   - Column E ("פרמיה ברוטו ללא אשראי ובולים-נומינלי שקל") = total premium
 *   - Last row is a "Total:" / "Sum:" line we must skip
 *   - The "פרמיה ברוטו…" header repeats for each product group, so we
 *     access by column INDEX, not by header name.
 */

const CLAL_ELEMENTARY_NEW_SHEET = 'כמות, פרמיות למספר סוכן';

const OLD_MAPPING = {
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
    const dashIndex = agentNameStr.lastIndexOf('-');
    if (dashIndex !== -1) {
      return agentNameStr.substring(0, dashIndex).trim();
    }
    return agentNameStr.trim();
  },

  // Validation function - determines if a row should be processed
  validateRow: (row) => {
    if (!row['מס\' סוכן']) return false;
    const sniaf = row['סניף'];
    if (sniaf && typeof sniaf === 'string' && sniaf.includes('סה\'\'כ')) return false;
    return true;
  }
};

const NEW_MAPPING = {
  description: 'Clal Elementary - New Format (per-agent rows, header at row 5)',
  companyName: 'Clal',
  sheetName: CLAL_ELEMENTARY_NEW_SHEET,

  // Row configuration (1-indexed)
  headerRow: 5,
  dataStartRow: 6,

  // The upload route reads this sheet with header:1 and range:5 (skip metadata + header),
  // so each row is an array starting at column B. We access by index, not by name,
  // because the "פרמיה ברוטו ללא אשראי ובולים-נומינלי שקל" header repeats per category.
  parseMode: 'POLICY_AGGREGATION',
  useArrayRows: true,

  columnIndices: {
    agentName: 0,      // Excel column B — שם עוסק מורשה
    taxId: 1,          // Excel column C — מספר עוסק מורשה
    agentNumber: 2,    // Excel column D — מספר סוכן
    grossPremium: 3    // Excel column E — total פרמיה ברוטו ללא אשראי ובולים-נומינלי שקל
  },

  // No agent name parsing needed — agent name is its own column
  parseAgentName: (s) => (s && typeof s === 'string') ? s.trim() : s,

  // Skip the trailing "Total:" / "Sum:" row and rows without an agent number
  validateRow: (row) => {
    if (!Array.isArray(row)) return false;
    const firstCell = String(row[0] || '').trim();
    if (firstCell === 'Total:' || firstCell.startsWith('Total')) return false;
    if (row[2] === null || row[2] === undefined || row[2] === '') return false;
    return true;
  }
};

/**
 * Get Clal elementary mapping based on the workbook's available sheets.
 * @param {Array<string>} columnsOrSheetList - Sheet names from the workbook
 *        (legacy callers pass detected column headers; we still return OLD in that case).
 * @returns {Object} Mapping configuration
 */
function getClalElementaryMapping(columnsOrSheetList) {
  if (Array.isArray(columnsOrSheetList) && columnsOrSheetList.includes(CLAL_ELEMENTARY_NEW_SHEET)) {
    console.log('Using Clal Elementary mapping (NEW format — per-agent rows)');
    return NEW_MAPPING;
  }
  console.log('Using Clal Elementary mapping (OLD format — per-policy rows)');
  return OLD_MAPPING;
}

module.exports = {
  getClalElementaryMapping,
  CLAL_ELEMENTARY_NEW_SHEET
};
