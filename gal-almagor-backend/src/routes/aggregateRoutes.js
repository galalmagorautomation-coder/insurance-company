const express = require('express');
const supabase = require('../config/supabase');
const {
  PRODUCT_CATEGORIES,
  getCompanyConfig,
  shouldExcludeAgent,
  calculateCategoryTotals 
} = require('../config/productCategoryMappings');

const router = express.Router();

// GET aggregated agent data by company and month range
router.get('/agents', async (req, res) => {
  try {
    const { 
      company_id, 
      start_month, 
      end_month,
      department,
      inspector,
      agent_name 
    } = req.query;

    // Validate required parameters
    if (!start_month || !end_month) {
      return res.status(400).json({
        success: false,
        message: 'start_month and end_month are required'
      });
    }

    // Get months array between start and end
    const months = getMonthsInRange(start_month, end_month);

    // Determine which companies to process
    let companyIdsToProcess = [];
    
    if (!company_id || company_id === 'all') {
      // Process all companies
      companyIdsToProcess = [1, 2, 4, 5, 6, 7, 8, 10, 11];
    } else {
      companyIdsToProcess = [parseInt(company_id)];
    }

    // Aggregate results from all companies
    const aggregatedResults = {};

    // Process each company
    for (const companyId of companyIdsToProcess) {
      const config = getCompanyConfig(companyId);
      if (!config) continue;

      // Step 1: Get agents for this specific company
      let agentQuery = supabase
        .from('agent_data')
        .select('*')
        .contains('company_id', [companyId]);

      // Apply additional filters
      if (department && department !== 'all') {
        agentQuery = agentQuery.eq('department', department);
      }
      if (inspector && inspector !== 'all') {
        agentQuery = agentQuery.eq('inspector', inspector);
      }
      if (agent_name && agent_name !== 'all') {
        agentQuery = agentQuery.eq('agent_name', agent_name);
      }

      const { data: agents, error: agentsError } = await agentQuery;

      if (agentsError) {
        console.error(`Error fetching agents for company ${companyId}:`, agentsError);
        continue;
      }

      if (!agents || agents.length === 0) continue;

      // Step 2: Get column name based on company_id
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
      if (!agentIdColumn) continue;

      // Step 3: Collect all agent numbers for this company
      const agentNumbers = [];
      agents.forEach(agent => {
        const agentNumber = agent[agentIdColumn];
        if (agentNumber) {
          const ids = agentNumber.split(',').map(id => id.trim());
          agentNumbers.push(...ids);
        }
      });

      if (agentNumbers.length === 0) {
        // Add agents with zero values
        agents.forEach(agent => {
          const agentKey = agent.agent_name;
          if (!aggregatedResults[agentKey]) {
            aggregatedResults[agentKey] = {
              ...agent,
              [PRODUCT_CATEGORIES.PENSION]: 0,
              [PRODUCT_CATEGORIES.RISK]: 0,
              [PRODUCT_CATEGORIES.FINANCIAL]: 0,
              [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
            };
          }
        });
        continue;
      }

      // Step 4: Fetch raw data for all months
      const { data: rawData, error: rawError } = await supabase
        .from('raw_data')
        .select('*')
        .eq('company_id', companyId)
        .in('month', months)
        .in('agent_number', agentNumbers);

      if (rawError) {
        console.error(`Error fetching raw data for company ${companyId}:`, rawError);
        continue;
      }

      // Step 5: Process data based on company type
      const agentTotals = await processCompanyData(companyId, config, rawData, months);

      // Step 6: Handle special cases - subtract agents (Menorah)
      if (config.subtractAgents && config.subtractAgents.length > 0) {
        await handleSubtractAgents(companyId, config, agentTotals, agents, agentIdColumn, months);
      }

      // Step 7: Merge totals with agent data
      agents.forEach(agent => {
        const agentNumber = agent[agentIdColumn];
        const agentKey = agent.agent_name;
        
        // Initialize if not exists
        if (!aggregatedResults[agentKey]) {
          aggregatedResults[agentKey] = {
            ...agent,
            [PRODUCT_CATEGORIES.PENSION]: 0,
            [PRODUCT_CATEGORIES.RISK]: 0,
            [PRODUCT_CATEGORIES.FINANCIAL]: 0,
            [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
          };
        }

        // Check if agent should be excluded for this company
        if (shouldExcludeAgent(companyId, agent.agent_name)) {
          return;
        }

        // Aggregate totals
        if (agentNumber) {
          const ids = agentNumber.split(',').map(id => id.trim());
          
          ids.forEach(id => {
            if (agentTotals[id]) {
              aggregatedResults[agentKey][PRODUCT_CATEGORIES.PENSION] += agentTotals[id][PRODUCT_CATEGORIES.PENSION];
              aggregatedResults[agentKey][PRODUCT_CATEGORIES.RISK] += agentTotals[id][PRODUCT_CATEGORIES.RISK];
              aggregatedResults[agentKey][PRODUCT_CATEGORIES.FINANCIAL] += agentTotals[id][PRODUCT_CATEGORIES.FINANCIAL];
              aggregatedResults[agentKey][PRODUCT_CATEGORIES.PENSION_TRANSFER] += agentTotals[id][PRODUCT_CATEGORIES.PENSION_TRANSFER];
            }
          });
        }
      });
    }

    // Convert to array
    const result = Object.values(aggregatedResults);


    // Get total count of raw_data rows matching the filters
let countQuery = supabase
.from('raw_data')
.select('*', { count: 'exact', head: true });

// Apply company filter
if (company_id && company_id !== 'all') {
countQuery = countQuery.eq('company_id', parseInt(company_id));
}

// Apply month range filter
countQuery = countQuery.in('month', months);

const { count: totalPolicies, error: countError } = await countQuery;

if (countError) {
console.error('Error counting raw_data:', countError);
}

res.json({
success: true,
data: result,
totalPolicies: totalPolicies || 0
});
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in aggregated agents:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred',
      error: error.message
    });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get array of months between start and end (inclusive)
 */
function getMonthsInRange(startMonth, endMonth) {
  const months = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');

  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Process company data based on company type
 */
async function processCompanyData(companyId, config, rawData, months) {
  const agentTotals = {};

  switch (config.type) {
    case 'SIMPLE':
      return processSimpleCompany(config, rawData, agentTotals);

    case 'FILTER_BY_PRODUCT':
      return processFilterByProduct(config, rawData, agentTotals);

    case 'COLUMN_BASED':
      return processColumnBased(config, rawData, agentTotals);

    case 'COLUMN_BASED_WITH_SUBTRACTION':
      return processColumnBasedWithSubtraction(config, rawData, agentTotals);

    case 'MULTI_SHEET_FORMULAS':
      return processMultiSheetFormulas(companyId, config, rawData, agentTotals, months);

    default:
      return agentTotals;
  }
}

/**
 * Process SIMPLE type (Mor)
 */
function processSimpleCompany(config, rawData, agentTotals) {
  rawData.forEach(row => {
    const agentNumber = row.agent_number;
    const amount = parseFloat(row[config.amountColumn]) || 0;

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    agentTotals[agentNumber][config.category] += amount;
  });

  return agentTotals;
}

/**
 * Process FILTER_BY_PRODUCT type (Ayalon, Phoenix, Migdal)
 */
function processFilterByProduct(config, rawData, agentTotals) {
  rawData.forEach(row => {
    const agentNumber = row.agent_number;
    const productName = row[config.productColumn];
    
    let amount = parseFloat(row[config.amountColumn]) || 0;
    
    if (amount === 0) return;
    
    if (config.excludeProducts && config.excludeProducts.includes(productName)) {
      return;
    }

    const category = config.categoryMappings[productName];
    if (!category) return;

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    agentTotals[agentNumber][category] += amount;
  });

  return agentTotals;
}

/**
 * Process COLUMN_BASED type (Hachshara, Harel, Clal)
 */
function processColumnBased(config, rawData, agentTotals) {
  rawData.forEach(row => {
    const agentNumber = row.agent_number;

    if (config.statusColumn && row[config.statusColumn] !== config.statusFilter) {
      return;
    }

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    Object.entries(config.formulas).forEach(([category, formula]) => {
      let sum = 0;
      formula.columns.forEach(col => {
        sum += parseFloat(row[col]) || 0;
      });
      agentTotals[agentNumber][category] += sum;
    });
  });

  return agentTotals;
}

/**
 * Process COLUMN_BASED_WITH_SUBTRACTION type (Menorah)
 */
function processColumnBasedWithSubtraction(config, rawData, agentTotals) {
  rawData.forEach(row => {
    const agentNumber = row.agent_number;

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    Object.entries(config.formulas).forEach(([category, formula]) => {
      if (formula.operation === 'SUBTRACT') {
        let total = parseFloat(row[formula.base]) || 0;
        formula.subtract.forEach(col => {
          total -= parseFloat(row[col]) || 0;
        });
        agentTotals[agentNumber][category] += total;
      } else {
        let sum = 0;
        formula.columns.forEach(col => {
          sum += parseFloat(row[col]) || 0;
        });
        agentTotals[agentNumber][category] += sum;
      }
    });
  });

  return agentTotals;
}

/**
 * Process MULTI_SHEET_FORMULAS type (Altshuler)
 */
async function processMultiSheetFormulas(companyId, config, rawData, agentTotals, months) {
  const sheetData = {
    gemel: [],
    pension: []
  };

  rawData.forEach(row => {
    const sheetType = identifyAltshulerSheet(row);
    if (sheetType && sheetData[sheetType]) {
      sheetData[sheetType].push(row);
    }
  });

  Object.entries(config.sheets).forEach(([sheetName, sheetConfig]) => {
    const rows = sheetData[sheetName] || [];
    
    rows.forEach(row => {
      const agentNumber = row.agent_number;

      if (!agentTotals[agentNumber]) {
        agentTotals[agentNumber] = initializeTotals();
      }

      Object.entries(sheetConfig.formulas).forEach(([category, formula]) => {
        let sum = 0;
        formula.columns.forEach(col => {
          sum += parseFloat(row[col]) || 0;
        });
        agentTotals[agentNumber][category] += sum;
      });
    });
  });

  return agentTotals;
}

/**
 * Identify which Altshuler sheet a row belongs to
 */
function identifyAltshulerSheet(row) {
  if (row['הפקדה חד פעמית'] !== undefined || row['ביטול שנה א\''] !== undefined) {
    return 'gemel';
  }
  if (row['פרמיה שנתית'] !== undefined || row['ביטולים'] !== undefined) {
    return 'pension';
  }
  return null;
}

/**
 * Handle subtract agents (Menorah special case)
 */
async function handleSubtractAgents(companyId, config, agentTotals, agents, agentIdColumn, months) {
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
      if (agentTotals[id]) {
        if (agentTotals[galAgentNumber]) {
          agentTotals[galAgentNumber][PRODUCT_CATEGORIES.PENSION] -= agentTotals[id][PRODUCT_CATEGORIES.PENSION];
          agentTotals[galAgentNumber][PRODUCT_CATEGORIES.RISK] -= agentTotals[id][PRODUCT_CATEGORIES.RISK];
          agentTotals[galAgentNumber][PRODUCT_CATEGORIES.FINANCIAL] -= agentTotals[id][PRODUCT_CATEGORIES.FINANCIAL];
          agentTotals[galAgentNumber][PRODUCT_CATEGORIES.PENSION_TRANSFER] -= agentTotals[id][PRODUCT_CATEGORIES.PENSION_TRANSFER];
        }
      }
    });
  });
}

/**
 * Initialize category totals
 */
function initializeTotals() {
  return {
    [PRODUCT_CATEGORIES.PENSION]: 0,
    [PRODUCT_CATEGORIES.RISK]: 0,
    [PRODUCT_CATEGORIES.FINANCIAL]: 0,
    [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
  };
}

module.exports = router;