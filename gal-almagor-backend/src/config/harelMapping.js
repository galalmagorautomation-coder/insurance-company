/**
 * Harel Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const HAREL_MAPPING = {
    companyName: 'Harel',
    companyNameHebrew: 'הראל',
    headerRow: 1,                                    // Header at row 1
    dataStartRow: 4,                                 // Data starts at row 4 (skip rows 2-3: sub-header + total)

    // Column mappings from Excel to our database
    columns: {
      // Core fields - Column A (empty header) contains "Name - Number"
      agentName: '__EMPTY',                          // Column A (empty header)
      agentNumber: '__EMPTY',                        // Column A (empty header)

      // Harel-specific fields
      privateRisk: 'סיכוני פרט',                     // Column B - Private Risk
      pensionHarel: 'פנסיוני',                       // Column C - Pension
      savingsProductsNoFinancials: 'מוצרי צבירה ללא פיננסים', // Column D - Savings Products Without Financials
      pensionTransferNet: 'ניוד פנסיה - נטו',       // Column E - Pension Transfer - Net
      nursingCareHarel: 'נסיעות חול'                 // Column F - Nursing Care/Travel Abroad
    }
  };
  
  module.exports = HAREL_MAPPING;