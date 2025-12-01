const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../config/supabase');
const { parseExcelData } = require('../utils/excelParser');
const { aggregateAfterUpload } = require('../services/aggregationService');
const { aggregateElementaryAfterUpload } = require('../services/elementaryAggregationService');
const { getAltshulerMapping } = require('../config/companyMappings'); 
const { getClalMapping, CLAL_MAPPING_SET1 } = require('../config/companyMappings');
const { parseElementaryExcelData } = require('../utils/elementaryExcelParser');

const router = express.Router();

/**
 * Helper function to insert data in batches to avoid timeout
 * @param {Array} data - Data to insert
 * @param {string} tableName - Supabase table name
 * @param {number} batchSize - Number of rows per batch (default: 1000)
 * @returns {Promise<{success: boolean, totalInserted: number, error?: string}>}
 */
async function insertInBatches(data, tableName, batchSize = 1000) {
  let totalInserted = 0;
  const totalBatches = Math.ceil(data.length / batchSize);

  console.log(`Inserting ${data.length} rows in ${totalBatches} batches of ${batchSize}...`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`  Batch ${batchNumber}/${totalBatches}: Inserting ${batch.length} rows...`);

    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error in batch ${batchNumber}:`, error);
      return {
        success: false,
        totalInserted,
        error: `Batch ${batchNumber} failed: ${error.message}`
      };
    }

    totalInserted += insertedData.length;
    console.log(`  ✓ Batch ${batchNumber}/${totalBatches} completed (${totalInserted}/${data.length} total)`);
  }

  return {
    success: true,
    totalInserted
  };
}

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
    const { companyId, month, uploadType } = req.body;

    console.log('Received companyId:', companyId);
    console.log('Received month:', month);
    console.log('Received uploadType:', uploadType);
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

    // Validate uploadType
    if (!uploadType) {
      return res.status(400).json({
        success: false,
        message: 'Upload type is required'
      });
    }

    const validUploadTypes = ['life-insurance', 'elementary', 'commission'];
    if (!validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid upload type. Must be one of: ${validUploadTypes.join(', ')}`
      });
    }

    console.log(`Processing ${uploadType} upload...`);

   // ========================================
