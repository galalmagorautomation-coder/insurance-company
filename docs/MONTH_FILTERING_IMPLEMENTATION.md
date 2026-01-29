# Month Filtering Implementation Guide

## Overview

This document explains the month filtering system implemented for insurance company data uploads. The system filters Excel rows based on date columns to ensure only data matching the user-selected month is inserted into the database.

## Problem Statement

**Original Issue:**
When users uploaded insurance company files and selected a month (e.g., "November 2025"), the system would insert ALL rows from the Excel file, regardless of their dates. This caused the Insights page to show data from all months (January, February, November) when filtering by a specific month.

**Solution:**
Implement month filtering at the upload stage - extract the month from date columns in the Excel file and only insert rows that match the user-selected month.

---

## Implementation Architecture

### Files Modified

1. **`gal-almagor-backend/src/utils/excelParser.js`**
   - Main file where month filtering logic is implemented
   - Added filtering for each company before row insertion

2. **`gal-almagor-backend/src/config/*Mapping.js`**
   - Added date column mappings for each company

3. **`gal-almagor-backend/src/routes/uploadRoutes.js`**
   - Updated Mor sheet selection logic
   - Removed multi-month aggregation for Migdal

---

## Company-Specific Implementations

### 1. Migdal (מגדל)

**Date Column:** `תאריך רישום` (Registration Date)
**Format:** M/D/YYYY (e.g., "11/3/2025" = November 3, 2025)
**Location in Code:** `excelParser.js` lines ~394-457

**Logic:**
```javascript
if (companyName === 'מגדל' || companyName === 'Migdal') {
  const registrationDateRaw = row[mapping.columns.registrationDate];

  // Extract month from registration date
  // Formats handled: M/D/YYYY, Excel serial number, Date object

  // Skip if extracted month ≠ upload month
  if (finalMonth !== uploadMonth) {
    return; // Skip row
  }
}
```

**Key Notes:**
- Column name has trailing space in some files: `"תאריך רישום "` (handled by trimming)
- Month is the **1st part** in M/D/YYYY format

---

### 2. Analyst (אנליסט)

**Date Column:** `תאריך הצטרפות` (Join Date)
**Format:** YYYY-MM-DD (e.g., "2025-05-22")
**Location in Code:** `excelParser.js` lines ~459-521

**Logic:**
```javascript
if (companyName === 'אנליסט' || companyName === 'Analyst') {
  const joinDateRaw = row[mapping.columns.joinDate];

  // Extract month from join date
  // Formats handled: YYYY-MM-DD, M/D/YYYY, Excel serial, Date object

  // Skip if extracted month ≠ upload month
  if (finalMonth !== uploadMonth) {
    return; // Skip row
  }
}
```

**Key Notes:**
- Primary format is YYYY-MM-DD
- Falls back to M/D/YYYY if needed
- Month is the **2nd part** in YYYY-MM-DD format

---

### 3. Phoenix (הפניקס)

**Date Column:** `ת. פרודוקציה` (Production Date)
**Format:** DD/MM/YYYY (e.g., "01/07/2025" = July 1, 2025)
**Location in Code:** `excelParser.js` lines ~523-583

**Logic:**
```javascript
if (companyName === 'הפניקס' || companyName === 'The Phoenix' || companyName === 'Phoenix') {
  const productionDateRaw = row[mapping.columns.productionDate];

  // Extract month from production date
  // Formats handled: DD/MM/YYYY, Excel serial, Date object

  // Skip if extracted month ≠ upload month
  if (finalMonth !== uploadMonth) {
    return; // Skip row
  }
}
```

**Key Notes:**
- Month is the **2nd part** in DD/MM/YYYY format
- Used for calculating gross from column "תפוקה"

---

### 4. Menorah (מנורה)

**Date Columns (OR Logic):**
1. **Option 1:** `חודש רישום` (Registration Month) - Month number (1-12)
2. **Option 2:** `תאריך` (Date) - DD/MM/YYYY format

