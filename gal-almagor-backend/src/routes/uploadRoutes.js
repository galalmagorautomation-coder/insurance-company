const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../config/supabase');
const { parseExcelData } = require('../utils/excelParser');
const { aggregateAfterUpload } = require('../services/aggregationService');

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

    // Fetch company name from database
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
    
    // Use sheet index 1 (second sheet) for Mor company, otherwise use first sheet
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

    // Pass companyId, companyName, and month to parser
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

    console.log(`Successfully inserted ${data.length} rows into raw_data`);

    // ========================================
    // TRIGGER AGGREGATION AFTER UPLOAD
    // ========================================
    let aggregationResult = null;
    let aggregationError = null;

    try {
      console.log(`Triggering aggregation for company ${companyIdInt}, month ${month}...`);
      aggregationResult = await aggregateAfterUpload(companyIdInt, month);
      console.log('Aggregation completed successfully:', aggregationResult);
    } catch (aggError) {
      // Log error but don't fail the upload
      console.error('Aggregation failed (raw data upload was successful):', aggError);
      aggregationError = aggError.message;
    }

    // Send response with both upload and aggregation results
    res.json({ 
      success: true, 
      message: 'File uploaded and data processed successfully',
      summary: {
        totalRowsInExcel: parseResult.summary.totalRows,
        rowsProcessed: parseResult.summary.rowsProcessed,
        rowsInserted: data.length,
        errorsCount: parseResult.summary.errorsCount,
        aggregation: aggregationResult ? {
          success: true,
          agentsProcessed: aggregationResult.agentsProcessed,
          rawDataRows: aggregationResult.rawDataRows
        } : {
          success: false,
          error: aggregationError
        }
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

// GET endpoint - Fetch all distinct company/month records
router.get('/records', async (req, res) => {
  try {
    const { data: uniqueRecords, error: rpcError } = await supabase
      .rpc('get_distinct_records');

    console.log('Unique records fetched:', uniqueRecords?.length);

    if (rpcError) {
      console.error('Error fetching distinct records:', rpcError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch records',
        error: rpcError.message
      });
    }

    const recordsWithNames = await Promise.all(
      uniqueRecords.map(async (record) => {
        const { data: companyData, error: companyError } = await supabase
          .from('company')
          .select('name, name_en')
          .eq('id', record.company_id)
          .single();

        if (companyError) {
          console.warn(`Company lookup failed for ID ${record.company_id}:`, companyError.message);
        }

        return {
          company_id: record.company_id,
          month: record.month,
          company_name: companyData?.name || 'Unknown',
          company_name_en: companyData?.name_en || 'Unknown',
          row_count: record.row_count
        };
      })
    );

    recordsWithNames.sort((a, b) => {
      const monthCompare = b.month.localeCompare(a.month);
      if (monthCompare !== 0) return monthCompare;
      return a.company_name.localeCompare(b.company_name);
    });

    res.json({
      success: true,
      data: recordsWithNames,
      count: recordsWithNames.length
    });

  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching records',
      error: error.message
    });
  }
});

// DELETE endpoint - Delete records for specific company/month
router.delete('/records', async (req, res) => {
  try {
    const { company_id, month } = req.body;

    // Validation
    if (!company_id) {
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

    console.log(`Deleting records for company ${company_id}, month ${month}`);

    // Delete from raw_data
    const { error: rawDataError, count: rawDataCount } = await supabase
      .from('raw_data')
      .delete({ count: 'exact' })
      .eq('company_id', company_id)
      .eq('month', month);

    if (rawDataError) {
      console.error('Error deleting from raw_data:', rawDataError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete raw_data records',
        error: rawDataError.message
      });
    }

    // Delete from agent_aggregations
    const { error: aggregationsError, count: aggregationsCount } = await supabase
      .from('agent_aggregations')
      .delete({ count: 'exact' })
      .eq('company_id', company_id)
      .eq('month', month);

    if (aggregationsError) {
      console.error('Error deleting from agent_aggregations:', aggregationsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete aggregation records',
        error: aggregationsError.message
      });
    }

    console.log(`Successfully deleted ${rawDataCount} raw_data rows and ${aggregationsCount} aggregation rows`);

    res.json({
      success: true,
      message: 'Records deleted successfully',
      summary: {
        rawDataDeleted: rawDataCount || 0,
        aggregationsDeleted: aggregationsCount || 0
      }
    });

  } catch (error) {
    console.error('Error deleting records:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting records',
      error: error.message
    });
  }
});

module.exports = router;