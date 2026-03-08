/**
 * Mor Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Sheet: גיליון1
 * No date filtering needed.
 */

const MOR_MAPPING = {
    companyName: 'Mor',
    companyNameHebrew: 'מור',

    columns: {
      // Core fields
      agentName: 'שם סוכן מגייס',                           // Column L - Recruiting Agent Name
      agentNumber: 'מספר סוכן מגייס',                       // Column J - Recruiting Agent Number
      product: 'סוג מוצר',                                  // Column E - Product Type
      output: 'סכום תנועה',                                 // Column I - Transaction Amount

      // Optional fields
      memberId: 'ת.זהות',                                   // Column A - ID Number
      memberName: 'שם עמית',                                // Column B - Member Name
      fundNumber: 'מספר קופה',                              // Column C - Fund Number
      fundOpeningDate: 'ת. פתיחת קופה',                     // Column D - Fund Opening Date
      validFormsReceiptDate: 'תאריך קבלת טפסים תקינים',    // Column F - Valid Forms Receipt Date
      transactionType: 'סוג תנועה',                         // Column G - Transaction Type
      valueDate: 'תאריך ערך',                               // Column H - Value Date
      rewardedAgentLicenseNumber: 'מספר רשיון סוכן מגייס'   // Column K - Recruiting Agent License Number
    }
  };

  module.exports = MOR_MAPPING;
