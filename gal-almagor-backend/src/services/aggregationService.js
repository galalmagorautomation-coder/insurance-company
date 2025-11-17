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
      11: 'menorah_agent_id'
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

    if (rawData.length === 0) {
      console.log(`No raw data found for company ${companyId}, month ${month}`);
      return { success: true, agentsProcessed: 0 };
    }

    console.log(`Processing ${rawData.length} raw data rows`);

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

    // Step 8: Upsert into agent_aggregations table
    if (aggregationRecords.length > 0) {
      const { data, error: upsertError } = await supabase
        .from('agent_aggregations')
        .upsert(aggregationRecords, {
          onConflict: 'agent_id,company_id,month'
        });

      if (upsertError) throw upsertError;

      console.log(`Successfully aggregated ${aggregationRecords.length} agent records`);
    }

    return {
      success: true,
      agentsProcessed: aggregationRecords.length,
      rawDataRows: rawData.length
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
  totals[config.category] += amount;
}

function processFilterByProduct(config, row, totals) {
  const productName = row[config.productColumn];
  const amount = parseFloat(row[config.amountColumn]) || 0;

  if (amount === 0) return;
  
  // ✅ ADD: Check if product should be excluded
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

module.exports = {
  aggregateAfterUpload
};