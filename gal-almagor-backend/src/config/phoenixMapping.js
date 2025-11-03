/**
 * Phoenix Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const PHOENIX_MAPPING = {
  companyName: 'The Phoenix',
  companyNameHebrew: 'הפניקס',
  
  // Column mappings from Excel to our database
  columns: {
    agentName: 'שם סוכן',                    // Agent Name
    agentNumber: 'מס סוכן',                  // Agent Number
    policyNumber: 'מס פוליסה',               // Policy Number
    collective: 'קולקטיב',                   // Collective
    insuredId: 'ת.זהות מבוטח',              // Insured ID
    insuredName: 'שם מבוטח',                 // Insured Name
    secondaryInsuredId: 'ת. זהות מבוטח משני', // Secondary Insured ID
    productGroup: 'קבוצת מוצר',              // Product Group
    product: 'מוצר',                         // Product
    coverageType: 'סוג כיסוי',               // Coverage Type
    submissionDate: 'ת. הגשה',               // Submission Date
    productionDate: 'ת. פרודוקציה',          // Production Date
    output: 'תפוקה',                         // Output/Amount
    policyStatus: 'מצב פוליסה',              // Policy Status
    lifeMonthly: 'חודשי חיים',               // Life Monthly
    arrearsMonths: 'חודשי פיגור'             // Arrears Months
  }
};

module.exports = PHOENIX_MAPPING;