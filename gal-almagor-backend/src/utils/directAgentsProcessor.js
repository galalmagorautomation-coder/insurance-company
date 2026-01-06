const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

/**
 * Main function to process Direct Agents Excel data
 * @param {Array} jsonData - Parsed Excel data
 * @param {String} month - Month in YYYY-MM format
 * @returns {Object} Processing results with stats and warnings
 */
async function processDirectAgentsData(jsonData, month) {
  const results = {
    totalRows: jsonData.length,
    successfulRows: 0,
    skippedRows: 0,
    companiesProcessed: new Set(),
    deductionsApplied: [],
    warnings: []
  }

  // 1. Parse and normalize data
  const parsedData = parseDirectAgentsExcel(jsonData)

  // 2. Get all companies for mapping
  const companies = await fetchCompanies()
  const companyMap = createCompanyNameMap(companies)

  // 3. Get all agents for matching
  const agents = await fetchAllAgents()

  // 4. Group by company and process
  const groupedByCompany = groupDataByCompany(parsedData, companyMap, agents, results)

  // 5. Insert/update agent aggregations
  await insertDirectAgentAggregations(groupedByCompany, month, results)

  // 6. Calculate and apply deductions to agent_id=426
  await applyDeductionsToAgent426(groupedByCompany, month, results)

  // 7. Save upload tracking record
  await saveUploadTracking(groupedByCompany, month, results)

  return results
}

/**
 * Parse Direct Agents Excel data
 * @param {Array} jsonData - Raw Excel data
 * @returns {Array} Parsed data with agentName, companyName, amount
 */
function parseDirectAgentsExcel(jsonData) {
  const parsed = []

  for (const row of jsonData) {
    // Extract columns by Hebrew headers
    const agentName = row['סוכן']?.toString().trim()
    const companyName = row['חברה']?.toString().trim()
    const amount = parseAmount(row['סה"כ להעברה'])

    // Skip empty rows
    if (!agentName || !companyName || amount === null) {
      continue
    }

    parsed.push({
      agentName,
      companyName,
      amount
    })
  }

  return parsed
}

/**
 * Parse amount value from various formats
 * @param {*} value - Amount value
 * @returns {Number|null} Parsed numeric amount
 */
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Match agent by name using exact and fuzzy matching
 * @param {String} agentName - Agent name to match
 * @param {Array} agents - Array of agent records
 * @returns {Object|null} Matched agent or null
 */
function matchAgentByName(agentName, agents) {
  // Normalize input name
  const normalizedInput = normalizeHebrewName(agentName)

  // Try exact match first (highest priority)
  for (const agent of agents) {
    const normalizedAgent = normalizeHebrewName(agent.agent_name)
    if (normalizedAgent === normalizedInput) {
      return agent
    }
  }

  // Try reversed name match (for "דני פחימה" vs "פחימה דני")
  const reversedInput = reverseHebrewName(normalizedInput)
  if (reversedInput !== normalizedInput) {
    for (const agent of agents) {
      const normalizedAgent = normalizeHebrewName(agent.agent_name)
      if (normalizedAgent === reversedInput) {
        return agent
      }
    }
  }

  // Try fuzzy match with stricter threshold and length check
  let bestMatch = null
  let bestScore = 0
  const THRESHOLD = 0.85 // Increased to 85% similarity for safety
  const MIN_LENGTH_RATIO = 0.7 // Input must be at least 70% of DB name length

  for (const agent of agents) {
    const normalizedAgent = normalizeHebrewName(agent.agent_name)

    // Check length ratio to avoid matching "סיון" with "סיון פיינרו"
    const lengthRatio = Math.min(normalizedInput.length, normalizedAgent.length) /
                        Math.max(normalizedInput.length, normalizedAgent.length)

    if (lengthRatio < MIN_LENGTH_RATIO) {
      continue // Skip if length difference is too large
    }

    const similarity = calculateStringSimilarity(normalizedInput, normalizedAgent)

    if (similarity > THRESHOLD && similarity > bestScore) {
      bestScore = similarity
      bestMatch = agent
    }
  }

  return bestMatch
}

/**
 * Reverse Hebrew name (swap first and last name)
 * @param {String} name - Name to reverse
 * @returns {String} Reversed name
 */
