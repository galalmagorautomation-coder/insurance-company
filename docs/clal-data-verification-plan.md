# Clal Data Verification Plan

## Problem Statement

Negative values appearing in Clal monthly data, specifically in December (-24,374,197).

**Current UI Data:**

| Month | Sales Amount |
|-------|-------------|
| Jan-Dec | 5,221,773 |
| Jan-Jun | 0 |
| Jan-July | 16,895,933 |
| July-Dec | 5,221,773 |
| August-Dec | -11,674,161 |
| Sept-Dec | -18,841,214 |
| Oct-Dec | -21,772,436 |
| Nov-Dec | -23,012,593 |
| Jul | 16,895,933 |
| Aug | 7,167,054 |
| Sep | 2,931,222 |
| Oct | 1,240,157 |
| Nov | 1,361,605 |
| Dec | -24,374,197 |

---

## Background: How Clal Data Works

### Three File Formats

| Set   | Sheet Name              | Contains                 | Data Type          |
|-------|-------------------------|--------------------------|--------------------|
| Set 1 | רמת עוסק מורשה         | RISK, PENSION, FINANCIAL | YTD Cumulative     |
| Set 2 | גיליון1                | PENSION_TRANSFER         | YTD Cumulative     |
| Set 3 | רמת פוליסה כל המוצרים | All categories           | Monthly (filtered) |

### Column Mappings

**Set 1 Columns:**
| Category  | Hebrew Column    | DB Column         |
|-----------|------------------|-------------------|
| RISK      | עסקי בריאות     | health_business   |
| RISK      | עסקי ריסק       | risk_business     |
| PENSION   | פרופיל מנהלים  | executive_profile |
| PENSION   | קרן פנסיה חדשה | new_pension_fund  |
| FINANCIAL | סה"כ פיננסים   | total_financial   |

**Set 2 Columns:**
| Category         | Hebrew Column | DB Column    |
|------------------|---------------|-----------   |
| PENSION_TRANSFER | ניוד נטו     | net_transfer |

### Aggregation Formula

```
RISK = health_business + risk_business
PENSION = executive_profile + new_pension_fund
FINANCIAL = total_financial
PENSION_TRANSFER = net_transfer

TOTAL = RISK + PENSION + FINANCIAL + PENSION_TRANSFER
```

### Cumulative to Monthly Conversion

Since Set 1 & 2 data is **Year-to-Date (YTD) cumulative**, the system calculates monthly values as:

```
Monthly Value = Current Month YTD - Previous Month YTD
```

**This is why negative values can appear if:**
1. Current month's YTD is lower than previous month's YTD
2. Wrong file was uploaded
3. Data correction/adjustment in source file

---

## Verification Steps

### Step 1: Identify Your Agent Number

**Clal Agent Number(s):** _______________

(Check `agent_data` table → `clal_agent_id` column)

---

### Step 2: Gather All Clal Files

Locate all Clal Excel files uploaded for July through December.

---

### Step 3: Check Each Month

---

#### JULY

**File 1 (Set 1 - רמת עוסק מורשה):**

- [ ] File name: Format 1
- [ ] Header row: 4
- [ ] Agent found: Yes / No

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות |2,211,109.29 |
| עסקי ריסק |1,775,861.28 |
| פרופיל מנהלים |0 |
| קרן פנסיה חדשה | 11,586,173.52|
| סה"כ פיננסים |377,741.28 |
| **Set 1 Subtotal** | 15,950,885.37 |

**File 2 (Set 2 - גיליון1):**

- [ ] File name: _______________
- [ ] Header row: 1
- [ ] Agent found: Yes / No

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו |  (found in this column - ניוד_נטו)  8,305,741.26     |

**JULY TOTAL YTD:** _______________

---

#### AUGUST

**File 1 (Set 1):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות |1,105,554.65 |
| עסקי ריסק |887,930.64 |
| פרופיל מנהלים |0.00 |
| קרן פנסיה חדשה | |
| סה"כ פיננסים |188,870.64 |
| **Set 1 Subtotal** | 7,975,442.69|

**File 2 (Set 2):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו | only found this - (ניוד_נטו) 8,429.01 |

**AUGUST TOTAL YTD:** _______________

**AUGUST MONTHLY (calculated):** Aug YTD - Jul YTD = _______________

---

#### SEPTEMBER

**File 1 (Set 1):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות |1,105,554.65 |
| עסקי ריסק |887,930.64|
| פרופיל מנהלים |0 |
| קרן פנסיה חדשה |5,793,086.76 |
| סה"כ פיננסים | 5,981,957.40|
| **Set 1 Subtotal** |7,786,572.05 |

**File 2 (Set 2):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו | Found this - ניוד_נטו   -22,325.33|

**SEPTEMBER TOTAL YTD:** _______________

**SEPTEMBER MONTHLY (calculated):** Sep YTD - Aug YTD = _______________

---

#### OCTOBER

