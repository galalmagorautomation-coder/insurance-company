/**
 * Menorah Company Mapping Configuration
 * Maps Excel columns to database structure
 * UPDATED: Simplified for new format
 */

const MENORAH_MAPPING = {
  companyName: 'Menorah',
  companyNameHebrew: 'מנורה',

  // Column mappings from Excel to our database
  columns: {
    // Core fields
    agentNumber: 'מספר סוכן',                       // Agent ID
    product: 'ענף ראשי',                             // Column F - Main Branch (for categorization)
    output: 'תפוקה נטו',                            // Column T - Net Output
    date: 'תאריך'                                   // Date (DD/MM/YYYY format) for month filtering
  }
};

module.exports = MENORAH_MAPPING;