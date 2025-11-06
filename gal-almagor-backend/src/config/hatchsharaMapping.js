/**
 * Hachshara Company Mapping Configuration
 * Maps Excel columns to database structure
 * 
 * Note: Hachshara has two file formats:
 * - Hachshara1: Includes one-time premium (16 columns)
 * - Hachshara2: Does not include one-time premium (15 columns)
 */

const HACHSHARA_MAPPING_1 = {
    companyName: 'Hachshara',
    companyNameHebrew: 'הכשרה',
    description: 'Hachshara file format with one-time premium',
    
    // Column mappings from Excel to our database
    columns: {
      // Client information
      idNumber: 'תז',                            // ID Number (client)
      firstName: 'שם פרטי',                       // First Name
      lastName: 'שם משפחה',                       // Last Name
      
      // Policy information
      policyNumber: 'מספר פוליסה',                // Policy Number
      product: 'שם מוצר',                         // Product Name
      
      // Date fields
      proposalDate: 'תאריך קליטת הצעה',          // Quote Reception Date
      policyProductionDate: 'תאריך הפקת הצעה',   // Quote Issuance Date
      
      // Premium fields
      oneTimePremium: 'פרמיה חד פעמית',          // One-Time Premium (only in format 1)
      lifeMonthly: 'פרמיה חודשית',               // Monthly Premium
      
      // Agency information
      agencyTaxId: 'ח.פ/ת.ז סוכנות',            // Agency Tax ID / Company ID
      agencyNumber: 'מספר סוכנות',                // Agency Number
      agencyName: 'שם סוכנות',                    // Agency Name
      
      // Agent information
      agentNumber: 'מספר סוכן',                   // Agent Number
      agentName: 'שם סוכן',                       // Agent Name
      
      // Supervisor information
      supervisorNumber: 'מספר מפקח',              // Supervisor Number
      supervisorNameNumber: 'מספר שם מפקח'        // Supervisor Name/Number
    }
  };

const HACHSHARA_MAPPING_2 = {
    companyName: 'Hachshara',
    companyNameHebrew: 'הכשרה',
    description: 'Hachshara file format without one-time premium',
    
    // Column mappings from Excel to our database
    columns: {
      // Client information
      idNumber: 'תז',                            // ID Number (client)
      firstName: 'שם פרטי',                       // First Name
      lastName: 'שם משפחה',                       // Last Name
      
      // Policy information
      policyNumber: 'מספר פוליסה',                // Policy Number
      product: 'שם מוצר',                         // Product Name
      
      // Date fields
      proposalDate: 'תאריך קליטת הצעה',          // Quote Reception Date
      policyProductionDate: 'תאריך הפקת הצעה',   // Quote Issuance Date
      
      // Premium fields
      lifeMonthly: 'פרמיה חודשית',               // Monthly Premium
      // Note: No one-time premium in this format
      
      // Agency information
      agencyTaxId: 'ח.פ/ת.ז סוכנות',            // Agency Tax ID / Company ID
      agencyNumber: 'מספר סוכנות',                // Agency Number
      agencyName: 'שם סוכנות',                    // Agency Name
      
      // Agent information
      agentNumber: 'מספר סוכן',                   // Agent Number
      agentName: 'שם סוכן',                       // Agent Name
      
      // Supervisor information
      supervisorNumber: 'מספר מפקח',              // Supervisor Number
      supervisorNameNumber: 'מספר שם מפקח'        // Supervisor Name/Number
    }
  };

/**
 * Helper function to determine which mapping to use
 * @param {Array} columns - Array of column names from the Excel file
 * @returns {Object} - The appropriate mapping configuration
 */
const getHachsharaMapping = (columns) => {
  const hasOneTimePremium = columns.includes('פרמיה חד פעמית');
  return hasOneTimePremium ? HACHSHARA_MAPPING_1 : HACHSHARA_MAPPING_2;
};

module.exports = {
  HACHSHARA_MAPPING_1,
  HACHSHARA_MAPPING_2,
  getHachsharaMapping
};