// ELEMENTARY UPLOAD PROCESSING
// ========================================
if (uploadType === 'elementary') {
  console.log('Processing Elementary upload...');

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
  console.log('Parsing Excel file for Elementary...');
  
  const workbook = xlsx.read(req.file.buffer, { 
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  
  console.log('Sheets found:', workbook.SheetNames);
  
  // ✅ SPECIAL HANDLING: Ayalon Elementary - specific tab
  if (companyName === 'איילון' || companyName === 'Ayalon') {
    console.log('Processing Ayalon Elementary with specific tab...');
    
    const targetTabName = 'אלמנטר - מכירות וחידושים סוכ';
    
    if (!workbook.SheetNames.includes(targetTabName)) {
      return res.status(400).json({
        success: false,
        message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
      });
    }
    
    const worksheet = workbook.Sheets[targetTabName];
    
    // Read from row 2 onwards (skip "פרמיה ברוטו" header in row 1)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: 1  // Start from row 2 (0-indexed, so 1 = row 2)
    });
    
    if (jsonData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Tab "${targetTabName}" is empty or has no valid data`
      });
    }
    
    console.log(`✓ Processing Ayalon Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
    console.log('First row sample:', jsonData[0]);
    
    // Parse the data
    const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
    
    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Ayalon Elementary data',
        errors: parseResult.errors
      });
    }
    
    console.log(`  Valid rows parsed: ${parseResult.data.length}`);
    
    // Insert data to raw_data_elementary table
    const { data, error } = await supabase
      .from('raw_data_elementary')
      .insert(parseResult.data)
      .select();
    
    if (error) {
      console.error('Error inserting Ayalon Elementary data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to insert data to database',
        error: error.message
      });
    }
    
    console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
    
    // Trigger elementary aggregation
    let aggregationResult = null;
    let aggregationError = null;

    try {
      console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
      aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
      console.log('Elementary aggregation completed successfully:', aggregationResult);
    } catch (aggError) {
      console.error('Elementary aggregation failed:', aggError);
      aggregationError = aggError.message;
    }
    
    // Return success response for Ayalon Elementary
    return res.json({
      success: true,
      message: `Successfully processed Ayalon Elementary data from tab "${targetTabName}"`,
      summary: {
        rowsInserted: data.length,
        tabProcessed: targetTabName,
        errorsCount: parseResult.errors.length,
        aggregation: aggregationResult ? {
          success: true,
          agentsProcessed: aggregationResult.agentsProcessed,
          rawDataRows: aggregationResult.rawDataRows,
          previousYearBackfilled: aggregationResult.previousYearBackfilled
        } : {
          success: false,
          error: aggregationError
        }
      },
      errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
    });
  }

  // ✅ SPECIAL HANDLING: Hachshara Elementary - 2 files, Sheet1, agent subtotals
  if (companyName === 'הכשרה' || companyName === 'Hachshara') {
    console.log('Processing Hachshara Elementary - Sheet1 with agent subtotals...');
    
    const targetTabName = 'Sheet1';
    
    if (!workbook.SheetNames.includes(targetTabName)) {
      return res.status(400).json({
        success: false,
        message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
      });
    }
    
    const worksheet = workbook.Sheets[targetTabName];
    
    // Read from row 2 onwards (skip row 1 header text)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: 1  // Start from row 2 (0-indexed, so 1 = row 2)
    });
    
    if (jsonData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Tab "${targetTabName}" is empty or has no valid data`
      });
    }
    
    console.log(`✓ Processing Hachshara Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
    console.log('First row sample:', jsonData[0]);
    
    // Parse the data (will use AGENT_SUBTOTALS mode)
    const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
    
    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Hachshara Elementary data',
        errors: parseResult.errors
      });
    }
    
    console.log(`  Valid agents parsed: ${parseResult.data.length}`);
    
    // Insert data to raw_data_elementary table
    const { data, error } = await supabase
      .from('raw_data_elementary')
      .insert(parseResult.data)
      .select();
    
    if (error) {
      console.error('Error inserting Hachshara Elementary data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to insert data to database',
        error: error.message
      });
    }
    
    console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
    
    // Trigger elementary aggregation
    let aggregationResult = null;
    let aggregationError = null;

    try {
      console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
      aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
      console.log('Elementary aggregation completed successfully:', aggregationResult);
    } catch (aggError) {
      console.error('Elementary aggregation failed:', aggError);
      aggregationError = aggError.message;
    }
    
    // Return success response for Hachshara Elementary
    return res.json({
      success: true,
      message: `Successfully processed Hachshara Elementary data from tab "${targetTabName}"`,
      summary: {
        rowsInserted: data.length,
        tabProcessed: targetTabName,
        errorsCount: parseResult.errors.length,
        aggregation: aggregationResult ? {
          success: true,
          agentsProcessed: aggregationResult.agentsProcessed,
          rawDataRows: aggregationResult.rawDataRows,
          previousYearBackfilled: aggregationResult.previousYearBackfilled
        } : {
          success: false,
          error: aggregationError
        }
      },
      errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
    });
  }

  // ✅ SPECIAL HANDLING: Phoenix Elementary - 1 file, Sheet1, agent subtotals
