# Life Insurance Computation Logic

This document outlines the exact computation logic and Excel column mappings for each insurance company in the system.

---

## 1. MIGDAL (מגדל) - Company ID: 8

### **Type**: Product-Based Filtering (`FILTER_BY_PRODUCT`)

### **Excel Columns Used:**
```
שם בסיס מדידה          (measurement_basis_name) - Product identifier
סה"כ פרמיה נמדדת       (total_measured_premium) - Amount to sum
```

### **Processing Logic:**

1. **Filter out** rows where agent name = `'אורלי יונאי'`

2. **Exclude** rows where `שם בסיס מדידה` contains:
   - `'בסיס מדידה לפנסיה'`
   - `'בסיס זיכוי לפנסיה רובד ב` לגיל 60-65'`
   - `'בריאות וריסק'`

3. **Categorize** remaining rows based on `שם בסיס מדידה`:

   **PENSION Category:**
   - `'קרן פנסיה'`
   - `'קופת גמל פנסיה'`
   - `'קופות גמל להשקעה'`
   - `'נסיעות לחול'`

   **RISK Category:**
   - `'ביטוח חיים'`
   - `'אובדן כושר עבודה'`
   - `'מחלות קשות'`

   **FINANCIAL Category:**
   - `'חיסכון לטווח ארוך'`
   - `'קופת גמל להשקעה'`

4. **SUM** `סה"כ פרמיה נמדדת` per category per agent

### **Configuration Files:**
- `productCategoryMappings.js`
- `migdalMapping.js`

---

## 2. ANALYST (אנליסט) - Company ID: 3

### **Type**: Simple (`SIMPLE`)

### **Excel Columns Used:**
```
שם סוכן                (agent_name & agent_number) - Both from same column
תז                     (insured_id) - ID number
סניף, מסלול, חשבון    (product) - Product info
יתרה                   (balance) - Amount to sum
סוג ישות              (entity_type) - Entity type
תאריך הצטרפות         (join_date) - Join date (DD/MM/YYYY format)
```

### **Processing Logic:**

1. **Extract upload year** from upload month (e.g., "2025-12" → 2025)

2. **Parse** `תאריך הצטרפות` to extract join year from DD/MM/YYYY format

3. **Filter** rows where:
   ```
   join_year >= upload_year
   ```
   - Example: If uploading for 2025-12, only keep rows where join year >= 2025

4. **ALL** remaining rows go to **FINANCIAL** category

5. **SUM** `יתרה` per agent

### **Important Notes:**
- No product-based filtering
- Everything is categorized as Financial
- Date filtering is critical

### **Configuration Files:**
- `productCategoryMappings.js`
- `analystMapping.js`
- `excelParser.js` (line 279 - date filtering logic)

---

## 3. PHOENIX (הפניקס) - Company ID: 5

### **Type**: Product-Based Filtering (`FILTER_BY_PRODUCT`)

### **Excel Columns Used:**
```
שם סוכן               (agent_name)
מס סוכן               (agent_number)
מס פוליסה             (policy_number)
קבוצת מוצר            (product_group) - Product identifier
הנ - סכום פרמיה       (output) - Amount to sum
```

### **Processing Logic:**

1. **Filter out** rows where `קבוצת מוצר` = `'משכנתא'` (Mortgage)

2. **Categorize** remaining rows based on `קבוצת מוצר`:

   **PENSION Category:**
   - `'קופת גמל לתגמולים'`
   - `'קופת גמל פנסיה'`
   - `'פנסיה חדשה'`

   **RISK Category:**
   - `'סיכונים'`
   - `'בריאות'`

   **FINANCIAL Category:**
   - `'חיסכון'`

   **PENSION_TRANSFER Category:**
   - `'ניוד פנסיה'`

3. **SUM** `הנ - סכום פרמיה` per category per agent

### **Configuration Files:**
- `productCategoryMappings.js`
- `phoenixMapping.js`

---

## 4. CLAL (כלל) - Company ID: 7

### **Type**: Column-Based (`COLUMN_BASED`)

### **Special Feature**: Auto-detects file format based on column headers

---

### **Format Set 1 - Insurance & Financial Products**

#### **Excel Columns Used:**
```
עסקי בריאות           (health_business)
עסקי ריסק             (risk_business)
פרופיל מנהלים         (executive_profile)
קרן פנסיה חדשה        (new_pension_fund)
סה"כ פיננסים          (total_financial)
```

