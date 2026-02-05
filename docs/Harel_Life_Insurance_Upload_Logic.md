# Harel Life Insurance Upload Logic

## 1. Overview

This document describes the upload logic for Harel Life Insurance data in the system. The process involves mapping Excel columns to database fields, parsing agent data, and storing results in the raw_data table.

---

## 2. Column Mapping (harelMapping.js)

The following Excel columns are mapped for Harel:

| Field Name | Hebrew Column | Description |
|------------|---------------|-------------|
| agentName/agentNumber | `__EMPTY` (Column A) | Agent name and number combined |
| privateRisk | סיכוני פרט | Private Risk amount |
| pensionHarel | פנסיוני | Pension amount |
| savingsProductsNoFinancials | מוצרי צבירה ללא פיננסים | Savings without financials |
| pensionTransferNet | ניוד פנסיה - נטו | Pension Transfer Net |
| nursingCareHarel | נסיעות חול | Travel Abroad / Nursing Care |

---

## 3. Data Parsing Logic (excelParser.js)

### 3.1 Agent Name/Number Extraction

Harel Excel files contain agent name and number in a combined format in Column A. The format is:

```
"Agent Name - Agent Number"
```

Example: `גל אלמגור-דאוד סוכנות - 85646`

The parser splits this using a regex pattern to extract both values:
- **agentName**: `גל אלמגור-דאוד סוכנות`
- **agentNumber**: `85646`

### 3.2 Header Row Detection

The parser skips header/sub-header rows by checking if numeric columns contain text like:
- `תפוקה` (output)
- `נטו` (net)

Only actual data rows are processed.

### 3.3 Summary Row Skip

Rows containing `סה"כ` (total) in the agent name field are skipped as these are summary rows, not individual agent data.

### 3.4 Numeric Validation

The parser validates that numeric fields (privateRisk, pensionHarel, etc.) contain actual numbers. Rows where all numeric fields are non-parseable strings are skipped.

---

## 4. Database Storage (uploadRoutes.js)

### 4.1 Target Table

Life insurance uploads for Harel are stored in the `raw_data` table.

### 4.2 Batch Insertion

Large files are inserted in batches of 1000 rows to prevent timeout issues.

### 4.3 Aggregation

After successful upload, the aggregation service is triggered to process and summarize the uploaded data.

---

## 5. Harel-Specific Database Fields

| Database Field | Source Column | Type |
|----------------|---------------|------|
| private_risk | סיכוני פרט | Numeric |
| pension_harel | פנסיוני | Numeric |
| savings_products_no_financials | מוצרי צבירה ללא פיננסים | Numeric |
| pension_transfer_net | ניוד פנסיה - נטו | Numeric |
| nursing_care_harel | נסיעות חול | Numeric |

---

## 6. Source Files Reference

### harelMapping.js
Column mapping configuration
`gal-almagor-backend/src/config/harelMapping.js`

### excelParser.js
Data parsing and transformation logic
`gal-almagor-backend/src/utils/excelParser.js`

### uploadRoutes.js
Upload endpoint and database insertion
`gal-almagor-backend/src/routes/uploadRoutes.js`
