// Menorah Pension Transfer Mapping
// Column mappings for Menorah pension transfer data (second file for life insurance)

/**
 * Menorah Pension Transfer Mapping Configuration
 * 
 * File Structure:
 * - This is the second file for Menorah life insurance uploads
 * - Contains pension transfer data only
 * - Tab Name: First sheet (index 0)
 * - Row 1: Column headers
 * - Row 2+: Agent data
 *   - Column "סוכן": Agent string format "604295  דאי גדי" or "9939  גל אלמגור דאוד סוכ' לב"
 *   - Column "סכום העברה - ניוד נטו": Net pension transfer amount (output)
 * 
 * All rows from this file are categorized as PENSION_TRANSFER
 */

/**
 * Parse combined agent string to extract agent number and name
 * Format: "604295  דאי גדי" or "9939  גל אלמגור דאוד סוכ' לב"
 * Pattern: NUMBER SPACE(S) NAME
 * 
 * @param {string} agentString - Combined agent string
 * @returns {Object} { agent_number: string, agent_name: string }
 */
function parseAgent(agentString) {
  if (!agentString || typeof agentString !== 'string') {
    return { agent_number: null, agent_name: null };
  }

  const trimmed = agentString.trim();
  
  // Find first space after the leading number
  const firstSpaceIndex = trimmed.indexOf(' ');
  
  if (firstSpaceIndex === -1) {
    // No space found - treat entire string as name
    return { agent_number: null, agent_name: trimmed };
  }

  const agent_number = trimmed.substring(0, firstSpaceIndex).trim();
  const agent_name = trimmed.substring(firstSpaceIndex + 1).trim();

  return { agent_number, agent_name };
}

const MENORAH_PENSION_TRANSFER_MAPPING = {
  companyName: 'Menorah',
  companyNameHebrew: 'מנורה',
  fileType: 'pension_transfer', // Identifier for this file type
  
  columns: {
    agentString: 'סוכן',                    // Combined agent number and name
    output: 'סכום העברה - ניוד נטו',        // Net pension transfer amount
    date: 'מועד קובע'                       // Column Y - Date (DD/MM/YYYY format) for month filtering
  },

  // Parse function for agent data
  parseAgent: parseAgent,

  // All rows from this file are pension transfer
  // No product mapping needed - all assigned to pension transfer category
  fixedCategory: 'PENSION_TRANSFER'
};

module.exports = MENORAH_PENSION_TRANSFER_MAPPING;
