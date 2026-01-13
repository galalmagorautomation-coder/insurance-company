// Securities Elementary Insurance Mapping
// Column mappings for Securities (סקוריטס) elementary insurance data

/**
 * Securities Elementary Mapping Configuration
 *
 * File Structure:
 * - Always access the first tab
 * - Only ONE agent: agent_number = "438", agent_name = "גל אלמגור-סוכנים"
 * - Column L: Gross Premium (פרמיה ברוטו) - if empty, ignore
 *
 * This company has a single agent, so we hardcode the agent information
 * and aggregate all rows with valid premium data for that agent.
 *
 * Tab Name: First tab (index 0)
 */

/**
 * Get Securities elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getSecuritiesElementaryMapping(columns) {
  console.log('Using Securities Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Securities Elementary - Single Agent Aggregation',
    companyName: 'Securities',
    sheetName: null,  // Use first sheet (index 0)
    sheetIndex: 0,    // Always first tab

    // Signature columns to identify this format
    signatureColumns: ['פרמיה ברוטו'],

    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where data starts
    useColumnNames: true, // Use exact column names instead of indices

    // Column mapping - using column index since column A is empty
    // The actual "פרמיה ברוטו" header is in column L (index 11), but because
    // column A is empty, XLSX names it __EMPTY_11
    columnMapping: {
      currentGrossPremium: '__EMPTY_11', // Column L: פרמיה ברוטו
      previousGrossPremium: null          // Not provided by Securities
    },

    // Hardcoded agent info - Securities only has one agent
    fixedAgent: {
      agent_number: '438',
      agent_name: 'גל אלמגור-סוכנים'
    },

    // Agent string parser - returns hardcoded values
    parseAgent: () => {
      return {
        agent_number: '438',
        agent_name: 'גל אלמגור-סוכנים'
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Check if premium column exists and has a value
      const premium = row['__EMPTY_11']; // Column L: פרמיה ברוטו

      // Skip if premium is empty, null, undefined, or 0
      if (premium === null || premium === undefined || premium === '' || premium === 0) {
        return false;
      }

      // Skip total rows "סה"כ"
      if (typeof premium === 'string' && premium.includes('סה"כ')) {
        return false;
      }

      return true;
    }
  };
}

module.exports = {
  getSecuritiesElementaryMapping
};
