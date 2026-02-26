const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../config/supabase');
const { parseExcelData } = require('../utils/excelParser');
const { aggregateAfterUpload } = require('../services/aggregationService');
const { aggregateElementaryAfterUpload } = require('../services/elementaryAggregationService');
const { getAltshulerMapping } = require('../config/companyMappings');
const { getClalMapping, CLAL_MAPPING_SET1 } = require('../config/companyMappings');
const { getMeitavMapping } = require('../config/companyMappings');
const { getHachsharaMapping } = require('../config/companyMappings');
const { parseElementaryExcelData } = require('../utils/elementaryExcelParser');

const router = express.Router();

/**
 * Helper function to insert placeholder row for empty elementary files
 * @param {number} companyId - Company ID
 * @param {string} month - Month in YYYY-MM format
 * @param {string} tabName - Tab name processed
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function insertEmptyElementaryPlaceholder(companyId, month, tabName) {
  console.log(`Tab "${tabName}" is empty - inserting placeholder row for tracking`);

  const placeholderRow = {
    company_id: companyId,
    month: month,
    agent_number: 'NO_DATA',
    agent_name: 'No Data - Empty File',
    current_gross_premium: 0,
    previous_gross_premium: 0,
    changes: 0
  };

  const { data, error } = await supabase
    .from('raw_data_elementary')
    .insert([placeholderRow])
    .select();

  return { success: !error, data, error };
}

/**
 * Helper function to insert placeholder row for empty life insurance files
 * @param {number} companyId - Company ID
 * @param {string} month - Month in YYYY-MM format
 * @param {string} tabName - Tab name processed
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function insertEmptyLifeInsurancePlaceholder(companyId, month, tabName) {
  console.log(`Tab "${tabName}" is empty - inserting placeholder row for tracking`);

  const placeholderRow = {
    company_id: companyId,
    month: month,
    agent_number: 'NO_DATA',
    agent_name: 'No Data - Empty File',
    policy_number: 'NO_DATA',
    product: 'No Data',
    output: 0
  };

  const { data, error } = await supabase
    .from('raw_data')
    .insert([placeholderRow])
    .select();

  return { success: !error, data, error };
}

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
  
  //  SPECIAL HANDLING: Ayalon Elementary - specific tab
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
    
    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        console.error('Error inserting placeholder row:', result.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      console.log('✓ Placeholder row inserted for empty file');

      return res.json({
        success: true,
        message: `Empty file uploaded for Ayalon Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
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

  //  SPECIAL HANDLING: Hachshara Elementary - 2 files, Sheet1, agent subtotals
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
    
    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for Hachshara Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
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

  //  SPECIAL HANDLING: Phoenix Elementary - 1 file, Sheet1, agent subtotals
if (companyName === 'הפניקס' || companyName === 'The Phoenix (Including excellence)') {
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Phoenix Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Harel Elementary - 1 file, Sheet 1, direct agent rows
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Harel Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Clal Elementary - 1 file, uses first available tab, policy aggregation
if (companyName === 'כלל' || companyName === 'Clal') {
  console.log('Processing Clal Elementary - using first available tab with policy aggregation...');
  
  // Use the first available tab
  const targetTabName = workbook.SheetNames[0];
  
  if (!targetTabName) {
    return res.status(400).json({
      success: false,
      message: `No tabs found in the Excel file`
    });
  }
  
  console.log(`Using tab: "${targetTabName}"`);
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will aggregate policies by agent)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Clal Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Migdal Elementary - 1 file, policy-level data
if (companyName === 'מגדל' || companyName === 'Migdal') {
  console.log('Processing Migdal Elementary with policy-level data...');

  // Try to find the correct tab: prefer "report", otherwise use first tab
  let targetTabName;
  if (workbook.SheetNames.includes('report')) {
    targetTabName = 'report';
    console.log('Using "report" tab');
  } else if (workbook.SheetNames.length > 0) {
    targetTabName = workbook.SheetNames[0];
    console.log(`Tab "report" not found, using first tab: "${targetTabName}"`);
  } else {
    return res.status(400).json({
      success: false,
      message: 'No sheets found in Excel file'
    });
  }

  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Migdal Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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
  //  SPECIAL HANDLING: M.M.S Elementary - 1 file, uses first available tab, policy-level data
if (companyName === 'מ.מ.ס' || companyName === 'M.M.S' || companyName === 'MMS') {
  console.log('Processing M.M.S Elementary - using first available tab with policy-level data...');
  
  // Use the first available tab
  const targetTabName = workbook.SheetNames[0];
  
  if (!targetTabName) {
    return res.status(400).json({
      success: false,
      message: `No tabs found in the Excel file`
    });
  }
  
  console.log(`Using tab: "${targetTabName}"`);
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Read normally (will insert all policy rows)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for M.M.S Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Menorah Elementary - File 1 only, Sheet1, agent-level data
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Menorah Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Passport Elementary - 1 file, Premium tab, policy-level data
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Passport Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Shomera Elementary - 1 file, uses first available tab, 3-row groups
if (companyName === 'שומרה' || companyName === 'Shomera') {
  console.log('Processing Shomera Elementary - using first available tab with 3-row groups...');
  
  // Use the first available tab
  const targetTabName = workbook.SheetNames[0];
  
  if (!targetTabName) {
    return res.status(400).json({
      success: false,
      message: `No tabs found in the Excel file`
    });
  }
  
  console.log(`Using tab: "${targetTabName}"`);
  
  const worksheet = workbook.Sheets[targetTabName];
  
  // Use numeric indices (header: 1)
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    header: 1  // Use numeric indices: 0, 1, 2, 3...
  });
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Shomera Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Shirbit Elementary - 1 file, דוח פרודוקציית סוכנים מפורט, policy-level data
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Shirbit Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
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

//  SPECIAL HANDLING: Shlomo Elementary - 1 file, Sheet1, agent subtotals
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
  
  // Read with column headers from first row
  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    raw: false  // Get formatted values
  });
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Shlomo Elementary - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
    });
  }

  console.log(`✓ Processing Shlomo Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First row sample:', jsonData[0]);
  console.log('Column headers:', Object.keys(jsonData[0] || {}));
  
  // Parse the data (will use AGENT_SUBTOTALS mode with dynamic month-based mapping)
  const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);
  
  if (!parseResult.success) {
    // Check if it's a column mismatch error
    const errorMessage = parseResult.errors && parseResult.errors.length > 0 
      ? parseResult.errors[0] 
      : 'Failed to parse Shlomo Elementary data';
    
    const isColumnMismatch = errorMessage.includes('not found in Excel file');
    
    return res.status(400).json({
      success: false,
      message: isColumnMismatch 
        ? `The selected month/year does not match the Excel file columns. ${errorMessage}`
        : 'Failed to parse Shlomo Elementary data',
      errors: parseResult.errors,
      isColumnMismatch: isColumnMismatch
    });
  }
  
  if (parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid data found in the Excel file',
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

  //  SPECIAL HANDLING: Cooper Nineveh Elementary - first tab
  if (companyName === 'קופר נינווה' || companyName === 'Cooper Nineveh') {
    console.log('Processing Cooper Nineveh Elementary - using first tab...');

    // Use first available tab
    const targetTabName = workbook.SheetNames[0];
    console.log(`Using first tab: "${targetTabName}"`);

    const worksheet = workbook.Sheets[targetTabName];

    // Read from row 1 onwards (row 1 has headers, row 2+ has data)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: 0  // Start from row 1 (0-indexed, so 0 = row 1 which contains headers)
    });

    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for Cooper Nineveh Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
      });
    }

    console.log(`✓ Processing Cooper Nineveh Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
    console.log('First row sample:', jsonData[0]);
    console.log('Column headers:', Object.keys(jsonData[0] || {}));

    // Parse the data
    const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);

    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Cooper Nineveh Elementary data',
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
      console.error('Error inserting Cooper Nineveh Elementary data:', error);
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

    // Return success response for Cooper Nineveh Elementary
    return res.json({
      success: true,
      message: `Successfully processed Cooper Nineveh Elementary data from tab "${targetTabName}"`,
      summary: {
        rowsInserted: data.length,
        tabProcessed: targetTabName,
        errorsCount: parseResult.errors.length,
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
  }

  //  SPECIAL HANDLING: Securities Elementary - first tab, single agent
  if (companyName === 'סקוריטס' || companyName === 'Securities') {
    console.log('Processing Securities Elementary - using first tab...');

    // Use first available tab
    const targetTabName = workbook.SheetNames[0];
    console.log(`Using first tab: "${targetTabName}"`);

    const worksheet = workbook.Sheets[targetTabName];

    // Read from row 3 onwards (Securities has title in row 1, empty row 2, headers in row 3, data in row 4+)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: 2  // Start from row 3 (0-indexed, so 2 = row 3 which contains headers)
    });

    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for Securities Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
      });
    }

    console.log(`✓ Processing Securities Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
    console.log('First row sample:', jsonData[0]);
    console.log('Column headers:', Object.keys(jsonData[0] || {}));

    // Parse the data (will aggregate all rows for single agent 438)
    const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);

    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Securities Elementary data',
        errors: parseResult.errors
      });
    }

    console.log(`  Valid rows parsed for agent 438: ${parseResult.data.length}`);

    // Insert data to raw_data_elementary table
    const { data, error } = await supabase
      .from('raw_data_elementary')
      .insert(parseResult.data)
      .select();

    if (error) {
      console.error('Error inserting Securities Elementary data:', error);
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

    // Return success response for Securities Elementary
    return res.json({
      success: true,
      message: `Successfully processed Securities Elementary data from tab "${targetTabName}"`,
      summary: {
        rowsInserted: data.length,
        tabProcessed: targetTabName,
        errorsCount: parseResult.errors.length,
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
  }

  //  SPECIAL HANDLING: Kash Elementary - 1 file, uses first available tab, policy aggregation
  if (companyName === 'קאש' || companyName === 'Kash') {
    console.log('Processing Kash Elementary - using first available tab with policy aggregation...');

    // Use the first available tab
    const targetTabName = workbook.SheetNames[0];

    if (!targetTabName) {
      return res.status(400).json({
        success: false,
        message: `No tabs found in the Excel file`
      });
    }

    console.log(`Using tab: "${targetTabName}"`);

    const worksheet = workbook.Sheets[targetTabName];

    // Read normally (will aggregate policies by agent)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false
    });

    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for Kash Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
      });
    }

    console.log(`✓ Processing Kash Elementary tab "${targetTabName}" with ${jsonData.length} policy rows`);
    console.log('First row sample:', jsonData[0]);

    // Parse the data (will use POLICY_AGGREGATION mode)
    const parseResult = parseElementaryExcelData(jsonData, companyIdInt, companyName, month);

    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Kash Elementary data',
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
      console.error('Error inserting Kash Elementary data:', error);
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

    // Return success response for Kash Elementary
    return res.json({
      success: true,
      message: `Successfully processed Kash Elementary data from tab "${targetTabName}"`,
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

  //  SPECIAL HANDLING: Haklai Elementary - 1 file, 2 header rows, branch-level data with previous year
  if (companyName === 'חקלאי' || companyName === 'Haklai') {
    console.log('Processing Haklai Elementary - branch-level data with previous year...');

    // Use the first available tab
    const targetTabName = workbook.SheetNames[0];

    if (!targetTabName) {
      return res.status(400).json({
        success: false,
        message: `No tabs found in the Excel file`
      });
    }

    console.log(`Using tab: "${targetTabName}"`);

    const worksheet = workbook.Sheets[targetTabName];

    // Read from row 3 (index 2) to skip the two header rows
    // Row 1: Date headers (אוקטובר 2024, אוקטובר 2025, שינוי)
    // Row 2: Column sub-headers (סניפים, סוכנים, ענף מסחרי, etc.)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: 1  // Start from row 2 (0-indexed), uses row 2 as headers
    });

    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyElementaryPlaceholder(companyIdInt, month, targetTabName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for Haklai Elementary - placeholder row created`,
        summary: {
          rowsInserted: 1,
          tabProcessed: targetTabName,
          isEmpty: true,
          errorsCount: 0
        }
      });
    }

    console.log(`✓ Processing Haklai Elementary tab "${targetTabName}" with ${jsonData.length} rows`);
    console.log('First row sample:', jsonData[0]);
    console.log('Column headers:', Object.keys(jsonData[0] || {}));

    // Filter out total rows (סה"כ) and process data
    const filteredData = jsonData.filter(row => {
      const firstCol = row['סניפים'] || Object.values(row)[0];
      const agentCol = row['סוכנים'] || Object.values(row)[1];

      // Skip total rows
      if (firstCol === 'סה"כ' || (typeof firstCol === 'string' && firstCol.includes('סה"כ'))) return false;
      if (!agentCol) return false;

      return true;
    });

    console.log(`After filtering: ${filteredData.length} data rows`);

    // Parse the data (will use POLICY_AGGREGATION mode)
    const parseResult = parseElementaryExcelData(filteredData, companyIdInt, companyName, month);

    if (!parseResult.success || parseResult.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to parse Haklai Elementary data',
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
      console.error('Error inserting Haklai Elementary data:', error);
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

    // Return success response for Haklai Elementary
    return res.json({
      success: true,
      message: `Successfully processed Haklai Elementary data from tab "${targetTabName}"`,
      summary: {
        rowsInserted: data.length,
        tabProcessed: targetTabName,
        totalRowsInFile: jsonData.length,
        dataRowsProcessed: filteredData.length,
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
    
    //  SPECIAL HANDLING: Process multiple tabs for Altshuler
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
      
      //  ALLOW EMPTY FILES: If no data inserted, create placeholder
      if (totalRowsInserted === 0) {
        const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, 'All Sheets');

        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to insert placeholder row for empty Altshuler file',
            error: result.error.message,
            errors: allErrors
          });
        }

        return res.json({
          success: true,
          message: `Empty file uploaded for Altshuler - placeholder row created`,
          summary: {
            totalSheetsProcessed: workbook.SheetNames.length,
            rowsInserted: 1,
            isEmpty: true,
            errorsCount: allErrors.length
          },
          errors: allErrors.length > 0 ? allErrors : undefined
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

   //  SPECIAL HANDLING: Process 3 files for Clal with specific tabs
if (companyName === 'כלל' || companyName === 'Clal') {
  console.log('Processing Clal file with specific tab selection');
  
  // Define expected tab names for each set
  const expectedTabs = {
    'רמת פוליסה כל המוצרים': { set: 'Set 1', headerRow: 4 },    // Header at row 4, data row 5 - Financial only, stop at "Count:" in Column B
    'גיליון1': { set: 'Set 2', headerRow: 1 },                   // Header at row 1 - Transfer data
    'רמת פוליסה': { set: 'Set 3', headerRow: 4 }                 // Header at row 4, data starts row 5 - Policy-level data
  };
  
  // Try to detect mapping by checking each sheet
  let detectedMapping = null;
  let targetTabName = null;
  let headerRowIndex = 0;
  
  //  NEW: Special case for Set 2 - if file has only 1 tab, accept it as Set 2
  if (workbook.SheetNames.length === 1) {
    console.log('File has only 1 tab - assuming Set 2 (Agency & Transfer Data)');
    targetTabName = workbook.SheetNames[0];
    headerRowIndex = 0; // Header at row 1 (0-based index)
    console.log(`✓ Using single tab "${targetTabName}" for Set 2, header at row 1`);
    
    // Read this sheet with header at row 1
    const worksheet = workbook.Sheets[targetTabName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false,
      range: headerRowIndex
    });
    
    if (jsonData.length > 0) {
      const columns = Object.keys(jsonData[0]);
      console.log('Detected columns:', columns.slice(0, 5));
      
      // Try to get mapping
      if (!columns[0].includes('__EMPTY')) {
        detectedMapping = getClalMapping(columns, targetTabName);
        console.log(`✓ Confirmed mapping: ${detectedMapping.description}`);
      }
    }
  } else {
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
            detectedMapping = getClalMapping(columns, tabName);
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
                detectedMapping = getClalMapping(columns2, tabName);
                headerRowIndex = headerRowIndex + 1;
                console.log(`✓ Found headers at row ${headerRowIndex + 1}: ${detectedMapping.description}`);
                break;
              }
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
  
  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, targetTabName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Clal Life Insurance - placeholder row created`,
      summary: {
        rowsInserted: 1,
        tabProcessed: targetTabName,
        isEmpty: true,
        errorsCount: 0
      }
    });
  }

  console.log(`✓ Processing tab "${targetTabName}" with ${jsonData.length} rows`);
  console.log('First data row sample:', JSON.stringify(jsonData[0]).substring(0, 200));

  // Filter data for Set 1 - stop at "Count:" in Column B
  let filteredData = jsonData;
  if (detectedMapping.stopAtColumnB) {
    // Read sheet as array to check Column B (index 1)
    const rawData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
      range: headerRowIndex
    });

    // Find the row index where Column B contains "Count:"
    let stopIndex = rawData.length;
    for (let i = 1; i < rawData.length; i++) { // Start from 1 to skip header
      const colB = rawData[i][1]; // Column B is index 1
      if (colB && typeof colB === 'string' && colB.includes(detectedMapping.stopAtColumnB)) {
        stopIndex = i - 1; // Stop at previous row (data rows, not including header)
        console.log(`Found "${detectedMapping.stopAtColumnB}" in Column B at row ${i + headerRowIndex + 1}, stopping at row ${stopIndex + headerRowIndex + 1}`);
        break;
      }
    }

    // Filter jsonData to only include rows before "Count:"
    filteredData = jsonData.slice(0, stopIndex);
    console.log(`Filtered from ${jsonData.length} to ${filteredData.length} rows (stopped at "Count:")`);
  }

  // Parse the data
  const parseResult = parseExcelData(filteredData, companyIdInt, companyName, month, detectedMapping);
  
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


//  SPECIAL HANDLING: Hachshara - 2 file types (Risk, Pension)
if (companyName === 'הכשרה' || companyName === 'Hachshara') {
  console.log('Processing Hachshara file...');

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false
  });

  //  ALLOW EMPTY FILES: Insert placeholder row for tracking
  if (jsonData.length === 0) {
    const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, sheetName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to insert placeholder row',
        error: result.error.message
      });
    }

    return res.json({
      success: true,
      message: `Empty file uploaded for Hachshara - placeholder row created`,
      summary: {
        rowsInserted: 1,
        sheetProcessed: sheetName,
        isEmpty: true,
        errorsCount: 0
      }
    });
  }

  // Detect which mapping to use based on columns
  const columns = Object.keys(jsonData[0]);
  console.log('Hachshara detected columns:', columns.slice(0, 10));

  const detectedMapping = getHachsharaMapping(columns);
  console.log(`✓ Using Hachshara mapping: ${detectedMapping.description}`);

  // Parse the data
  const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month, detectedMapping);

  if (!parseResult.success || parseResult.data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Failed to parse Hachshara data',
      errors: parseResult.errors
    });
  }

  // Tag each row with the fixed category so aggregation can distinguish file types
  const categoryTag = detectedMapping.fixedCategory; // RISK or PENSION
  parseResult.data.forEach(row => {
    row.product = categoryTag;
  });

  console.log(`  Valid rows parsed: ${parseResult.data.length}`);

  // Insert data
  const { data, error } = await supabase
    .from('raw_data')
    .insert(parseResult.data)
    .select();

  if (error) {
    console.error('Error inserting Hachshara data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert data to database',
      error: error.message
    });
  }

  console.log(`✓ Successfully inserted ${data.length} rows from Hachshara file`);

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

  return res.json({
    success: true,
    message: `Successfully processed Hachshara ${detectedMapping.description} from tab "${sheetName}"`,
    summary: {
      rowsInserted: data.length,
      tabProcessed: sheetName,
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

    //  SPECIAL HANDLING: Menorah Life Insurance - Auto-detect file type
    if (companyName === 'מנורה' || companyName === 'Menorah') {
      console.log('Processing Menorah file - detecting file type...');
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false
      });

      if (jsonData.length === 0) {
        const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, sheetName);

        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to insert placeholder row',
            error: result.error.message
          });
        }

        return res.json({
          success: true,
          message: `Empty file uploaded for Menorah - placeholder row created`,
          summary: {
            rowsInserted: 1,
            sheetProcessed: sheetName,
            isEmpty: true,
            errorsCount: 0
          }
        });
      }

      // Auto-detect file type by checking column structure
      const columns = Object.keys(jsonData[0]);
      const isPensionTransferFile = columns.includes('סוכן') && columns.includes('סכום העברה - ניוד נטו');
      const isRegularFile = columns.includes('שם סוכן');

      console.log('Detected columns:', columns);
      console.log('Is pension transfer file:', isPensionTransferFile);
      console.log('Is regular file:', isRegularFile);

      if (isPensionTransferFile) {
        // Process as pension transfer file (file 2)
        console.log('✓ Detected Menorah PENSION TRANSFER file');

        const menorahPensionTransferMapping = require('../config/menorahPensionTransferMapping');
        
        // Parse pension transfer data
        const parsedData = [];
        const errors = [];
        let skippedByDate = 0;

        // Extract target month and year from user's selected month (format: "YYYY-MM")
        const [targetYear, targetMonth] = month.split('-').map(Number);
        console.log(`Filtering Menorah Pension Transfer by date - Target: ${targetMonth}/${targetYear}`);

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];

          try {
            const agentString = row[menorahPensionTransferMapping.columns.agentString];
            const output = row[menorahPensionTransferMapping.columns.output];
            const dateValue = row[menorahPensionTransferMapping.columns.date];

            if (!agentString) {
              continue; // Skip rows without agent
            }

            // Date filtering - parse DD/MM/YYYY format from מועד קובע column
            if (dateValue) {
              let rowMonth, rowYear;

              if (typeof dateValue === 'string' && dateValue.includes('/')) {
                // Format: "08/12/2025" (DD/MM/YYYY)
                const parts = dateValue.split('/');
                if (parts.length === 3) {
                  rowMonth = parseInt(parts[1], 10); // Month is the 2nd part
                  rowYear = parseInt(parts[2], 10);  // Year is the 3rd part
                }
              } else if (typeof dateValue === 'number' && dateValue > 0 && dateValue < 100000) {
                // Handle Excel serial number
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000);
                rowMonth = jsDate.getMonth() + 1; // JavaScript months are 0-indexed
                rowYear = jsDate.getFullYear();
              }

              // Skip rows that don't match the target month/year
              if (rowMonth && rowYear && (rowMonth !== targetMonth || rowYear !== targetYear)) {
                skippedByDate++;
                continue;
              }
            }

            // Parse agent number and name from combined field
            const { agent_number, agent_name } = menorahPensionTransferMapping.parseAgent(agentString);

            if (!agent_name || !output) {
              continue; // Skip if missing critical data
            }

            parsedData.push({
              company_id: companyIdInt,
              month: month,
              agent_name: agent_name,
              agent_number: agent_number ? String(agent_number) : null,
              product: 'ניוד פנסיה', // Fixed product name for pension transfer
              output: parseFloat(output) || 0,
              policy_number: null,
              // Add any other standard fields as null
              agent_license_hierarchy: null,
              pension: null,
              health_compensation: null
            });
          } catch (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }

        console.log(`✓ Date filtering complete - Skipped ${skippedByDate} rows not matching ${month}`);

        if (parsedData.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No valid pension transfer data found in file',
            errors: errors
          });
        }

        console.log(`✓ Parsed ${parsedData.length} pension transfer rows`);

        // Insert data
        const { data, error } = await supabase
          .from('raw_data')
          .insert(parsedData)
          .select();

        if (error) {
          console.error('Error inserting Menorah pension transfer data:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to insert pension transfer data to database',
            error: error.message
          });
        }

        console.log(`✓ Successfully inserted ${data.length} pension transfer rows`);

        // Run aggregation
        const { result: aggregationResult, error: aggregationError } = await aggregateAfterUpload(companyIdInt, month);

        return res.json({
          success: true,
          message: `Menorah pension transfer data uploaded successfully`,
          summary: {
            rowsInserted: data.length,
            fileType: 'pension_transfer',
            sheetProcessed: sheetName,
            errorsCount: errors.length,
            aggregation: aggregationResult ? {
              success: true,
              agentsProcessed: aggregationResult.agentsProcessed,
              rawDataRows: aggregationResult.rawDataRows
            } : {
              success: false,
              error: aggregationError
            }
          },
          errors: errors.length > 0 ? errors : undefined
        });

      } else if (isRegularFile) {
        // Process as regular life insurance file (file 1) - use standard parsing
        console.log('✓ Detected Menorah REGULAR life insurance file - using standard processing');
        // Continue to standard processing below
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unable to determine Menorah file type. Expected either regular life insurance file (with "שם סוכן" column) or pension transfer file (with "סוכן" column)',
          detectedColumns: columns
        });
      }
    }
    
    //  SPECIAL HANDLING: Meitav - 3 file types (Pension, Finance, Pension Transfer)
    if (companyName === 'מיטב' || companyName === 'Meitav') {
      console.log('Processing Meitav file...');

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        defval: null,
        blankrows: false
      });

      //  ALLOW EMPTY FILES
      if (jsonData.length === 0) {
        const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, sheetName);

        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to insert placeholder row',
            error: result.error.message
          });
        }

        return res.json({
          success: true,
          message: `Empty file uploaded for Meitav - placeholder row created`,
          summary: {
            rowsInserted: 1,
            sheetProcessed: sheetName,
            isEmpty: true,
            errorsCount: 0
          }
        });
      }

      // Detect which mapping to use based on columns
      const columns = Object.keys(jsonData[0]);
      console.log('Meitav detected columns:', columns.slice(0, 10));

      // Use uploadType from request body to distinguish Finance vs Pension Transfer
      // since both have identical columns (סך תנועה + מספר סוכן ראשי)
      const meitavUploadType = req.body.meitavFileType || null;
      const detectedMapping = getMeitavMapping(columns, sheetName, meitavUploadType, jsonData);
      console.log(`✓ Using Meitav mapping: ${detectedMapping.description}`);

      // Parse the data
      const parseResult = parseExcelData(jsonData, companyIdInt, companyName, month, detectedMapping);

      if (!parseResult.success || parseResult.data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Failed to parse Meitav data',
          errors: parseResult.errors
        });
      }

      // Tag each row with the fixed category so aggregation can distinguish file types
      const categoryTag = detectedMapping.fixedCategory; // PENSION, FINANCIAL, or PENSION_TRANSFER
      parseResult.data.forEach(row => {
        row.product = categoryTag;
      });

      console.log(`  Valid rows parsed: ${parseResult.data.length}`);

      // Insert data
      const { data, error } = await supabase
        .from('raw_data')
        .insert(parseResult.data)
        .select();

      if (error) {
        console.error('Error inserting Meitav data:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to insert data to database',
          error: error.message
        });
      }

      console.log(`✓ Successfully inserted ${data.length} rows from Meitav file`);

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

      return res.json({
        success: true,
        message: `Successfully processed Meitav ${detectedMapping.description} from tab "${sheetName}"`,
        summary: {
          rowsInserted: data.length,
          tabProcessed: sheetName,
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

    //  STANDARD SINGLE-SHEET PROCESSING (for all other companies and Menorah regular file)
    let sheetIndex = 0;
    let sheetName = workbook.SheetNames[sheetIndex];

    // Special handling for Mor - look for sheets starting with "גיליון"
    if (companyName === 'מור' || companyName === 'Mor') {
      console.log(`Mor: Available sheets: ${workbook.SheetNames.join(', ')}`);

      // Find all sheets that start with "גיליון" (e.g., גיליון1, גיליון2, גיליון3, or just גיליון)
      const gilyonSheets = workbook.SheetNames.filter(name => name.startsWith('גיליון'));

      if (gilyonSheets.length > 0) {
        console.log(`Mor: Found ${gilyonSheets.length} גיליון sheet(s): ${gilyonSheets.join(', ')}`);

        // If multiple sheets, sort by sheet number and use the highest
        if (gilyonSheets.length > 1) {
          gilyonSheets.sort((a, b) => {
            const numA = parseInt(a.replace('גיליון', '')) || 0;
            const numB = parseInt(b.replace('גיליון', '')) || 0;
            return numA - numB;
          });
          sheetName = gilyonSheets[gilyonSheets.length - 1]; // Use last (highest numbered)
          console.log(`Mor: Multiple גיליון sheets found, using highest: "${sheetName}"`);
        } else {
          // Only one גיליון sheet, use it
          sheetName = gilyonSheets[0];
          console.log(`Mor: One גיליון sheet found, using: "${sheetName}"`);
        }

        sheetIndex = workbook.SheetNames.indexOf(sheetName);
      } else {
        // No גיליון sheets found, use first sheet
        sheetIndex = 0;
        sheetName = workbook.SheetNames[0];
        console.log(`Mor: No גיליון sheets found, using first sheet: "${sheetName}"`);
      }
    }

    console.log(`Using sheet: "${sheetName}" (index: ${sheetIndex})`);

    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false
    });

    console.log('Rows parsed:', jsonData.length);

    //  ALLOW EMPTY FILES: Insert placeholder row for tracking
    if (jsonData.length === 0) {
      const result = await insertEmptyLifeInsurancePlaceholder(companyIdInt, month, sheetName);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to insert placeholder row',
          error: result.error.message
        });
      }

      return res.json({
        success: true,
        message: `Empty file uploaded for ${companyName} Life Insurance - placeholder row created`,
        summary: {
          rowsInserted: 1,
          sheetProcessed: sheetName,
          isEmpty: true,
          errorsCount: 0
        }
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
      // Aggregate the uploaded month (Migdal rows are now filtered to match selected month)
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
        aggregation: aggregationResult ? (
          // Migdal has multiple months
          aggregationResult.monthsAggregated ? {
            success: true,
            monthsAggregated: aggregationResult.monthsAggregated,
            results: aggregationResult.results
          } : {
            // Normal single month aggregation
            success: true,
            agentsProcessed: aggregationResult.agentsProcessed,
            rawDataRows: aggregationResult.rawDataRows
          }
        ) : {
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
    const validUploadTypes = ['life-insurance', 'elementary', 'commission', 'direct-agents'];
    if (!uploadType || !validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing uploadType. Must be one of: ${validUploadTypes.join(', ')}`
      });
    }

    console.log(`Fetching distinct records for uploadType: ${uploadType}`);

    // Handle Direct Agents separately (different table structure)
    if (uploadType === 'direct-agents') {
      const { data: directAgentsRecords, error: fetchError } = await supabase
        .rpc('get_distinct_direct_agents_records');

      if (fetchError) {
        console.error('Error fetching direct agents records:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch direct agents records',
          error: fetchError.message
        });
      }

      return res.json({
        success: true,
        data: directAgentsRecords || [],
        count: directAgentsRecords?.length || 0,
        uploadType: 'direct-agents'
      });
    }

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

    // Validate uploadType parameter
    const validUploadTypes = ['life-insurance', 'elementary', 'commission', 'direct-agents'];
    if (!uploadType || !validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing uploadType. Must be one of: ${validUploadTypes.join(', ')}`
      });
    }

    // Handle Direct Agents deletion separately
    if (uploadType === 'direct-agents') {
      // For direct-agents, we only need month (not company_id)
      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'Month is required'
        });
      }

      console.log(`Deleting Direct Agents records for month ${month}`);

      // Fetch the tracking record to get the data for reversal
      const { data: trackingRecord, error: fetchError } = await supabase
        .from('direct_agents_uploads')
        .select('*')
        .eq('month', month)
        .single();

      if (fetchError) {
        console.error('Error fetching tracking record:', fetchError);
        return res.status(404).json({
          success: false,
          message: 'Direct Agents record not found for this month',
          error: fetchError.message
        });
      }

      // Step 1: Delete all direct agent records from agent_aggregations_elementary
      const uploadedRecords = trackingRecord.uploaded_records || [];
      let deletedAgentsCount = 0;

      for (const record of uploadedRecords) {
        const { error: deleteError } = await supabase
          .from('agent_aggregations_elementary')
          .delete()
          .eq('agent_id', record.agent_id)
          .eq('company_id', record.company_id)
          .eq('month', month);

        if (deleteError) {
          console.warn(`Failed to delete agent ${record.agent_id} for company ${record.company_id}:`, deleteError);
        } else {
          deletedAgentsCount++;
        }
      }

      // Step 2: Restore amounts to agent_id=426 (reverse the deductions)
      const totalAmountByCompany = trackingRecord.total_amount_by_company || {};
      const AGENT_426_ID = 426;
      let reversedCompaniesCount = 0;

      for (const [companyId, totalAmount] of Object.entries(totalAmountByCompany)) {
        // Fetch current agent_426 record
        const { data: agent426Record, error: fetchAgent426Error } = await supabase
          .from('agent_aggregations_elementary')
          .select('*')
          .eq('agent_id', AGENT_426_ID)
          .eq('company_id', parseInt(companyId))
          .eq('month', month)
          .single();

        if (fetchAgent426Error && fetchAgent426Error.code !== 'PGRST116') {
          console.warn(`Error fetching agent 426 for company ${companyId}:`, fetchAgent426Error);
          continue;
        }

        if (agent426Record) {
          // Add back the amount that was deducted
          const currentAmount = parseFloat(agent426Record.gross_premium) || 0;
          const restoredAmount = currentAmount + totalAmount;

          const { error: updateError } = await supabase
            .from('agent_aggregations_elementary')
            .update({
              gross_premium: restoredAmount
            })
            .eq('agent_id', AGENT_426_ID)
            .eq('company_id', parseInt(companyId))
            .eq('month', month);

          if (updateError) {
            console.warn(`Failed to restore agent 426 amount for company ${companyId}:`, updateError);
          } else {
            reversedCompaniesCount++;
            console.log(`Restored ${totalAmount} to agent 426 for company ${companyId} (new balance: ${restoredAmount})`);
          }
        } else {
          console.warn(`Agent 426 record not found for company ${companyId}, month ${month}`);
        }
      }

      // Step 3: Delete the tracking record
      const { error: deleteTrackingError } = await supabase
        .from('direct_agents_uploads')
        .delete()
        .eq('month', month);

      if (deleteTrackingError) {
        console.error('Error deleting tracking record:', deleteTrackingError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete tracking record',
          error: deleteTrackingError.message
        });
      }

      console.log(`Successfully deleted Direct Agents record for ${month}: ${deletedAgentsCount} agents, ${reversedCompaniesCount} companies reversed`);

      return res.json({
        success: true,
        message: 'Direct Agents records deleted successfully',
        summary: {
          rawDataDeleted: 0, // Direct Agents don't have raw data
          aggregationsDeleted: deletedAgentsCount, // Number of direct agent aggregations deleted
          reversedCompanies: reversedCompaniesCount,
          uploadType: 'direct-agents'
        }
      });
    }

    // For other upload types (life-insurance, elementary, commission)
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

// ===================================================================
// Direct Agents Upload Endpoint
// ===================================================================

const { processDirectAgentsData } = require('../utils/directAgentsProcessor');

/**
 * Upload Direct Agents Excel file
 * Processes agent names, amounts, and company assignments
 * Adds amounts to direct agents and deducts from agent_id=426
 */
