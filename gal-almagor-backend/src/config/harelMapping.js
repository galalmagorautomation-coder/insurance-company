/**
 * Harel Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const HAREL_MAPPING = {
    companyName: 'Harel',
    companyNameHebrew: 'הראל',
    
    // Column mappings from Excel to our database
    columns: {
      // Core fields - A1 column is empty but contains agent data
      agentName: '__EMPTY',                          // Column A (empty header)
      agentNumber: '__EMPTY',                        // Column A (empty header)
      
      // Harel-specific fields
      privateRisk: 'סיכוני פרט',                     // Column B - Risk
      pensionHarel: 'פנסיוני',                       // Column C - Pension
      savingsProductsNoFinancials: 'מוצרי צבירה ללא פיננסים' // Column D - Financial
    }
  };
  
  module.exports = HAREL_MAPPING;