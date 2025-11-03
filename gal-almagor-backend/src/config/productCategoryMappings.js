/**
 * Product Category Mappings and Formula Configurations
 * Handles both simple mappings and complex column formulas for each company
 */

const PRODUCT_CATEGORIES = {
  PENSION: 'פנסיוני',
  RISK: 'סיכונים',
  FINANCIAL: 'פיננסים',
  PENSION_TRANSFER: 'ניודי פנסיה'
};

// ========================================
// COMPANY CONFIGURATIONS
// ========================================

const COMPANY_CONFIGS = {
  // ========================================
  // 1. AYALON (איילון)
  // ========================================
  1: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'insurance_type_name',
    amountColumn: 'commission_premium_amount',
    // ❌ REMOVE fallbackColumns - only count if commission exists!
    excludeZeroOutput: true,  // Skip rows with commission = 0
    categoryMappings: {
      'ריסק': PRODUCT_CATEGORIES.RISK,
      'בריאות': PRODUCT_CATEGORIES.RISK,
      'מחלות קשות': PRODUCT_CATEGORIES.RISK,  // ✅ Add this
      'שלב': PRODUCT_CATEGORIES.PENSION,
      'פנסיוני': PRODUCT_CATEGORIES.PENSION,
      'פיננסים': PRODUCT_CATEGORIES.FINANCIAL
    }
  },

  // ========================================
  // 2. ALTSHULER SHAHAM (אלטשולר שחם)
  // ========================================
  2: {
    type: 'MULTI_SHEET_FORMULAS',
    sheets: {
      gemel: {
        sheetIdentifier: 'גמל', // If you have sheet column
        formulas: {
          [PRODUCT_CATEGORIES.FINANCIAL]: {
            columns: ['הפקדה חד פעמית', 'תנועות העברה פנימה', 'ביטול שנה א\''],
            operation: 'SUM'
          }
        }
      },
      pension: {
        sheetIdentifier: 'פנסיה',
        formulas: {
          [PRODUCT_CATEGORIES.PENSION]: {
            columns: ['פרמיה שנתית', 'תנועות העברה פנימה', 'ביטולים'],
            operation: 'SUM'
          }
        }
      }
    }
  },

  // ========================================
  // 4. HACHSHARA (הכשרה)
  // ========================================
  4: {
    type: 'COLUMN_BASED',
    statusColumn: 'status',
    statusFilter: 'הופקה',
    formulas: {
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['הפקדות'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['פרמיה השנתית'],
        operation: 'SUM'
      }
    }
  },

  // ========================================
  // 5. PHOENIX (הפניקס)
  // ========================================
  5: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'product',
    amountColumn: 'output',
    excludeAgents: ['אורלי יונאי', 'רייזר ענת', 'עידן דיגיטלי'],
    categoryMappings: {
      // פנסיוני
      'פנסיה': PRODUCT_CATEGORIES.PENSION,
      'מסלול מנהלים': PRODUCT_CATEGORIES.PENSION,
      'אכ"ע': PRODUCT_CATEGORIES.PENSION,
      
      // סיכונים
      'ביטוח חד"פ': PRODUCT_CATEGORIES.RISK,
      'סיעוד': PRODUCT_CATEGORIES.RISK,
      'משכנתא': PRODUCT_CATEGORIES.RISK,
      'תאונות אישיות': PRODUCT_CATEGORIES.RISK,
      'ריסק- מסלול מנהלים': PRODUCT_CATEGORIES.RISK,
      'בריאות פרט': PRODUCT_CATEGORIES.RISK,
      'מוות וניכויות': PRODUCT_CATEGORIES.RISK,
      'מחלות קשות': PRODUCT_CATEGORIES.RISK,
      'ריסק-פרטי': PRODUCT_CATEGORIES.RISK,
      'ריסק פרט': PRODUCT_CATEGORIES.RISK,
      
      // פיננסים
      'אקסלנט': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול פרט': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול פרט חד"פ': PRODUCT_CATEGORIES.FINANCIAL,
      'חסכון מסלול מנהלים': PRODUCT_CATEGORIES.FINANCIAL,
      'גמל': PRODUCT_CATEGORIES.FINANCIAL,
      'גמל העברות': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול זמן פרישה': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול לזמן פרישה': PRODUCT_CATEGORIES.FINANCIAL,
      'אינווסט ח"פ': PRODUCT_CATEGORIES.FINANCIAL,
      
      // ניודי פנסיה
      'ניוד פנסיה': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'מסלול ניוד מנהלים': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'פנסיה העברות': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'בסיס זיכוי ניוד פנסיה העברה': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'בסיס זיכוי ניוד פנסיה  העברה': PRODUCT_CATEGORIES.PENSION_TRANSFER
    }
  },

  // ========================================
  // 6. HAREL (הראל)
  // ========================================
  6: {
    type: 'COLUMN_BASED',
    formulas: {
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['פנסיוני'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['סיכונים פרט', 'סיעוד'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['מוצרי צבירה ללא פיננסים'],
        operation: 'SUM'
      }
    }
  },

  // ========================================
  // 7. CLAL (כלל)
  // ========================================
  7: {
    type: 'COLUMN_BASED',
    formulas: {
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['פרופיל מנהלים', 'קרן פנסיה'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['עסקי ריסק', 'עסקי בריאות'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['פרט פיננסים שוטף', 'פרט פיננסים חד פעמי'],
        operation: 'SUM'
      }
    },
    // Note: Pension transfer sheet separate - needs special handling
    pensionTransferSheet: true
  },

  // ========================================
  // 8. MIGDAL (מגדל)
  // ========================================
  8: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'measurement_basis_name',
    amountColumn: 'total_measured_premium',
    excludeAgents: ['אורלי יונאי'],
    categoryMappings: {
      // פנסיוני
      'בסיס זיכוי מנהלים (רובד א\')': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי לפנסיה (רובד א\')': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי למקפת משלימה רובד א\'': PRODUCT_CATEGORIES.PENSION,
      
      // סיכונים
      'בסיס זיכוי בריאות וריסק': PRODUCT_CATEGORIES.RISK,
      'איחוד שתפ-בסיס זיכוי בריאות וריסק (סיעוד 40%)': PRODUCT_CATEGORIES.RISK,
      
      // פיננסים
      'בסיס זיכוי גמל להשקעה': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי למוצרים פיננסים': PRODUCT_CATEGORIES.FINANCIAL,
      
      // ניודי פנסיה
      'בסיס זיכוי ניוד פנסיה 2022': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'בסיס זיכוי ניוד פנסיה': PRODUCT_CATEGORIES.PENSION_TRANSFER
    }
  },

  // ========================================
  // 10. MOR (מור)
  // ========================================
  10: {
    type: 'SIMPLE',
    amountColumn: 'deposit_amount',
    category: PRODUCT_CATEGORIES.FINANCIAL // Only financial products
  },

  // ========================================
  // 11. MENORAH (מנורה)
  // ========================================
  11: {
    type: 'COLUMN_BASED_WITH_SUBTRACTION',
    excludeAgents: ['דולב רן', 'אורלי יונאי'],
    subtractAgents: ['מזרחי שלי', 'בלאן סמיר'], // Need to confirm אורטל's full name
    formulas: {
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['total_pension', 'step_death_disability'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        base: 'total_insurance',
        subtract: ['step_death_disability'],
        operation: 'SUBTRACT'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['total_financial'],
        operation: 'SUM'
      }
    }
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get configuration for a company
 */
function getCompanyConfig(companyId) {
  return COMPANY_CONFIGS[companyId] || null;
}

/**
 * Check if agent should be excluded
 */
function shouldExcludeAgent(companyId, agentName) {
  const config = COMPANY_CONFIGS[companyId];
  if (!config || !config.excludeAgents) return false;
  
  return config.excludeAgents.some(excluded => 
    agentName && agentName.includes(excluded)
  );
}

/**
 * Check if product should be excluded
 */
function shouldExcludeProduct(companyId, productName) {
  const config = COMPANY_CONFIGS[companyId];
  if (!config || !config.excludeProducts) return false;
  
  return config.excludeProducts.includes(productName);
}

/**
 * Get category for a product (for FILTER_BY_PRODUCT type companies)
 */
function getProductCategory(companyId, productName) {
  const config = COMPANY_CONFIGS[companyId];
  if (!config || config.type !== 'FILTER_BY_PRODUCT') return null;
  
  return config.categoryMappings[productName] || null;
}

/**
 * Calculate category totals based on company type
 */
function calculateCategoryTotals(companyId, rows) {
  const config = COMPANY_CONFIGS[companyId];
  if (!config) return null;

  const totals = {
    [PRODUCT_CATEGORIES.PENSION]: 0,
    [PRODUCT_CATEGORIES.RISK]: 0,
    [PRODUCT_CATEGORIES.FINANCIAL]: 0,
    [PRODUCT_CATEGORIES.PENSION_TRANSFER]: 0
  };

  switch (config.type) {
    case 'SIMPLE':
      // Mor - just sum amount column into one category
      rows.forEach(row => {
        const amount = parseFloat(row[config.amountColumn]) || 0;
        totals[config.category] += amount;
      });
      break;

    case 'FILTER_BY_PRODUCT':
      // Phoenix, Ayalon, Migdal
      rows.forEach(row => {
        const productName = row[config.productColumn];
        const amount = parseFloat(row[config.amountColumn]) || 0;
        
        // Check exclusions
        if (config.excludeProducts && config.excludeProducts.includes(productName)) {
          return;
        }
        
        const category = config.categoryMappings[productName];
        if (category) {
          totals[category] += amount;
        }
      });
      break;

    case 'COLUMN_BASED':
      // Harel, Clal, Hachshara
      rows.forEach(row => {
        // Status filter for Hachshara
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
      });
      break;

    case 'COLUMN_BASED_WITH_SUBTRACTION':
      // Menorah
      rows.forEach(row => {
        Object.entries(config.formulas).forEach(([category, formula]) => {
          if (formula.operation === 'SUBTRACT') {
            // Base - subtract columns
            let total = parseFloat(row[formula.base]) || 0;
            formula.subtract.forEach(col => {
              total -= parseFloat(row[col]) || 0;
            });
            totals[category] += total;
          } else {
            // Regular sum
            let sum = 0;
            formula.columns.forEach(col => {
              sum += parseFloat(row[col]) || 0;
            });
            totals[category] += sum;
          }
        });
      });
      break;

    case 'MULTI_SHEET_FORMULAS':
      // Altshuler - needs special handling in route
      // This will be handled separately
      break;
  }

  return totals;
}

module.exports = {
  PRODUCT_CATEGORIES,
  COMPANY_CONFIGS,
  getCompanyConfig,
  shouldExcludeAgent,
  shouldExcludeProduct,
  getProductCategory,
  calculateCategoryTotals
};