**Format:** Month number OR DD/MM/YYYY
**Location in Code:** `excelParser.js` lines ~585-668

**Logic:**
```javascript
if (companyName === 'מנורה' || companyName === 'Menorah') {
  // OPTION 1: Try "חודש רישום" first (month number)
  const registrationMonthRaw = row[mapping.columns.registrationMonth];
  if (registrationMonthRaw && valid_month_number) {
    // Use this month with upload year
  }

  // OPTION 2: Fall back to "תאריך" (full date)
  else {
    const dateRaw = row[mapping.columns.date];
    // Extract month from DD/MM/YYYY
  }

  // Skip if extracted month ≠ upload month
}
```

**Key Notes:**
- Uses **OR logic** - tries both columns
- If "חודש רישום" exists → use it with upload year
- If "תאריך" exists → extract month from full date
- Month is the **2nd part** in DD/MM/YYYY format

---

### 5. Altshuler (אלטשולר שחם)

**Date Column:** `חודש` (Month)
**Format:** Month number (e.g., 12 = December)
**Location in Code:** `excelParser.js` lines ~670-704

**Logic:**
```javascript
if (companyName === 'אלטשולר שחם' || companyName === 'Altshuler Shaham' || companyName === 'Altshuler') {
  const monthRaw = row[mapping.columns.month];

  // Extract upload month number for comparison
  const uploadMonthInt = parseInt(uploadMonth.split('-')[1]);

  // Parse Excel month number
  const monthNum = parseInt(monthRaw);

  // Skip if month numbers don't match
  if (monthNum !== uploadMonthInt) {
    return; // Skip row
  }
}
```

**Key Notes:**
- Only has month number, not full date
- Assumes year from upload selection
- Applied to both Tab 1 and Tab 2 mappings

---

### 6. Ayalon (איילון)

**Date Column:** `תאריך פרודוקציה של כיסוי` (Coverage Production Date)
**Format:** DD/MM/YYYY (e.g., "01/12/2025" = December 1, 2025)
**Location in Code:** `excelParser.js` lines ~706-767

**Special Feature:** OR logic for old vs new agent columns

**Logic:**
```javascript
if (companyName === 'איילון' || companyName === 'Ayalon') {
  const coverageProductionDateRaw = row[mapping.columns.coverageProductionDate];

  // Extract month from coverage production date
  // Formats handled: DD/MM/YYYY, Excel serial, Date object

  // Skip if extracted month ≠ upload month
  if (finalMonth !== uploadMonth) {
    return; // Skip row
  }
}
```

**Agent Column OR Logic:**
```javascript
// Try new columns first
const newAgentName = row['שם סוכן'];
const newAgentNumber = row['מספר סוכן'];

// Fall back to old column if new ones don't exist
const oldAgentNameNumber = row['שם סוכן ומספר סוכן'];

if (newAgentName || newAgentNumber) {
  // Use new columns
} else if (oldAgentNameNumber) {
  // Use old column
}
```

**Key Notes:**
- Month is the **2nd part** in DD/MM/YYYY format
- Handles both old and new Excel formats for agent info
- Multiple possible column names: "כ-מחוז", "שם מפקח", etc.

---

### 7. Mor (מור)

**Date Columns (OR Logic):**
1. **Option 1:** `תאריך פרודוקציה של כיסוי` (Coverage Production Date) - M/D/YYYY
2. **Option 2:** `חודש גיוס` (Recruitment Month) - M/D/YY or M/D/YYYY

**Format:** M/D/YYYY OR M/D/YY
**Location in Code:** `excelParser.js` lines ~367-459

**Special Feature:** Smart sheet selection

**Month Filtering Logic:**
```javascript
if (companyName === 'מור' || companyName === 'Mor') {
  // OPTION 1: Try "תאריך פרודוקציה של כיסוי" first
  const coverageProductionDateRaw = row[mapping.columns.coverageProductionDate];
  if (coverageProductionDateRaw) {
    // Extract month from M/D/YYYY
  }

  // OPTION 2: Fall back to "חודש גיוס"
  else {
    const recruitmentMonthRaw = row[mapping.columns.recruitmentMonth];
    // Extract month from M/D/YY or M/D/YYYY
  }

  // Skip if extracted month ≠ upload month
}
```

