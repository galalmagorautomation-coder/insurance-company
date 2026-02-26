/**
 * Aggregation Service
 * Processes raw_data and creates aggregated totals for agents
 */

const supabase = require('../config/supabase');
const {
  PRODUCT_CATEGORIES,
  getCompanyConfig
} = require('../config/productCategoryMappings');

/**
 * Aggregate data for a specific company and month after upload
 * @param {number} companyId - Company ID
 * @param {string} month - Month in YYYY-MM format
 */
async function aggregateAfterUpload(companyId, month) {
  console.log(`Starting aggregation for company ${companyId}, month ${month}`);

  try {
    const config = getCompanyConfig(companyId);
    if (!config) {
      throw new Error(`No config found for company ${companyId}`);
    }

    // Step 1: Get company column mapping
    const companyColumnMap = {
      1: 'ayalon_agent_id',
      2: 'altshuler_agent_id',
      3: 'analyst_agent_id',      
      4: 'hachshara_agent_id',
      5: 'phoenix_agent_id',
      6: 'harel_agent_id',
      7: 'clal_agent_id',
      8: 'migdal_agent_id',
      9: 'mediho_agent_id',       
      10: 'mor_agent_id',
      11: 'menorah_agent_id',
      28: 'meitav_agent_id'
    };

    const agentIdColumn = companyColumnMap[companyId];
    if (!agentIdColumn) {
      throw new Error(`No agent column mapping for company ${companyId}`);
    }

    // Step 2: Get all agents for this company
    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select('*')
      .contains('company_id', [companyId]);

    if (agentsError) throw agentsError;
    if (!agents || agents.length === 0) {
      console.log(`No agents found for company ${companyId}`);
      return { success: true, agentsProcessed: 0 };
    }

    // Step 3: Collect all agent numbers
    const agentNumbers = [];
    agents.forEach(agent => {
      const agentNumber = agent[agentIdColumn];
      if (agentNumber) {
        const ids = agentNumber.split(',').map(id => id.trim());
        agentNumbers.push(...ids);
      }
    });

    if (agentNumbers.length === 0) {
      console.log(`No agent numbers found for company ${companyId}`);
      return { success: true, agentsProcessed: 0 };
    }

    // Step 4: Fetch raw data in batches using range (more reliable than limit)
    console.log('Fetching raw data in batches...');
    const rawData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('raw_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('month', month)
        .in('agent_number', agentNumbers)
        .neq('agent_name', 'No Data - Empty File') // Exclude placeholder rows
        .range(from, from + batchSize - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        rawData.push(...data);
        console.log(`Fetched batch: ${data.length} rows (total so far: ${rawData.length})`);
        from += batchSize;
        hasMore = data.length === batchSize; // Stop if we got less than batch size
      } else {
        hasMore = false;
      }
    }

    // Note: Don't return early if rawData is empty - there might be unmapped data
    if (rawData.length === 0) {
      console.log(`No raw data found for known agents (company ${companyId}, month ${month})`);
    } else {
      console.log(`Processing ${rawData.length} raw data rows`);
    }

    // Step 5: Process data based on company type
    const agentTotals = processCompanyData(config, rawData);

    // Step 6: Handle special cases (Menorah subtract agents)
    if (config.subtractAgents && config.subtractAgents.length > 0) {
      handleSubtractAgents(config, agentTotals, agents, agentIdColumn);
    }

    // Step 7: Build aggregation records
    const aggregationRecords = [];

    agents.forEach(agent => {
      const agentNumber = agent[agentIdColumn];
      if (!agentNumber) return;

      // Check exclusions
      if (config.excludeAgents && config.excludeAgents.some(excluded =>
        agent.agent_name && agent.agent_name.includes(excluded)
      )) {
        return;
      }

      const ids = agentNumber.split(',').map(id => id.trim());

      // Sum totals from all IDs for this agent
      let pension = 0, risk = 0, financial = 0, pensionTransfer = 0;

      ids.forEach(id => {
        if (agentTotals[id]) {
          pension += agentTotals[id][PRODUCT_CATEGORIES.PENSION];
          risk += agentTotals[id][PRODUCT_CATEGORIES.RISK];
          financial += agentTotals[id][PRODUCT_CATEGORIES.FINANCIAL];
          pensionTransfer += agentTotals[id][PRODUCT_CATEGORIES.PENSION_TRANSFER];
        }
      });

      aggregationRecords.push({
        agent_id: agent.id,
        company_id: companyId,
        month: month,
        pension: pension,
        risk: risk,
        financial: financial,
        pension_transfer: pensionTransfer
      });
    });

    // Step 8: Handle unmapped rows (rows not matching any known agent)
    console.log('Fetching unmapped rows...');
    const unmappedRawData = [];
    let unmappedFrom = 0;
    let hasMoreUnmapped = true;

    while (hasMoreUnmapped) {
      const { data, error } = await supabase
        .from('raw_data')
        .select('*')
        .eq('company_id', companyId)
        .eq('month', month)
        .not('agent_number', 'in', `(${agentNumbers.join(',')})`)
        .neq('agent_name', 'No Data - Empty File') // Exclude placeholder rows
        .range(unmappedFrom, unmappedFrom + batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        unmappedRawData.push(...data);
        console.log(`Fetched unmapped batch: ${data.length} rows (total so far: ${unmappedRawData.length})`);
        unmappedFrom += batchSize;
        hasMoreUnmapped = data.length === batchSize;
      } else {
        hasMoreUnmapped = false;
      }
    }

    // Step 9: Aggregate unmapped rows to the UNMAPPED agent
    if (unmappedRawData.length > 0) {
      console.log(`Processing ${unmappedRawData.length} unmapped rows`);

      // Get the unmapped agent for this company
      const { data: unmappedAgent, error: unmappedAgentError } = await supabase
        .from('agent_data')
        .select('id')
        .eq('agent_id', `UNMAPPED_${companyId}`)
        .single();

      if (unmappedAgentError || !unmappedAgent) {
        console.error(`Warning: No unmapped agent found for company ${companyId}. Skipping unmapped aggregation.`);
      } else {
        // Process unmapped data using the same logic
        const unmappedTotals = processCompanyData(config, unmappedRawData);

        // Sum all unmapped totals (they may have different agent_numbers)
        let totalPension = 0, totalRisk = 0, totalFinancial = 0, totalPensionTransfer = 0;

        Object.values(unmappedTotals).forEach(totals => {
          totalPension += totals[PRODUCT_CATEGORIES.PENSION];
          totalRisk += totals[PRODUCT_CATEGORIES.RISK];
          totalFinancial += totals[PRODUCT_CATEGORIES.FINANCIAL];
          totalPensionTransfer += totals[PRODUCT_CATEGORIES.PENSION_TRANSFER];
        });

        // Add unmapped aggregation record
        aggregationRecords.push({
          agent_id: unmappedAgent.id,
          company_id: companyId,
          month: month,
          pension: totalPension,
          risk: totalRisk,
          financial: totalFinancial,
          pension_transfer: totalPensionTransfer
        });

        console.log(`Added unmapped aggregation: Pension=${totalPension}, Risk=${totalRisk}, Financial=${totalFinancial}, Transfer=${totalPensionTransfer}`);
      }
    } else {
      console.log('No unmapped rows found');
    }

    // Step 10: Deduplicate records before upserting (merge duplicate agent_id + company_id + month)
    const deduplicatedRecords = {};
    aggregationRecords.forEach(record => {
      const key = `${record.agent_id}-${record.company_id}-${record.month}`;
      if (!deduplicatedRecords[key]) {
        deduplicatedRecords[key] = record;
      } else {
        // Merge totals if duplicate found
        deduplicatedRecords[key].pension += record.pension;
        deduplicatedRecords[key].risk += record.risk;
        deduplicatedRecords[key].financial += record.financial;
        deduplicatedRecords[key].pension_transfer += record.pension_transfer;
      }
    });

    let finalRecords = Object.values(deduplicatedRecords);

    // Step 10.5: Clal cumulative-to-monthly conversion
    // For Clal (company 7) Format 1 & 2, the data is year-to-date cumulative
    // We need to subtract previous months in the same year to get monthly values
    // Format 3 (policy-level) is already monthly and doesn't need conversion
    if (companyId === 7 && config.isCumulative) {
      // Check if data is from Format 3 (policy-level) by looking for product_category in raw data
      const hasPolicyLevelData = rawData.some(row => row.product_category);

      if (hasPolicyLevelData) {
        console.log('Clal Format 3 detected (policy-level) - data is already monthly, no conversion needed');
      } else {
        console.log('Clal Format 1/2 detected (cumulative) - applying YTD to monthly conversion');
        finalRecords = await convertCumulativeToMonthly(finalRecords, companyId, month);
      }
    }

    // Step 11: Upsert into agent_aggregations table
    if (finalRecords.length > 0) {
      const { data, error: upsertError } = await supabase
        .from('agent_aggregations')
        .upsert(finalRecords, {
          onConflict: 'agent_id,company_id,month'
        });

      if (upsertError) throw upsertError;

      console.log(`Successfully aggregated ${finalRecords.length} agent records (deduplicated from ${aggregationRecords.length})`);
    }

    return {
      success: true,
      agentsProcessed: aggregationRecords.length,
      rawDataRows: rawData.length,
      unmappedRows: unmappedRawData.length
    };

  } catch (error) {
    console.error('Aggregation error:', error);
    throw error;
  }
}

