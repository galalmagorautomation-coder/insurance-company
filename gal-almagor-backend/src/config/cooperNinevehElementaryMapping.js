// Cooper Nineveh Elementary Insurance Mapping
// Column mappings for Cooper Nineveh (קופר נינווה) elementary insurance data

/**
 * Cooper Nineveh Elementary Mapping Configuration
 *
 * File Structure:
 * - Always access the first tab
 * - Column C: Agent ID (מספר סוכן)
 * - Column D: Agent Name (שם סוכן)
 * - Column Q: Gross Premium to sum (פרמיה ברוטו)
 *
 * Tab Name: First tab (index 0)
 */

/**
 * Get Cooper Nineveh elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getCooperNinevehElementaryMapping(columns) {
  console.log('Using Cooper Nineveh Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Cooper Nineveh Elementary - Agent Data',
    companyName: 'Cooper Nineveh',
    sheetName: null,  // Use first sheet (index 0)
    sheetIndex: 0,    // Always first tab

    // Signature columns to identify this format
    signatureColumns: ['שם סוכן', 'מספר סוכן', 'פרמיה ברוטו'],

    // Row configuration
    headerRow: 1,        // Row 1 contains column headers (1-indexed)
    dataStartRow: 2,     // Row 2 is where agent data starts
    useColumnNames: true, // Use exact column names instead of indices

    // Column mapping - using exact column names from Excel
    columnMapping: {
      agentIdColumn: 'מספר סוכן',        // Agent ID column name
      agentNameColumn: 'שם סוכן',        // Agent Name column name
      currentGrossPremium: 'פרמיה_ברוטו', // Gross Premium column name (with underscore!)
      previousGrossPremium: null          // Not provided by Cooper Nineveh
    },

    // Agent string parser - extracts from separate columns
    parseAgent: (agentId, agentName) => {
      return {
        agent_number: agentId ? String(agentId).trim() : null,
        agent_name: agentName ? String(agentName).trim() : null
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // row is the actual row object with column names as keys
      const agentId = row['מספר סוכן'];
      const agentName = row['שם סוכן'];

      if (!agentId && !agentName) return false;

      // Skip total rows "סה"כ"
      if (typeof agentName === 'string' && agentName.includes('סה"כ')) return false;
      if (typeof agentId === 'string' && agentId.includes('סה"כ')) return false;

      return true;
    }
  };
}

module.exports = {
  getCooperNinevehElementaryMapping
};
