"""
Script to create Harel Life Insurance Logic PDF documentation
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Create PDF
doc = SimpleDocTemplate(
    "docs/Harel_Life_Insurance_Upload_Logic.pdf",
    pagesize=letter,
    rightMargin=72,
    leftMargin=72,
    topMargin=72,
    bottomMargin=72
)

styles = getSampleStyleSheet()
story = []

# Title
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Title'],
    fontSize=18,
    spaceAfter=30
)
story.append(Paragraph("Harel Life Insurance Upload Logic", title_style))
story.append(Spacer(1, 20))

# Section 1: Overview
story.append(Paragraph("1. Overview", styles['Heading1']))
story.append(Spacer(1, 10))
story.append(Paragraph(
    "This document describes the upload logic for Harel Life Insurance data in the system. "
    "The process involves mapping Excel columns to database fields, parsing agent data, and "
    "storing results in the raw_data table.",
    styles['Normal']
))
story.append(Spacer(1, 20))

# Section 2: Column Mapping
story.append(Paragraph("2. Column Mapping (harelMapping.js)", styles['Heading1']))
story.append(Spacer(1, 10))
story.append(Paragraph("The following Excel columns are mapped for Harel:", styles['Normal']))
story.append(Spacer(1, 10))

# Mapping table
mapping_data = [
    ['Field Name', 'Hebrew Column', 'Description'],
    ['agentName/agentNumber', '__EMPTY (Column A)', 'Agent name and number combined'],
    ['privateRisk', 'sikuni prat', 'Private Risk amount'],
    ['pensionHarel', 'pensioni', 'Pension amount'],
    ['savingsProductsNoFinancials', 'motzrei tzevira lelo finansim', 'Savings without financials'],
    ['pensionTransferNet', 'niyud pensia - neto', 'Pension Transfer Net amount'],
    ['nursingCareHarel', 'nesiot hol', 'Travel Abroad / Nursing Care'],
]

table = Table(mapping_data, colWidths=[2*inch, 2*inch, 2.5*inch])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(table)
story.append(Spacer(1, 20))

# Section 3: Data Parsing Logic
story.append(Paragraph("3. Data Parsing Logic (excelParser.js)", styles['Heading1']))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>3.1 Agent Name/Number Extraction</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "Harel Excel files contain agent name and number in a combined format in Column A. "
    "The format is: 'Agent Name - Agent Number' (e.g., 'Gal Almagor Agency - 85646'). "
    "The parser splits this using a regex pattern to extract both values.",
    styles['Normal']
))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>3.2 Header Row Detection</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "The parser skips header/sub-header rows by checking if numeric columns contain "
    "text like 'tfuka' (output) or 'neto' (net). Only actual data rows are processed.",
    styles['Normal']
))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>3.3 Summary Row Skip</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "Rows containing 'sah kol' (total) in the agent name field are skipped as these "
    "are summary rows, not individual agent data.",
    styles['Normal']
))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>3.4 Numeric Validation</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "The parser validates that numeric fields (privateRisk, pensionHarel, etc.) contain "
    "actual numbers. Rows where all numeric fields are non-parseable strings are skipped.",
    styles['Normal']
))
story.append(Spacer(1, 20))

# Section 4: Database Storage
story.append(Paragraph("4. Database Storage (uploadRoutes.js)", styles['Heading1']))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>4.1 Target Table</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "Life insurance uploads for Harel are stored in the 'raw_data' table.",
    styles['Normal']
))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>4.2 Batch Insertion</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "Large files are inserted in batches of 1000 rows to prevent timeout issues.",
    styles['Normal']
))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>4.3 Aggregation</b>", styles['Normal']))
story.append(Spacer(1, 5))
story.append(Paragraph(
    "After successful upload, the aggregation service is triggered to process "
    "and summarize the uploaded data.",
    styles['Normal']
))
story.append(Spacer(1, 20))

# Section 5: Harel-Specific Database Fields
story.append(Paragraph("5. Harel-Specific Database Fields", styles['Heading1']))
story.append(Spacer(1, 10))

fields_data = [
    ['Database Field', 'Source Column', 'Type'],
    ['private_risk', 'sikuni prat', 'Numeric'],
    ['pension_harel', 'pensioni', 'Numeric'],
    ['savings_products_no_financials', 'motzrei tzevira...', 'Numeric'],
    ['pension_transfer_net', 'niyud pensia - neto', 'Numeric'],
    ['nursing_care_harel', 'nesiot hol', 'Numeric'],
]

table2 = Table(fields_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
table2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
]))
story.append(table2)
story.append(Spacer(1, 20))

# Section 6: Files Reference
story.append(Paragraph("6. Source Files Reference", styles['Heading1']))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>harelMapping.js</b> - Column mapping configuration", styles['Normal']))
story.append(Paragraph("Location: gal-almagor-backend/src/config/harelMapping.js", styles['Normal']))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>excelParser.js</b> - Data parsing and transformation logic", styles['Normal']))
story.append(Paragraph("Location: gal-almagor-backend/src/utils/excelParser.js", styles['Normal']))
story.append(Spacer(1, 10))

story.append(Paragraph("<b>uploadRoutes.js</b> - Upload endpoint and database insertion", styles['Normal']))
story.append(Paragraph("Location: gal-almagor-backend/src/routes/uploadRoutes.js", styles['Normal']))

# Build PDF
doc.build(story)
print("PDF created successfully: docs/Harel_Life_Insurance_Upload_Logic.pdf")
