/**
 * Excel Parser Utility
 * Handles parsing and transforming Excel data based on company mappings
 */

const { getCompanyMapping, getHachsharaMapping, getAltshulerMapping, getClalMapping } = require('../config/companyMappings');

/**
 * Helper function to format dates to YYYY-MM-DD
 */
const formatDate = (date) => {
  if (!date) return null;
  
  // Handle "-" or empty string as null
  if (date === '-' || date === '' || date === ' ') return null;
  
  // ADD: Handle Excel serial numbers (e.g., 45144)
  if (typeof date === 'number' && date > 0 && date < 100000) {
    // Excel date serial number: days since 1900-01-01
    // Note: Excel incorrectly treats 1900 as a leap year, so we need to adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + date * 86400000); // 86400000 ms = 1 day
    
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Handle MM/YYYY format (convert to first day of month: YYYY-MM-01)
  if (typeof date === 'string' && /^\d{2}\/\d{4}$/.test(date)) {
    const [month, year] = date.split('/');
    return `${year}-${month}-01`;
  }
  
  // Handle DD/MM/YYYY string format
  if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  return date;
};

/**
 * Helper function to clean product names - removes year references
 * Currently used for Migdal company to make product names future-proof
 */
const cleanProductName = (productName) => {
  if (!productName || typeof productName !== 'string') {
    return productName;
  }

  let cleaned = productName;

  // Remove year patterns (2025, 2024, etc.)
  cleaned = cleaned.replace(/לשנת\s*\d{4}/g, '');  // "לשנת 2025"
  cleaned = cleaned.replace(/\s*-?\s*\d{4}\s*$/g, '');  // Trailing "2025" or "- 2025"
  cleaned = cleaned.replace(/\s*\d{4}\s*,/g, ',');  // "2025," in middle
  cleaned = cleaned.replace(/\s*\d{4}\s+/g, ' ');  // "2025 " in middle (before text/parentheses)
  cleaned = cleaned.replace(/\s*,?\s*לשנת\s*$/g, '');  // Trailing ", לשנת" or "לשנת"

  // Clean up extra spaces, commas, and dashes
  cleaned = cleaned.replace(/\s*,\s*$/g, '');  // Trailing comma
  cleaned = cleaned.replace(/\s*-\s*$/g, '');  // Trailing dash
  cleaned = cleaned.replace(/\s+/g, ' ');      // Multiple spaces to single
  cleaned = cleaned.trim();

  return cleaned;
};

/**
 * Parse Excel data and transform to database format
 * @param {Array} excelData - Raw data from Excel file
 * @param {number} companyId - Company ID from database
 * @param {string} companyName - Company name (Hebrew)
 * @param {string} uploadMonth - Upload month (YYYY-MM format)
 * @returns {Object} - { success: boolean, data: Array, errors: Array }
 */
function parseExcelData(excelData, companyId, companyName, uploadMonth, providedMapping = null) {
  // Trim all column names to remove leading/trailing spaces
  excelData = excelData.map(row => {
    const trimmedRow = {};
    Object.keys(row).forEach(key => {
      const trimmedKey = key.trim();
      trimmedRow[trimmedKey] = row[key];
    });
    return trimmedRow;
  });

  // Use provided mapping if available (for multi-sheet companies like Altshuler)
  let mapping = providedMapping || getCompanyMapping(companyName);

  if (!mapping) {
    return {
      success: false,
      data: [],
      errors: [`No mapping configuration found for company: ${companyName}`]
    };
  }

  // For Hachshara company, use auto-detection based on Excel columns
  if (companyName === 'הכשרה' || companyName === 'Hachshara') {
    if (excelData && excelData.length > 0) {
      const columns = Object.keys(excelData[0]);
      mapping = getHachsharaMapping(columns);
      console.log(`Auto-detected Hachshara mapping: ${mapping.description}`);
    }
  }

  // For Clal company, use auto-detection based on Excel columns
  // Skip if mapping was already provided by the upload route (e.g., Set 3 policy-level)
if ((companyName === 'כלל' || companyName === 'Clal') && !providedMapping) {
  if (excelData && excelData.length > 0) {
    const columns = Object.keys(excelData[0]);
    mapping = getClalMapping(columns);
    console.log(`Auto-detected Clal mapping: ${mapping.description}`);
  }
}

  // SPECIAL HANDLING: Clal Set 3 - Column-based data (Risk & Pension from רמת עוסק מורשה)
  if ((companyName === 'כלל' || companyName === 'Clal') && mapping.isColumnBased) {
    console.log('\n🔍 Processing Clal Set 3 - Agent-level summary (Risk & Pension)');

    const transformedData = [];
    const errors = [];
    const cols = mapping.columns;

    excelData.forEach((row, index) => {
      try {
        const agentNumber = row[cols.agentNumber];

        // Skip rows without agent number (total rows)
        if (!agentNumber) return;

        // Parse category amounts
        const healthBusiness = parseFloat(row[cols.healthBusiness]) || 0;  // Col G
        const riskBusiness = parseFloat(row[cols.riskBusiness]) || 0;      // Col J
        const newPensionFund = parseFloat(row[cols.newPensionFund]) || 0;  // Col O

        transformedData.push({
          company_id: companyId,
          month: uploadMonth,
          agent_name: String(agentNumber).trim(),
          agent_number: String(agentNumber).trim(),
          health_business: healthBusiness,
          risk_business: riskBusiness,
          new_pension_fund: newPensionFund,
          output: '0'
        });

      } catch (error) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    });

    console.log(`   Processed ${transformedData.length} agent rows`);

    return {
      success: errors.length === 0,
      data: transformedData,
      errors: errors,
      summary: {
        totalRows: excelData.length,
        rowsProcessed: transformedData.length,
        errorsCount: errors.length
      }
    };
  }

  const transformedData = [];
  const errors = [];

  // Log available columns from first row (for Migdal debugging)
  if (excelData.length > 0 && (companyName === 'מגדל' || companyName === 'Migdal')) {
    console.log('\n📋 Available columns in Migdal Excel file:');
    const columnNames = Object.keys(excelData[0]);
    columnNames.forEach((col, idx) => {
      console.log(`  ${idx + 1}. "${col}" (length: ${col.length})`);
    });
    console.log('\n🎯 Looking for column: "' + mapping.columns.registrationDate + '" (length: ' + mapping.columns.registrationDate.length + ')');

    // Try to find similar column names
    const similarCols = columnNames.filter(col => col.includes('רישום') || col.includes('תאריך'));
    if (similarCols.length > 0) {
      console.log('\n🔍 Found columns containing "רישום" or "תאריך":');
      similarCols.forEach(col => {
        console.log(`  - "${col}"`);
      });
    }
    console.log('');
  }

  // Parse each row
  excelData.forEach((row, index) => {
    try {
      // Skip completely empty rows
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ''
      );
      if (!hasData) {
        return;
      }

      // ADD THIS NEW SECTION FOR CLAL
    // Skip Clal summary rows
    if (companyName === 'כלל' || companyName === 'Clal') {
      const values = Object.values(row);
      // Check if any cell contains summary indicators
      if (values.some(v => 
        v && typeof v === 'string' && 
        (v.includes('Sum:') || v === 'סה"כ' || v.includes('Total'))
      )) {
        console.log('Skipping Clal summary row');
        return;
      }
    }

      // ADD: Skip Altshuler summary rows (rows where most fields are "סה"כ")
if (companyName === 'אלטשולר שחם' || companyName === 'Altshuler Shaham') {
  const values = Object.values(row);
  const totalSummaryCount = values.filter(v => v === 'סה"כ').length;
  
  // If more than 5 fields contain "סה"כ", it's a summary row
  if (totalSummaryCount >= 5) {
    console.log(`Skipping summary row with ${totalSummaryCount} "סה"כ" fields`);
    return;
  }
}

      // ADD HERE - Direct check for Harel header row
      if (companyName === 'הראל') {
        const harelFirstValue = row['סיכוני פרט'];
        if (harelFirstValue && typeof harelFirstValue === 'string' && 
            (harelFirstValue.includes('תפוקה') || harelFirstValue.includes('נטו'))) {
          return;
        }
      }
    
      // IMPROVED: Skip header/sub-header rows - only check NUMERIC columns, not all columns
      const numericColumns = [
        mapping.columns.output,
        mapping.columns.privateRisk,
        mapping.columns.pensionHarel,
        mapping.columns.clientPremium,
        mapping.columns.totalMeasuredPremium,
        mapping.columns.pensionTransferNet,
        mapping.columns.savingsProductsNoFinancials
      ].filter(col => col); // Remove undefined columns
      
      const hasHeaderText = numericColumns.some(col => {
        const value = row[col];
        return typeof value === 'string' && (
          value.includes('תפוקה') || 
          value.includes('נטו') ||
          value.includes('Header') ||
          value.includes('Total')
        );
      });
    
      if (hasHeaderText) {
        return;
      }
      
      // ADD: Extra validation - skip rows where ALL numeric fields are strings
      if (companyName === 'הראל') {
        const allNumericFields = [
          row[mapping.columns.privateRisk],
          row[mapping.columns.pensionHarel],
          row[mapping.columns.savingsProductsNoFinancials],
          row[mapping.columns.pensionTransferNet]
        ];
        
        const allAreStrings = allNumericFields.every(val => 
          val && typeof val === 'string' && isNaN(parseFloat(val))
        );
        
        if (allAreStrings) {
          return;
        }
      }

      // Get agent name and clean it
      let agentName = row[mapping.columns.agentName];
      let agentNumber = row[mapping.columns.agentNumber];

      // ADD: Special handling for Menorah - use agent number for both fields
      if (companyName === 'מנורה' || companyName === 'Menorah') {
        agentName = agentNumber; // Use agent number as agent name
      }

      // ADD: Special handling for Meitav - use agent number for both fields (no agent name column)
      // Also clean agent number: remove spaces and dashes (e.g., ' 2-12240 ' → '212240')
      if (companyName === 'מיטב' || companyName === 'Meitav') {
        if (agentNumber && typeof agentNumber === 'string') {
          agentNumber = agentNumber.replace(/[\s-]/g, '');
        }
        agentName = agentNumber;
      }

      // ADD: Special handling for Hachshara - agent column has "NUMBER - NAME" format
      // e.g. "9569 - גל אלמגור סוכ בטוח בעמ" → agentNumber = "9569", agentName = "גל אלמגור סוכ בטוח בעמ"
      if (companyName === 'הכשרה' || companyName === 'Hachshara') {
        if (agentNumber && typeof agentNumber === 'string' && agentNumber.includes(' - ')) {
          const parts = agentNumber.split(' - ');
          agentNumber = parts[0].trim();
          agentName = parts.slice(1).join(' - ').trim();
        } else {
          agentName = agentNumber;
        }
      }

      // Note: Ayalon now uses standard agentNumber/agentName columns directly from mapping

      // ADD: Special handling for Harel - agent name and number in same column
      if (companyName === 'הראל' && agentName && typeof agentName === 'string') {
        // Format 1: "Name - Number" (e.g., "חג'ג מרדכי - 301649083")
        let match = agentName.match(/^(.+?)\s*-\s*(\d+)$/);
        if (match) {
          agentName = match[1].trim();
          agentNumber = match[2].trim();
          console.log(`Harel: Parsed (Name-Number) - Name: "${agentName}", Number: "${agentNumber}"`);
        }
        // Format 2 (Fallback): "Number - Name" (e.g., "301649083 - חג'ג מרדכי")
        else {
          match = agentName.match(/^(\d+)\s*-\s*(.+)$/);
          if (match) {
            agentNumber = match[1].trim();
            agentName = match[2].trim();
            console.log(`Harel: Parsed (Number-Name) - Name: "${agentName}", Number: "${agentNumber}"`);
          }
        }

        // Skip summary rows like "סה"כ"
        if (agentName.includes('סה"כ') || agentName === 'סה"כ') {
          return;
        }
      }

      // Clean agent name - remove parentheses and agent numbers
      if (agentName && typeof agentName === 'string') {
        // Remove agent number patterns from name
        agentName = agentName.replace(/^\d+-\([^)]+\)/, '');     // Remove "70504-(2020)"
        agentName = agentName.replace(/^\d+-/, '');              // Remove leading "70504-"
        agentName = agentName.replace(/\s*\(\d+\)\s*/g, '');     //  CHANGE: Remove "(2020)" anywhere
        agentName = agentName.replace(/^\(/, '');                // Remove leading "("
        agentName = agentName.replace(/\s*\(\d+\)?$/, '');       // Remove trailing "(number)"
        agentName = agentName.trim();
      }


    //  Special handling for Mediho - extract agent number from notes field (Column O)
    //  Fallback to מזהה סוכן (Column F) if Column O doesn't have a valid agent number
if (companyName === 'מדיהו' || companyName === 'Mediho') {
  let medihoAgentFound = false;

  if (agentNumber && typeof agentNumber === 'string') {
    if (agentNumber.includes('עמלת סוכן משנה')) {
      // Extract number that comes after "עמלת סוכן משנה"
      const numberMatch = agentNumber.match(/עמלת סוכן משנה\s+(\d+)/);
      if (numberMatch) {
        agentNumber = numberMatch[1];
        medihoAgentFound = true;
      }
    }
  }

  // Fallback to מזהה סוכן (Column F) if primary agent number not found
  if (!medihoAgentFound) {
    const fallbackAgent = row[mapping.columns.agentNumberFallback];
    if (fallbackAgent) {
      agentNumber = String(fallbackAgent).trim();
    }
  }
}

      //  ADD: Special handling for Analyst company agent_number
      // Use קוד הסכם (agreement code) as agent number; fallback to שם סוכן if not available
      if (companyName === 'אנליסט' || companyName === 'Analyst') {
        if (agentNumber && !isNaN(agentNumber)) {
          // קוד הסכם exists and is numeric - convert to string
          agentNumber = String(agentNumber).trim();
        } else {
          // Fallback to agent name if קוד הסכם is missing
          agentNumber = agentName;
        }
      }

      //  NEW: Special filtering for Analyst - only include rows where join_date year matches upload month year
if (companyName === 'אנליסט' || companyName === 'Analyst') {
  const joinDateRaw = row[mapping.columns.joinDate];

  if (joinDateRaw) {
    // Extract year from upload month (e.g., "2025-12" → 2025)
    const uploadYear = parseInt(uploadMonth.split('-')[0]);

    // Parse join date to extract year
    let joinDateYear = null;

    // Handle DD/MM/YYYY format
    if (typeof joinDateRaw === 'string' && joinDateRaw.includes('/')) {
      const parts = joinDateRaw.split('/');
      if (parts.length === 3) {
        joinDateYear = parseInt(parts[2]); // Year is the 3rd part
      }
    }
    // Handle Excel serial number
    else if (typeof joinDateRaw === 'number' && joinDateRaw > 0 && joinDateRaw < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + joinDateRaw * 86400000);
      joinDateYear = jsDate.getFullYear();
    }
    // Handle Date object
    else if (joinDateRaw instanceof Date) {
      joinDateYear = joinDateRaw.getFullYear();
    }

    // Skip row if year doesn't match
    if (joinDateYear && joinDateYear !== uploadYear) {
      console.log(`Skipping Analyst row: join_date year ${joinDateYear} != upload year ${uploadYear}`);
      return;
    }
  }
}

      // Note: Mor no longer needs date filtering (new template has no date-based row filtering)

      // Note: Migdal no longer needs date filtering
      let finalMonth = uploadMonth; // Default to user-selected month

      // NEW: Extract month from joinDate for Analyst
      if (companyName === 'אנליסט' || companyName === 'Analyst') {
        const joinDateRaw = row[mapping.columns.joinDate];
        console.log(`\n🔍 Processing Analyst row ${index + 1}:`);
        console.log(`   Join date raw:`, joinDateRaw);
        console.log(`   Upload month:`, uploadMonth);

        if (joinDateRaw) {
          // Parse join date to extract year and month
          let joinYear = null;
          let joinMonthNum = null;

          // Handle YYYY-MM-DD format (e.g., "2025-05-22")
          if (typeof joinDateRaw === 'string' && joinDateRaw.includes('-')) {
            const parts = joinDateRaw.split('-');
            console.log(`   Date format: YYYY-MM-DD string (parts: ${parts.join(', ')})`);
            if (parts.length === 3) {
              joinYear = parseInt(parts[0]); // Year is the 1st part
              joinMonthNum = parseInt(parts[1]); // Month is the 2nd part
              console.log(`   Extracted: Year=${joinYear}, Month=${joinMonthNum}`);
            }
          }
          // Handle M/D/YYYY format (e.g., "11/3/2025" for November 3, 2025)
          else if (typeof joinDateRaw === 'string' && joinDateRaw.includes('/')) {
            const parts = joinDateRaw.split('/');
            console.log(`   Date format: String with / (parts: ${parts.join(', ')})`);
            if (parts.length === 3) {
              joinMonthNum = parseInt(parts[0]); // Month is the 1st part
              joinYear = parseInt(parts[2]); // Year is the 3rd part
              console.log(`   Extracted: Year=${joinYear}, Month=${joinMonthNum}`);
            }
          }
          // Handle Excel serial number
          else if (typeof joinDateRaw === 'number' && joinDateRaw > 0 && joinDateRaw < 100000) {
            console.log(`   Date format: Excel serial number (${joinDateRaw})`);
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + joinDateRaw * 86400000);
            joinYear = jsDate.getFullYear();
            joinMonthNum = jsDate.getMonth() + 1; // getMonth() returns 0-11
            console.log(`   Extracted: Year=${joinYear}, Month=${joinMonthNum}`);
          }
          // Handle Date object
          else if (joinDateRaw instanceof Date) {
            console.log(`   Date format: Date object`);
            joinYear = joinDateRaw.getFullYear();
            joinMonthNum = joinDateRaw.getMonth() + 1;
            console.log(`   Extracted: Year=${joinYear}, Month=${joinMonthNum}`);
          } else {
            console.log(`   ⚠️ Date format not recognized (type: ${typeof joinDateRaw})`);
          }

          // Use extracted month for this row (format: YYYY-MM)
          if (joinYear && joinMonthNum) {
            const monthStr = joinMonthNum.toString().padStart(2, '0');
            finalMonth = `${joinYear}-${monthStr}`;
            console.log(`   Final month: ${finalMonth}`);

            // Skip this row if the extracted month doesn't match the selected upload month
            if (finalMonth !== uploadMonth) {
              console.log(`   ❌ SKIPPED: Extracted month ${finalMonth} doesn't match upload month ${uploadMonth}`);
              return; // Skip to next row
            }

            console.log(`   ✅ INCLUDED: Month ${finalMonth} matches upload month ${uploadMonth}`);
          } else {
            // If we couldn't extract the month from joinDate, skip the row for Analyst
            console.log(`   ❌ SKIPPED: Could not extract month from joinDate`);
            return;
          }
        } else {
          // If no joinDate for Analyst, skip the row
          console.log(`   ❌ SKIPPED: No joinDate found`);
          return;
        }
      }

      // NEW: Extract month from productionDate for Phoenix
      if (companyName === 'הפניקס' || companyName === 'The Phoenix (Including excellence)' || companyName === 'Phoenix') {
        const productionDateRaw = row[mapping.columns.productionDate];
        console.log(`\n🔍 Processing Phoenix row ${index + 1}:`);
        console.log(`   Production date raw:`, productionDateRaw);
        console.log(`   Upload month:`, uploadMonth);

        if (productionDateRaw) {
          // Parse production date to extract year and month
          let productionYear = null;
          let productionMonthNum = null;

          // Handle DD/MM/YYYY format (e.g., "01/07/2025" for July 1, 2025)
          if (typeof productionDateRaw === 'string' && productionDateRaw.includes('/')) {
            const parts = productionDateRaw.split('/');
            console.log(`   Date format: DD/MM/YYYY string (parts: ${parts.join(', ')})`);
            if (parts.length === 3) {
              productionMonthNum = parseInt(parts[1]); // Month is the 2nd part
              productionYear = parseInt(parts[2]); // Year is the 3rd part
              console.log(`   Extracted: Year=${productionYear}, Month=${productionMonthNum}`);
            }
          }
          // Handle Excel serial number
          else if (typeof productionDateRaw === 'number' && productionDateRaw > 0 && productionDateRaw < 100000) {
            console.log(`   Date format: Excel serial number (${productionDateRaw})`);
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + productionDateRaw * 86400000);
            productionYear = jsDate.getFullYear();
            productionMonthNum = jsDate.getMonth() + 1; // getMonth() returns 0-11
            console.log(`   Extracted: Year=${productionYear}, Month=${productionMonthNum}`);
          }
          // Handle Date object
          else if (productionDateRaw instanceof Date) {
            console.log(`   Date format: Date object`);
            productionYear = productionDateRaw.getFullYear();
            productionMonthNum = productionDateRaw.getMonth() + 1;
            console.log(`   Extracted: Year=${productionYear}, Month=${productionMonthNum}`);
          } else {
            console.log(`   ⚠️ Date format not recognized (type: ${typeof productionDateRaw})`);
          }

          // Use extracted month for this row (format: YYYY-MM)
          if (productionYear && productionMonthNum) {
            const monthStr = productionMonthNum.toString().padStart(2, '0');
            finalMonth = `${productionYear}-${monthStr}`;
            console.log(`   Final month: ${finalMonth}`);

            // Skip this row if the extracted month doesn't match the selected upload month
            if (finalMonth !== uploadMonth) {
              console.log(`   ❌ SKIPPED: Extracted month ${finalMonth} doesn't match upload month ${uploadMonth}`);
              return; // Skip to next row
            }

            console.log(`   ✅ INCLUDED: Month ${finalMonth} matches upload month ${uploadMonth}`);
          } else {
            // If we couldn't extract the month from productionDate, skip the row for Phoenix
            console.log(`   ❌ SKIPPED: Could not extract month from productionDate`);
            return;
          }
        } else {
          // If no productionDate for Phoenix, skip the row
          console.log(`   ❌ SKIPPED: No productionDate found`);
          return;
        }
      }

      // NEW: Extract month from date (תאריך) for Menorah
      if (companyName === 'מנורה' || companyName === 'Menorah') {
        const dateRaw = row[mapping.columns.date];
        console.log(`\n🔍 Processing Menorah row ${index + 1}:`);
        console.log(`   Date (תאריך) raw:`, dateRaw);
        console.log(`   Upload month:`, uploadMonth);

        let menorahYear = null;
        let menorahMonthNum = null;

        if (dateRaw) {
          // Handle DD/MM/YYYY format (e.g., "16/12/2025")
          if (typeof dateRaw === 'string' && dateRaw.includes('/')) {
            const parts = dateRaw.split('/');
            console.log(`   Date format: DD/MM/YYYY string (parts: ${parts.join(', ')})`);
            if (parts.length === 3) {
              menorahMonthNum = parseInt(parts[1]); // Month is the 2nd part
              menorahYear = parseInt(parts[2]); // Year is the 3rd part
              console.log(`   Extracted: Year=${menorahYear}, Month=${menorahMonthNum}`);
            }
          }
          // Handle Excel serial number
          else if (typeof dateRaw === 'number' && dateRaw > 0 && dateRaw < 100000) {
            console.log(`   Date format: Excel serial number (${dateRaw})`);
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + dateRaw * 86400000);
            menorahYear = jsDate.getFullYear();
            menorahMonthNum = jsDate.getMonth() + 1;
            console.log(`   Extracted: Year=${menorahYear}, Month=${menorahMonthNum}`);
          }
          // Handle Date object
          else if (dateRaw instanceof Date) {
            console.log(`   Date format: Date object`);
            menorahYear = dateRaw.getFullYear();
            menorahMonthNum = dateRaw.getMonth() + 1;
            console.log(`   Extracted: Year=${menorahYear}, Month=${menorahMonthNum}`);
          }
        }

        // Check if we successfully extracted month
        if (menorahYear && menorahMonthNum) {
          const monthStr = menorahMonthNum.toString().padStart(2, '0');
          finalMonth = `${menorahYear}-${monthStr}`;
          console.log(`   Final month: ${finalMonth}`);

          // Skip this row if the extracted month doesn't match the selected upload month
          if (finalMonth !== uploadMonth) {
            console.log(`   ❌ SKIPPED: Extracted month ${finalMonth} doesn't match upload month ${uploadMonth}`);
            return;
          }

          console.log(`   ✅ INCLUDED: Month ${finalMonth} matches upload month ${uploadMonth}`);
        } else {
          // If we couldn't extract the month from תאריך column, skip the row
          console.log(`   ❌ SKIPPED: Could not extract month from "תאריך" column`);
          return;
        }
      }

      // NEW: Extract month number for Altshuler
      if (companyName === 'אלטשולר שחם' || companyName === 'Altshuler Shaham' || companyName === 'Altshuler') {
        console.log(`\n🔍 Processing Altshuler row ${index + 1}:`);
        console.log(`   Upload month:`, uploadMonth);

        const monthRaw = row[mapping.columns.month];
        console.log(`   "חודש" column value:`, monthRaw);

        if (monthRaw) {
          // Extract upload month number for comparison
          const [uploadYear, uploadMonthStr] = uploadMonth.split('-');
          const uploadMonthInt = parseInt(uploadMonthStr);
          console.log(`   Upload month number:`, uploadMonthInt);

          // Parse the month number from the Excel
          const monthNum = parseInt(monthRaw);
          console.log(`   Excel month number:`, monthNum);

          if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
            // Compare month numbers
            if (monthNum !== uploadMonthInt) {
              console.log(`   ❌ SKIPPED: Excel month ${monthNum} doesn't match upload month ${uploadMonthInt}`);
              return; // Skip to next row
            }

            console.log(`   ✅ INCLUDED: Month ${monthNum} matches upload month ${uploadMonthInt}`);
          } else {
            console.log(`   ❌ SKIPPED: Invalid month number "${monthRaw}"`);
            return;
          }
        } else {
          // If no month column for Altshuler, skip the row
          console.log(`   ❌ SKIPPED: No "חודש" column found`);
          return;
        }
      }

      // Note: Ayalon no longer needs date filtering (new template has no date-based row filtering)

      // Get product (no cleaning - keep original name for category matching)
      const rawProduct = row[mapping.columns.product];
      const product = rawProduct;

      // Parse output amount
      const outputStr = row[mapping.columns.output];
      const output = parseFloat(
        String(outputStr || 0).replace(/"/g, '').replace(/,/g, '')
      ) || 0;

      // Map all columns to database structure
      transformedData.push({
        company_id: companyId,
        month: finalMonth, // Use extracted month for Migdal, uploadMonth for others
        agent_name: agentName,
        agent_number: String(agentNumber),
        policy_number: row[mapping.columns.policyNumber] || null,
        collective: row[mapping.columns.collective] || null,
        insured_id: row[mapping.columns.insuredId] || null,
        insured_name: row[mapping.columns.insuredName] || null,
        secondary_insured_id: row[mapping.columns.secondaryInsuredId] || null,
        product_group: row[mapping.columns.productGroup] || null,
        product: product,
        coverage_type: row[mapping.columns.coverageType] || null,
        submission_date: formatDate(row[mapping.columns.submissionDate]),   
        production_date: formatDate(row[mapping.columns.productionDate]),    
        output: output,
        policy_status: row[mapping.columns.policyStatus] || null,
        life_monthly: row[mapping.columns.lifeMonthly] || null,
        arrears_months: row[mapping.columns.arrearsMonths] || null,

        // Ayalon-specific columns
        district: row[mapping.columns.district] || null,
        supervisor_name: row[mapping.columns.supervisorName] || null,
        main_agent_name_number: row[mapping.columns.mainAgentNameNumber] || null,
        main_agent_id: row[mapping.columns.mainAgentId] || null,
        secondary_agent_id: row[mapping.columns.secondaryAgentId] || null,
        insurance_type_name: row[mapping.columns.insuranceTypeName] || null,
        tariff: row[mapping.columns.tariff] || null,
        insured_birth_date: formatDate(row[mapping.columns.insuredBirthDate]),
        proposal_policy: row[mapping.columns.proposalPolicy] || null,
        tariff_number: row[mapping.columns.tariffNumber] || null,
        tariff_name: row[mapping.columns.tariffName] || null,
        tariff_status: row[mapping.columns.tariffStatus] || null,
        tariff_start_date: formatDate(row[mapping.columns.tariffStartDate]),
        tariff_cancellation_date: formatDate(row[mapping.columns.tariffCancellationDate]),
        proposal_date: formatDate(row[mapping.columns.proposalDate]),
        registration_date: formatDate(row[mapping.columns.registrationDate]),
        insurance_start_process: formatDate(row[mapping.columns.insuranceStartProcess]),
        policy_production_date: formatDate(row[mapping.columns.policyProductionDate]),
        coverage_production_date: formatDate(row[mapping.columns.coverageProductionDate]),
        proposal_date_alt: formatDate(row[mapping.columns.proposalDateAlt]),
        previous_policy_status: row[mapping.columns.previousPolicyStatus] || null,
        commission_type: row[mapping.columns.commissionType] || null,
        net_collection_premium: row[mapping.columns.netCollectionPremium] || null,
        gross_collection_premium: row[mapping.columns.grossCollectionPremium] || null,
        commission_premium_amount: row[mapping.columns.commissionPremiumAmount] || null,

        // Analyst-specific columns
        entity_type: row[mapping.columns.entityType] || null,
        valuation: row[mapping.columns.valuation] || null,
        agreement: row[mapping.columns.agreement] || null,
        recruiting_agreement: row[mapping.columns.recruitingAgreement] || null,
        agency_number: row[mapping.columns.agencyNumber] || null,
        agency_name: row[mapping.columns.agencyName] || null,
        member: row[mapping.columns.member] || null,
        account_code: row[mapping.columns.accountCode] || null,
        super_fund: row[mapping.columns.superFund] || null,
        branch: row[mapping.columns.branch] || null,
        account: row[mapping.columns.account] || null,
        branch_track_account: row[mapping.columns.branchTrackAccount] || null,
        join_date: formatDate(row[mapping.columns.joinDate]),
        balance: row[mapping.columns.balance] || null,
        commission_payable: row[mapping.columns.commissionPayable] || null,

        // Menorah-specific columns
        agent_license_hierarchy: row[mapping.columns.agentLicenseHierarchy] || null,
        agent_name_in_license_hierarchy: row[mapping.columns.agentNameInLicenseHierarchy] || null,
        consolidating_branch_license: row[mapping.columns.consolidatingBranchLicense] || null,
        branch_license: row[mapping.columns.branchLicense] || null,
        consolidating_agent_license: row[mapping.columns.consolidatingAgentLicense] || null,
        agent_license: row[mapping.columns.agentLicense] || null,
        managers_independents_status: row[mapping.columns.managersIndependentsStatus] || null,
        pension: row[mapping.columns.pension] || null,
        total_pension: row[mapping.columns.totalPension] || null,
        health_compensation: row[mapping.columns.healthCompensation] || null,
        health_branch_no_accidents: row[mapping.columns.healthBranchNoAccidents] || null,
        nursing_care: row[mapping.columns.nursingCare] || null,
        top_accidents: row[mapping.columns.topAccidents] || null,
        risk_no_mortgage_managers: row[mapping.columns.riskNoMortgageManagers] || null,
        risk_no_mortgage_private: row[mapping.columns.riskNoMortgagePrivate] || null,
        mortgage_risk: row[mapping.columns.mortgageRisk] || null,
        step_death_disability: row[mapping.columns.stepDeathDisability] || null,
        total_insurance: row[mapping.columns.totalInsurance] || null,
        gemel_training: row[mapping.columns.gemelTraining] || null,
        top_finance_investment_savings: row[mapping.columns.topFinanceInvestmentSavings] || null,
        third_age: row[mapping.columns.thirdAge] || null,
        total_financial: row[mapping.columns.totalFinancial] || null,

        // Mor-specific columns
        member_id: row[mapping.columns.memberId] || null,
        member_name: row[mapping.columns.memberName] || null,
        fund_number: row[mapping.columns.fundNumber] || null,
        fund_opening_date: formatDate(row[mapping.columns.fundOpeningDate]),
        product_type: row[mapping.columns.productType] || null,
        valid_forms_receipt_date: formatDate(row[mapping.columns.validFormsReceiptDate]),
        transaction_type: row[mapping.columns.transactionType] || null,
        value_date: formatDate(row[mapping.columns.valueDate]),
        transfer_date: formatDate(row[mapping.columns.transferDate]),
        transaction_amount: row[mapping.columns.transactionAmount] || null,
        supervising_agent: row[mapping.columns.supervisingAgent] || null,
        rewarded_agent_number: row[mapping.columns.rewardedAgentNumber] || null,
        rewarded_agent_license_number: row[mapping.columns.rewardedAgentLicenseNumber] || null,
        rewarded_agent_name: row[mapping.columns.rewardedAgentName] || null,
        rewarded_agent_type: row[mapping.columns.rewardedAgentType] || null,
        column1: row[mapping.columns.column1] || null,
        column2: row[mapping.columns.column2] || null,
        rewarded_agent_house_license_number: row[mapping.columns.rewardedAgentHouseLicenseNumber] || null,
        rewarded_agent_house_name: row[mapping.columns.rewardedAgentHouseName] || null,
        recruitment_month: row[mapping.columns.recruitmentMonth] || null,
        supervisor: row[mapping.columns.supervisor] || null,
        distribution_channel: row[mapping.columns.distributionChannel] || null,
        monthly_target: row[mapping.columns.monthlyTarget] || null,
        employer_id: row[mapping.columns.employerId] || null,
        employer_name: row[mapping.columns.employerName] || null,
        incentive: row[mapping.columns.incentive] || null,
        group_name: row[mapping.columns.groupName] || null,

        // Mediho-specific columns
        paid: row[mapping.columns.paid] || null,
        report_date: formatDate(row[mapping.columns.reportDate]),
        reference_date: formatDate(row[mapping.columns.referenceDate]),
        client_id: row[mapping.columns.clientId] || null,
        client_name: row[mapping.columns.clientName] || null,
        agent_id: row[mapping.columns.agentId] || null,
        mentor: row[mapping.columns.mentor] || null,
        client_premium: row[mapping.columns.clientPremium] || null,
        quantity: row[mapping.columns.quantity] || null,
        weighted_client_premium: row[mapping.columns.weightedClientPremium] || null,
        agent_commission: row[mapping.columns.agentCommission] || null,
        details: row[mapping.columns.details] || null,
        classification: row[mapping.columns.classification] || null,
        notes: row[mapping.columns.notes] || null,

        // Migdal-specific columns
        measurement_basis_name: row[mapping.columns.measurementBasisName] || null,
        total_measured_premium: row[mapping.columns.totalMeasuredPremium] || null,
        registration_date: formatDate(row[mapping.columns.registrationDate]),

        // Harel-specific columns
        private_risk: row[mapping.columns.privateRisk] || null,
        pension_harel: row[mapping.columns.pensionHarel] || null,
        savings_products_no_financials: row[mapping.columns.savingsProductsNoFinancials] || null,
        pension_transfer_net: row[mapping.columns.pensionTransferNet] || null,
        nursing_care_harel: row[mapping.columns.nursingCareHarel] || null,

        // Hachshara-specific columns
        one_time_premium: row[mapping.columns.oneTimePremium] || null,

        //  ADD: Altshuler-specific columns (15 new columns)
establishment_date: formatDate(row[mapping.columns.establishmentDate]),
agent_super_license: row[mapping.columns.agentSuperLicense] || null,
weighted_interest_accumulation_pct: row[mapping.columns.weightedInterestAccumulationPct] === '-' ? null : row[mapping.columns.weightedInterestAccumulationPct] || null,
weighted_interest_deposit_pct: row[mapping.columns.weightedInterestDepositPct] === '-' ? null : row[mapping.columns.weightedInterestDepositPct] || null,
internal_transfer_by_join_date: row[mapping.columns.internalTransferByJoinDate] === '-' ? null : row[mapping.columns.internalTransferByJoinDate] || null,
third_tier_agency_plan: row[mapping.columns.thirdTierAgencyPlan] || null,
third_tier_agency_license_plan: row[mapping.columns.thirdTierAgencyLicensePlan] || null,
third_tier_agency: row[mapping.columns.thirdTierAgency] || null,
third_tier_agency_license: row[mapping.columns.thirdTierAgencyLicense] || null,
expected_deposits_count: row[mapping.columns.expectedDepositsCount] === '-' ? null : row[mapping.columns.expectedDepositsCount] || null,
actual_deposits_last_year: row[mapping.columns.actualDepositsLastYear] === '-' ? null : row[mapping.columns.actualDepositsLastYear] || null,
gross_annual_premium: row[mapping.columns.grossAnnualPremium] || null,
cancellations_year_a: row[mapping.columns.cancellationsYearA] === '-' ? null : row[mapping.columns.cancellationsYearA] || null,
cancellations_year_b: row[mapping.columns.cancellationsYearB] === '-' ? null : row[mapping.columns.cancellationsYearB] || null,
weighted_sales_mgmt_fees_transactions: row[mapping.columns.weightedSalesMgmtFeesTransactions] === '-' ? null : row[mapping.columns.weightedSalesMgmtFeesTransactions] || null,

//  ADD: Clal-specific columns (27 new columns)
region_name: row[mapping.columns.regionName] || null,
central_supervisor_name: row[mapping.columns.centralSupervisorName] || null,
licensed_business_name: row[mapping.columns.licensedBusinessName] || null,
licensed_business_number: row[mapping.columns.licensedBusinessNumber] || null,
total_new_business: row[mapping.columns.totalNewBusiness] || null,
health_business: row[mapping.columns.healthBusiness] || null,
nursing_care_business: row[mapping.columns.nursingCareBusiness] || null,
health_without_nursing: row[mapping.columns.healthWithoutNursing] || null,
risk_business: row[mapping.columns.riskBusiness] || null,
pure_risk: row[mapping.columns.pureRisk] || null,
executive_risk: row[mapping.columns.executiveRisk] || null,
mortgage_risk_shoham: row[mapping.columns.mortgageRiskShoham] || null,
executive_profile: row[mapping.columns.executiveProfile] || null,
new_pension_fund: row[mapping.columns.newPensionFund] || null,
financial_detail_regular: row[mapping.columns.financialDetailRegular] || null,
financial_detail_one_time: row[mapping.columns.financialDetailOneTime] || null,
agency_above_id: row[mapping.columns.agencyAboveId] || null,
agency_above_name: row[mapping.columns.agencyAboveName] || null,
lead_agent_number: row[mapping.columns.leadAgentNumber] || null,
lead_agent_name: row[mapping.columns.leadAgentName] || null,
agency_flag: row[mapping.columns.agencyFlag] || null,
q_id: row[mapping.columns.qId] || null,
incoming_transfer: row[mapping.columns.incomingTransfer] || null,
outgoing_transfer: row[mapping.columns.outgoingTransfer] || null,
net_transfer: row[mapping.columns.netTransfer] || null,
leading_region: row[mapping.columns.leadingRegion] || null,
agent_above_name: row[mapping.columns.agentAboveName] || null,
      });

    } catch (error) {
      errors.push(`Row ${index + 2}: ${error.message}`);
    }
  });

  return {
    success: errors.length === 0,
    data: transformedData,
    errors: errors,
    summary: {
      totalRows: excelData.length,
      rowsProcessed: transformedData.length,
      errorsCount: errors.length
    }
  };
}

module.exports = {
  parseExcelData
};