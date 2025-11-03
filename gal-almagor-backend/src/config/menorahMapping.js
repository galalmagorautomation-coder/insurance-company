/**
 * Menorah Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const MENORAH_MAPPING = {
    companyName: 'Menorah',
    companyNameHebrew: 'מנורה',
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields
      agentName: 'סוכן',                                    // Agent
      
      // Menorah-specific fields
      agentLicenseHierarchy: 'היררכית רשיון סוכן',         // Agent License Hierarchy
      agentNameInLicenseHierarchy: 'שם סוכן בהיררכית רשיון', // Agent Name in License Hierarchy
      consolidatingBranchLicense: 'רשיון סניף מאגד',       // Consolidating Branch License
      branchLicense: 'רשיון סניף',                         // Branch License
      consolidatingAgentLicense: 'רשיון סוכן מאגד',        // Consolidating Agent License
      agentLicense: 'רשיון סוכן',                          // Agent License
      managersIndependentsStatus: 'סטטוס מנהלים ועצמאיים - שוטף', // Managers & Independents Status
      pension: 'פנסיה',                                     // Pension
      totalPension: 'סה"כ פנסיוני',                        // Total Pension
      healthCompensation: 'בריאות פיצוי',                  // Health Compensation
      healthBranchNoAccidents: 'ענף בריאות - ללא תאונות',  // Health Branch - No Accidents
      nursingCare: 'סיעוד',                                // Nursing Care
      topAccidents: 'תאונות טופ',                          // Top Accidents
      riskNoMortgageManagers: 'ריסק ללא משכנתא מנהלים',    // Risk No Mortgage Managers
      riskNoMortgagePrivate: 'ריסק ללא משכנתא פרט',        // Risk No Mortgage Private
      mortgageRisk: 'ריסק משכנתא',                         // Mortgage Risk
      stepDeathDisability: 'שלב + מוות ונכות',             // Step + Death & Disability
      totalInsurance: 'סה"כ ביטוח',                        // Total Insurance
      gemelTraining: 'גמל והשתלמות',                       // Gemel & Training
      topFinanceInvestmentSavings: 'טופ פייננס השקעה וחסכון', // Top Finance Investment & Savings
      thirdAge: 'גיל שלישי',                               // Third Age
      totalFinancial: 'סה"כ פיננסי'                       // Total Financial
    }
  };
  
  module.exports = MENORAH_MAPPING;