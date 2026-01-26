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
        27: 'elementary_id_kash'             // קש
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
        .or('agent_name.is.null,agent_name.neq.No Data - Empty File') // Include NULL and exclude placeholder rows
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

    // Note: Don't return early if rawData is empty - there might be unmapped data
    if (rawData.length === 0) {
      console.log(`No raw elementary data found for known agents (company ${companyId}, month ${month})`);
    } else {
      console.log(`Processing ${rawData.length} raw elementary data rows`);
    }

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

    // Step 7: Handle unmapped rows (rows not matching any known agent)
    console.log('Fetching unmapped elementary rows...');
    const unmappedRawData = [];
    let unmappedFrom = 0;
    let hasMoreUnmapped = true;

    while (hasMoreUnmapped) {
      const { data, error } = await supabase
        .from('raw_data_elementary')
        .select('*')
        .eq('company_id', companyId)
        .eq('month', month)
        .not('agent_number', 'in', `(${agentNumbers.join(',')})`)
        .or('agent_name.is.null,agent_name.neq.No Data - Empty File') // Include NULL and exclude placeholder rows
        .range(unmappedFrom, unmappedFrom + batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        unmappedRawData.push(...data);
        console.log(`Fetched unmapped elementary batch: ${data.length} rows (total so far: ${unmappedRawData.length})`);
        unmappedFrom += batchSize;
        hasMoreUnmapped = data.length === batchSize;
      } else {
        hasMoreUnmapped = false;
      }
    }

    // Step 8: Aggregate unmapped rows to the UNMAPPED agent
    if (unmappedRawData.length > 0) {
      console.log(`Processing ${unmappedRawData.length} unmapped elementary rows`);

      // Get the unmapped agent for this company
      const { data: unmappedAgent, error: unmappedAgentError } = await supabase
        .from('agent_data')
        .select('id')
        .eq('agent_id', `UNMAPPED_${companyId}`)
        .single();

      if (unmappedAgentError || !unmappedAgent) {
        console.error(`Warning: No unmapped agent found for company ${companyId}. Skipping unmapped elementary aggregation.`);
      } else {
        // Aggregate unmapped data
        let totalCurrentGrossPremium = 0;
        let totalPreviousGrossPremium = 0;

        unmappedRawData.forEach(row => {
          totalCurrentGrossPremium += parseFloat(row.current_gross_premium) || 0;
          totalPreviousGrossPremium += parseFloat(row.previous_gross_premium) || 0;
        });

        // Calculate changes (growth percentage)
        let changes = null;
        if (totalPreviousGrossPremium !== 0) {
          changes = (totalCurrentGrossPremium - totalPreviousGrossPremium) / totalPreviousGrossPremium;
        } else if (totalCurrentGrossPremium > 0) {
          changes = 1; // 100% growth from 0
        }

        // Add unmapped aggregation record
        aggregationRecords.push({
          agent_id: unmappedAgent.id,
          company_id: companyId,
          month: month,
          gross_premium: totalCurrentGrossPremium,
          previous_year_gross_premium: totalPreviousGrossPremium,
          changes: changes
        });

        console.log(`Added unmapped elementary aggregation: Current=${totalCurrentGrossPremium}, Previous=${totalPreviousGrossPremium}, Changes=${changes}`);
      }
    } else {
      console.log('No unmapped elementary rows found');
    }

    // Step 9: Deduplicate records before upserting (merge duplicate agent_id + company_id + month)
    const deduplicatedRecords = {};
    aggregationRecords.forEach(record => {
      const key = `${record.agent_id}-${record.company_id}-${record.month}`;
      if (!deduplicatedRecords[key]) {
        deduplicatedRecords[key] = record;
      } else {
        // Merge totals if duplicate found
        deduplicatedRecords[key].gross_premium += record.gross_premium;
        deduplicatedRecords[key].previous_year_gross_premium += record.previous_year_gross_premium;
        // Recalculate changes
        const prev = deduplicatedRecords[key].previous_year_gross_premium;
        const curr = deduplicatedRecords[key].gross_premium;
        if (prev !== 0) {
          deduplicatedRecords[key].changes = (curr - prev) / prev;
        } else if (curr > 0) {
          deduplicatedRecords[key].changes = 1;
        }
      }
    });

    const finalRecords = Object.values(deduplicatedRecords);

    // Step 10: Upsert into agent_aggregations_elementary table
    if (finalRecords.length > 0) {
      const { data, error: upsertError } = await supabase
        .from('agent_aggregations_elementary')
        .upsert(finalRecords, {
          onConflict: 'agent_id,company_id,month'
        });

      if (upsertError) throw upsertError;

      console.log(`Successfully aggregated ${finalRecords.length} elementary agent records for month ${month} (deduplicated from ${aggregationRecords.length})`);
    }

    return {
      success: true,
      agentsProcessed: aggregationRecords.length,
      rawDataRows: rawData.length,
      unmappedRows: unmappedRawData.length
    };

  } catch (error) {
    console.error('Elementary aggregation error:', error);
    throw error;
  }
}

module.exports = {
  aggregateElementaryAfterUpload
};