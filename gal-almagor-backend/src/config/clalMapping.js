/**
 * Clal Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Note: Clal has three file formats:
 * - Clal Set 1: Insurance and financial products data (YTD cumulative)
 *   - RISK = עסקי בריאות + עסקי ריסק
 *   - PENSION = פרופיל מנהלים + קרן פנסיה חדשה
 *   - FINANCIAL = סה"כ פיננסים
 *
 * - Clal Set 2: Transfer data (YTD cumulative)
 *   - PENSION_TRANSFER = ניוד נטו
 *
 * - Clal Set 3: Policy-level data from "רמת פוליסה" sheet (Monthly - requires filtering)
 *   - Filter by month (Column H: 1-12)
 *   - Agent ID in Column D, Amount in Column O
 *   - Classify by Column M product type
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
    description: 'Clal Set 3 - Policy-level data with month filtering',
    targetSheet: 'רמת פוליסה',            // Sheet name
    isPolicyLevel: true,                   // Policy-level data (not aggregate)
    requiresMonthFilter: true,             // Must filter by month column
    headerRow: 4,                          // Header at row 4
    dataStartRow: 5,                       // Data starts at row 5

    columns: {
      // Column headers at row 4:
      // Column D: מספר סוכן (Agent Number)
      // Column H: חודש רישום תפוקה (Month)
      // Column M: מוצר קבינט (Product)
      // Column O: פרמיה כוללת ממודדת (Amount)

      agentNumber: 'מספר סוכן',            // Column D
      agentName: null,                      // Will use agent number as name
      month: 'חודש רישום תפוקה',           // Column H
      productType: 'מוצר קבינט',           // Column M
      output: 'פרמיה כוללת ממודדת'         // Column O
    },

    // Column indices (0-based) - kept for fallback
    columnIndices: {
      agentId: 3,      // Column D
      month: 7,        // Column H
      productType: 12, // Column M
      amount: 14       // Column O
    },

    // Product classification mapping for Column M values
    // Risk = בריאות + ריסק מנהלים + ריסק טהור + ריסק משכנתא
    // Pension = פנסיה תיק משולב
    // Financial = חסכון פיננסי
    productClassification: {
      'בריאות': 'RISK',
      'ריסק מנהלים': 'RISK',
      'ריסק טהור': 'RISK',
      'ריסק משכנתא': 'RISK',
      'פנסיה תיק משולב': 'PENSION',
      'חסכון פיננסי': 'FINANCIAL'
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

    // Check for Set 3 by sheet name (Policy-level data)
    if (sheetName === 'רמת פוליסה') {
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