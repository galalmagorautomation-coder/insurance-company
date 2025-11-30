// Ayalon Elementary Insurance Mapping
// Column mappings for Ayalon elementary insurance data

/**
 * Ayalon Elementary Mapping Configuration
 * 
 * File Structure:
 * - Row 1: "פרמיה ברוטו" (skip)
 * - Row 2: Column headers with dynamic months (e.g., "יולי 2024", "יולי 2025")
 * - Row 3: Total row "סה"כ" (skip)
 * - Row 4+: Agent data
 * - Last 5 rows: Metadata (stop when "הגדרות" detected)
 * 
 * Agent Format: "224350 - א.ד.אבידן ביטוחים -גל אלמגור"
 * - Split by first " - " to get agent_number and agent_name
 * 
 * Tab Name: "אלמנטר - מכירות וחידושים סוכ"
 */

/**
 * Get Ayalon elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getAyalonElementaryMapping(columns) {
  console.log('Using Ayalon Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Ayalon Elementary - Sales and Renewals by Agent',
    companyName: 'Ayalon',
    sheetName: 'אלמנטר - מכירות וחידושים סוכ',
    
    // Signature columns to identify this format
    signatureColumns: ['סוכן א\'', 'אחוז גידול'],
    
    // Row configuration
    headerRow: 2,        // Row 2 contains column headers (1-indexed)
    dataStartRow: 4,     // Row 4 is where agent data starts (skip header + total)
    skipTotalRow: true,  // Skip row 3 which is "סה"כ"
    
    // Column mapping (using indices since month names are dynamic)
    columnMapping: {
      agentString: 0,           // Column A: Full agent string "number - name"
      previousGrossPremium: 1,  // Column B: Previous year premium (dynamic month)
      currentGrossPremium: 2,   // Column C: Current year premium (dynamic month)
      changes: 3                // Column D: Growth percentage "אחוז גידול"
    },
    
    // Stop conditions - stop parsing when these strings are found
    stopKeywords: ['הגדרות', 'תיאור דוח', 'המשתמש המייצא', 'שעת ייצוא', 'פתח דוח'],
    
    // Agent string parser
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "224350 - א.ד.אבידן ביטוחים -גל אלמגור"
      const firstDashIndex = agentString.indexOf(' - ');
      
      if (firstDashIndex === -1) {
        // No dash found, return whole string as name
        return {
          agent_number: null,
          agent_name: agentString.trim()
        };
      }

      const agent_number = agentString.substring(0, firstDashIndex).trim();
      const agent_name = agentString.substring(firstDashIndex + 3).trim(); // +3 to skip " - "

      return {
        agent_number: agent_number || null,
        agent_name: agent_name || null
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row) => {
      // Skip if no agent string
      if (!row[0]) return false;
      
      // Skip total row "סה"כ"
      if (typeof row[0] === 'string' && row[0].includes('סה"כ')) return false;
      
      // Skip metadata rows
      const stopKeywords = ['הגדרות', 'תיאור דוח', 'המשתמש המייצא', 'שעת ייצוא', 'פתח דוח'];
      if (typeof row[0] === 'string' && stopKeywords.some(keyword => row[0].includes(keyword))) {
        return false;
      }

      return true;
    }
  };
}

module.exports = {
  getAyalonElementaryMapping
};