if (companyName === 'הפניקס' || companyName === 'The Phoenix') {
  console.log('Processing Phoenix Elementary - Sheet1 with agent subtotals...');
  
  const targetTabName = 'Sheet1';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read from row 2 onwards (skip row 1 header text)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    range: 1  // Start from row 2 (0-indexed, so 1 = row 2)
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Phoenix Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use AGENT_SUBTOTALS mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Phoenix Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid agents parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Phoenix Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Phoenix Elementary
  return res.json({
    success: true,
    message: `Successfully processed Phoenix Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Harel Elementary - 1 file, Sheet 1, direct agent rows
if (companyName === 'הראל' || companyName === 'Harel') {
  console.log('Processing Harel Elementary - Sheet 1 with direct agent data...');
  
  const targetTabName = 'Sheet 1';  // Note: with space
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Use numeric column indices (header: 1)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    header: 1  // Use numeric indices: 0, 1, 2, 3...
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Harel Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use standard mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Harel Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid agents parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Harel Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Harel Elementary
  return res.json({
    success: true,
    message: `Successfully processed Harel Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Clal Elementary - 1 file, excel.csv (1), policy aggregation
if (companyName === 'כלל' || companyName === 'Clal') {
  console.log('Processing Clal Elementary - excel.csv (1) with policy aggregation...');
  
  const targetTabName = 'excel.csv (1)';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will aggregate policies by agent)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Clal Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use POLICY_AGGREGATION mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Clal Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid agents aggregated: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Clal Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Clal Elementary
  return res.json({
    success: true,
    message: `Successfully processed Clal Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      policiesProcessed: parseResult.summary.totalRows,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Migdal Elementary - 1 file, דוח תפוקה חדש, policy-level data
if (companyName === 'מגדל' || companyName === 'Migdal') {
  console.log('Processing Migdal Elementary - דוח תפוקה חדש with policy-level data...');
  
  const targetTabName = 'דוח תפוקה חדש';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Migdal Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use POLICY_AGGREGATION mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Migdal Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid policies parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Migdal Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Migdal Elementary
  return res.json({
    success: true,
    message: `Successfully processed Migdal Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      policiesProcessed: parseResult.summary.totalRows,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}
  // ✅ SPECIAL HANDLING: M.M.S Elementary - 1 file, Memci_* sheet, policy-level data
if (companyName === 'מ.מ.ס' || companyName === 'M.M.S' || companyName === 'MMS') {
  console.log('Processing M.M.S Elementary - Memci sheet with policy-level data...');
  
  // Find sheet that starts with "Memci_"
  const targetTabName = workbook.SheetNames.find(name => name.startsWith('Memci_'));
  
  if (!targetTabName) {
    return res.status(400).json({
      success: false,
      message: `No sheet starting with "Memci_" found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing M.M.S Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use POLICY_AGGREGATION mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse M.M.S Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid policies parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting M.M.S Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for M.M.S Elementary
  return res.json({
    success: true,
    message: `Successfully processed M.M.S Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      policiesProcessed: parseResult.summary.totalRows,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Menorah Elementary - File 1 only, Sheet1, agent-level data
if (companyName === 'מנורה' || companyName === 'Menorah') {
  console.log('Processing Menorah Elementary - Sheet1 with agent-level data...');
  
  const targetTabName = 'Sheet1';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Use numeric indices (header: 1)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    header: 1  // Use numeric indices: 0, 1, 2, 3...
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Menorah Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use standard mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Menorah Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid agents parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Menorah Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Menorah Elementary
  return res.json({
    success: true,
    message: `Successfully processed Menorah Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Passport Elementary - 1 file, Premium tab, policy-level data
if (companyName === 'פספורט' || companyName === 'Passport') {
  console.log('Processing Passport Elementary - Premium tab with policy-level data...');
  
  const targetTabName = 'Premium';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Passport Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use POLICY_AGGREGATION mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Passport Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid policies parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Passport Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Passport Elementary
  return res.json({
    success: true,
    message: `Successfully processed Passport Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      policiesProcessed: parseResult.summary.totalRows,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Shomera Elementary - 1 file, גיליון1, 3-row groups
if (companyName === 'שומרה' || companyName === 'Shomera') {
  console.log('Processing Shomera Elementary - גיליון1 with 3-row groups...');
  
  const targetTabName = 'גיליון1';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Use numeric indices (header: 1)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    header: 1  // Use numeric indices: 0, 1, 2, 3...
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Shomera Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use THREE_ROW_GROUPS mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Shomera Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid agents parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Shomera Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Shomera Elementary
  return res.json({
    success: true,
    message: `Successfully processed Shomera Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Shirbit Elementary - 1 file, דוח פרודוקציית סוכנים מפורט, policy-level data
if (companyName === 'שירביט' || companyName === 'Shirbit') {
  console.log('Processing Shirbit Elementary - דוח פרודוקציית סוכנים מפורט with policy-level data...');
  
  const targetTabName = 'דוח פרודוקציית סוכנים מפורט';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Shirbit Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use POLICY_AGGREGATION mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Shirbit Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid policies parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Shirbit Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Shirbit Elementary
  return res.json({
    success: true,
    message: `Successfully processed Shirbit Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      policiesProcessed: parseResult.summary.totalRows,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}

// ✅ SPECIAL HANDLING: Shlomo Elementary - 1 file, Sheet1, agent subtotals
if (companyName === 'שלמה' || companyName === 'Shlomo') {
  console.log('Processing Shlomo Elementary - Sheet1 with agent subtotals...');
  
  const targetTabName = 'Sheet1';
  
  if (!workbook.SheetNames.includes(targetTabName)) {
    return res.status(400).json({
      success: false,
      message: `Required tab "${targetTabName}" not found. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Use numeric indices (header: 1)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    header: 1  // Use numeric indices: 0, 1, 2, 3...
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Shlomo Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  
  // Parse the data (will use AGENT_SUBTOTALS mode)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Shlomo Elementary data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid branch rows parsed: ${parseResult.data.length}`);
  
  // Insert data to raw_data_elementary table
  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Shlomo Elementary data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows into raw_data_elementary`);
  
  // Trigger elementary aggregation
  let aggregationResult = null;
  let aggregationError = null;

  try {
    console.log(`Triggering elementary aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateElementaryAfterUpload(companyIdInt, month);
    console.log('Elementary aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Elementary aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Shlomo Elementary
  return res.json({
    success: true,
    message: `Successfully processed Shlomo Elementary data from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      errorsCount: parseResult.errors.length,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows,
        previousYearBackfilled: aggregationResult.previousYearBackfilled
      } : {
        success: false,
        error: aggregationError
      }
    },
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined
  });
}
  // TODO: Add other elementary company handlers here
  
  // Default: Not implemented for this company
  return res.status(501).json({
    success: false,
    message: `Elementary upload for company "${companyName}" is not yet implemented.`
  });
}

    if (uploadType === 'commission') {
      return res.status(501).json({
        success: false,
        message: 'Commission upload processing is not yet implemented.',
        hint: 'Commission table and processing logic need to be set up.'
      });
    }

    // ========================================
    // LIFE INSURANCE UPLOAD PROCESSING
    // ========================================
    if (uploadType !== 'life-insurance') {
      return res.status(400).json({
        success: false,
        message: 'Unknown upload type'
      });
    }

    console.log('Processing Life Insurance upload...');

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
    
    // ✅ SPECIAL HANDLING: Process multiple tabs for Altshuler
if (companyName === 'אלטשולר שחם' || companyName === 'Altshuler Shaham') {
      console.log('Processing Altshuler file with multiple tabs...');
      
      let totalRowsInserted = 0;
      const allErrors = [];
      let totalRowsProcessed = 0;
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        console.log(`\n--- Processing sheet: "${sheetName}" ---`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, {
          defval: null,
          blankrows: false
        });
        
        if (jsonData.length === 0) {
          console.log(`Sheet "${sheetName}" is empty, skipping...`);
          continue;
        }
        
        // Check if this sheet has recognizable Altshuler columns
        const columns = Object.keys(jsonData[0]);
        const detectedMapping = getAltshulerMapping(columns);
        
        // Validate if this sheet matches any Altshuler signature
        const hasValidSignature = detectedMapping.signatureColumns.some(col => columns.includes(col));
        
        if (!hasValidSignature) {
          console.log(`Sheet "${sheetName}" doesn't match Altshuler signature, skipping...`);
          continue;
        }
        
        console.log(`✓ Sheet "${sheetName}" matched: ${detectedMapping.description}`);
        console.log(`  Rows in sheet: ${jsonData.length}`);
        
        // Parse the data
        const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month, detectedMapping);
        
        if (!parseResult.success || parseResult.data.length === 0) {
          console.warn(`Sheet "${sheetName}" produced no valid data`);
          allErrors.push(...parseResult.errors);
          continue;
        }
        
        console.log(`  Valid rows parsed: ${parseResult.data.length}`);
        
        // Insert data from this sheet
        const { data, error } = await supabase
          .from('raw_data')
          .insert(parseResult.data)
          .select();
        
        if (error) {
          console.error(`Error inserting data from sheet "${sheetName}":`, error);
          allErrors.push(`Sheet ${sheetName}: ${error.message}`);
          continue;
        }
        
        console.log(`✓ Successfully inserted ${data.length} rows from sheet "${sheetName}"`);
        totalRowsInserted += data.length;
        totalRowsProcessed += parseResult.data.length;
      }
      
      if (totalRowsInserted === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid data found in any sheet',
          errors: allErrors
        });
      }
      
      console.log(`\n=== Altshuler Upload Summary ===`);
      console.log(`Total sheets processed: ${workbook.SheetNames.length}`);
      console.log(`Total rows inserted: ${totalRowsInserted}`);
      
      // Trigger aggregation
      let aggregationResult = null;
      let aggregationError = null;
      
      try {
        console.log(`Triggering aggregation for company ${companyIdInt}, month ${month}...`);
        aggregationResult = await aggregateAfterUpload(companyIdInt, month);
        console.log('Aggregation completed successfully:', aggregationResult);
      } catch (aggError) {
        console.error('Aggregation failed:', aggError);
        aggregationError = aggError.message;
      }
      
      // Return success response for Altshuler
      return res.json({
        success: true,
        message: `Successfully processed ${workbook.SheetNames.length} sheets from Altshuler file`,
        summary: {
          totalSheetsProcessed: workbook.SheetNames.length,
          rowsInserted: totalRowsInserted,
          errorsCount: allErrors.length,
          aggregation: aggregationResult ? {
            success: true,
            agentsProcessed: aggregationResult.agentsProcessed,
            rawDataRows: aggregationResult.rawDataRows
          } : {
            success: false,
            error: aggregationError
          }
        },
        errors: allErrors.length > 0 ? allErrors : undefined
      });
    }

   // ✅ SPECIAL HANDLING: Process 3 files for Clal with specific tabs
if (companyName === 'כלל' || companyName === 'Clal') {
  console.log('Processing Clal file with specific tab selection');
  
  // Define expected tab names for each set
  const expectedTabs = {
    'רמת עוסק מורשה': { set: 'Set 1', headerRow: 4 },  // Header at row 4
    'גיליון1': { set: 'Set 2', headerRow: 1 },           // Header at row 1
    'פיננסים-סוכן': { set: 'Set 3', headerRow: 4 }      // Header at row 4
  };
  
  // Try to detect mapping by checking each sheet
  let detectedMapping = null;
  let targetTabName = null;
  let headerRowIndex = 0;
  
  // First, check if any of the expected tabs exist
  for (const [tabName, config] of Object.entries(expectedTabs)) {
    if (workbook.SheetNames.includes(tabName)) {
      targetTabName = tabName;
      headerRowIndex = config.headerRow - 1; // Convert to 0-based index
      console.log(`✓ Found expected tab "${tabName}" for ${config.set}, header at row ${config.headerRow}`);
      
      // Read this sheet with specific header row
      const worksheet = workbook.Sheets[tabName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false,
        range: headerRowIndex  // Start from the header row
      });
      
      if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0]);
        console.log('Detected columns:', columns.slice(0, 5));
        
        // Verify we have valid Hebrew headers
        if (!columns[0].includes('__EMPTY')) {
          detectedMapping = getClalMapping(columns);
          console.log(`✓ Confirmed mapping: ${detectedMapping.description}`);
          break;
        } else {
          console.log('Still got __EMPTY columns, trying next row...');
          // Try one more row down
          const jsonData2 = xlsx.utils.sheet_to_json(worksheet, {
            defval: null,
            blankrows: false,
            range: headerRowIndex + 1
          });
          
          if (jsonData2.length > 0) {
            const columns2 = Object.keys(jsonData2[0]);
            if (!columns2[0].includes('__EMPTY')) {
              detectedMapping = getClalMapping(columns2);
              headerRowIndex = headerRowIndex + 1;
              console.log(`✓ Found headers at row ${headerRowIndex + 1}: ${detectedMapping.description}`);
              break;
            }
          }
        }
      }
    }
  }
  
  if (!targetTabName || !detectedMapping) {
    return res.status(400).json({
      success: false,
      message: `Unable to find valid Clal data sheet. Available tabs: ${workbook.SheetNames.join(', ')}`
    });
  }
  
  console.log(`Available tabs: ${workbook.SheetNames.join(', ')}`);
  console.log(`Processing tab: "${targetTabName}" starting from row ${headerRowIndex + 1}`);
  
  // Read the target sheet with correct header row
  const worksheet = workbook.Sheets[targetTabName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    range: headerRowIndex
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First data row sample:', JSON.stringify(jsonData[0]).substring(0, 200));
  
  // Parse the data
  const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month, detectedMapping);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Clal data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid rows parsed: ${parseResult.data.length}`);
  
  // Insert data
  const { data, error } = await supabase
    .from('raw_data')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Clal data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows from tab "${targetTabName}"`);
  
  // Trigger aggregation
  let aggregationResult = null;
  let aggregationError = null;
  
  try {
    console.log(`Triggering aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateAfterUpload(companyIdInt, month);
    console.log('Aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Clal
  return res.json({
    success: true,
    message: `Successfully processed Clal ${detectedMapping.description} from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      mappingUsed: detectedMapping.description,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows
      } : {
        success: false,
        error: aggregationError
      }
    }
  });
}


// ✅ SPECIAL HANDLING: Process Hachshara Risk file - use "מסודר" tab only
if ((companyName === 'הכשרה' || companyName === 'Hachshara') && workbook.SheetNames.includes('מסודר')) {
  console.log('Processing Hachshara Risk file - using "מסודר" tab only');
  
  const targetTabName = 'מסודר';
  const worksheet = workbook.Sheets[targetTabName];
  
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Tab "${targetTabName}" is empty or has no valid data`
    });
  }
  
  console.log(`✓ Processing Hachshara Risk tab "${targetTabName}" with ${jsonData.length} rows`);
  
  // Parse the data
  const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Hachshara Risk data',
      errors: parseResult.errors
    });
  }
  
  console.log(`  Valid rows parsed: ${parseResult.data.length}`);
  
  // Insert data
  const { data, error } = await supabase
    .from('raw_data')
    .insert(parseResult.data)
    .select();
  
  if (error) {
    console.error('Error inserting Hachshara Risk data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }
  
  console.log(`✓ Successfully inserted ${data.length} rows from Hachshara Risk file`);
  
  // Trigger aggregation
  let aggregationResult = null;
  let aggregationError = null;
  
  try {
    console.log(`Triggering aggregation for company ${companyIdInt}, month ${month}...`);
    aggregationResult = await aggregateAfterUpload(companyIdInt, month);
    console.log('Aggregation completed successfully:', aggregationResult);
  } catch (aggError) {
    console.error('Aggregation failed:', aggError);
    aggregationError = aggError.message;
  }
  
  // Return success response for Hachshara Risk
  return res.json({
    success: true,
    message: `Successfully processed Hachshara Risk file from tab "${targetTabName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: targetTabName,
      aggregation: aggregationResult ? {
        success: true,
        agentsProcessed: aggregationResult.agentsProcessed,
        rawDataRows: aggregationResult.rawDataRows
      } : {
        success: false,
        error: aggregationError
      }
    }
  });
}
    
    // ✅ STANDARD SINGLE-SHEET PROCESSING (for all other companies)
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

    // Insert data to Supabase in batches to avoid timeout
    const batchResult = await insertInBatches(parseResult.data, 'raw_data', 1000);

    if (!batchResult.success) {
      console.error('Batch insert error:', batchResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to insert data to database',
        error: batchResult.error
      });
    }

    console.log(`Successfully inserted ${batchResult.totalInserted} rows into raw_data`);

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
        rowsInserted: batchResult.totalInserted,
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

// GET endpoint - Fetch all distinct company/month records filtered by upload type
router.get('/records', async (req, res) => {
  try {
    const { uploadType } = req.query;

    // Validate uploadType parameter
    const validUploadTypes = ['life-insurance', 'elementary', 'commission'];
    if (!uploadType || !validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing uploadType. Must be one of: ${validUploadTypes.join(', ')}`
      });
    }

    console.log(`Fetching distinct records for uploadType: ${uploadType}`);

    // Determine which RPC function to call based on uploadType
    let rpcFunctionName;
    if (uploadType === 'life-insurance') {
      rpcFunctionName = 'get_distinct_records';
    } else if (uploadType === 'elementary') {
      rpcFunctionName = 'get_distinct_elementary_records';
    } else if (uploadType === 'commission') {
      // TODO: Add commission RPC function when implemented
      return res.status(501).json({
        success: false,
        message: 'Commission records are not yet implemented'
      });
    }

    // Call the appropriate RPC function to get distinct records
    const { data: uniqueRecords, error: rpcError } = await supabase
      .rpc(rpcFunctionName);

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
      count: recordsWithNames.length,
      uploadType: uploadType
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

// DELETE endpoint - Delete records for specific company/month and upload type
router.delete('/records', async (req, res) => {
  try {
    const { company_id, month, uploadType } = req.body;

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

    // Validate uploadType parameter
    const validUploadTypes = ['life-insurance', 'elementary', 'commission'];
    if (!uploadType || !validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing uploadType. Must be one of: ${validUploadTypes.join(', ')}`
      });
    }

    console.log(`Deleting records for company ${company_id}, month ${month}, uploadType ${uploadType}`);

    // Determine which tables to delete from based on uploadType
    let rawDataTable, aggregationTable;

    if (uploadType === 'life-insurance') {
      rawDataTable = 'raw_data';
      aggregationTable = 'agent_aggregations';
    } else if (uploadType === 'elementary') {
      rawDataTable = 'raw_data_elementary';
      aggregationTable = 'agent_aggregations_elementary';
    } else if (uploadType === 'commission') {
      // TODO: Add commission tables when implemented
      return res.status(501).json({
        success: false,
        message: 'Commission deletion is not yet implemented'
      });
    }

    // Delete from raw data table
    const { error: rawDataError, count: rawDataCount } = await supabase
      .from(rawDataTable)
      .delete({ count: 'exact' })
      .eq('company_id', company_id)
      .eq('month', month);

    if (rawDataError) {
      console.error(`Error deleting from ${rawDataTable}:`, rawDataError);
      return res.status(500).json({
        success: false,
        message: `Failed to delete ${rawDataTable} records`,
        error: rawDataError.message
      });
    }

    // Delete from aggregations table
    const { error: aggregationsError, count: aggregationsCount } = await supabase
      .from(aggregationTable)
      .delete({ count: 'exact' })
      .eq('company_id', company_id)
      .eq('month', month);

    if (aggregationsError) {
      console.error(`Error deleting from ${aggregationTable}:`, aggregationsError);
      return res.status(500).json({
        success: false,
        message: `Failed to delete ${aggregationTable} records`,
        error: aggregationsError.message
      });
    }

    console.log(`Successfully deleted ${rawDataCount} ${rawDataTable} rows and ${aggregationsCount} ${aggregationTable} rows`);

    res.json({
      success: true,
      message: 'Records deleted successfully',
      summary: {
        rawDataDeleted: rawDataCount || 0,
        aggregationsDeleted: aggregationsCount || 0,
        uploadType: uploadType
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