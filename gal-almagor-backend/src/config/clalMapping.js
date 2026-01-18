/**
 * Clal Company Mapping Configuration
 * Maps Excel columns to database structure
 * 
 * Note: Clal has three file formats:
 * - Clal Set 1: Insurance and financial products data (17 columns)
 * - Clal Set 2: Agency and transfer data (13 columns)
 * - Clal Set 3: Provident fund and savings products data (18 columns)
 */

const CLAL_MAPPING_SET1 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 1 - Insurance and financial products data',
    
    columns: {
      // Region and supervisor information
      regionName: 'שם מרחב',                        // Region Name
      centralSupervisorName: 'שם מפקח מרכז',        // Central Supervisor Name
      
      // Licensed business information
      licensedBusinessName: 'שם עוסק מורשה',        // Licensed Business Name
      licensedBusinessNumber: 'מספר עוסק מורשה',    // Licensed Business Number
      
      // Agent information
      agentNumber: 'מספר סוכן',                     // Agent Number
      agentName: 'שם עוסק מורשה',                  //  ADD: Use licensed business name as agent name
      
      // Business metrics
      totalNewBusiness: 'סה"כ עסק חדש',            // Total New Business
      
      // Health products
      healthBusiness: 'עסקי בריאות',                // Health Business
      nursingCareBusiness: 'סיעוד',                // Nursing Care
      healthWithoutNursing: 'בריאות-ללא סיעוד',     // Health Without Nursing
      
      // Risk products
      riskBusiness: 'עסקי ריסק',                   // Risk Business
      pureRisk: 'ריסק טהור',                       // Pure Risk
      executiveRisk: 'ריסק מנהלים',                // Executive Risk
      mortgageRiskShoham: 'ריסק משכנתא -שוהם',     // Mortgage Risk - Shoham
      
      // Profile and pension
      executiveProfile: 'פרופיל מנהלים',           // Executive Profile
      newPensionFund: 'קרן פנסיה חדשה',            // New Pension Fund
      
      // Financial details
      financialDetailRegular: 'פרט פיננסי -שוטף',  // Financial Detail - Regular
      financialDetailOneTime: 'פרט פיננסי-חד פעמי' // Financial Detail - One Time
    }
  };
  
  const CLAL_MAPPING_SET2 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 2 - Agency and transfer data',
    
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
      agentNumber: 'מספר סוכן מוביל',              //  ADD: Use lead agent as primary agent
      agentName: 'שם סוכן מוביל',                  //  ADD: Use lead agent name as primary
      leadAgentNumber: 'מספר סוכן מוביל',          // Lead Agent Number
      leadAgentName: 'שם סוכן מוביל',              // Lead Agent Name
      
      // Agency details
      agencyFlag: 'דגל_סוכנות',                    // Agency Flag
      qId: 'Q_id',                                 // Q ID
      
      // Transfer data
      incomingTransfer: 'ניוד_נכנס',               // Incoming Transfer
      outgoingTransfer: 'ניוד_יוצא',               // Outgoing Transfer
      netTransfer: 'ניוד_נטו'                      // Net Transfer
    }
  };
  
  const CLAL_MAPPING_SET3 = {
    companyName: 'Clal',
    companyNameHebrew: 'כלל',
    description: 'Clal Set 3 - Provident fund and savings products data',
    
    columns: {
      // Region and supervisor information
      leadingRegion: 'מרחב מוביל',                  // Leading Region
      centralSupervisorName: 'שם מפקח מרכז',        // Central Supervisor Name
      agentAboveName: 'שם סוכן על',                // Agent Above Name
      
      // Licensed business information
      licensedBusinessName: 'שם עוסק מורשה',        // Licensed Business Name
      
      // Agent information
      agentNumber: 'מספר סוכן',                     // Agent Number
      agentName: 'שם סוכן',                        // Agent Name
      
      // Provident fund products
      gemelInvestmentOneTime: 'גמל להשקעה חד פעמי', // Provident Fund Investment - One Time
      gemelInvestmentRegular: 'גמל להשקעה שוטף',   // Provident Fund Investment - Regular
      trainingIncomingTransfer: 'השתלמות- ניוד נכנס', // Advanced Training - Incoming Transfer
      trainingRegular: 'השתלמות- שוטף',            // Advanced Training - Regular
      gemelIncomingTransfer: 'גמל- ניוד נכנס',     // Provident Fund - Incoming Transfer
      
      // Compensation and savings
      centralCompensationFund: 'קופה מרכזית לפיצויים', // Central Severance Fund
      amendment190Gemel: 'תיקון 190 בגמל עדכני',    // Amendment 190 in Current Provident Fund
      amendment190Policy: 'תיקון 190 בפוליסה',      // Amendment 190 in Policy
      financialSavingsOneTime: 'חסכון פיננסי- ח"פ', // Financial Savings - One Time
      financialSavingsRegular: 'חיסכון פיננסי- שוטף', // Financial Savings - Regular
      
      // Consolidated data
      consolidatedProfile: 'פרופיל מאוחד',          // Consolidated Profile
      totalFinancial: 'סה"כ פיננסים'              // Total Financials
    }
  };
  
  /**
   * Helper function to determine which Clal mapping to use
   * @param {Array} columns - Array of column names from the Excel file
   * @returns {Object} - The appropriate mapping configuration
   */
  const getClalMapping = (columns) => {
    // Check for Set 1 specific columns
    if (columns.includes('סה"כ עסק חדש') && columns.includes('עסקי בריאות')) {
      return CLAL_MAPPING_SET1;
    }
    
    // Check for Set 2 specific columns
    if (columns.includes('דגל_סוכנות') && columns.includes('Q_id')) {
      return CLAL_MAPPING_SET2;
    }
    
    // Check for Set 3 specific columns
    if (columns.includes('גמל להשקעה חד פעמי') && columns.includes('פרופיל מאוחד')) {
      return CLAL_MAPPING_SET3;
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