**Sheet Selection Logic (`uploadRoutes.js` lines ~2746-2777):**
```javascript
if (companyName === 'מור' || companyName === 'Mor') {
  // Find sheets starting with "גיליון"
  const gilyonSheets = workbook.SheetNames.filter(name => name.startsWith('גיליון'));

  if (gilyonSheets.length > 1) {
    // Multiple sheets: Use highest numbered (גיליון3 > גיליון2 > גיליון1)
    sheetName = gilyonSheets[gilyonSheets.length - 1];
  } else if (gilyonSheets.length === 1) {
    // One sheet: Use it
    sheetName = gilyonSheets[0];
  } else {
    // No גיליון sheets: Use first sheet
    sheetName = workbook.SheetNames[0];
  }
}
```

**Key Notes:**
- Month is the **1st part** in M/D/YYYY format
- Handles 2-digit years (YY) by adding 2000
- Can process files with 1 or 2 sheets
- Sheet names can be: "גיליון", "גיליון1", "גיליון2", "גיליון3"

---

## Date Format Handling Reference

### Date Format Types

| Format | Example | Month Position | Companies Using |
|--------|---------|----------------|-----------------|
| **M/D/YYYY** | 11/3/2025 | 1st part | Migdal, Mor |
| **DD/MM/YYYY** | 01/12/2025 | 2nd part | Phoenix, Menorah, Ayalon |
| **YYYY-MM-DD** | 2025-05-22 | 2nd part | Analyst |
| **Month Number** | 12 | Direct value | Altshuler, Menorah |
| **Excel Serial** | 45144 | Convert to date | All companies |
| **Date Object** | Date instance | getMonth() + 1 | All companies |

### Date Parsing Code Pattern

All companies use this pattern for handling different date formats:

```javascript
let year = null;
let monthNum = null;

// Handle string with "/" (M/D/YYYY or DD/MM/YYYY)
if (typeof dateRaw === 'string' && dateRaw.includes('/')) {
  const parts = dateRaw.split('/');
  if (parts.length === 3) {
    monthNum = parseInt(parts[1]); // or parts[0] depending on format
    year = parseInt(parts[2]);
  }
}
// Handle string with "-" (YYYY-MM-DD)
else if (typeof dateRaw === 'string' && dateRaw.includes('-')) {
  const parts = dateRaw.split('-');
  if (parts.length === 3) {
    year = parseInt(parts[0]);
    monthNum = parseInt(parts[1]);
  }
}
// Handle Excel serial number
else if (typeof dateRaw === 'number' && dateRaw > 0 && dateRaw < 100000) {
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
  year = jsDate.getFullYear();
  monthNum = jsDate.getMonth() + 1;
}
// Handle Date object
else if (dateRaw instanceof Date) {
  year = dateRaw.getFullYear();
  monthNum = dateRaw.getMonth() + 1;
}

// Compare with upload month
const finalMonth = `${year}-${monthNum.toString().padStart(2, '0')}`;
if (finalMonth !== uploadMonth) {
  return; // Skip row
}
```

---

## How to Add Month Filtering for a New Company

### Step 1: Update Company Mapping

**File:** `gal-almagor-backend/src/config/[company]Mapping.js`

Add the date column to the mapping:

```javascript
const COMPANY_MAPPING = {
  companyName: 'CompanyName',
  companyNameHebrew: 'שם חברה',

  columns: {
    // ... existing columns ...

    // Add date column
    productionDate: 'תאריך פרודוקציה',  // Or whatever the column name is
  }
};
```

### Step 2: Add Filtering Logic

**File:** `gal-almagor-backend/src/utils/excelParser.js`

Add the filtering block after other company filters (search for "// Get product and clean it"):

