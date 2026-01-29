/**
 * Menorah Company Mapping Configuration
 * Maps Excel columns to database structure
 * UPDATED FOR NEW POLICY-LEVEL FORMAT
 */

const MENORAH_MAPPING = {
  companyName: 'Menorah',
  companyNameHebrew: 'מנורה',
  
  // Column mappings from Excel to our database
  columns: {
    // Core fields
    agentName: 'שם סוכן',                           // Agent Name
    agentNumber: 'מספר סוכן',                       // Agent Number
    
    
    // Policy-level fields (NEW FORMAT)
    policyNumber: 'מספר פוליסה',                    // Policy Number
    productGroup: 'ענף ראשי',                       // Main Branch
    product: 'שם ענף',                              // Branch Name - USED FOR CATEGORIZATION
    coverageType: 'שם כיסוי',                       // Coverage Name
    insuredId: 'מספר זהות מבוטח',                   // Insured ID
    insuredName: 'שם לקוח',                         // Client Name
    submissionDate: 'תאריך הצעת פוליסה',            // Policy Proposal Date

    // Date filtering columns (for month extraction)
    registrationMonth: 'חודש רישום',                // Registration Month (month number) - Regular file
    date: 'תאריך',                                  // Date (DD/MM/YYYY format) - Regular file
    decisiveDate: 'מועד קובע',                      // Decisive Date (DD/MM/YYYY format) - Pension Transfer file

    // Output column
    output: 'תפוקה נטו',                            // Net Output
    
    // OLD MENORAH-SPECIFIC FIELDS - REMOVED (don't exist in new format)
    // agentLicenseHierarchy, agentNameInLicenseHierarchy, consolidatingBranchLicense,
    // branchLicense, consolidatingAgentLicense, agentLicense, managersIndependentsStatus,
    // pension, totalPension, healthCompensation, healthBranchNoAccidents, nursingCare,
    // topAccidents, riskNoMortgageManagers, riskNoMortgagePrivate, mortgageRisk,
    // stepDeathDisability, totalInsurance, gemelTraining, topFinanceInvestmentSavings,
    // thirdAge, totalFinancial
  }
};

module.exports = MENORAH_MAPPING;