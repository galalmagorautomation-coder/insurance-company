/**
 * Script to create Harel Life Insurance Logic PDF documentation
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create PDF document
const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 72, bottom: 72, left: 72, right: 72 }
});

// Output file
const outputPath = path.join(__dirname, 'Harel_Life_Insurance_Upload_Logic.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Title
doc.fontSize(20).font('Helvetica-Bold')
   .text('Harel Life Insurance Upload Logic', { align: 'center' });
doc.moveDown(2);

// Section 1: Overview
doc.fontSize(14).font('Helvetica-Bold').text('1. Overview');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica')
   .text('This document describes the upload logic for Harel Life Insurance data in the system. The process involves mapping Excel columns to database fields, parsing agent data, and storing results in the raw_data table.', {
     align: 'justify'
   });
doc.moveDown(1.5);

// Section 2: Column Mapping
doc.fontSize(14).font('Helvetica-Bold').text('2. Column Mapping (harelMapping.js)');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica')
   .text('The following Excel columns are mapped for Harel:');
doc.moveDown(0.5);

// Mapping table data
const mappings = [
  { field: 'agentName/agentNumber', hebrew: '__EMPTY (Column A)', desc: 'Agent name and number combined' },
  { field: 'privateRisk', hebrew: 'סיכוני פרט', desc: 'Private Risk amount' },
  { field: 'pensionHarel', hebrew: 'פנסיוני', desc: 'Pension amount' },
  { field: 'savingsProductsNoFinancials', hebrew: 'מוצרי צבירה ללא פיננסים', desc: 'Savings without financials' },
  { field: 'pensionTransferNet', hebrew: 'ניוד פנסיה - נטו', desc: 'Pension Transfer Net' },
  { field: 'nursingCareHarel', hebrew: 'נסיעות חול', desc: 'Travel Abroad / Nursing Care' }
];

// Draw table
const tableTop = doc.y;
const col1X = 72;
const col2X = 220;
const col3X = 370;
const rowHeight = 25;

// Header row
doc.rect(col1X, tableTop, 468, rowHeight).fill('#666666');
doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
doc.text('Field Name', col1X + 5, tableTop + 7, { width: 140 });
doc.text('Hebrew Column', col2X + 5, tableTop + 7, { width: 140 });
doc.text('Description', col3X + 5, tableTop + 7, { width: 160 });

// Data rows
doc.fillColor('black').font('Helvetica').fontSize(9);
mappings.forEach((row, i) => {
  const y = tableTop + rowHeight + (i * rowHeight);
  doc.rect(col1X, y, 468, rowHeight).stroke();
  doc.text(row.field, col1X + 5, y + 7, { width: 140 });
  doc.text(row.hebrew, col2X + 5, y + 7, { width: 140 });
  doc.text(row.desc, col3X + 5, y + 7, { width: 160 });
});

doc.y = tableTop + rowHeight + (mappings.length * rowHeight) + 20;
doc.moveDown(1);

// Section 3: Data Parsing Logic
doc.fontSize(14).font('Helvetica-Bold').text('3. Data Parsing Logic (excelParser.js)');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('3.1 Agent Name/Number Extraction');
doc.fontSize(10).font('Helvetica')
   .text('Harel Excel files contain agent name and number in a combined format in Column A. The format is: "Agent Name - Agent Number" (e.g., "גל אלמגור-דאוד סוכנות - 85646"). The parser splits this using a regex pattern to extract both values.');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('3.2 Header Row Detection');
doc.fontSize(10).font('Helvetica')
   .text('The parser skips header/sub-header rows by checking if numeric columns contain text like "תפוקה" (output) or "נטו" (net). Only actual data rows are processed.');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('3.3 Summary Row Skip');
doc.fontSize(10).font('Helvetica')
   .text('Rows containing "סה״כ" (total) in the agent name field are skipped as these are summary rows, not individual agent data.');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('3.4 Numeric Validation');
doc.fontSize(10).font('Helvetica')
   .text('The parser validates that numeric fields (privateRisk, pensionHarel, etc.) contain actual numbers. Rows where all numeric fields are non-parseable strings are skipped.');
doc.moveDown(1.5);

// Section 4: Database Storage
doc.fontSize(14).font('Helvetica-Bold').text('4. Database Storage (uploadRoutes.js)');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('4.1 Target Table');
doc.fontSize(10).font('Helvetica')
   .text('Life insurance uploads for Harel are stored in the "raw_data" table.');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('4.2 Batch Insertion');
doc.fontSize(10).font('Helvetica')
   .text('Large files are inserted in batches of 1000 rows to prevent timeout issues.');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('4.3 Aggregation');
doc.fontSize(10).font('Helvetica')
   .text('After successful upload, the aggregation service is triggered to process and summarize the uploaded data.');
doc.moveDown(1.5);

// Section 5: Database Fields
doc.fontSize(14).font('Helvetica-Bold').text('5. Harel-Specific Database Fields');
doc.moveDown(0.5);

const dbFields = [
  { field: 'private_risk', source: 'סיכוני פרט', type: 'Numeric' },
  { field: 'pension_harel', source: 'פנסיוני', type: 'Numeric' },
  { field: 'savings_products_no_financials', source: 'מוצרי צבירה ללא פיננסים', type: 'Numeric' },
  { field: 'pension_transfer_net', source: 'ניוד פנסיה - נטו', type: 'Numeric' },
  { field: 'nursing_care_harel', source: 'נסיעות חול', type: 'Numeric' }
];

// Draw second table
const table2Top = doc.y;

// Header row
doc.rect(col1X, table2Top, 468, rowHeight).fill('#666666');
doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
doc.text('Database Field', col1X + 5, table2Top + 7, { width: 180 });
doc.text('Source Column', col2X + 5, table2Top + 7, { width: 150 });
doc.text('Type', col3X + 60, table2Top + 7, { width: 80 });

// Data rows
doc.fillColor('black').font('Helvetica').fontSize(9);
dbFields.forEach((row, i) => {
  const y = table2Top + rowHeight + (i * rowHeight);
  doc.rect(col1X, y, 468, rowHeight).stroke();
  doc.text(row.field, col1X + 5, y + 7, { width: 180 });
  doc.text(row.source, col2X + 5, y + 7, { width: 150 });
  doc.text(row.type, col3X + 60, y + 7, { width: 80 });
});

doc.y = table2Top + rowHeight + (dbFields.length * rowHeight) + 20;
doc.moveDown(1);

// Section 6: Files Reference
doc.fontSize(14).font('Helvetica-Bold').text('6. Source Files Reference');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('harelMapping.js');
doc.fontSize(10).font('Helvetica').text('Column mapping configuration');
doc.fontSize(9).fillColor('gray').text('Location: gal-almagor-backend/src/config/harelMapping.js');
doc.fillColor('black');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('excelParser.js');
doc.fontSize(10).font('Helvetica').text('Data parsing and transformation logic');
doc.fontSize(9).fillColor('gray').text('Location: gal-almagor-backend/src/utils/excelParser.js');
doc.fillColor('black');
doc.moveDown(0.5);

doc.fontSize(11).font('Helvetica-Bold').text('uploadRoutes.js');
doc.fontSize(10).font('Helvetica').text('Upload endpoint and database insertion');
doc.fontSize(9).fillColor('gray').text('Location: gal-almagor-backend/src/routes/uploadRoutes.js');

// Finalize PDF
doc.end();

console.log('PDF created successfully:', outputPath);