/**
 * Process company data based on type
 */
function processCompanyData(config, rawData) {
  const agentTotals = {};

  rawData.forEach(row => {
    const agentNumber = row.agent_number;

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    // Check if this row has a product_category (Clal Format 3 policy-level data)
    // If so, process it using policy-level logic instead of company config
    if (row.product_category && config.policyLevelConfig) {
      processPolicyLevel(config, row, agentTotals[agentNumber]);
      return; // Use return in forEach context
    }

    switch (config.type) {
      case 'SIMPLE':
        processSimple(config, row, agentTotals[agentNumber]);
        break;

      case 'FILTER_BY_PRODUCT':
        processFilterByProduct(config, row, agentTotals[agentNumber]);
        break;

      case 'COLUMN_BASED':
        processColumnBased(config, row, agentTotals[agentNumber]);
        break;

      case 'COLUMN_BASED_WITH_SUBTRACTION':
        processColumnBasedWithSubtraction(config, row, agentTotals[agentNumber]);
        break;

      case 'MULTI_SHEET_FORMULAS':
        processMultiSheetFormulas(config, row, agentTotals[agentNumber]);
        break;
    }
  });

  return agentTotals;
}

function processSimple(config, row, totals) {
  const amount = parseFloat(row[config.amountColumn]) || 0;
  console.log(`[SIMPLE] Agent ${row.agent_number}: column=${config.amountColumn}, value=${row[config.amountColumn]}, parsed=${amount}, category=${config.category}`);
  totals[config.category] += amount;
}

