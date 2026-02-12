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
      agentNumber: 'סוכן',                     // Agent Number
      output: 'סה"כ פרמיה נמדדת',             // Total Measured Premium

      // Migdal-specific fields
      measurementBasisName: 'שם בסיס מדידה',  // Measurement Basis Name (product categorization)
      registrationDate: 'תאריך פרודוקציה'      // Production Date - Column Y (for month filtering, format: D/M/YYYY)
    }
  };
  
  module.exports = MIGDAL_MAPPING;