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
      privateRisk: 'סיכוני פרט',                     // Private Risk
      pensionHarel: 'פנסיוני',                       // Pension
      savingsProductsNoFinancials: 'מוצרי צבירה ללא פיננסים', // Savings Products Without Financials
      pensionTransferNet: 'ניוד פנסיה - נטו',       // Pension Transfer - Net
      nursingCareHarel: 'נסיעות חול'                 // ✅ FIXED: Nursing Care/Travel Abroad
    }
  };
  
  module.exports = HAREL_MAPPING;