function processFilterByProduct(config, row, totals) {
  const productName = row[config.productColumn];
  const amount = parseFloat(row[config.amountColumn]) || 0;

  if (amount === 0) return;
  
  //  ADD: Check if product should be excluded
  if (config.excludeProducts && config.excludeProducts.includes(productName)) return;
  
  if (config.excludeAgents && config.excludeAgents.includes(productName)) return;

  const category = config.categoryMappings[productName];
  if (category) {
    totals[category] += amount;
  }
}

function processColumnBased(config, row, totals) {
  if (config.statusColumn && row[config.statusColumn] !== config.statusFilter) {
    return;
  }

  Object.entries(config.formulas).forEach(([category, formula]) => {
    let sum = 0;
    formula.columns.forEach(col => {
      sum += parseFloat(row[col]) || 0;
    });
    totals[category] += sum;
  });
}

function processColumnBasedWithSubtraction(config, row, totals) {
  Object.entries(config.formulas).forEach(([category, formula]) => {
    if (formula.operation === 'SUBTRACT') {
      let total = parseFloat(row[formula.base]) || 0;
      formula.subtract.forEach(col => {
        total -= parseFloat(row[col]) || 0;
      });
      totals[category] += total;
    } else {
      let sum = 0;
      formula.columns.forEach(col => {
        sum += parseFloat(row[col]) || 0;
      });
      totals[category] += sum;
    }
  });
}

