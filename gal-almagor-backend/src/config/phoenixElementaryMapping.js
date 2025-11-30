// Phoenix Elementary Insurance Mapping
// Column mappings for Phoenix elementary insurance data

/**
 * Phoenix Elementary Mapping Configuration
 * 
 * File Structure:
 * - Single file
 * - Row 1: Skip (contains "פרמיה ברוטו" and "כמות פוליסות")
 * - Row 2: Column headers
 * - Row 3+: Agent data with multiple rows per agent:
 *   - Agent header row: Column A has "agent_number - agent_name" + Column B has first branch
 *   - Branch detail rows: Column A empty, Column B has branch code + name
 *   - Agent subtotal row: Column B has "סה"כ עבור [agent]" - SKIP THIS (we insert branches)
 * - Last rows: Grand total "סה"כ" and metadata (skip)
 * 
 * We insert ALL branch rows (including the first one in the agent header row)
 * 
 * Tab Name: "Sheet1"
 */

/**
 * Get Phoenix elementary mapping based on detected columns
 * @param {Array<string>} columns - Excel column headers
 * @returns {Object} Mapping configuration
 */
function getPhoenixElementaryMapping(columns) {
  console.log('Using Phoenix Elementary mapping');
  console.log('Detected columns:', columns);

  return {
    description: 'Phoenix Elementary - Sales by Agent (Branch Rows)',
    companyName: 'The Phoenix',
    sheetName: 'Sheet1',
    
    // Signature columns to identify this format
    signatureColumns: ['סוכן (עדכני)', 'ענף', 'שיעור שינוי חודש נוכחי'],
    
    // Row configuration
    headerRow: 2,        // Row 2 contains column headers (1-indexed)
    dataStartRow: 3,     // Row 3 is where agent data starts
    skipHeaderText: true, // Skip row 1 which has header text
    
    // Special parsing mode
    parseMode: 'AGENT_SUBTOTALS', // Parse branch rows (not subtotals)
    
    // Column mapping (using indices)
    columnMapping: {
      agentString: 0,           // Column A: Agent string (only in header rows)
      branchOrSubtotal: 1,      // Column B: Branch code+name OR "סה"כ עבור..." for subtotals
      currentGrossPremium: 2,   // Column C: 2025 gross premium (יולי 2025)
      previousGrossPremium: 3,  // Column D: 2024 gross premium (יולי 2024)
      changes: 4                // Column E: Change % (שיעור שינוי)
    },
    
    // Stop keywords - stop parsing when these are found
    stopKeywords: ['שם הדוח', 'הגדרות', 'תיאור דוח', 'המשתמש המייצא'],
    
    // Agent string parser - same as Ayalon/Hachshara
    parseAgent: (agentString) => {
      if (!agentString || typeof agentString !== 'string') {
        return { agent_number: null, agent_name: null };
      }

      // Format: "211 - גל אלמגור/דר ביטוח"
      const firstDashIndex = agentString.indexOf(' - ');
      
      if (firstDashIndex === -1) {
        return {
          agent_number: null,
          agent_name: agentString.trim()
        };
      }

      const agent_number = agentString.substring(0, firstDashIndex).trim();
      const agent_name = agentString.substring(firstDashIndex + 3).trim();

      return {
        agent_number: agent_number || null,
        agent_name: agent_name || null
      };
    },

    // Validation function - determines if a row should be processed
    validateRow: (row, previousAgentString = null) => {
      const columnA = row[0];
      const columnB = row[1];
      
      // Skip if no data
      if (!columnA && !columnB) {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
      }
      
      // Check if this is grand total row
      if (columnA === 'סה"כ') {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
      }
      
      // Check if this is metadata row
      const stopKeywords = ['שם הדוח', 'הגדרות', 'תיאור דוח', 'המשתמש המייצא', 'שעת ייצוא', 'פתח דוח'];
      if (typeof columnA === 'string' && stopKeywords.some(keyword => columnA.includes(keyword))) {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
      }
      
      // Check if Column B contains "סה"כ עבור" (agent subtotal row) - SKIP IT
      if (columnB && typeof columnB === 'string' && columnB.includes('סה"כ עבור')) {
        return { shouldProcess: false, isAgentHeader: false, isSubtotal: true };
      }
      
      // Check if this is an agent header row (has agent number - name in column A)
      if (columnA && typeof columnA === 'string' && columnA.includes(' - ')) {
        // This is an agent header row
        // Check if it ALSO has branch data (Column B has a branch code/name)
        const hasBranchData = columnB && typeof columnB === 'string' && !columnB.includes('סה"כ');
        
        return { 
          shouldProcess: hasBranchData,  // TRUE if this row also has branch data
          isAgentHeader: true, 
          isSubtotal: false,
          agentString: columnA 
        };
      }
      
      // This is a branch detail row (Column A empty, Column B has branch code+name)
      if (!columnA && columnB && typeof columnB === 'string' && !columnB.includes('סה"כ')) {
        return { shouldProcess: true, isAgentHeader: false, isSubtotal: false };
      }
      
      // Default: skip
      return { shouldProcess: false, isAgentHeader: false, isSubtotal: false };
    }
  };
}

module.exports = {
  getPhoenixElementaryMapping
};