router.post('/upload-direct-agents', upload.single('file'), async (req, res) => {
  try {
    // 1. Validate file exists
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // 2. Extract month from request body
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Month is required in YYYY-MM format'
      });
    }

    console.log(`Processing Direct Agents upload for month: ${month}`);

    // 3. Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

    // 4. Find the correct tab
    let worksheet;
    const targetTabName = 'תפוקה של הסוכנים הישירים';

    if (workbook.SheetNames.includes(targetTabName)) {
      worksheet = workbook.Sheets[targetTabName];
      console.log(`Found target tab: "${targetTabName}"`);
    } else if (workbook.SheetNames.length === 1) {
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      console.log(`Using single tab: "${workbook.SheetNames[0]}"`);
    } else {
      return res.status(400).json({
        success: false,
        error: `Could not find tab "${targetTabName}" and file has multiple tabs: ${workbook.SheetNames.join(', ')}`
      });
    }

    // 5. Convert to JSON (assuming headers in first row)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      blankrows: false
    });

    console.log(`Parsed ${jsonData.length} rows from Excel`);

    // 6. Process the data using utility function
    const result = await processDirectAgentsData(jsonData, month);

    console.log(`Processing complete: ${result.successfulRows} successful, ${result.skippedRows} skipped`);

    // 7. Return response
    return res.json({
      success: true,
      message: `Successfully processed Direct Agents data for ${month}`,
      summary: {
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        skippedRows: result.skippedRows,
        companiesProcessed: Array.from(result.companiesProcessed),
        deductionsApplied: result.deductionsApplied
      },
      warnings: result.warnings
    });

  } catch (err) {
    console.error('Direct Agents upload error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred during upload'
    });
  }
});

module.exports = router;