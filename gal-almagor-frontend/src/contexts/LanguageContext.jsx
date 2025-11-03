import { createContext, useContext, useState } from 'react'


export const COMPANIES = [
  { en: 'Ayalon', he: 'איילון' },
  { en: 'Altshuler Shaham', he: 'אלטשולר שחם' },
  { en: 'Analyst', he: 'אנליסט' },
  { en: 'Training', he: 'הכשרה' },
  { en: 'The Phoenix', he: 'הפניקס' },
  { en: 'Harel', he: 'הראל' },
  { en: 'Clal', he: 'כלל' },
  { en: 'Migdal', he: 'מגדל' },
  { en: 'Mediho', he: 'מדיהו' },
  { en: 'Mor', he: 'מור' },
  { en: 'Menora', he: 'מנורה' }
];

const LanguageContext = createContext()

export const translations = {
  en: {
    // Header
    insuranceDashboard: 'Insurance Dashboard',
    dashboard: 'Dashboard',
    upload: 'Upload',
    insights: 'Insights',
    agentsHeader: 'Agents',
    logout: 'Logout',
    
    // Login Page
    welcome: 'Welcome',
    signInAccess: 'Sign in to access your dashboard',
    emailAddress: 'Email Address',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In',
    needHelp: 'Need help?',
    contactSupport: 'Contact Support',
    simplifyAnalytics: 'Simplify Your Insurance Analytics',
    trackPerformance: 'Track performance, generate reports, and manage your insurance data all in one place.',
    activeAgents: 'Active Agents',
    policies: 'Policies',
    satisfaction: 'Satisfaction',
    
    // Dashboard
    realTimeActivity: 'Real-time activity and updates overview',
    filterByCompany: 'Filter by Company',
    filterByMonth: 'Filter by Month',
    allCompanies: 'All Companies',
    quickStatsMonth: 'Quick Stats - This Month',
    totalOutput: 'Total Output',
    policiesSold: 'Policies Sold',
    activeAgentsCount: 'Active Agents',
    uploadProgress: 'Upload Progress',
    thisMonth: 'This month',
    currentlyActive: 'Currently active',
    todaySummary: "Today's Summary",
    policiesAdded: 'Policies Added',
    totalPremium: 'Total Premium',
    agentsActive: 'Agents Active',
    reportsGenerated: 'Reports Generated',
    recentActivities: 'Recent Activities',
    notificationsAlerts: 'Notifications & Alerts',
    pendingActions: 'Pending Actions',
    uploadCSVFiles: 'Upload CSV Files',
    uploadProcess: 'Upload and process your insurance data files for analysis',
    viewInsights: 'View Insights',
    exploreAnalytics: 'Explore detailed analytics and performance metrics',
    
    // Upload Page
    uploadExcelFiles: 'Upload Excel Files',
    uploadCompanyData: 'Upload company data for analysis',
    error: 'Error',
    success: 'Success',
    step1SelectCompanyMonth: 'Step 1: Select Company and Month',
    selectCompany: 'Select Company',
    selectMonth: 'Select Month',
    chooseCompany: 'Choose a company...',
    step2UploadExcel: 'Step 2: Upload Excel File',
    dropFileHere: 'Drop file here',
    uploadExcelFile: 'Upload Excel File',
    dragAndDropBrowse: 'Drag and drop or click to browse',
    excelSupported: '.xlsx and .xlsb supported',
    uploadingProcessing: 'Uploading and processing...',
    uploadedFile: 'Uploaded File',
    uploadedSuccessfully: 'Uploaded Successfully',
    uploadFailed: 'Upload Failed',
    processing: 'Processing...',
    submitDataFor: 'Submit Data for',
    selectedCompany: 'Selected Company',
    pleaseSelectCompany: 'Please select a company',
    pleaseUploadExcelFile: 'Please upload an Excel file',
    readyToSubmit: 'Ready to submit for',
    
    // Insights Page
    analyticsInsights: 'Analytics & Insights',
    comprehensiveMetrics: 'Comprehensive performance metrics and analytics dashboard',
    exportToCSV: 'Export to CSV',
    activeFilters: 'Active Filters:',
    pension: 'Pension',
    risk: 'Risk',
    financial: 'Financial',
    pensionTransfer: 'Pension Transfer',
    
    // Agents Page
    email: 'Email',
  phone: 'Phone',
  category: 'Category',
  insuranceType: 'Insurance Type',
  status: 'Status',
  active: 'Active',
  inactive: 'Inactive',
    clickOnCompanies: 'Click on companies to add or remove them',
    createNewAgentRecord: 'Create a new agent record',
    addAgent: 'Add Agent',
    agentManagement: 'Agent Management',
    manageAgentRecords: 'Manage and update agent records',
    searchAgents: 'Search Agents',
    searchPlaceholder: 'Search by name, number, inspector, or department...',
    clearFilters: 'Clear Filters',
    totalAgents: 'Total Agents',
    filteredResults: 'Filtered Results',
    companies: 'Companies',
    agentList: 'Agent List',
    loading: 'Loading...',
    noAgentsFound: 'No agents found',
    agentName: 'Agent Name',
    agentNumber: 'Agent Number',
    inspector: 'Inspector',
    department: 'Department',
    company: 'Company',
    actions: 'Actions',
    update: 'Update',
    delete: 'Delete',
    showing: 'Showing',
    of: 'of',
    agents: 'agents',
    confirmDelete: 'Confirm Delete',
    thisActionCannotBeUndone: 'This action cannot be undone',
    cancel: 'Cancel',
    deleteAgent: 'Delete Agent',
    updateAgent: 'Update Agent',
    editAgentInformation: 'Edit agent information',
    saveChanges: 'Save Changes',
  },
  he: {
    // Header
    insuranceDashboard: 'לוח מחוונים לביטוח',
    dashboard: 'לוח בקרה',
    upload: 'העלאה',
    insights: 'תובנות',
    agentsHeader: 'סוכנים',
    logout: 'התנתק',
    
    // Login Page
    welcome: 'ברוכים הבאים',
    signInAccess: 'היכנס כדי לגשת ללוח המחוונים שלך',
    emailAddress: 'כתובת אימייל',
    password: 'סיסמה',
    rememberMe: 'זכור אותי',
    forgotPassword: 'שכחת סיסמה?',
    signIn: 'כניסה',
    needHelp: 'צריך עזרה?',
    contactSupport: 'צור קשר עם התמיכה',
    simplifyAnalytics: 'פשט את ניתוח הביטוח שלך',
    trackPerformance: 'עקוב אחר ביצועים, צור דוחות ונהל את נתוני הביטוח שלך במקום אחד.',
    activeAgents: 'סוכנים פעילים',
    policies: 'פוליסות',
    satisfaction: 'שביעות רצון',
    
    // Dashboard
    realTimeActivity: 'סקירה כללית של פעילות ועדכונים בזמן אמת',
    filterByCompany: 'סינון לפי חברה',
    filterByMonth: 'סינון לפי חודש',
    allCompanies: 'כל החברות',
    quickStatsMonth: 'סטטיסטיקות מהירות - חודש זה',
    totalOutput: 'תפוקה כוללת',
    policiesSold: 'פוליסות שנמכרו',
    activeAgentsCount: 'סוכנים פעילים',
    uploadProgress: 'התקדמות העלאה',
    thisMonth: 'החודש',
    currentlyActive: 'פעיל כעת',
    todaySummary: 'סיכום היום',
    policiesAdded: 'פוליסות שנוספו',
    totalPremium: 'פרמיה כוללת',
    agentsActive: 'סוכנים פעילים',
    reportsGenerated: 'דוחות שנוצרו',
    recentActivities: 'פעילויות אחרונות',
    notificationsAlerts: 'התראות ועדכונים',
    pendingActions: 'פעולות ממתינות',
    uploadCSVFiles: 'העלה קבצי CSV',
    uploadProcess: 'העלה ועבד את קבצי נתוני הביטוח שלך לניתוח',
    viewInsights: 'צפה בתובנות',
    exploreAnalytics: 'חקור ניתוחים מפורטים ומדדי ביצועים',
    
    // Upload Page
    uploadExcelFiles: 'העלאת קבצי Excel',
    uploadCompanyData: 'העלה נתוני חברה לניתוח',
    error: 'שגיאה',
    success: 'הצלחה',
    step1SelectCompanyMonth: 'שלב 1: בחר חברה וחודש',
    selectCompany: 'בחר חברה',
    selectMonth: 'בחר חודש',
    chooseCompany: 'בחר חברה...',
    step2UploadExcel: 'שלב 2: העלה קובץ Excel',
    dropFileHere: 'שחרר את הקובץ כאן',
    uploadExcelFile: 'העלה קובץ Excel',
    dragAndDropBrowse: 'גרור ושחרר או לחץ לעיון',
    excelSupported: 'תומך ב-.xlsx וב-.xlsb',
    uploadingProcessing: 'מעלה ומעבד...',
    uploadedFile: 'קובץ שהועלה',
    uploadedSuccessfully: 'הועלה בהצלחה',
    uploadFailed: 'ההעלאה נכשלה',
    processing: 'מעבד...',
    submitDataFor: 'שלח נתונים עבור',
    selectedCompany: 'חברה נבחרת',
    pleaseSelectCompany: 'אנא בחר חברה',
    pleaseUploadExcelFile: 'אנא העלה קובץ Excel',
    readyToSubmit: 'מוכן לשליחה עבור',
    
    // Insights Page
    analyticsInsights: 'ניתוחים ותובנות',
    comprehensiveMetrics: 'לוח מחוונים מקיף של מדדי ביצועים וניתוחים',
    exportToCSV: 'ייצא ל-CSV',
    activeFilters: 'מסננים פעילים:',
    pension: 'פנסיוני',
    risk: 'סיכונים',
    financial: 'פיננסים',
    pensionTransfer: 'ניודי פנסיה',
    
    // Agents Page
    email: 'אימייל',
    phone: 'טלפון',
    category: 'קטגוריה',
    insuranceType: 'סוג ביטוח',
    status: 'מצב',
    active: 'פעיל',
    inactive: 'לא פעיל',
    clickOnCompanies: 'לחץ על חברות כדי להוסיף או להסיר אותן',
    createNewAgentRecord: 'צור רשומת סוכן חדשה',
    addAgent: 'הוסף סוכן',
    agentManagement: 'ניהול סוכנים',
    manageAgentRecords: 'נהל ועדכן רישומי סוכנים',
    searchAgents: 'חיפוש סוכנים',
    searchPlaceholder: 'חפש לפי שם, מספר, מפקח או מחלקה...',
    clearFilters: 'נקה מסננים',
    totalAgents: 'סה"כ סוכנים',
    filteredResults: 'תוצאות מסוננות',
    companies: 'חברות',
    agentList: 'רשימת סוכנים',
    loading: 'טוען...',
    noAgentsFound: 'לא נמצאו סוכנים',
    agentName: 'שם הסוכן',
    agentNumber: 'מספר סוכן',
    inspector: 'מפקח',
    department: 'מחלקה',
    company: 'חברה',
    actions: 'פעולות',
    update: 'עדכן',
    delete: 'מחק',
    showing: 'מציג',
    of: 'מתוך',
    agents: 'סוכנים',
    confirmDelete: 'אשר מחיקה',
    thisActionCannotBeUndone: 'פעולה זו אינה הפיכה',
    cancel: 'ביטול',
    deleteAgent: 'מחק סוכן',
    updateAgent: 'עדכן סוכן',
    editAgentInformation: 'ערוך מידע על הסוכן',
    saveChanges: 'שמור שינויים',
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  const t = (key) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

