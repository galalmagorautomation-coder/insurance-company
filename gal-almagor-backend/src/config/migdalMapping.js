/**
 * Migdal Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const MIGDAL_MAPPING = {
    companyName: 'Migdal',
    companyNameHebrew: 'מגדל',
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields
      agentName: 'שם סוכן',                    // Agent Name
      agentNumber: 'סוכן',                     // Agent
      output: 'סה"כ פרמיה נמדדת',             // Total Measured Premium

      // Migdal-specific fields
      measurementBasisName: 'שם בסיס מדידה',  // Measurement Basis Name
      totalMeasuredPremium: 'סה"כ פרמיה נמדדת', // Total Measured Premium
      registrationDate: 'תאריך רישום'          // Registration Date (for month validation)
    }
  };
  
  module.exports = MIGDAL_MAPPING;