// Haklai Elementary Insurance Mapping
// Column mappings for Haklai (חקלאי) elementary insurance data

/**
 * Haklai Elementary Mapping Configuration
 *
 * File Structure:
 * - Row 1: Date headers (אוקטובר 2024, אוקטובר 2025, שינוי)
 * - Row 2: Column sub-headers (סניפים, סוכנים, ענף מסחרי, פרמיה ברוטו, ספירת פוליסות נטו, etc.)
 * - Row 3: Total row (סה"כ) - SKIP
 * - Row 4+: Data rows (multiple rows per agent for different branches)
 *
 * Columns:
 *   סניפים | סוכנים | ענף מסחרי | פרמיה ברוטו (prev) | ספירת פוליסות נטו (prev) |
 *   פרמיה ברוטו (curr) | ספירת פוליסות נטו (curr) | פרמיה ברוטו (change) | ספירת פוליסות נטו (change)
 *
 * Agent format: "980023 - גל אלמגור" (number - name)
 * Branch format: "151 - גל אלמגור" (number - name)
 *
 * We need to aggregate all branch rows per agent
 * Has both previous year and current year data
 */

/**
 * Get Haklai elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getHaklaiElementaryMapping(columns) {
  console.log('Using Haklai Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Haklai Elementary - Branch Level Data (Aggregation Required)',
    companyName: 'Haklai',

    // Signature columns to identify this format
    signatureColumns: ['סניפים', 'סוכנים', 'ענף מסחרי'],

    // Row configuration - data starts after 2 header rows + 1 total row
    headerRow: 2,        // Row 2 contains the actual column headers
    dataStartRow: 4,     // Row 4 is where actual data starts (after headers and total)

    // Special parsing mode - aggregate branches by agent
    parseMode: 'POLICY_AGGREGATION',

    // Column mapping - these are the column headers from row 2
    // Note: xlsx may combine row 1 and row 2 headers or use row 2 only
    columnMapping: {
      branch: 'סניפים',                    // Branch: "151 - גל אלמגור"
      agentRaw: 'סוכנים',                  // Agent: "980023 - גל אלמגור"
      commercialBranch: 'ענף מסחרי',       // Commercial branch type
      // Previous year columns (אוקטובר 2024)
      previousGrossPremium: 'פרמיה ברוטו',  // Will need index-based access for first occurrence
      // Current year columns (אוקטובר 2025)
      currentGrossPremium: 'פרמיה ברוטו_1', // Will need index-based access for second occurrence
      // Change columns (שינוי)
      changeGrossPremium: 'פרמיה ברוטו_2'   // Will need index-based access for third occurrence
    },

    // Alternative: Use column indices if header names are problematic
    columnIndices: {
      branch: 0,                // Column A: סניפים
      agentRaw: 1,              // Column B: סוכנים
      commercialBranch: 2,      // Column C: ענף מסחרי
      previousGrossPremium: 3,  // Column D: פרמיה ברוטו (Oct 2024)
      previousPolicyCount: 4,   // Column E: ספירת פוליסות נטו (Oct 2024)
      currentGrossPremium: 5,   // Column F: פרמיה ברוטו (Oct 2025)
      currentPolicyCount: 6,    // Column G: ספירת פוליסות נטו (Oct 2025)
      changeGrossPremium: 7,    // Column H: פרמיה ברוטו (שינוי)
      changePolicyCount: 8      // Column I: ספירת פוליסות נטו (שינוי)
    },

    // Parse agent info from "סוכנים" column
    // Format: "980023 - גל אלמגור"
    parseAgentInfo: (agentStr) => {
      if (!agentStr || typeof agentStr !== 'string') {
        return { agentNumber: null, agentName: null };
      }

      const parts = agentStr.split(' - ');
      if (parts.length >= 2) {
        return {
          agentNumber: parts[0].trim(),
          agentName: parts.slice(1).join(' - ').trim()
        };
      }

      return { agentNumber: agentStr.trim(), agentName: null };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row, rowIndex) => {
      // Get the agent column value (could be by name or index)
      const agentValue = row['סוכנים'] || Object.values(row)[1];

      // Skip if no agent
      if (!agentValue) return false;

      // Skip total rows
      if (typeof agentValue === 'string' && agentValue.includes('סה"כ')) return false;

      // Skip header-like rows
      const firstCol = row['סניפים'] || Object.values(row)[0];
      if (firstCol === 'סניפים' || firstCol === 'סה"כ') return false;

      return true;
    },

    // Parse numeric values (remove commas)
    parseNumber: (value) => {
      if (value === null || value === undefined || value === '') return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    }
  };
}

module.exports = {
  getHaklaiElementaryMapping
};
