# Backend Logic Documentation

This document explains how Excel files are processed for **Life Insurance** and **Elementary Insurance** in the Gal Almagor Insurance Dashboard.

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Life Insurance Processing](#life-insurance-processing)
3. [Elementary Insurance Processing](#elementary-insurance-processing)
4. [Key Differences Summary](#key-differences-summary)
5. [File Reference Table](#file-reference-table)

---

## Quick Overview

The backend processes two completely separate insurance types. Each has its own:
- Database tables
- Parsing logic
- Mapping configurations
- Aggregation formulas

| Aspect | Life Insurance | Elementary Insurance |
|--------|----------------|----------------------|
| **Raw Data Table** | `raw_data` | `raw_data_elementary` |
| **Aggregation Table** | `agent_aggregations` | `agent_aggregations_elementary` |
| **Categories** | Pension, Risk, Financial, Pension Transfer | Gross Premium (current + previous year) |
| **Companies Supported** | 14 companies | 14 companies |
| **Upload Type Parameter** | `life-insurance` | `elementary` |

---

# Life Insurance Processing

## Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LIFE INSURANCE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Upload Request
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /upload                                                                │
│  Body: { companyId, month, uploadType: "life-insurance" }                   │
│  File: Excel file (.xlsx or .xlsb)                                          │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 2: File Validation (Multer)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Validates file extension (.xlsx, .xlsb)                                  │
│  - Stores file in memory                                                    │
│  - Fetches company name from database using companyId                       │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 3: Excel Parsing
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Reads Excel file using xlsx.read()                                       │
│  - Extracts sheet data using sheet_to_json()                                │
│  - Gets column mapping based on company name                                │
│                                                                              │
│  📁 File: src/utils/excelParser.js                                          │
│  📁 File: src/config/companyMappings.js                                     │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 4: Get Company Mapping
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Loads the correct mapping file based on company:                           │
│                                                                              │
│  📁 src/config/ayalonMapping.js         → Ayalon                            │
│  📁 src/config/altshulerMapping.js      → Altshuler Shaham                  │
│  📁 src/config/analystMapping.js        → Analyst                           │
│  📁 src/config/hatchsharaMapping.js     → Hachshara                         │
│  📁 src/config/phoenixMapping.js        → Phoenix                           │
│  📁 src/config/harelMapping.js          → Harel                             │
│  📁 src/config/clalMapping.js           → Clal                              │
│  📁 src/config/migdalMapping.js         → Migdal                            │
│  📁 src/config/menorahMapping.js        → Menorah                           │
│  📁 src/config/morMapping.js            → Mor                               │
│  📁 src/config/medihoMapping.js         → Mediho                            │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 5: Data Transformation
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  parseExcelData() function performs:                                        │
│                                                                              │
│  1. Row Filtering                                                           │
│     - Skips empty rows                                                      │
│     - Skips header/summary rows (תפוקה, נטו, Total, סה"כ)                   │
│     - Company-specific filters                                              │
│                                                                              │
│  2. Agent Parsing                                                           │
│     - Extracts agent_name and agent_number                                  │
│     - Cleans parentheses patterns: (2020), (XXXX)                           │
│     - Handles special formats per company                                   │
│                                                                              │
│  3. Date Formatting                                                         │
│     - Converts Excel serial numbers → YYYY-MM-DD                            │
│     - Converts MM/YYYY → YYYY-MM-01                                         │
│                                                                              │
│  4. Output Parsing                                                          │
│     - Removes quotes and commas                                             │
│     - Parses as float, defaults to 0                                        │
│                                                                              │
│  📁 File: src/utils/excelParser.js                                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 6: Database Insertion
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Inserts parsed data into `raw_data` table                                │
│  - Uses batch insertion (1000 rows per batch)                               │
│  - If file is empty, inserts placeholder row with agent_number='NO_DATA'    │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
│  🗄️ Table: raw_data                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 7: Aggregation
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  aggregateAfterUpload(companyId, month) performs:                           │
│                                                                              │
│  1. Fetches all agents for this company from `agent_data` table             │
│  2. Collects all agent numbers (from company-specific ID columns)           │
│  3. Fetches raw data in batches of 1000                                     │
│  4. Processes data based on company type:                                   │
│                                                                              │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ SIMPLE           → Sum single column to one category            │     │
│     │ FILTER_BY_PRODUCT → Map product name to category, sum each      │     │
│     │ COLUMN_BASED      → Sum specific columns per category           │     │
│     │ MULTI_SHEET       → Different formulas for different sheets     │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  5. Calculates totals for: pension, risk, financial, pension_transfer       │
│  6. Upserts results into `agent_aggregations` table                         │
│                                                                              │
│  📁 File: src/services/aggregationService.js                                │
│  📁 File: src/config/productCategoryMappings.js                             │
│  🗄️ Table: agent_aggregations                                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 8: Response
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Returns:                                                                   │
│  {                                                                          │
│    success: true,                                                           │
│    message: "File processed successfully",                                  │
│    rowsInserted: 5432,                                                      │
│    agentsProcessed: 120                                                     │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Life Insurance Files Summary

| Step | File | Purpose |
|------|------|---------|
| 1-2 | `src/routes/uploadRoutes.js` | Handles upload request, validates file |
| 3-5 | `src/utils/excelParser.js` | Parses Excel, transforms data |
| 4 | `src/config/companyMappings.js` | Exports all company mappings |
| 4 | `src/config/[company]Mapping.js` | Individual company column mappings (11 files, 3 companies without mappings) |
| 7 | `src/services/aggregationService.js` | Aggregates raw data by agent |
| 7 | `src/config/productCategoryMappings.js` | Defines aggregation formulas per company |

---

## Life Insurance Companies (14)

| Company | Mapping File | Processing Type |
|---------|--------------|-----------------|
| Ayalon | `ayalonMapping.js` | FILTER_BY_PRODUCT |
| Altshuler Shaham | `altshulerMapping.js` | MULTI_SHEET_FORMULAS |
| Analyst | `analystMapping.js` | SIMPLE |
| Hachshara | `hatchsharaMapping.js` | COLUMN_BASED |
| Phoenix | `phoenixMapping.js` | FILTER_BY_PRODUCT |
| Harel | `harelMapping.js` | COLUMN_BASED |
| Clal | `clalMapping.js` | COLUMN_BASED |
| Migdal | `migdalMapping.js` | FILTER_BY_PRODUCT |
| Menorah | `menorahMapping.js` | FILTER_BY_PRODUCT |
| Mor | `morMapping.js` | SIMPLE |
| Mediho | `medihoMapping.js` | SIMPLE |
| Meitav | N/A (no mapping - no reports yet) | N/A |
| Infinity | N/A (no mapping - no reports yet) | N/A |
| Yalin Lapidot | N/A (no mapping - no reports yet) | N/A |

---

## Life Insurance Database Tables

**`raw_data`** - Stores every row from uploaded Excel files
```
┌────────────────┬──────────────────────────────────────────────────┐
│ Column         │ Description                                      │
├────────────────┼──────────────────────────────────────────────────┤
│ company_id     │ Insurance company ID                             │
│ month          │ Upload month (YYYY-MM)                           │
│ agent_name     │ Agent name extracted from Excel                  │
│ agent_number   │ Agent number/ID extracted from Excel             │
│ product        │ Product name                                     │
│ output         │ Output/premium amount                            │
│ ...            │ 50+ company-specific fields                      │
└────────────────┴──────────────────────────────────────────────────┘
```

**`agent_aggregations`** - Stores calculated totals per agent per month
```
┌──────────────────┬──────────────────────────────────────────────────┐
│ Column           │ Description                                      │
├──────────────────┼──────────────────────────────────────────────────┤
│ agent_id         │ Reference to agent_data table                    │
│ company_id       │ Insurance company ID                             │
│ month            │ Month (YYYY-MM)                                  │
│ pension          │ Total for pension category                       │
│ risk             │ Total for risk category                          │
│ financial        │ Total for financial category                     │
│ pension_transfer │ Total for pension transfer category              │
└──────────────────┴──────────────────────────────────────────────────┘
```

---

# Elementary Insurance Processing

## Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ELEMENTARY INSURANCE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: Upload Request
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /upload                                                                │
│  Body: { companyId, month, uploadType: "elementary" }                       │
│  File: Excel file (.xlsx or .xlsb)                                          │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 2: File Validation (Multer)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Validates file extension (.xlsx, .xlsb)                                  │
│  - Stores file in memory                                                    │
│  - Fetches company name from database using companyId                       │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 3: Get Elementary Mapping
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  getElementaryMapping(companyName) loads the correct mapping:               │
│                                                                              │
│  📁 src/config/ayalonElementaryMapping.js        → Ayalon                   │
│  📁 src/config/hachsharaElementaryMapping.js     → Hachshara                │
│  📁 src/config/phoenixElementaryMapping.js       → Phoenix                  │
│  📁 src/config/harelElementaryMapping.js         → Harel                    │
│  📁 src/config/clalElementaryMapping.js          → Clal                     │
│  📁 src/config/migdalElementaryMapping.js        → Migdal                   │
│  📁 src/config/mmsElementaryMapping.js           → M.M.S                    │
│  📁 src/config/menorahElementaryMapping.js       → Menorah                  │
│  📁 src/config/passportCardElementaryMapping.js  → Passport Card            │
│  📁 src/config/shomeraElementaryMapping.js       → Shomera                  │
│  📁 src/config/shirbitElementaryMapping.js       → Shirbit                  │
│  📁 src/config/shlomoElementaryMapping.js        → Shlomo                   │
│  📁 src/config/cooperNinevehElementaryMapping.js → Cooper Nineveh           │
│  📁 src/config/securitiesElementaryMapping.js    → Securities               │
│                                                                              │
│  📁 Router File: src/config/elementaryMappings.js                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 4: Determine Parsing Mode
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Each company mapping specifies a parseMode:                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STANDARD          │ One row = one agent                             │    │
│  │                   │ Companies: Ayalon, Harel, Menorah, Passport Card│    │
│  ├───────────────────┼─────────────────────────────────────────────────┤    │
│  │ AGENT_SUBTOTALS   │ Agent header row + multiple branch rows         │    │
│  │                   │ Companies: Hachshara, Phoenix, Shlomo           │    │
│  ├───────────────────┼─────────────────────────────────────────────────┤    │
│  │ POLICY_AGGREGATION│ Each row is a policy, grouped by agent          │    │
│  │                   │ Companies: Clal, Migdal, M.M.S, Shirbit         │    │
│  ├───────────────────┼─────────────────────────────────────────────────┤    │
│  │ THREE_ROW_GROUPS  │ 3 rows per agent (2024, 2025, change%)          │    │
│  │                   │ Companies: Shomera                              │    │
│  └───────────────────┴─────────────────────────────────────────────────┘    │
│                                                                              │
│  📁 File: src/utils/elementaryExcelParser.js                                │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 5: Excel Parsing by Mode
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  parseElementaryExcelData() processes based on mode:                        │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════     │
│  MODE: STANDARD                                                             │
│  ══════════════════════════════════════════════════════════════════════     │
│  For each row:                                                              │
│    1. Extract agent_name and agent_number                                   │
│    2. Parse current_gross_premium (this year)                               │
│    3. Parse previous_gross_premium (last year)                              │
│    4. Calculate changes = (current - previous) / previous                   │
│    5. Create database record                                                │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════     │
│  MODE: AGENT_SUBTOTALS                                                      │
│  ══════════════════════════════════════════════════════════════════════     │
│  Excel structure:                                                           │
│    Row 1: Agent header (agent name + number)                                │
│    Row 2: Branch 1 data                                                     │
│    Row 3: Branch 2 data                                                     │
│    Row 4: Subtotal (SKIPPED)                                                │
│    Row 5: Next agent header...                                              │
│                                                                              │
│  Processing:                                                                │
│    1. Detect agent header → store agent info                                │
│    2. Detect branch row → insert with current agent                         │
│    3. Detect subtotal row → skip, reset agent                               │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════     │
│  MODE: POLICY_AGGREGATION                                                   │
│  ══════════════════════════════════════════════════════════════════════     │
│  Each row is an individual policy:                                          │
│    1. Extract agent_number from policy row                                  │
│    2. Extract gross_premium amount                                          │
│    3. Insert each policy row separately                                     │
│    4. Aggregation service will group by agent later                         │
│                                                                              │
│  ══════════════════════════════════════════════════════════════════════     │
│  MODE: THREE_ROW_GROUPS                                                     │
│  ══════════════════════════════════════════════════════════════════════     │
│  Every 3 rows = 1 agent:                                                    │
│    Row 1: Agent name + 2024 premium                                         │
│    Row 2: 2025 premium                                                      │
│    Row 3: Change percentage                                                 │
│                                                                              │
│  Processing:                                                                │
│    1. Read row 1 → store agent + previous year                              │
│    2. Read row 2 → store current year                                       │
│    3. Read row 3 → extract change %                                         │
│    4. Insert combined record                                                │
│                                                                              │
│  📁 File: src/utils/elementaryExcelParser.js                                │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 6: Database Insertion
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Inserts parsed data into `raw_data_elementary` table                     │
│  - Uses batch insertion (1000 rows per batch)                               │
│  - If file is empty, inserts placeholder row                                │
│                                                                              │
│  📁 File: src/routes/uploadRoutes.js                                        │
│  🗄️ Table: raw_data_elementary                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 7: Aggregation
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  aggregateElementaryAfterUpload(companyId, month) performs:                 │
│                                                                              │
│  1. Fetches all agents for this company from `agent_data` table             │
│  2. Collects all agent numbers                                              │
│  3. Fetches raw elementary data in batches of 1000                          │
│  4. Aggregates by agent:                                                    │
│                                                                              │
│     agentTotals[agentNumber] = {                                            │
│       current_gross_premium: SUM of all rows,                               │
│       previous_gross_premium: SUM of all rows                               │
│     }                                                                        │
│                                                                              │
│  5. Calculates changes percentage:                                          │
│     changes = (current - previous) / previous                               │
│                                                                              │
│  6. Upserts results into `agent_aggregations_elementary` table              │
│                                                                              │
│  📁 File: src/services/elementaryAggregationService.js                      │
│  🗄️ Table: agent_aggregations_elementary                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
STEP 8: Response
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Returns:                                                                   │
│  {                                                                          │
│    success: true,                                                           │
│    message: "File processed successfully",                                  │
│    rowsInserted: 3200,                                                      │
│    agentsProcessed: 85                                                      │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Elementary Insurance Files Summary

| Step | File | Purpose |
|------|------|---------|
| 1-2 | `src/routes/uploadRoutes.js` | Handles upload request, validates file |
| 3 | `src/config/elementaryMappings.js` | Routes to correct company mapping |
| 3 | `src/config/[company]ElementaryMapping.js` | Individual company mappings (14 files) |
| 4-5 | `src/utils/elementaryExcelParser.js` | Parses Excel with 4 different modes |
| 7 | `src/services/elementaryAggregationService.js` | Aggregates raw data by agent |

---

## Elementary Insurance Companies (14)

| Company | Mapping File | Parsing Mode |
|---------|--------------|--------------|
| Ayalon | `ayalonElementaryMapping.js` | STANDARD |
| Hachshara | `hachsharaElementaryMapping.js` | AGENT_SUBTOTALS |
| Phoenix | `phoenixElementaryMapping.js` | AGENT_SUBTOTALS |
| Harel | `harelElementaryMapping.js` | STANDARD |
| Clal | `clalElementaryMapping.js` | POLICY_AGGREGATION |
| Migdal | `migdalElementaryMapping.js` | POLICY_AGGREGATION |
| M.M.S | `mmsElementaryMapping.js` | POLICY_AGGREGATION |
| Menorah | `menorahElementaryMapping.js` | STANDARD |
| Passport Card | `passportCardElementaryMapping.js` | STANDARD |
| Shomera | `shomeraElementaryMapping.js` | THREE_ROW_GROUPS |
| Shirbit | `shirbitElementaryMapping.js` | POLICY_AGGREGATION |
| Shlomo | `shlomoElementaryMapping.js` | AGENT_SUBTOTALS |
| Cooper Nineveh | `cooperNinevehElementaryMapping.js` | STANDARD |
| Securities | `securitiesElementaryMapping.js` | STANDARD |

---

## Elementary Insurance Database Tables

**`raw_data_elementary`** - Stores every row from uploaded Excel files
```
┌────────────────────────┬──────────────────────────────────────────────────┐
│ Column                 │ Description                                      │
├────────────────────────┼──────────────────────────────────────────────────┤
│ company_id             │ Insurance company ID                             │
│ month                  │ Upload month (YYYY-MM)                           │
│ agent_name             │ Agent name extracted from Excel                  │
│ agent_number           │ Agent number/ID extracted from Excel             │
│ current_gross_premium  │ This year's gross premium                        │
│ previous_gross_premium │ Last year's gross premium                        │
│ changes                │ Year-over-year change percentage                 │
└────────────────────────┴──────────────────────────────────────────────────┘
```

**`agent_aggregations_elementary`** - Stores calculated totals per agent per month
```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ Column                     │ Description                                  │
├────────────────────────────┼──────────────────────────────────────────────┤
│ agent_id                   │ Reference to agent_data table                │
│ company_id                 │ Insurance company ID                         │
│ month                      │ Month (YYYY-MM)                              │
│ gross_premium              │ Total current year premium                   │
│ previous_year_gross_premium│ Total previous year premium                  │
│ changes                    │ Growth percentage                            │
└────────────────────────────┴──────────────────────────────────────────────┘
```

---

# Key Differences Summary

## Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LIFE INSURANCE vs ELEMENTARY INSURANCE                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬─────────────────────────┬─────────────────────────────┐
│ Aspect              │ Life Insurance          │ Elementary Insurance        │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Upload Type         │ "life-insurance"        │ "elementary"                │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Parser File         │ excelParser.js          │ elementaryExcelParser.js    │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Mapping Router      │ companyMappings.js      │ elementaryMappings.js       │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Mapping Files       │ [company]Mapping.js     │ [company]ElementaryMapping  │
│                     │ (11 files, 3 companies  │ (14 files)                  │
│                     │  without mappings)      │                             │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Aggregation Service │ aggregationService.js   │ elementaryAggregation       │
│                     │                         │ Service.js                  │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Category Config     │ productCategory         │ (none - simpler structure)  │
│                     │ Mappings.js             │                             │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Raw Data Table      │ raw_data                │ raw_data_elementary         │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Aggregation Table   │ agent_aggregations      │ agent_aggregations_         │
│                     │                         │ elementary                  │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Output Categories   │ pension                 │ gross_premium               │
│                     │ risk                    │ previous_year_gross_premium │
│                     │ financial               │ changes (percentage)        │
│                     │ pension_transfer        │                             │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Parsing Modes       │ Single mode             │ 4 modes:                    │
│                     │ (company-specific       │ - STANDARD                  │
│                     │ column mapping)         │ - AGENT_SUBTOTALS           │
│                     │                         │ - POLICY_AGGREGATION        │
│                     │                         │ - THREE_ROW_GROUPS          │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Aggregation Types   │ 4 types:                │ Single type:                │
│                     │ - SIMPLE                │ Sum premiums by agent       │
│                     │ - FILTER_BY_PRODUCT     │                             │
│                     │ - COLUMN_BASED          │                             │
│                     │ - MULTI_SHEET_FORMULAS  │                             │
├─────────────────────┼─────────────────────────┼─────────────────────────────┤
│ Companies Supported │ 14                      │ 14                          │
└─────────────────────┴─────────────────────────┴─────────────────────────────┘
```

---

# File Reference Table

## All Backend Files for Excel Processing

### Core Upload & Route Files
| File | Purpose |
|------|---------|
| `src/routes/uploadRoutes.js` | Main upload endpoint, file validation, routing |
| `src/routes/aggregateRoutes.js` | API endpoints for fetching/updating aggregations |

### Life Insurance Files
| File | Purpose |
|------|---------|
| `src/utils/excelParser.js` | Parses life insurance Excel files |
| `src/config/companyMappings.js` | Exports all life insurance mappings |
| `src/config/ayalonMapping.js` | Ayalon column mapping |
| `src/config/altshulerMapping.js` | Altshuler Shaham column mapping |
| `src/config/analystMapping.js` | Analyst column mapping |
| `src/config/hatchsharaMapping.js` | Hachshara column mapping |
| `src/config/phoenixMapping.js` | Phoenix column mapping |
| `src/config/harelMapping.js` | Harel column mapping |
| `src/config/clalMapping.js` | Clal column mapping |
| `src/config/migdalMapping.js` | Migdal column mapping |
| `src/config/menorahMapping.js` | Menorah column mapping |
| `src/config/morMapping.js` | Mor column mapping |
| `src/config/medihoMapping.js` | Mediho column mapping |
| `src/config/productCategoryMappings.js` | Aggregation formulas & categories |
| `src/services/aggregationService.js` | Life insurance aggregation logic |

### Elementary Insurance Files
| File | Purpose |
|------|---------|
| `src/utils/elementaryExcelParser.js` | Parses elementary Excel files (4 modes) |
| `src/config/elementaryMappings.js` | Routes to correct elementary mapping |
| `src/config/ayalonElementaryMapping.js` | Ayalon elementary mapping |
| `src/config/hachsharaElementaryMapping.js` | Hachshara elementary mapping |
| `src/config/phoenixElementaryMapping.js` | Phoenix elementary mapping |
| `src/config/harelElementaryMapping.js` | Harel elementary mapping |
| `src/config/clalElementaryMapping.js` | Clal elementary mapping |
| `src/config/migdalElementaryMapping.js` | Migdal elementary mapping |
| `src/config/mmsElementaryMapping.js` | M.M.S elementary mapping |
| `src/config/menorahElementaryMapping.js` | Menorah elementary mapping |
| `src/config/passportCardElementaryMapping.js` | Passport Card elementary mapping |
| `src/config/shomeraElementaryMapping.js` | Shomera elementary mapping |
| `src/config/shirbitElementaryMapping.js` | Shirbit elementary mapping |
| `src/config/shlomoElementaryMapping.js` | Shlomo elementary mapping |
| `src/config/cooperNinevehElementaryMapping.js` | Cooper Nineveh elementary mapping |
| `src/config/securitiesElementaryMapping.js` | Securities elementary mapping |
| `src/services/elementaryAggregationService.js` | Elementary aggregation logic |

### Utility Files
| File | Purpose |
|------|---------|
| `src/utils/directAgentsProcessor.js` | Processes direct agent uploads with fuzzy matching |

---

*Last updated: January 2026*
