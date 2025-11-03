const express = require('express');
const supabase = require('../config/supabase');
const {
  PRODUCT_CATEGORIES,
  getCompanyConfig,
  shouldExcludeAgent,
  calculateCategoryTotals
} = require('../config/productCategoryMappings');

const router = express.Router();

// GET aggregated agent data by company and month
router.get('/agents', async (req, res) => {
  try {
    const { company_id, month } = req.query;

    if (!company_id || !month) {
      return res.status(400).json({
        success: false,
        message: 'company_id and month are required'
      });
    }

    const companyId = parseInt(company_id);
    const config = getCompanyConfig(companyId);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsupported company_id'
      });
    }

    // Step 1: Get all agents for this company
    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select('*')
      .contains('company_id', [companyId]);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: agentsError.message
      });
    }

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
    if (!agentIdColumn) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company_id - no agent column mapping'
      });
    }

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
      return res.json({
        success: true,
        data: agents.map(agent => ({
          ...agent,
          [PRODUCT_CATEGORIES.PENSION]: 0,
          [PRODUCT_CATEGORIES.RISK]: 0,
          [PRODUCT_CATEGORIES.FINANCIAL]: 0,
          [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
        }))
      });
    }

    // Step 4: Fetch raw data
    const { data: rawData, error: rawError } = await supabase
      .from('raw_data')
      .select('*') // Select all columns - we need different ones per company
      .eq('company_id', companyId)
      .eq('month', month)
      .in('agent_number', agentNumbers);

    if (rawError) {
      console.error('Error fetching raw data:', rawError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch raw data',
        error: rawError.message
      });
    }

    // Step 5: Process data based on company type
    const agentTotals = await processCompanyData(companyId, config, rawData, month);

    // Step 6: Handle special cases - subtract agents (Menorah)
    if (config.subtractAgents && config.subtractAgents.length > 0) {
      await handleSubtractAgents(companyId, config, agentTotals, agents, agentIdColumn, month);
    }

    // Step 7: Merge totals with agent data
    const result = agents.map(agent => {
      const agentNumber = agent[agentIdColumn];
      
      // Check if agent should be excluded
      if (shouldExcludeAgent(companyId, agent.agent_name)) {
        return {
          ...agent,
          [PRODUCT_CATEGORIES.PENSION]: 0,
          [PRODUCT_CATEGORIES.RISK]: 0,
          [PRODUCT_CATEGORIES.FINANCIAL]: 0,
          [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0,
          excluded: true
        };
      }

      // Initialize totals
      let totals = {
        [PRODUCT_CATEGORIES.PENSION]: 0,
        [PRODUCT_CATEGORIES.RISK]: 0,
        [PRODUCT_CATEGORIES.FINANCIAL]: 0,
        [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
      };

      if (agentNumber) {
        const ids = agentNumber.split(',').map(id => id.trim());
        
        ids.forEach(id => {
          if (agentTotals[id]) {
            totals[PRODUCT_CATEGORIES.PENSION] += agentTotals[id][PRODUCT_CATEGORIES.PENSION];
            totals[PRODUCT_CATEGORIES.RISK] += agentTotals[id][PRODUCT_CATEGORIES.RISK];
            totals[PRODUCT_CATEGORIES.FINANCIAL] += agentTotals[id][PRODUCT_CATEGORIES.FINANCIAL];
            totals[PRODUCT_CATEGORIES.PENSION_TRANSFER] += agentTotals[id][PRODUCT_CATEGORIES.PENSION_TRANSFER];
          }
        });
      }

      return {
        ...agent,
        ...totals
      };
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
 * Process company data based on company type
 */
async function processCompanyData(companyId, config, rawData, month) {
  const agentTotals = {};

  switch (config.type) {
    case 'SIMPLE':
      // Company 10 (Mor) - just one category
      return processSimpleCompany(config, rawData, agentTotals);

    case 'FILTER_BY_PRODUCT':
      // Companies 1 (Ayalon), 5 (Phoenix), 8 (Migdal)
      return processFilterByProduct(config, rawData, agentTotals);

    case 'COLUMN_BASED':
      // Companies 4 (Hachshara), 6 (Harel), 7 (Clal)
      return processColumnBased(config, rawData, agentTotals);

    case 'COLUMN_BASED_WITH_SUBTRACTION':
      // Company 11 (Menorah)
      return processColumnBasedWithSubtraction(config, rawData, agentTotals);

    case 'MULTI_SHEET_FORMULAS':
      // Company 2 (Altshuler) - needs special handling
      return processMultiSheetFormulas(companyId, config, rawData, agentTotals, month);

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
    
    // ✅ ONLY use commission_premium_amount, NO fallback
    let amount = parseFloat(row[config.amountColumn]) || 0;
    
    // Skip if amount is 0
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

    // Status filter (for Hachshara)
    if (config.statusColumn && row[config.statusColumn] !== config.statusFilter) {
      return;
    }

    if (!agentTotals[agentNumber]) {
      agentTotals[agentNumber] = initializeTotals();
    }

    // Calculate each category using formulas
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
        // Base amount minus subtract columns
        let total = parseFloat(row[formula.base]) || 0;
        formula.subtract.forEach(col => {
          total -= parseFloat(row[col]) || 0;
        });
        agentTotals[agentNumber][category] += total;
      } else {
        // Regular sum
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
 * Note: This assumes sheets are identified by a 'sheet_type' column in raw_data
 * If not, you'll need to fetch from different tables
 */
async function processMultiSheetFormulas(companyId, config, rawData, agentTotals, month) {
  // Group data by sheet type
  const sheetData = {
    gemel: [],
    pension: []
  };

  rawData.forEach(row => {
    // Identify which sheet this row belongs to
    // You might need to adjust this logic based on your data structure
    const sheetType = identifyAltshulerSheet(row);
    if (sheetType && sheetData[sheetType]) {
      sheetData[sheetType].push(row);
    }
  });

  // Process each sheet
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
 * Adjust this based on your actual data structure
 */
function identifyAltshulerSheet(row) {
  // Check if row has gemel-specific columns
  if (row['הפקדה חד פעמית'] !== undefined || row['ביטול שנה א\''] !== undefined) {
    return 'gemel';
  }
  // Check if row has pension-specific columns
  if (row['פרמיה שנתית'] !== undefined || row['ביטולים'] !== undefined) {
    return 'pension';
  }
  return null;
}

/**
 * Handle subtract agents (Menorah special case)
 * Subtract production of Shelly, Ortal, Samir Balan from Gal Almgor
 */
async function handleSubtractAgents(companyId, config, agentTotals, agents, agentIdColumn, month) {
  // Find Gal Almgor
  const galAlmgor = agents.find(agent => 
    agent.agent_name && agent.agent_name.includes('גל אלמגור')
  );

  if (!galAlmgor) return;

  const galAgentNumber = galAlmgor[agentIdColumn];
  if (!galAgentNumber) return;

  // Find agents to subtract
  const subtractAgentsList = agents.filter(agent =>
    config.subtractAgents.some(name => 
      agent.agent_name && agent.agent_name.includes(name)
    )
  );

  // Subtract their totals from Gal's totals
  subtractAgentsList.forEach(agent => {
    const agentNumber = agent[agentIdColumn];
    if (!agentNumber) return;

    const ids = agentNumber.split(',').map(id => id.trim());
    
    ids.forEach(id => {
      if (agentTotals[id]) {
        // Subtract from Gal's totals
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