const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../config/supabase');
const { parseExcelData } = require('../utils/excelParser');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const isExcel = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.mimetype === 'application/vnd.ms-excel' ||
                    file.originalname.endsWith('.xlsx') ||
                    file.originalname.endsWith('.xlsb');
    
    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xlsb) are allowed'), false);
    }
  }
});

// Upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { companyId, month } = req.body;

    console.log('Received companyId:', companyId);
    console.log('Received month:', month);
    console.log('File received:', req.file ? req.file.originalname : 'none');

    // Validation
    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Company ID is required' 
      });
    }

    if (!month) {
      return res.status(400).json({ 
        success: false, 
        message: 'Month is required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // ✅ NEW: Fetch company name from database
    console.log('Looking up company name for ID:', companyId);
    
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select('id, name')
      .eq('id', companyId)
      .single();

    console.log('Company lookup result:', { companyData, companyError });

    if (companyError || !companyData) {
      return res.status(400).json({
        success: false,
        message: `Company with ID "${companyId}" not found in database`
      });
    }

    const companyIdInt = parseInt(companyId);
    const companyName = companyData.name;

    console.log('Company found:', { id: companyIdInt, name: companyName });

    // Parse Excel file
    console.log('Parsing Excel file...');
    
    const workbook = xlsx.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    console.log('Sheets found:', workbook.SheetNames);
    
    // ✅ CHANGE: Use sheet index 1 (second sheet) for Mor company, otherwise use first sheet
    const sheetIndex = companyName === 'מור' ? 1 : 0;
    const sheetName = workbook.SheetNames[sheetIndex];
    
    console.log(`Using sheet: "${sheetName}" (index: ${sheetIndex})`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false
    });

    console.log('Rows parsed:', jsonData.length);

    if (jsonData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Excel file is empty'
      });
    }

    console.log(`Processing company "${companyName}" (ID: ${companyIdInt}) for month ${month}`);
    console.log('First row sample:', jsonData[0]);

    // ✅ CHANGED: Pass companyId, companyName, and month to parser
    const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month);

    console.log('Parse result success:', parseResult.success);
    console.log('Parse result errors:', parseResult.errors);
    console.log('Parse result data length:', parseResult.data.length);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Excel data',
        errors: parseResult.errors,
        summary: parseResult.summary
      });
    }

    if (parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found in Excel file',
        errors: parseResult.errors
      });
    }

    // Insert data to Supabase
    const { data, error } = await supabase
      .from('raw_data')
      .insert(parseResult.data)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to insert data to database',
        error: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'File uploaded and data inserted successfully',
      summary: {
        totalRowsInExcel: parseResult.summary.totalRows,
        rowsProcessed: parseResult.summary.rowsProcessed,
        rowsInserted: data.length,
        errorsCount: parseResult.summary.errorsCount
      },
      errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during upload',
      error: error.message 
    });
  }
});

module.exports = router;