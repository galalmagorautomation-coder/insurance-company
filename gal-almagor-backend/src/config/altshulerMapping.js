/**
 * Altshuler Company Mapping Configuration
 * Altshuler has 2 tabs with different structures - we process both
 */

// TAB 1 MAPPING - Contains: שנה,חודש,סוכן,מוצר,תאריך הקמה,ת.ז. לקוח,שם לקוח,מספר חוזה סוכן...
const ALTSHULER_MAPPING_1 = {
    companyName: 'Altshuler Shaham',           
    companyNameHebrew: 'אלטשולר שחם',          
    description: 'Altshuler Tab 1 - Main data with establishment dates and weighted interest',
    
    
    // Signature columns to identify this tab
    signatureColumns: [
        'שנה',
        'סוכן',
        'תאריך הקמה',
        'ד.נ. משוקלל מצבירה %'
    ],
    
    columns: {
        // Date filtering
        month: 'חודש',                                        // Month (month number for filtering)

        // Core fields
        agentName: 'סוכן',                                    // Agent
        agentNumber: 'רישיון סוכן',                          // Agent License
        product: '[מוצר]',                                    // Product
        
        // Client information
        insuredId: 'ת.ז. לקוח',                              // Customer ID
        insuredName: 'שם לקוח',                              // Customer Name
        policyNumber: 'מספר חוזה סוכן',                      // Agent Contract Number
        
        // Altshuler-specific fields (NEW - map to 15 new columns)
        establishmentDate: 'תאריך הקמה',                      // Establishment Date
        distributionChannel: 'ערוץ הפצה',                     // Distribution Channel
        agentLicense: 'רישיון סוכן',                         // Agent License
        agentSuperLicense: 'רישיון סוכן על',                 // Agent Super License
        agencyName: 'סוכנות',                                // Agency
        weightedInterestAccumulationPct: 'ד.נ. משוקלל מצבירה %',  // Weighted Interest from Accumulation %
        weightedInterestDepositPct: 'ד.נ. משוקלל מהפקדה %',       // Weighted Interest from Deposit %
        internalTransferByJoinDate: 'תנועות העברה פנימה לפי תאריך הצטרפות',  // Internal Transfer by Join Date
        grossAnnualPremium: 'פרמיה שנתית - ברוטו',                    // Annual Premium - Gross
        thirdTierAgencyPlan: 'סוכנות דרגה שלישית - תוכנית',           // Third Tier Agency Plan
        thirdTierAgencyLicensePlan: 'רישיון סוכנות דרגה שלישית - תוכנית', // Third Tier Agency License Plan
        expectedDepositsCount: 'צפי כמות הפקדות',                     // Expected Deposits Count
        actualDepositsLastYear: 'כמות הפקדות בפועל שנה אחרונה',       // Actual Deposits Last Year
        arrearsMonths: 'כמות חודשי פיגור',                            // Months in Arrears
        cancellationsYearB: 'ביטולים שנה ב',                          // Cancellations Year B
    }
};

// TAB 2 MAPPING - Contains: הפקדה חד פעמית,תנועות העברה פנימה,דמי ניהול מכירות משוקלל,ביטול שנה א...
const ALTSHULER_MAPPING_2 = {
    companyName: 'Altshuler Shaham',          
    companyNameHebrew: 'אלטשולר שחם',         
    description: 'Altshuler Tab 2 - One-time deposits and sales management fees',
    
    
    // Signature columns to identify this tab
    signatureColumns: [
        'הפקדה חד פעמית',
        'דמי ניהול מכירות משוקלל. תנועות בלבד',
        'ביטול שנה א'
    ],
    
    columns: {
        // Date filtering
        month: 'חודש',                                        // Month (month number for filtering)

        // Core fields
        agentName: 'שם סוכן',                                 // Agent Name
        agentNumber: 'רישיון סוכן',                          // Agent License
        product: 'מוצר',                                     // Product
        supervisor: 'מפקח',                                  // Supervisor
        
        // Client information
        insuredId: 'ת.ז. לקוח',                              // Customer ID
        insuredName: 'שם לקוח',                              // Customer Name
        policyNumber: 'מספר חוזה סוכן',                      // Agent Contract Number
        fundNumber: 'מספר קופה',                             // Fund Number
        
        // Date fields
        joinDate: 'תאריך הצטרפות לקופה',                     // Fund Join Date
        
        // Altshuler-specific fields (NEW - map to 15 new columns)
        oneTimePremium: 'הפקדה חד פעמית',                     // One-Time Deposit
        internalTransferByJoinDate: 'תנועות העברה פנימה לפי תאריך הצטרפות',  // Internal Transfer by Join Date
        weightedSalesMgmtFeesTransactions: 'דמי ניהול מכירות משוקלל. תנועות בלבד',  // Weighted Sales Management Fees
        cancellationsYearA: 'ביטול שנה א',                    // Cancellations Year A
        agencyName: 'סוכנות',                                // Agency
        agentLicense: 'רישיון סוכן',                         // Agent License
        agentSuperLicense: 'רישיון סוכן על',                 // Agent Super License
        thirdTierAgency: 'סוכנות דרגה שלישית',                // Third Tier Agency
        thirdTierAgencyLicense: 'רישיון סוכנות דרגה שלישית',  // Third Tier Agency License
    }
};

/**
 * Auto-detect which Altshuler mapping to use based on column headers
 */
function getAltshulerMapping(excelColumns) {
    const columnsSet = new Set(excelColumns);
    
    // Check Tab 1 signature
    const hasTab1Signature = ALTSHULER_MAPPING_1.signatureColumns.every(col => 
        columnsSet.has(col)
    );
    
    // Check Tab 2 signature
    const hasTab2Signature = ALTSHULER_MAPPING_2.signatureColumns.every(col => 
        columnsSet.has(col)
    );
    
    if (hasTab1Signature) {
        console.log('Detected Altshuler Tab 1 (Main data)');
        return ALTSHULER_MAPPING_1;
    }
    
    if (hasTab2Signature) {
        console.log('Detected Altshuler Tab 2 (Deposits and fees)');
        return ALTSHULER_MAPPING_2;
    }
    
    console.warn('Could not detect Altshuler tab type, defaulting to Tab 1');
    return ALTSHULER_MAPPING_1;
}

module.exports = {
    ALTSHULER_MAPPING_1,
    ALTSHULER_MAPPING_2,
    getAltshulerMapping
};