**File 1 (Set 1):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות |1,105,554.646 |
| עסקי ריסק |887,930.64 |
| פרופיל מנהלים | 133,926.72|
| קרן פנסיה חדשה | 0|
| סה"כ פיננסים |5,793,086.76 + 188,870.64 = 5,981,957.4 |
| **Set 1 Subtotal** | 8,109,369.406|

**File 2 (Set 2):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו | Only found this - ניוד_נטו   10,024,238.49|

**OCTOBER TOTAL YTD:** _______________

**OCTOBER MONTHLY (calculated):** Oct YTD - Sep YTD = _______________

---

#### NOVEMBER

**File 1 (Set 1):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות |2,211,109.29 |
| עסקי ריסק |1,775,861.28 |
| פרופיל מנהלים | 0|
| קרן פנסיה חדשה | 11,586,173.52|
| סה"כ פיננסים |377,741.28 |
| **Set 1 Subtotal** | 15,950,885.37|

**File 2 (Set 2):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו | Found this ניוד_נטו 11,397,012.47|

**NOVEMBER TOTAL YTD:** _______________

**NOVEMBER MONTHLY (calculated):** Nov YTD - Oct YTD = _______________

---

#### DECEMBER

**File 1 (Set 1):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| עסקי בריאות | 120,392.395|
| עסקי ריסק | 59,227.05|
| פרופיל מנהלים | -1,602.7|
| קרן פנסיה חדשה |0 |
| סה"כ פיננסים | `"סה"כ פיננסים" (Total Financials) doesn't exist as a column in this sheet. The closest related columns are:
"פרט פיננסי -שוטף" (Current Financial - Individual): 578,345.28
"פרט פיננסי-חד פעמי" (One-time Financial - Individual): 23,996.79` |
| **Set 1 Subtotal** |178,016.745 |

**File 2 (Set 2):**

- [ ] File name: _______________

| Column (Hebrew) | Value |
|-----------------|-------|
| ניוד נטו | 18,838,871.92 ניוד_נטו |

**DECEMBER TOTAL YTD:** _______________

**DECEMBER MONTHLY (calculated):** Dec YTD - Nov YTD = _______________

---

### Step 4: Summary Comparison Table

| Month | YTD from File | Expected YTD | Monthly (calculated) | Monthly (UI) | Match? |
|-------|---------------|--------------|---------------------|--------------|--------|
| Jul | | 16,895,933 | 16,895,933 | 16,895,933 | |
| Aug | | 24,062,987 | 7,167,054 | 7,167,054 | |
| Sep | | 26,994,209 | 2,931,222 | 2,931,222 | |
| Oct | | 28,234,366 | 1,240,157 | 1,240,157 | |
| Nov | | 29,595,971 | 1,361,605 | 1,361,605 | |
| Dec | | 5,221,773 | -24,374,197 | -24,374,197 | |

---

### Step 5: Identify the Problem

After completing the table, check for:

- [ ] **December YTD mismatch** - Is Dec file really showing ~5.2M or should it be ~30M+?
- [ ] **Wrong file uploaded** - Was a wrong month's file uploaded for any month?
- [ ] **Missing Set 2 data** - Is PENSION_TRANSFER (ניוד נטו) included for all months?
- [ ] **Agent number mismatch** - Is the system matching the correct agent rows?
- [ ] **Multiple agents combined** - Are there multiple agent IDs that should be summed?

---

## Findings

### Root Cause:

_____________________________________________________________

_____________________________________________________________

_____________________________________________________________

### Action Required:

- [ ] Re-upload corrected file for month: _______________
- [ ] Fix agent mapping in database
- [ ] Fix parsing logic in code
- [ ] Other: _______________

---

## Technical Reference

### Relevant Code Files

| File | Purpose |
|------|---------|
| `gal-almagor-backend/src/config/clalMapping.js` | Column mappings for 3 Clal sets |
| `gal-almagor-backend/src/utils/excelParser.js` | Parses Excel data using mappings |
| `gal-almagor-backend/src/routes/uploadRoutes.js` | Upload handling & sheet detection |
| `gal-almagor-backend/src/services/aggregationService.js` | Aggregation & YTD-to-monthly conversion |
| `gal-almagor-backend/src/config/productCategoryMappings.js` | Category formulas (company ID: 7) |

### Database Tables

| Table | Purpose |
|-------|---------|
| `agent_data` | Agent info, `clal_agent_id` column |
| `raw_data` | Raw uploaded data |
| `agent_aggregations` | Aggregated monthly values |

### SQL to Check Raw Data

```sql
-- Check raw_data for Clal (company_id = 7) for a specific month
SELECT
  agent_number,
  agent_name,
  month,
  health_business,
  risk_business,
  executive_profile,
  new_pension_fund,
  total_financial,
  net_transfer
FROM raw_data
WHERE company_id = 7
  AND month = '2025-12'
  AND agent_number = 'YOUR_AGENT_NUMBER';
```

```sql
-- Check aggregated data
SELECT *
FROM agent_aggregations
WHERE company_id = 7
  AND month >= '2025-07'
ORDER BY month;
```