```javascript
// NEW: Extract month from [dateColumn] for [CompanyName]
if (companyName === 'שם חברה' || companyName === 'CompanyName') {
  const dateRaw = row[mapping.columns.productionDate];
  console.log(`\n🔍 Processing [CompanyName] row ${index + 1}:`);
  console.log(`   Date raw:`, dateRaw);
  console.log(`   Upload month:`, uploadMonth);

  if (dateRaw) {
    let dateYear = null;
    let dateMonthNum = null;

    // Handle [format] (e.g., "DD/MM/YYYY")
    if (typeof dateRaw === 'string' && dateRaw.includes('/')) {
      const parts = dateRaw.split('/');
      if (parts.length === 3) {
        dateMonthNum = parseInt(parts[1]); // Adjust based on format
        dateYear = parseInt(parts[2]);
      }
    }
    // Handle Excel serial number
    else if (typeof dateRaw === 'number' && dateRaw > 0 && dateRaw < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
      dateYear = jsDate.getFullYear();
      dateMonthNum = jsDate.getMonth() + 1;
    }
    // Handle Date object
    else if (dateRaw instanceof Date) {
      dateYear = dateRaw.getFullYear();
      dateMonthNum = dateRaw.getMonth() + 1;
    }

    if (dateYear && dateMonthNum) {
      const monthStr = dateMonthNum.toString().padStart(2, '0');
      finalMonth = `${dateYear}-${monthStr}`;

      if (finalMonth !== uploadMonth) {
        console.log(`   ❌ SKIPPED: Extracted month ${finalMonth} doesn't match upload month ${uploadMonth}`);
        return;
      }

      console.log(`   ✅ INCLUDED: Month ${finalMonth} matches upload month ${uploadMonth}`);
    } else {
      console.log(`   ❌ SKIPPED: Could not extract month from date`);
      return;
    }
  } else {
    console.log(`   ❌ SKIPPED: No date found`);
    return;
  }
}
```

### Step 3: Test

1. **Check Excel file** - identify the date column name and format
2. **Update mapping** - add column name to company mapping
3. **Add filter logic** - adjust month position based on format
4. **Upload test file** - check console logs
5. **Verify data** - check raw_data table for correct month values

---

## Common Issues and Solutions

### Issue 1: Column Not Found (undefined)

**Symptom:** Console shows "No [column] found" for all rows

**Cause:** Column name in mapping doesn't match Excel header

**Solution:**
1. Check Excel for **exact column name** (including spaces)
2. Add console logging to show available columns:
```javascript
console.log('Available columns:', Object.keys(row).join(', '));
```
3. Update mapping with correct column name
4. Remember: Column names are **trimmed** automatically

### Issue 2: All Rows Filtered Out

**Symptom:** Upload says "0 rows inserted" even though Excel has data

**Causes:**
- Wrong date format parsing (e.g., treating M/D/YYYY as DD/MM/YYYY)
- Wrong month position in date string
- Date column is empty in Excel

**Solution:**
1. Check console logs for extracted dates
2. Verify month position (1st part vs 2nd part)
3. Add format-specific handling

### Issue 3: Wrong Month Extracted

**Symptom:** November data shows as January in database

**Cause:** Month/day confusion (11/1/2025 parsed as January 11 instead of November 1)

**Solution:**
- Verify date format: M/D/YYYY vs DD/MM/YYYY
- Update month position: `parts[0]` vs `parts[1]`
- Check with actual Excel data

### Issue 4: Trailing Spaces in Column Names

**Symptom:** Column exists but system can't find it

**Cause:** Excel column name has trailing space: `"תאריך רישום "`

**Solution:** Already handled! All column names are trimmed in `parseExcelData()`:
```javascript
excelData = excelData.map(row => {
  const trimmedRow = {};
  Object.keys(row).forEach(key => {
    const trimmedKey = key.trim();
    trimmedRow[trimmedKey] = row[key];
  });
  return trimmedRow;
});
```

---

## Testing Checklist

When adding or modifying month filtering:

- [ ] Upload file with multiple months of data
- [ ] Verify console shows correct month extraction
- [ ] Check raw_data table - only selected month inserted
- [ ] Verify aggregation runs successfully
- [ ] Check Insights page - filtering works correctly
- [ ] Test with different date formats (string, serial, Date object)
- [ ] Test with files that have 1 sheet vs multiple sheets (if applicable)
- [ ] Verify gross calculation matches Excel sum for filtered month

---

## Debugging Tips

### 1. Enable Detailed Logging

All filtering code includes console.log statements. Check backend console for:
```
🔍 Processing [Company] row 123:
   Date raw: 12/18/2025
   Upload month: 2025-12
   Extracted: Year=2025, Month=12
   ✅ INCLUDED: Month 2025-12 matches upload month 2025-12
