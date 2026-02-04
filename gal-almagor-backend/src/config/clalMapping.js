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
    description: 'Clal Set 1 - Insurance and financial products data',
    isCumulative: true,  // Year-to-date cumulative data - requires subtraction of previous months

    columns: {
      // Region and supervisor information
      regionName: 'שם מרחב',                        // Region Name
      centralSupervisorName: 'שם מפקח מרכז',        // Central Supervisor Name

      // Licensed business information
      licensedBusinessName: 'שם עוסק מורשה',        // Licensed Business Name
      licensedBusinessNumber: 'מספר עוסק מורשה',    // Licensed Business Number

      // Agent information
      agentNumber: 'מספר סוכן',                     // Agent Number
      agentName: 'שם עוסק מורשה',                  // Use licensed business name as agent name

      // Business metrics
      totalNewBusiness: 'סה"כ עסק חדש',            // Total New Business

      // Health products - for RISK calculation
      healthBusiness: 'עסקי בריאות',                // Health Business (RISK)
      nursingCareBusiness: 'סיעוד',                // Nursing Care
      healthWithoutNursing: 'בריאות-ללא סיעוד',     // Health Without Nursing

      // Risk products - for RISK calculation
      riskBusiness: 'עסקי ריסק',                   // Risk Business (RISK)
      pureRisk: 'ריסק טהור',                       // Pure Risk
      executiveRisk: 'ריסק מנהלים',                // Executive Risk
      mortgageRiskShoham: 'ריסק משכנתא -שוהם',     // Mortgage Risk - Shoham

      // Profile and pension - for PENSION calculation
      executiveProfile: 'פרופיל מנהלים',           // Executive Profile (PENSION)
      newPensionFund: 'קרן פנסיה חדשה',            // New Pension Fund (PENSION)

      // Financial - for FINANCIAL calculation
      totalFinancial: 'סה"כ פיננסים',              // Total Financial (FINANCIAL)

      // Additional financial details (not used in aggregation)
      financialDetailRegular: 'פרט פיננסי -שוטף',  // Financial Detail - Regular
      financialDetailOneTime: 'פרט פיננסי-חד פעמי' // Financial Detail - One Time
    }
  };
  
  const CLAL_MAPPING_SET2 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 2 - Agency and transfer data',
    isCumulative: true,  // Year-to-date cumulative data - requires subtraction of previous months

    columns: {
      // Region and supervisor information
      regionName: 'שם_מרחב',                        // Region Name
      supervisorName: 'שם_מפקח',                    // Supervisor Name

      // Agency hierarchy
      agencyAboveId: 'עמ סוכנות על',               // Agency Above ID
      agencyAboveName: 'שם סוכנות על',             // Agency Above Name
      agencyNumber: 'עמ_סוכנות',                   // Agency ID
      agencyName: 'שם_סוכנות',                     // Agency Name

      // Lead agent information (also map to primary agent fields)
      agentNumber: 'מספר סוכן מוביל',              // Use lead agent as primary agent
      agentName: 'שם סוכן מוביל',                  // Use lead agent name as primary
      leadAgentNumber: 'מספר סוכן מוביל',          // Lead Agent Number
      leadAgentName: 'שם סוכן מוביל',              // Lead Agent Name

      // Agency details
      agencyFlag: 'דגל_סוכנות',                    // Agency Flag
      qId: 'Q_id',                                 // Q ID

      // Transfer data - for PENSION_TRANSFER calculation
      incomingTransfer: 'ניוד_נכנס',               // Incoming Transfer
      outgoingTransfer: 'ניוד_יוצא',               // Outgoing Transfer
      netTransfer: 'ניוד_נטו'                      // Net Transfer (PENSION_TRANSFER)
    }
  };
  
  const CLAL_MAPPING_SET3 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 3 - Policy-level data with month filtering',
    targetSheet: 'רמת פוליסה כל המוצרים',  // Only process this specific sheet
    isPolicyLevel: true,        // Policy-level data (not aggregate)
    requiresMonthFilter: true,  // Must filter by month column

    columns: {
      // Core columns from the document (by Excel column letter)
      // Column D = Agent ID
      // Column H = Month (1-12)
      // Column M = Product type
      // Column O = Amount

      agentNumber: null,  // Will be extracted by column index (D = index 3)
      agentName: null,    // Will use agent number as name
      month: null,        // Will be extracted by column index (H = index 7)
      productType: null,  // Will be extracted by column index (M = index 12)
      output: null        // Will be extracted by column index (O = index 14)
    },

    // Column indices (0-based)
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
    // Check for Set 3 by sheet name first (most reliable)
    if (sheetName === 'רמת פוליסה' || sheetName === 'רמת פוליסה כל המוצרים') {
      console.log(`Detected Clal Set 3 by sheet name: ${sheetName}`);
      return CLAL_MAPPING_SET3;
    }

    // Check for Set 1 specific columns
    if (columns.includes('סה"כ עסק חדש') && columns.includes('עסקי בריאות')) {
      console.log('Detected Clal Set 1 by columns: סה"כ עסק חדש, עסקי בריאות');
      return CLAL_MAPPING_SET1;
    }

    // Check for Set 2 specific columns
    if (columns.includes('דגל_סוכנות') && columns.includes('Q_id')) {
      console.log('Detected Clal Set 2 by columns: דגל_סוכנות, Q_id');
      return CLAL_MAPPING_SET2;
    }

    // Alternative detection for Set 2 (transfer data)
    if (columns.includes('ניוד_נכנס') && columns.includes('ניוד_יוצא') && columns.includes('ניוד_נטו')) {
      console.log('Detected Clal Set 2 by transfer columns');
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