function processMultiSheetFormulas(config, row, totals) {
  // Identify sheet type based on DATABASE column presence
  let sheetType = null;
  
  // Tab 2 (Gemel) - has one_time_premium (unique to gemel)
  if (row.one_time_premium !== null && row.one_time_premium !== undefined) {
    sheetType = 'gemel';
  } 
  // Tab 1 (Pension) - has gross_annual_premium (unique to pension)
  else if (row.gross_annual_premium !== null && row.gross_annual_premium !== undefined) {
    sheetType = 'pension';
  }

  if (!sheetType || !config.sheets[sheetType]) {
    console.log(`Could not determine sheet type for row with agent: ${row.agent_number}`);
    return;
  }

  const sheetConfig = config.sheets[sheetType];
  Object.entries(sheetConfig.formulas).forEach(([category, formula]) => {
    let sum = 0;
    formula.columns.forEach(col => {
      const value = parseFloat(row[col]) || 0;
      sum += value;
    });
    
    if (sum > 0) {
      console.log(`[${sheetType}] Agent ${row.agent_number}: ${category} = ${sum}`);
    }
    
    totals[category] += sum;
  });
}

function handleSubtractAgents(config, agentTotals, agents, agentIdColumn) {
  const galAlmgor = agents.find(agent => 
    agent.agent_name && agent.agent_name.includes('גל אלמגור')
  );

  if (!galAlmgor) return;

  const galAgentNumber = galAlmgor[agentIdColumn];
  if (!galAgentNumber) return;

  const subtractAgentsList = agents.filter(agent =>
    config.subtractAgents.some(name => 
      agent.agent_name && agent.agent_name.includes(name)
    )
  );

  subtractAgentsList.forEach(agent => {
    const agentNumber = agent[agentIdColumn];
    if (!agentNumber) return;

    const ids = agentNumber.split(',').map(id => id.trim());
    
    ids.forEach(id => {
      if (agentTotals[id] && agentTotals[galAgentNumber]) {
        agentTotals[galAgentNumber][PRODUCT_CATEGORIES.PENSION] -= agentTotals[id][PRODUCT_CATEGORIES.PENSION];
        agentTotals[galAgentNumber][PRODUCT_CATEGORIES.RISK] -= agentTotals[id][PRODUCT_CATEGORIES.RISK];
        agentTotals[galAgentNumber][PRODUCT_CATEGORIES.FINANCIAL] -= agentTotals[id][PRODUCT_CATEGORIES.FINANCIAL];
        agentTotals[galAgentNumber][PRODUCT_CATEGORIES.PENSION_TRANSFER] -= agentTotals[id][PRODUCT_CATEGORIES.PENSION_TRANSFER];
      }
    });
  });
}