function reverseHebrewName(name) {
  const parts = name.trim().split(' ')
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`
  }
  return name // Don't reverse if not exactly 2 parts
}

/**
 * Normalize Hebrew name for matching
 * @param {String} name - Name to normalize
 * @returns {String} Normalized name
 */
function normalizeHebrewName(name) {
  if (!name) return ''

  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[-–—]/g, '-') // Normalize dashes
    .replace(/סוכ'?$/i, '') // Remove agent abbreviation
    .trim()
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {String} str1 - First string
 * @param {String} str2 - Second string
 * @returns {Number} Similarity score (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  // Use Levenshtein distance for similarity
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(str1, str2)
  return 1 - (distance / maxLen)
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {String} str1 - First string
 * @param {String} str2 - Second string
 * @returns {Number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Create company name to ID mapping
 * @param {Array} companies - Array of company records
 * @returns {Map} Company name to ID map
 */
function createCompanyNameMap(companies) {
  const map = new Map()

  for (const company of companies) {
    // Map Hebrew name to company_id
    if (company.name && company.elementary) {
      map.set(company.name.trim(), company.id)
    }
  }

  return map
}

/**
 * Match company by name
 * @param {String} companyName - Company name to match
 * @param {Map} companyMap - Company name to ID map
 * @returns {Number|null} Company ID or null
 */
function matchCompanyByName(companyName, companyMap) {
  return companyMap.get(companyName.trim()) || null
}

/**
 * Group parsed data by company and match agents
 * @param {Array} parsedData - Parsed Excel data
 * @param {Map} companyMap - Company name to ID map
 * @param {Array} agents - Array of agent records
 * @param {Object} results - Results object to update
 * @returns {Map} Grouped data by company_id
 */
function groupDataByCompany(parsedData, companyMap, agents, results) {
  const grouped = new Map() // company_id -> [{ agent_id, amount }]

  for (const row of parsedData) {
    // Match company
    const companyId = matchCompanyByName(row.companyName, companyMap)
    if (!companyId) {
      results.warnings.push({
        row: row,
        reason: `Company not found: "${row.companyName}"`
      })
      results.skippedRows++
      continue
    }

    // Match agent
    const agent = matchAgentByName(row.agentName, agents)
    if (!agent) {
      results.warnings.push({
        row: row,
        reason: `Agent not found: "${row.agentName}"`
      })
      results.skippedRows++
      continue
    }

    // Add to grouped data
    if (!grouped.has(companyId)) {
      grouped.set(companyId, [])
    }

    grouped.get(companyId).push({
      agent_id: agent.id,
      agent_name: agent.agent_name,
      amount: row.amount
    })

    results.successfulRows++
    results.companiesProcessed.add(companyId)
  }

  return grouped
}

/**
 * Insert/update agent aggregations for direct agents
 * @param {Map} groupedByCompany - Grouped data by company
 * @param {String} month - Month in YYYY-MM format
 * @param {Object} results - Results object to update
 */
async function insertDirectAgentAggregations(groupedByCompany, month, results) {
  const records = []

  for (const [companyId, agents] of groupedByCompany) {
    for (const agentData of agents) {
      records.push({
        company_id: companyId,
        agent_id: agentData.agent_id,
        month: month,
        gross_premium: agentData.amount,
        previous_year_gross_premium: 0,
        changes: null
      })
    }
  }

  // Use upsert to handle existing records
  const { data, error } = await supabase
    .from('agent_aggregations_elementary')
    .upsert(records, {
      onConflict: 'agent_id,company_id,month',
      ignoreDuplicates: false
    })

  if (error) {
    throw new Error(`Failed to insert agent aggregations: ${error.message}`)
  }

  return data
}

/**
 * Apply deductions to agent_id=426 per company
 * @param {Map} groupedByCompany - Grouped data by company
 * @param {String} month - Month in YYYY-MM format
 * @param {Object} results - Results object to update
 */
async function applyDeductionsToAgent426(groupedByCompany, month, results) {
  const AGENT_426_ID = 426

  for (const [companyId, agents] of groupedByCompany) {
    // Calculate total amount for this company
    const totalAmount = agents.reduce((sum, agent) => sum + agent.amount, 0)

    // Fetch current record for agent_id=426, company_id, month
    const { data: existingRecords, error: fetchError } = await supabase
      .from('agent_aggregations_elementary')
      .select('*')
      .eq('agent_id', AGENT_426_ID)
      .eq('company_id', companyId)
      .eq('month', month)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      throw new Error(`Failed to fetch agent 426 record: ${fetchError.message}`)
    }

    let newGrossPremium
    if (existingRecords) {
      // Deduct from existing amount
      const currentAmount = parseFloat(existingRecords.gross_premium) || 0
      newGrossPremium = currentAmount - totalAmount
    } else {
      // No existing record - create with negative amount
      newGrossPremium = -totalAmount
    }

    // Update or insert
    const { error: updateError } = await supabase
      .from('agent_aggregations_elementary')
      .upsert({
        company_id: companyId,
        agent_id: AGENT_426_ID,
        month: month,
        gross_premium: newGrossPremium,
        previous_year_gross_premium: existingRecords?.previous_year_gross_premium || 0,
        changes: existingRecords?.changes || null
      }, {
        onConflict: 'agent_id,company_id,month'
      })

    if (updateError) {
      throw new Error(`Failed to update agent 426 deduction: ${updateError.message}`)
    }

    results.deductionsApplied.push({
      companyId,
      deductedAmount: totalAmount,
      newBalance: newGrossPremium
    })
  }
}

/**
 * Fetch all elementary companies from database
 * @returns {Array} Array of company records
 */
async function fetchCompanies() {
  const { data, error } = await supabase
    .from('company')
    .select('*')
    .eq('elementary', true)

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`)
  }

  return data
}

