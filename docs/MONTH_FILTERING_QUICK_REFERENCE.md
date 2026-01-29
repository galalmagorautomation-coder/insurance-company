# Month Filtering - Quick Reference

## Quick Company Lookup

### Migdal (מגדל)
- **Column:** `תאריך רישום`
- **Format:** M/D/YYYY (11/3/2025)
- **Month Position:** 1st part

### Analyst (אנליסט)
- **Column:** `תאריך הצטרפות`
- **Format:** YYYY-MM-DD (2025-05-22)
- **Month Position:** 2nd part

### Phoenix (הפניקס)
- **Column:** `ת. פרודוקציה`
- **Format:** DD/MM/YYYY (01/07/2025)
- **Month Position:** 2nd part

### Menorah (מנורה)
- **Columns (OR):** `חודש רישום` OR `תאריך`
- **Format:** Month# OR DD/MM/YYYY
- **Month Position:** Direct OR 2nd part

### Altshuler (אלטשולר שחם)
- **Column:** `חודש`
- **Format:** Month number (12)
- **Month Position:** Direct value

### Ayalon (איילון)
- **Column:** `תאריך פרודוקציה של כיסוי`
- **Format:** DD/MM/YYYY (01/12/2025)
- **Month Position:** 2nd part
- **Special:** OR logic for agent columns

### Mor (מור)
- **Columns (OR):** `תאריך פרודוקציה של כיסוי` OR `חודש גיוס`
- **Format:** M/D/YYYY (12/18/2025) OR M/D/YY (7/1/25)
- **Month Position:** 1st part
- **Special:** Smart sheet selection (גיליון)

---

## Date Format Quick Reference

| Format | Month Position | Example | Parse Code |
|--------|----------------|---------|------------|
| M/D/YYYY | 1st | 11/3/2025 | `parts[0]` |
| DD/MM/YYYY | 2nd | 01/12/2025 | `parts[1]` |
| YYYY-MM-DD | 2nd | 2025-05-22 | `parts[1]` |
| Month# | Direct | 12 | Direct value |

---

## Common Code Patterns

### Extract Month from M/D/YYYY (Month is 1st)
```javascript
const parts = dateRaw.split('/');
monthNum = parseInt(parts[0]); // Month
year = parseInt(parts[2]); // Year
```

### Extract Month from DD/MM/YYYY (Month is 2nd)
```javascript
const parts = dateRaw.split('/');
monthNum = parseInt(parts[1]); // Month
year = parseInt(parts[2]); // Year
```

### Extract Month from YYYY-MM-DD (Month is 2nd)
```javascript
const parts = dateRaw.split('-');
year = parseInt(parts[0]); // Year
monthNum = parseInt(parts[1]); // Month
```

### Excel Serial Number
```javascript
const excelEpoch = new Date(1899, 11, 30);
const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
year = jsDate.getFullYear();
monthNum = jsDate.getMonth() + 1;
```

---

## Adding Filtering to New Company (3 Steps)

### 1. Update Mapping (`config/[company]Mapping.js`)
```javascript
columns: {
  // ... existing ...
  productionDate: 'תאריך פרודוקציה',
}
```

### 2. Add Filter Logic (`utils/excelParser.js`)
```javascript
if (companyName === 'CompanyName') {
  const dateRaw = row[mapping.columns.productionDate];

  // Extract month (adjust based on format)
  // Skip if month doesn't match
  if (finalMonth !== uploadMonth) return;
}
```

### 3. Test
- Upload → Check console → Verify raw_data → Check Insights page

---

## Debugging Commands

### Check Console Logs
```
🔍 Processing [Company] row 123:
   Date raw: 12/18/2025
   ✅ INCLUDED or ❌ SKIPPED
```

### Check Raw Data
```sql
SELECT COUNT(*), month FROM raw_data WHERE company_id = X GROUP BY month;
```

### Verify Excel Sum
```excel
=SUMIFS(M:M, L:L, ">="&DATE(2025,12,1), L:L, "<="&DATE(2025,12,31))
```

---

## Where Things Are

- **Filter Logic:** `gal-almagor-backend/src/utils/excelParser.js`
- **Mappings:** `gal-almagor-backend/src/config/*Mapping.js`
- **Sheet Selection:** `gal-almagor-backend/src/routes/uploadRoutes.js`
- **Full Docs:** `docs/MONTH_FILTERING_IMPLEMENTATION.md`

---

**Last Updated:** 2026-01-29
