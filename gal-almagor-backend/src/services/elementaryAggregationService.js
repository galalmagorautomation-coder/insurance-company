/**
 * Elementary Aggregation Service
 * Processes raw_data_elementary and creates aggregated totals for agents
 */

const supabase = require('../config/supabase');

/**
 * Aggregate elementary data for a specific company and month after upload
 * @param {number} companyId - Company ID
 * @param {string} month - Month in YYYY-MM format (e.g., "2025-11")
 */
async function aggregateElementaryAfterUpload(companyId, month) {
  console.log(`Starting elementary aggregation for company ${companyId}, month ${month}`);

  try {
    // Step 1: Get company column mapping for elementary
    const companyColumnMap = {
        1: 'elementary_id_ayalon',           // איילון
        4: 'elementary_id_hachshara',        // הכשרה
        5: 'elementary_id_phoenix',          // הפניקס
        6: 'elementary_id_harel',            // הראל
        7: 'elementary_id_clal',             // כלל
        8: 'elementary_id_migdal',           // מגדל
        11: 'elementary_id_menorah',         // מנורה
        12: 'elementary_id_shomera',         // שומרה
        13: 'elementary_id_shlomo',          // שלמה
        14: 'elementary_id_shirbit',         // שירביט
        15: 'elementary_id_haklai',          // חקלאי
        16: 'elementary_id_mms',             // מ.מ.ס
        19: 'elementary_id_passport',        // פספורט
        21: 'elementary_id_cooper_ninova',   // קופר נינווה
        23: 'elementary_id_securities',      // סקוריטס
        25: 'elementary_id_kash'             // קש
      };

    const agentIdColumn = companyColumnMap[companyId];
    if (!agentIdColumn) {
      throw new Error(`No elementary agent column mapping for company ${companyId}`);
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

    console.log(`Found ${agentNumbers.length} agent numbers to process`);

    // Step 4: Fetch raw elementary data for this specific month
    console.log('Fetching raw elementary data in batches...');
    const rawData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('raw_data_elementary')
        .select('*')
        .eq('company_id', companyId)
        .eq('month', month)
        .in('agent_number', agentNumbers)
        .neq('agent_name', 'No Data - Empty File') // ✅ Exclude placeholder rows
        .range(from, from + batchSize - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        rawData.push(...data);
        console.log(`Fetched batch: ${data.length} rows (total so far: ${rawData.length})`);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    if (rawData.length === 0) {
      console.log(`No raw elementary data found for company ${companyId}, month ${month}`);
      return { success: true, agentsProcessed: 0 };
    }

    console.log(`Processing ${rawData.length} raw elementary data rows`);

    // Step 5: Aggregate data by agent number
    const agentTotals = {};

    rawData.forEach(row => {
      const agentNumber = row.agent_number;

      if (!agentTotals[agentNumber]) {
        agentTotals[agentNumber] = {
          current_gross_premium: 0,
          previous_gross_premium: 0
        };
      }

      // Sum the premiums
      const currentPremium = parseFloat(row.current_gross_premium) || 0;
      const previousPremium = parseFloat(row.previous_gross_premium) || 0;
      agentTotals[agentNumber].current_gross_premium += currentPremium;
      agentTotals[agentNumber].previous_gross_premium += previousPremium;
    });

    // Step 6: Build aggregation records for CURRENT YEAR
    const aggregationRecords = [];
    agents.forEach(agent => {
      const agentNumber = agent[agentIdColumn];
      if (!agentNumber) return;

      const ids = agentNumber.split(',').map(id => id.trim());

      // Sum totals from all IDs for this agent
      let currentGrossPremium = 0;
      let previousGrossPremium = 0;

      ids.forEach(id => {
        if (agentTotals[id]) {
          currentGrossPremium += agentTotals[id].current_gross_premium;
          previousGrossPremium += agentTotals[id].previous_gross_premium;
        }
      });

      // Calculate changes (growth percentage)
      let changes = null;
      if (previousGrossPremium !== 0) {
        changes = (currentGrossPremium - previousGrossPremium) / previousGrossPremium;
      } else if (currentGrossPremium > 0) {
        changes = 1; // 100% growth from 0
      }

      // Create/update aggregation record for CURRENT YEAR month
      aggregationRecords.push({
        agent_id: agent.id,
        company_id: companyId,
        month: month, // e.g., "2025-11"
        gross_premium: currentGrossPremium,
        previous_year_gross_premium: previousGrossPremium,
        changes: changes
      });
    });

    // Step 7: Upsert into agent_aggregations_elementary table
    if (aggregationRecords.length > 0) {
      const { data, error: upsertError } = await supabase
        .from('agent_aggregations_elementary')
        .upsert(aggregationRecords, {
          onConflict: 'agent_id,company_id,month'
        });

      if (upsertError) throw upsertError;

      console.log(`Successfully aggregated ${aggregationRecords.length} elementary agent records for month ${month}`);
    }

    return {
      success: true,
      agentsProcessed: aggregationRecords.length,
      rawDataRows: rawData.length
    };

  } catch (error) {
    console.error('Elementary aggregation error:', error);
    throw error;
  }
}

module.exports = {
  aggregateElementaryAfterUpload
};