/**
 * Fetch all agents from database
 * @returns {Array} Array of agent records with id and agent_name
 */
async function fetchAllAgents() {
  const { data, error } = await supabase
    .from('agent_data')
    .select('id, agent_name')

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`)
  }

  return data
}

/**
 * Save upload tracking record to direct_agents_uploads table
 * @param {Map} groupedByCompany - Grouped data by company
 * @param {String} month - Month in YYYY-MM format
 * @param {Object} results - Results object
 */
async function saveUploadTracking(groupedByCompany, month, results) {
  // Prepare uploaded_records array
  const uploadedRecords = []
  const totalAmountByCompany = {}
  const companiesAffected = []

  for (const [companyId, agents] of groupedByCompany) {
    companiesAffected.push(companyId)

    // Calculate total for this company
    let companyTotal = 0

    for (const agentData of agents) {
      uploadedRecords.push({
        agent_id: agentData.agent_id,
        company_id: companyId,
        amount: agentData.amount
      })

      companyTotal += agentData.amount
    }

    totalAmountByCompany[companyId] = companyTotal
  }

  // Prepare tracking record
  const trackingRecord = {
    month: month,
    uploaded_records: uploadedRecords,
    total_amount_by_company: totalAmountByCompany,
    row_count: results.successfulRows,
    companies_affected: companiesAffected
  }

  // Check if record for this month already exists
  const { data: existingRecord, error: fetchError } = await supabase
    .from('direct_agents_uploads')
    .select('*')
    .eq('month', month)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Error other than "not found"
    console.warn('Error checking existing tracking record:', fetchError)
  }

  if (existingRecord) {
    // Update existing record (merge with new data)
    const mergedRecords = [...existingRecord.uploaded_records, ...uploadedRecords]
    const mergedAmounts = { ...existingRecord.total_amount_by_company }

    // Merge amounts
    for (const [companyId, amount] of Object.entries(totalAmountByCompany)) {
      mergedAmounts[companyId] = (mergedAmounts[companyId] || 0) + amount
    }

    // Merge companies affected
    const mergedCompanies = [...new Set([...existingRecord.companies_affected, ...companiesAffected])]

    const { error: updateError } = await supabase
      .from('direct_agents_uploads')
      .update({
        uploaded_records: mergedRecords,
        total_amount_by_company: mergedAmounts,
        row_count: existingRecord.row_count + results.successfulRows,
        companies_affected: mergedCompanies,
        uploaded_at: new Date().toISOString()
      })
      .eq('month', month)

    if (updateError) {
      console.error('Failed to update tracking record:', updateError)
      throw new Error(`Failed to update tracking record: ${updateError.message}`)
    }
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from('direct_agents_uploads')
      .insert(trackingRecord)

    if (insertError) {
      console.error('Failed to insert tracking record:', insertError)
      throw new Error(`Failed to insert tracking record: ${insertError.message}`)
    }
  }

  console.log(`Tracking record saved for month ${month}: ${results.successfulRows} rows, ${companiesAffected.length} companies`)
}

module.exports = {
  processDirectAgentsData
}
