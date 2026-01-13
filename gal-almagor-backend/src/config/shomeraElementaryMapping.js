// Shomera Elementary Insurance Mapping
// Column mappings for Shomera elementary insurance data

/**
 * Shomera Elementary Mapping Configuration
 *
 * SUPPORTS TWO FILE FORMATS:
 *
 * Format 1 (Shomera_elementary.xlsx - 7 columns):
 * - Sheet: "גיליון1"
 * - Columns: פריטים, זמן, סה"כ, רכב חובה, רכב קסקו, דירות, בתי עסק
 * - Date format: Datetime (2024-07-01)
 * - Agent data in Column A (פריטים)
 *
 * Format 2 (שומרה.xlsx - 8 columns):
 * - Sheet: "Sheet1"
 * - Columns: פריטים, זמן, סה"כ, רכב חובה, רכב קסקו, דירות, בתי עסק, חבויות
 * - Date format: Text (ינואר 2024 - אוגוסט 2024)
 * - Agent data in Column A (פריטים)
 *
 * Both formats use 3-row groups:
 *   - Row 1: Agent header + 2024 data (Column A: "741101 - בנימין גרניק")
 *   - Row 2: 2025 data (Column A: empty)
 *   - Row 3: Change % row (skip)
 */

/**
 * Detect which Shomera format is being used
 * @param {Array<string>} columns - Excel column headers
 * @returns {string} 'format1' or 'format2'
 */
function detectShomeraFormat(columns) {
  // Format 2 has "חבויות" column (8 columns total)
  if (columns.length >= 8 && columns.includes('7')) {
    console.log('Detected Format 2: שומרה.xlsx (8 columns with חבויות)');
    return 'format2';
  }

  // Format 1 has 7 columns without "חבויות"
  console.log('Detected Format 1: Shomera_elementary.xlsx (7 columns)');
  return 'format1';
}

/**
 * Get Shomera elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getShomeraElementaryMapping(columns) {
  console.log('Using Shomera Elementary mapping');
  console.log('Detected columns:', columns);

  const format = detectShomeraFormat(columns);

  return {
    description: `Shomera Elementary - 3-Row Agent Groups (${format})`,
    companyName: 'Shomera',
    sheetName: format === 'format1' ? 'גיליון1' : 'Sheet1',

    // Signature columns to identify this format
    signatureColumns: ['פריטים', 'זמן', 'סה"כ'],

    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 13,    // Row 13 is where agent data starts
    useNumericIndices: true, // Use numeric column indices

    // Special parsing mode
    parseMode: 'THREE_ROW_GROUPS',

    // Column mapping (using indices) - same for both formats
    columnMapping: {
      agentString: 0,           // Column A: Agent string (only in first row of group)
      dateColumn: 1,            // Column B: Date/label column
      totalPremium: 2           // Column C: Total premium (סה"כ)
    },

    // Agent string parser - format: "741101 - בנימין גרניק"
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Normalize by replacing non-breaking spaces with regular spaces
      const normalized = agentString.replace(/\u00A0/g, ' ');

      // Format: "741101 - בנימין גרניק"
      const firstDashIndex = normalized.indexOf(' - ');

      if (firstDashIndex === -1) {
        return {
          agent_number: null,
          agent_name: normalized.trim()
        };
      }

      const agent_number = normalized.substring(0, firstDashIndex).trim();
      const agent_name = normalized.substring(firstDashIndex + 3).trim();

      return {
        agent_number: agent_number || null,
        agent_name: agent_name || null
      };
    },

    // Validation function - determines row type (works for both formats)
    validateRow: (row) => {
      const col0 = row[0]; // Column A - agent string or empty
      const col1 = row[1]; // Column B - date/label column

      // Normalize "null" strings to actual null
      const normalizedCol0 = col0 === 'null' || col0 === null || col0 === undefined ? null : col0;
      const normalizedCol1 = col1 === 'null' || col1 === null || col1 === undefined ? null : col1;

      // Skip if both empty
      if (!normalizedCol0 && !normalizedCol1) return { shouldProcess: false, rowType: 'empty' };

      // Check if this is an agent header row (has agent string with dash separator in Column A)
      // Agent must have both agent number and name (e.g., "741101 - בנימין גרניק")
      // Check for multiple dash and space combinations (regular space and non-breaking space)
      const hasDash = normalizedCol0 && typeof normalizedCol0 === 'string' &&
                     (normalizedCol0.includes(' - ') ||    // Regular space + hyphen + regular space
                      normalizedCol0.includes(' -\u00A0') || // Regular space + hyphen + NBSP
                      normalizedCol0.includes('\u00A0-\u00A0') || // NBSP + hyphen + NBSP
                      normalizedCol0.includes('\u00A0- ') || // NBSP + hyphen + regular space
                      normalizedCol0.includes(' – ') ||    // En dash with spaces
                      normalizedCol0.includes(' — ') ||    // Em dash with spaces
                      normalizedCol0.includes(' ־ '));     // Hebrew maqaf with spaces

      if (hasDash) {
        // Make sure this is NOT a date label (dates contain Hebrew months)
        const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const isDateLabel = hebrewMonths.some(month => normalizedCol0.includes(month));

        // Also check if it's a header/metadata row
        const isHeaderRow = normalizedCol0.includes('פריטים') ||
                           normalizedCol0.includes('סוכן') ||
                           normalizedCol0.includes('משנה');

        if (!isDateLabel && !isHeaderRow) {
          // This should be an agent header - verify Col1 has 2024 date
          const col1HasDate = normalizedCol1 && String(normalizedCol1).includes('2024');

          if (col1HasDate) {
            return { shouldProcess: false, rowType: 'agent_header', agentString: normalizedCol0 };
          }
        }
      }

      // Check if this is a change % row
      if (normalizedCol1 && typeof normalizedCol1 === 'string' && normalizedCol1.includes('שיעור השינוי')) {
        return { shouldProcess: false, rowType: 'change_row' };
      }

      // Check if this is a 2025 data row (Column A empty, Column B has date)
      if (!normalizedCol0 && normalizedCol1) {
        const dateStr = String(normalizedCol1);

        // Format 1: datetime string like "2024-07-01" → check for "2025"
        // Format 2: text string like "ינואר 2025 - אוגוסט 2025" → check for "2025"
        if (dateStr.includes('2025')) {
          return { shouldProcess: true, rowType: 'current_year_data' };
        }
      }

      // Default: skip
      return { shouldProcess: false, rowType: 'unknown' };
    }
  };
}

module.exports = {
  getShomeraElementaryMapping
};