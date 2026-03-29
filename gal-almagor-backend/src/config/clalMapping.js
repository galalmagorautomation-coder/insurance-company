/**
 * Clal Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Note: Clal has three file formats:
 * - Set 1: Financial products (YTD cumulative) - finance.xlsx
 *   - Sheet: רמת פוליסה כל המוצרים
 *   - FINANCIAL = סה"כ פיננסים
 *
 * - Set 2: Pension Transfer (YTD cumulative) - pension_transfer.xlsx
 *   - Sheet: גיליון1
 *   - PENSION_TRANSFER = ניוד_נטו
 *
 * - Set 3: Risk & Pension (YTD cumulative) - דוח תפוקה פרמיה כוללת ליעדים
 *   - Sheet: רמת עוסק מורשה
 *   - Agent: Column E (מספר סוכן)
 *   - RISK = Column G (עסקי בריאות) + Column J (עסקי ריסק)
 *   - PENSION = Column O (קרן פנסיה חדשה)
 */

const CLAL_MAPPING_SET1 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 1 - Financial products only',
    targetSheet: 'רמת פוליסה כל המוצרים',
    headerRow: 4,                          // Header at row 4
    dataStartRow: 5,                       // Data starts at row 5
    isCumulative: true,                    // Year-to-date cumulative data
    stopAtColumnB: 'Count:',               // Stop processing when Column B contains "Count:"

    columns: {
      // Agent information - Column H
      agentNumber: 'מספר סוכן',             // Column H - Agent Number
      agentName: null,                      // Will use agent number as name

      // Financial - Column Z (FINANCIAL only)
      output: 'סה"כ פיננסים'                // Column Z - Total Financial (only category)
    },

    // Fixed category - all data is FINANCIAL
    fixedCategory: 'FINANCIAL'
  };
  
  const CLAL_MAPPING_SET2 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 2 - Pension Transfer only',
    targetSheet: 'גיליון1',
    headerRow: 1,                          // Header at row 1
    dataStartRow: 2,                       // Data starts at row 2
    isCumulative: true,                    // Year-to-date cumulative data

    columns: {
      // Agent information - Column G
      agentNumber: 'מספר סוכן מוביל',       // Column G - Agent ID
      agentName: null,                      // Will use agent number as name

      // Transfer amount - Column M
      output: 'ניוד_נטו'                    // Column M - Net Transfer (PENSION_TRANSFER)
    },

    // Fixed category - all data is PENSION_TRANSFER
    fixedCategory: 'PENSION_TRANSFER'
  };
  
  const CLAL_MAPPING_SET3 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 3 - Risk & Pension from agent-level summary',
    targetSheet: 'רמת עוסק מורשה',        // Agent-level summary sheet
    headerRow: 4,                          // Header at row 4
    dataStartRow: 5,                       // Data starts at row 5
    isCumulative: true,                    // Year-to-date cumulative data
    isColumnBased: true,                   // Categories come from specific columns, not product names

    columns: {
      // Column E: מספר סוכן (Agent Number)
      agentNumber: 'מספר סוכן',
      agentName: null,

      // Risk = Column G + Column J
      healthBusiness: 'עסקי בריאות',       // Column G
      riskBusiness: 'עסקי ריסק',           // Column J

      // Pension = Column O
      newPensionFund: 'קרן פנסיה חדשה',    // Column O

      // Finance - do NOT calculate (Col P + Q are ignored)
    }
  };
  
  /**
   * Helper function to determine which Clal mapping to use
   * @param {Array} columns - Array of column names from the Excel file
   * @param {string} sheetName - Optional sheet name to help detection
   * @returns {Object} - The appropriate mapping configuration
   */
  const getClalMapping = (columns, sheetName = null) => {
    // Check for Set 1 by sheet name (Financial only)
    if (sheetName === 'רמת פוליסה כל המוצרים') {
      console.log(`Detected Clal Set 1 by sheet name: ${sheetName}`);
      return CLAL_MAPPING_SET1;
    }

    // Check for Set 3 by sheet name (Agent-level summary - Risk & Pension)
    if (sheetName === 'רמת עוסק מורשה') {
      console.log(`Detected Clal Set 3 by sheet name: ${sheetName}`);
      return CLAL_MAPPING_SET3;
    }

    // Check for Set 1 by columns (Financial only)
    if (columns.includes('סה"כ פיננסים') && columns.includes('מספר סוכן')) {
      console.log('Detected Clal Set 1 by columns: סה"כ פיננסים, מספר סוכן');
      return CLAL_MAPPING_SET1;
    }

    // Check for Set 2 by sheet name or columns (Pension Transfer)
    if (sheetName === 'גיליון1') {
      console.log(`Detected Clal Set 2 by sheet name: ${sheetName}`);
      return CLAL_MAPPING_SET2;
    }

    // Alternative detection for Set 2 (transfer data)
    if (columns.includes('ניוד_נטו') && columns.includes('מספר סוכן מוביל')) {
      console.log('Detected Clal Set 2 by columns: ניוד_נטו, מספר סוכן מוביל');
      return CLAL_MAPPING_SET2;
    }

    // Default to Set 1 if unable to determine
    console.warn('Unable to determine Clal file format, defaulting to Set 1');
    return CLAL_MAPPING_SET1;
  };
  
  module.exports = {
    CLAL_MAPPING_SET1,
    CLAL_MAPPING_SET2,
    CLAL_MAPPING_SET3,
    getClalMapping
  };