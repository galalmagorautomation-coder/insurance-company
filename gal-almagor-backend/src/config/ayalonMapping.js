/**
 * Ayalon Company Mapping Configuration
 * Maps Excel columns to database structure
 */

const AYALON_MAPPING = {
    companyName: 'Ayalon',
    companyNameHebrew: 'איילון',
    
    columns: {
      // Existing common columns
      agentName: 'שם סוכן ומספר סוכן',
      agentNumber: 'שם סוכן ומספר סוכן',
      policyNumber: 'מספר פוליסה',
      insuredId: 'ת.ז מבוטח',
      insuredName: 'שם מבוטח',
      policyStatus: 'סטאטוס פוליסה',
      product: 'שם תעריף',
      submissionDate: 'כ - תאריך הצעה',
      productionDate: 'תאריך פרודוקציה של פוליסה',
      output: 'הנ-סכום פרמיה לעמלה',
      
      // Ayalon-specific columns
      
      district: 'כ-מחוז',
      supervisorName: 'שם מפקח',
      mainAgentNameNumber: 'שם ומספר סוכן ראשי כללי',
      mainAgentId: 'ח.פ סוכן ראשי',
      secondaryAgentId: 'ח.פ סוכן משנה',
      insuranceTypeName: 'שם סוג ביטוח תעריף',
      tariff: 'תעריף',
      insuredBirthDate: 'תאריך לידה',
      proposalPolicy: 'הצעה\\פוליסה',
      tariffNumber: 'מספר תעריף',
      tariffName: 'שם תעריף',
      tariffStatus: 'ה- סטטוס תעריף',
      tariffStartDate: 'הנ - תאריך התחלת תעריף',
      tariffCancellationDate: 'תאריך ביטול תעריף',
      proposalDate: 'כ- תאריך הצעה',
      registrationDate: 'תאריך רישום',
      insuranceStartProcess: 'כ- תהליך התחלת ביטוח',
      policyProductionDate: 'תאריך פרודוקציה של פוליסה',
      coverageProductionDate: 'תאריך פרודוקציה של כיסוי',
      proposalDateAlt: 'תאריך הצעה',
      previousPolicyStatus: 'סטטוס פוליסה קודם',
      commissionType: 'סוג עמלה',
      netCollectionPremium: 'פרמיה לגביה נטו',
      grossCollectionPremium: 'פרמיה לגביה ברוטו',
      commissionPremiumAmount: 'הנ-סכום פרמיה לעמלה'
    }
  };
  
  module.exports = AYALON_MAPPING;