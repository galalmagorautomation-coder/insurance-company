/**
 * Ayalon Company Mapping Configuration
 * Maps Excel columns to database structure
 *
 * Single file format - all Risk.
 * Agent number in Column B (מספר סוכן), Amount in Column U (פרמיה לגביה).
 * No date filtering needed.
 */

const AYALON_MAPPING = {
  companyName: 'Ayalon',
  companyNameHebrew: 'איילון',

  columns: {
    agentNumber: 'מספר סוכן',               // Column B - Agent Number
    agentName: 'שם סוכן',                    // Column C - Agent Name

    output: 'פרמיה לגביה',                   // Column U - Amount

    policyNumber: 'מספר פוליסה',
    insuredId: 'ת.ז מבוטח',
    insuredName: 'שם מבוטח',
    product: 'תיאור מוצר',
    policyStatus: 'סטאטוס פוליסה'
  }
};

module.exports = AYALON_MAPPING;