#### **Processing Logic:**

```javascript
RISK = עסקי בריאות + עסקי ריסק
       (health_business + risk_business)

PENSION = פרופיל מנהלים + קרן פנסיה חדשה
          (executive_profile + new_pension_fund)

FINANCIAL = סה"כ פיננסים
            (total_financial)
```

---

### **Format Set 2 - Agency & Transfer Data**

#### **Excel Columns Used:**
```
ניוד נטו              (net_transfer) - Column M in Excel
```

#### **Processing Logic:**

```javascript
PENSION_TRANSFER = ניוד נטו
                   (net_transfer)
```

---

### **Format Set 3 - Provident Fund & Savings**

#### **Excel Columns Used:**
```
פרופיל מנהלים         (executive_profile)
קרן פנסיה             (pension_fund)
עסקי ריסק             (risk_business)
עסקי בריאות           (health_business)
פרט פיננסים שוטף     (detailed_financial_current)
פרט פיננסים חד פעמי   (detailed_financial_one_time)
```

#### **Processing Logic:**

```javascript
PENSION = פרופיל מנהלים + קרן פנסיה
          (executive_profile + pension_fund)

RISK = עסקי ריסק + עסקי בריאות
       (risk_business + health_business)

FINANCIAL = פרט פיננסים שוטף + פרט פיננסים חד פעמי
            (detailed_financial_current + detailed_financial_one_time)
```

### **Auto-Detection Logic:**
The system automatically detects which Set format to use by examining the Excel column headers. The detection happens in `excelParser.js` (lines 106-118).

### **Configuration Files:**
- `productCategoryMappings.js`
- `clalMapping.js` (Set 1)
- `clalElementaryMapping.js` (Set 2)
- Auto-detection in `excelParser.js`

---

## Summary Table

| Company | Type | Key Operation | Hebrew Amount Column(s) | Categories |
|---------|------|---------------|-------------------------|------------|
| **Migdal** | Product Filter | Filter → Categorize → Sum | `סה"כ פרמיה נמדדת` | Pension, Risk, Financial |
| **Analyst** | Simple | Date Filter → Sum | `יתרה` | Financial only |
| **Phoenix** | Product Filter | Filter → Categorize → Sum | `הנ - סכום פרמיה` | Pension, Risk, Financial, Pension Transfer |
| **Clal Set 1** | Column-Based | Add columns | `עסקי בריאות` + `עסקי ריסק`<br>`פרופיל מנהלים` + `קרן פנסיה חדשה`<br>`סה"כ פיננסים` | Pension, Risk, Financial |
| **Clal Set 2** | Column-Based | Direct sum | `ניוד נטו` | Pension Transfer |
| **Clal Set 3** | Column-Based | Add columns | `פרופיל מנהלים` + `קרן פנסיה`<br>`עסקי ריסק` + `עסקי בריאות`<br>`פרט פיננסים שוטף` + `פרט פיננסים חד פעמי` | Pension, Risk, Financial |

---

## Key Category Definitions

### **PENSION (פנסיה)**
Pension funds, provident funds, and retirement savings

### **RISK (סיכונים/ריסק)**
Life insurance, disability insurance, critical illness coverage, health insurance

### **FINANCIAL (פיננסים)**
Long-term savings, investment funds

### **PENSION_TRANSFER (ניוד פנסיה)**
Pension fund transfers

---

## Data Flow

1. **Upload**: Excel files are uploaded via frontend
2. **Parse**: Backend parses Excel using appropriate mapping file
3. **Filter**: Apply company-specific exclusions
4. **Categorize**: Group data into categories based on company type
5. **Aggregate**: Sum amounts per agent per category
6. **Store**: Save results in `aggregations` table in Supabase

---

## Backend Service Files

### **Main Processing:**
- `aggregationService.js` - Core aggregation logic
- `excelParser.js` - Excel file parsing and mapping

### **Mapping Files:**
- `companyMappings.js` - Main company configurations
- `productCategoryMappings.js` - Product-to-category mappings
- Individual company mapping files (e.g., `migdalMapping.js`)

---

## Notes

- All monetary values are summed per agent
- Results are stored with company_id, agent_id, upload_month
- The system handles both Hebrew and English column names
- Special characters and formatting are handled during parsing
- Duplicate detection prevents re-uploading same month/company data

---

**Last Updated:** January 19, 2026