function initializeTotals() {
  return {
    [PRODUCT_CATEGORIES.PENSION]: 0,
    [PRODUCT_CATEGORIES.RISK]: 0,
    [PRODUCT_CATEGORIES.FINANCIAL]: 0,
    [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
  };
}

/**
 * Process policy-level data where each row has a pre-determined category
 * Used for Clal Format 3 (policy-level data from "רמת פוליסה" sheet)
 */
function processPolicyLevel(config, row, totals) {
  const policyConfig = config.policyLevelConfig;
  if (!policyConfig) return;

  const category = row[policyConfig.categoryColumn];
  const amount = parseFloat(row[policyConfig.amountColumn]) || 0;

  // Map category string to PRODUCT_CATEGORIES constant
  const categoryMap = {
    'RISK': PRODUCT_CATEGORIES.RISK,
    'PENSION': PRODUCT_CATEGORIES.PENSION,
    'FINANCIAL': PRODUCT_CATEGORIES.FINANCIAL,
    'PENSION_TRANSFER': PRODUCT_CATEGORIES.PENSION_TRANSFER
  };

  const mappedCategory = categoryMap[category];
  if (mappedCategory && totals[mappedCategory] !== undefined) {
    totals[mappedCategory] += amount;
  }
}

/**
 * Convert cumulative YTD aggregations to monthly values
 * by subtracting sum of previous months in same year
 * Used for Clal Format 1 & 2 (cumulative data)
 *
 * @param {Array} aggregationRecords - Records with YTD cumulative values
 * @param {number} companyId - Company ID
 * @param {string} month - Month in YYYY-MM format
 * @returns {Promise<Array>} - Records with monthly values
 */
async function convertCumulativeToMonthly(aggregationRecords, companyId, month) {
  const [year, monthNum] = month.split('-').map(Number);

  // If January, no previous months to subtract - YTD = Monthly
  if (monthNum === 1) {
    console.log('January upload - no previous months to subtract, using YTD as monthly');
    return aggregationRecords;
  }

  // Build list of previous months in same year (Jan to month-1)
  const previousMonths = [];
  for (let m = 1; m < monthNum; m++) {
    previousMonths.push(`${year}-${String(m).padStart(2, '0')}`);
  }

  console.log(`Fetching previous months for cumulative conversion: ${previousMonths.join(', ')}`);

  // Fetch previous aggregations for all agents
  const { data: previousAggregations, error } = await supabase
    .from('agent_aggregations')
    .select('agent_id, pension, risk, financial, pension_transfer')
    .eq('company_id', companyId)
    .in('month', previousMonths);

  if (error) {
    console.error('Error fetching previous aggregations:', error);
    throw error;
  }

  if (!previousAggregations || previousAggregations.length === 0) {
    console.warn(`No previous months found for ${year}. This may be the first upload for this year. Using YTD as-is.`);
    return aggregationRecords;
  }

  // Sum previous months by agent_id
  const previousTotals = {};
  previousAggregations.forEach(agg => {
    if (!previousTotals[agg.agent_id]) {
      previousTotals[agg.agent_id] = {
        pension: 0,
        risk: 0,
        financial: 0,
        pension_transfer: 0
      };
    }
    previousTotals[agg.agent_id].pension += agg.pension || 0;
    previousTotals[agg.agent_id].risk += agg.risk || 0;
    previousTotals[agg.agent_id].financial += agg.financial || 0;
    previousTotals[agg.agent_id].pension_transfer += agg.pension_transfer || 0;
  });

  console.log(`Found previous totals for ${Object.keys(previousTotals).length} agents`);

  // Subtract previous totals from current YTD to get monthly values
  aggregationRecords.forEach(record => {
    if (previousTotals[record.agent_id]) {
      const prev = previousTotals[record.agent_id];
      const originalPension = record.pension;
      const originalRisk = record.risk;
      const originalFinancial = record.financial;
      const originalTransfer = record.pension_transfer;

      record.pension = record.pension - prev.pension;
      record.risk = record.risk - prev.risk;
      record.financial = record.financial - prev.financial;
      record.pension_transfer = record.pension_transfer - prev.pension_transfer;

      // Log significant conversions for debugging
      if (originalPension !== record.pension || originalRisk !== record.risk ||
          originalFinancial !== record.financial || originalTransfer !== record.pension_transfer) {
        console.log(`  Agent ${record.agent_id}: YTD(${originalPension},${originalRisk},${originalFinancial},${originalTransfer}) - Prev(${prev.pension},${prev.risk},${prev.financial},${prev.pension_transfer}) = Monthly(${record.pension},${record.risk},${record.financial},${record.pension_transfer})`);
      }
    }
  });

  console.log('Cumulative-to-monthly conversion complete');
  return aggregationRecords;
}

module.exports = {
  aggregateAfterUpload,
  convertCumulativeToMonthly  // Export for potential use in scripts
};