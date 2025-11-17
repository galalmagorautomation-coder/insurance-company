/**
 * Mediho Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const MEDIHO_MAPPING = {
    companyName: 'Mediho',
    companyNameHebrew: 'מדיהו',
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields
      agentName: 'שם סוכן',              // Agent Name
      agentNumber: 'הערות',              // Agent Number
      
      // Mediho-specific fields
      paid: 'שולם',                      // Paid
      reportDate: 'תאריך דוח',           // Report Date
      referenceDate: 'ת. אסמכתא',       // Reference Date
      clientId: 'מזהה לקוח',            // Client ID
      clientName: 'שם לקוח',            // Client Name
      agentId: 'מזהה סוכן',             // Agent ID
      mentor: 'מנטור',                  // Mentor
      clientPremium: 'פרמיה לקוח',      // Client Premium
      quantity: 'כמות',                 // Quantity
      weightedClientPremium: 'פרמיה לקוח משונת', // Weighted Client Premium
      agentCommission: 'עמלת סוכן',     // Agent Commission
      details: 'פרטים',                 // Details
      classification: 'סיווג',         // Classification
      notes: 'הערות'                    // Notes
    }
  };
  
  module.exports = MEDIHO_MAPPING;