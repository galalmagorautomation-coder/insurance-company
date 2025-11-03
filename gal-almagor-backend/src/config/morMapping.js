/**
 * Mor Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const MOR_MAPPING = {
    companyName: 'Mor',
    companyNameHebrew: 'מור',
    sheetIndex: 1,
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields
      agentName: 'שם סוכן מתוגמל',                           // Rewarded Agent Name
      agentNumber: 'מספר סוכן מתוגמל',                      // Rewarded Agent Number
      product: 'סוג מוצר',                                  // Product Type
      output: 'סכום תנועה',                                 // Transaction Amount
      
      // Mor-specific fields
      memberId: 'ת.זהות',                                   // ID Number
      memberName: 'שם עמית',                                // Member Name
      fundNumber: 'מספר קופה',                              // Fund Number
      fundOpeningDate: 'תאריך פתיחת קופה',                  // Fund Opening Date
      productType: 'סוג מוצר',                              // Product Type
      validFormsReceiptDate: 'תאריך קבלת טפסים תקינים',    // Valid Forms Receipt Date
      transactionType: 'סוג תנועה',                         // Transaction Type
      valueDate: 'תאריך ערך',                               // Value Date
      transferDate: 'תאריך הזרמה',                          // Transfer Date
      transactionAmount: 'סכום תנועה',                      // Transaction Amount
      supervisingAgent: 'סוכן מפקח',                        // Supervising Agent
      rewardedAgentNumber: 'מספר סוכן מתוגמל',              // Rewarded Agent Number
      rewardedAgentLicenseNumber: 'מספר רשיון סוכן מתוגמל', // Rewarded Agent License Number
      rewardedAgentName: 'שם סוכן מתוגמל',                  // Rewarded Agent Name
      rewardedAgentType: 'סוג סוכן מתוגמל',                 // Rewarded Agent Type
      column1: 'עמודה1',                                    // Column1
      column2: 'עמודה2',                                    // Column2
      rewardedAgentHouseLicenseNumber: 'מספר רשיון בית סוכן מתוגמל', // Rewarded Agent House License Number
      rewardedAgentHouseName: 'שם בית סוכן מתוגמל',         // Rewarded Agent House Name
      recruitmentMonth: 'חודש גיוס',                        // Recruitment Month
      supervisor: 'מפקח',                                   // Supervisor
      distributionChannel: 'ערוץ הפצה',                     // Distribution Channel
      monthlyTarget: 'יעד חודשי',                           // Monthly Target
      employerId: 'ח.פ מעסיק',                             // Employer ID
      employerName: 'שם מעסיק',                             // Employer Name
      incentive: 'מתמק',                                    // Incentive
      groupName: 'בוצה'                                     // Group
    }
  };
  
  module.exports = MOR_MAPPING;