```

### 2. Check Raw Data Table

After upload, query raw_data:
```sql
SELECT COUNT(*), month
FROM raw_data
WHERE company_id = [id]
GROUP BY month
ORDER BY month;
```

Should only show the selected month.

### 3. Verify Excel Formula

To verify gross totals in Excel, use appropriate SUMIFS:
```excel
-- For DD/MM/YYYY format (Phoenix, Ayalon):
=SUMIFS(M:M, L:L, ">="&DATE(2025,12,1), L:L, "<="&DATE(2025,12,31))

-- Or use wildcards:
=SUMIF(L:L, "*/12/2025", M:M)
```

---

## Architecture Decisions

### Why Filter at Upload Stage?

**Decision:** Filter rows during Excel parsing, before database insertion

**Alternatives Considered:**
1. ~~Insert all rows, filter during aggregation~~ - Pollutes database with unwanted data
2. ~~Filter in frontend before upload~~ - Can't be done (frontend doesn't parse Excel)
3. ✅ **Filter during parsing** - Clean, prevents bad data from entering system

**Benefits:**
- Database only contains relevant data
- No cleanup needed
- Aggregation is simpler
- Insights page filtering works correctly

### Why OR Logic for Some Companies?

**Companies Using OR Logic:**
- Menorah (2 possible date columns)
- Mor (2 possible date columns)
- Ayalon (old vs new agent columns)

**Reason:** Excel file formats change over time. OR logic ensures backward compatibility:
1. Try new/preferred column first
2. Fall back to old column if new doesn't exist
3. Maintains support for both old and new files

---

## Summary Table

| Company | Date Column(s) | Format | OR Logic | Sheet Selection |
|---------|---------------|--------|----------|-----------------|
| **Migdal** | תאריך רישום | M/D/YYYY | ❌ | Default |
| **Analyst** | תאריך הצטרפות | YYYY-MM-DD | ❌ | Default |
| **Phoenix** | ת. פרודוקציה | DD/MM/YYYY | ❌ | Default |
| **Menorah** | חודש רישום OR תאריך | Month# OR DD/MM/YYYY | ✅ | Default |
| **Altshuler** | חודש | Month# | ❌ | Default |
| **Ayalon** | תאריך פרודוקציה של כיסוי | DD/MM/YYYY | ✅ (agent cols) | Default |
| **Mor** | תאריך פרודוקציה של כיסוי OR חודש גיוס | M/D/YYYY OR M/D/YY | ✅ | Smart (גיליון) |

---

## Future Improvements

1. **Standardize Date Formats:** Consider storing dates in a consistent format in raw_data
2. **Validation UI:** Show users preview of filtered rows before upload
3. **Multi-Month Upload:** Allow selecting multiple months in one upload
4. **Date Range Validation:** Warn users if Excel contains months outside selected range
5. **Column Auto-Detection:** Automatically detect date columns by analyzing content

---

## Contact & Questions

If you need to modify or extend this system:
1. Read this document thoroughly
2. Check existing company implementations for patterns
3. Use the "How to Add Month Filtering" section as a guide
4. Test thoroughly with actual Excel files
5. Update this documentation with any changes

**Last Updated:** 2026-01-29
**Implemented By:** Claude (Sonnet 4.5) + User collaboration
