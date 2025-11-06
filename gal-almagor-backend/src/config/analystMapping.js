/**
 * Analyst Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const ANALYST_MAPPING = {
    companyName: 'Analyst',
    companyNameHebrew: 'אנליסט',
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields
      agentName: 'שם סוכן',                      // Agent Name
      agentNumber: 'שם סוכן',                 // Agent Name
      
      // Product fields
      product: 'סניף, מסלול, חשבון',            // Branch, Track, Account
      
      // Output/Amount
      output: 'יתרה',                            // Balance
      
      // Additional standard fields that exist
      insuredId: 'תז',                          // ID Number
      
      // Analyst-specific fields (map to the new columns we added)
      entityType: 'סוג ישות',                   // Entity Type
      valuation: 'שיערוך',                      // Valuation
      agreement: 'הסכם',                        // Agreement
      recruitingAgreement: 'הסכם מגייס',        // Recruiting Agreement
      agencyNumber: 'מס סוכנות',                // Agency Number
      agencyName: 'שם סוכנות',                  // Agency Name
      member: 'עמית',                           // Member
      accountCode: 'קוד חשבון',                 // Account Code
      superFund: 'קופת על',                     // Super Fund
      branch: 'סניף',                           // Branch
      account: 'חשבון',                         // Account
      branchTrackAccount: 'סניף, מסלול, חשבון', // Branch, Track, Account
      joinDate: 'תאריך הצטרפות',               // Join Date
      balance: 'יתרה',                          // Balance
      commissionPayable: 'עמלה לתשלום לסוכנות'  // Commission Payable
    }
  };
  
  module.exports = ANALYST_MAPPING;