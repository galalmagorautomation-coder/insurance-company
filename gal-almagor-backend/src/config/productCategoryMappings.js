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
    // REMOVE fallbackColumns - only count if commission exists!
    excludeZeroOutput: true,  // Skip rows with commission = 0
    categoryMappings: {
      'ריסק': PRODUCT_CATEGORIES.RISK,
      'בריאות': PRODUCT_CATEGORIES.RISK,
      'מחלות קשות': PRODUCT_CATEGORIES.RISK,
      'נכות': PRODUCT_CATEGORIES.RISK,  //  Add this
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
      sheetIdentifier: 'גמל',
      formulas: {
        [PRODUCT_CATEGORIES.FINANCIAL]: {
          columns: [
            'one_time_premium',                    // was: 'הפקדה חד פעמית'
            'internal_transfer_by_join_date',      // was: 'תנועות העברה פנימה לפי תאריך הצטרפות'
            'cancellations_year_a'                 // was: 'ביטול שנה א'
          ],
          operation: 'SUM'
        }
      }
    },
    pension: {
      sheetIdentifier: 'פנסיה',
      formulas: {
        [PRODUCT_CATEGORIES.PENSION]: {
          columns: [
            'gross_annual_premium',                // was: 'פרמיה שנתית - ברוטו'
            'internal_transfer_by_join_date',      // was: 'תנועות העברה פנימה לפי תאריך הצטרפות'
            'cancellations_year_b'                 // was: 'ביטולים שנה ב'
          ],
          operation: 'SUM'
        }
      }
    }
  }
},

  // ========================================
// 3. ANALYST (אנליסט)
// ========================================
3: {
  type: 'SIMPLE',
  amountColumn: 'balance',
  category: PRODUCT_CATEGORIES.FINANCIAL
},

  // ========================================
  // 4. HACHSHARA (הכשרה)
  // ========================================
  4: {
    type: 'COLUMN_BASED',
    formulas: {
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['one_time_premium'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['life_monthly'],
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
        columns: ['pension_harel'],  //  Changed to DB column name
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['private_risk'],  //  Changed to DB column name
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['savings_products_no_financials'],  //  Changed to DB column name
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.PENSION_TRANSFER]: {
        columns: ['pension_transfer_net'],  //  Changed to DB column name
        operation: 'SUM'
      }
    }
  },

  // ========================================
  // 7. CLAL (כלל)
  // ========================================
  // Clal has 3 file formats:
  // - Format 1: Insurance & Financial (cumulative YTD) - RISK, PENSION, FINANCIAL
  // - Format 2: Transfer Data (cumulative YTD) - PENSION_TRANSFER
  // - Format 3: Policy-level data (monthly) - filter by month, classify by product
  7: {
    type: 'COLUMN_BASED',
    isCumulative: true,  // Format 1 & 2 are YTD cumulative - subtract previous months
    formulas: {
      // From Format 1 (Insurance & Financial Products):
      // RISK = עסקי בריאות (health_business) + עסקי ריסק (risk_business)
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['health_business', 'risk_business'],
        operation: 'SUM'
      },
      // PENSION = פרופיל מנהלים (executive_profile) + קרן פנסיה חדשה (new_pension_fund)
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['executive_profile', 'new_pension_fund'],
        operation: 'SUM'
      },
      // FINANCIAL = סה"כ פיננסים (total_financial)
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['total_financial'],
        operation: 'SUM'
      },
      // From Format 2 (Transfer Data):
      // PENSION_TRANSFER = ניוד נטו (net_transfer)
      [PRODUCT_CATEGORIES.PENSION_TRANSFER]: {
        columns: ['net_transfer'],
        operation: 'SUM'
      }
    },
    // Format 3 (Policy-level) uses product classification from Column M
    // Handled separately in aggregation with product_category field
    policyLevelConfig: {
      categoryColumn: 'product_category',  // Stores RISK/PENSION/FINANCIAL classification
      amountColumn: 'output'               // Amount to sum
    }
  },

  // ========================================
  // 8. MIGDAL (מגדל)
  // ========================================
  8: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'measurement_basis_name',
    amountColumn: 'total_measured_premium',
    excludeAgents: ['אורלי יונאי'],
    excludeProducts: [
      // NOT RELEVANT - Exclude these products (measurement basis, not actual sales)
      'בסיס מדידה לפנסיה',
      'בסיס זיכוי לפנסיה רובד ב` לגיל 60-65',
      'בריאות וריסק',
      'בסיס זיכוי לפנסיה רובד ב` לגיל 60',
      'בריאות ללא סיעוד כולל הגדלות - בסיס תפוקה לזיכוי',
      'בריאות כולל הגדלות - בסיס תפוקה לזיכוי סיעוד 40% שקלול',
      'בסיס מדידה מוצרים פיננסים',
      'בסיס מדידה עמלת קשת, העברות ח"פ',
      'ביטוח מנהלים ללא הגדלות ,פרט ועצמאים',
      'בסיס מדידה לגמל להשקעה והשתלמות הפקדות שוטפות'
    ],
    categoryMappings: {
      // ========== פנסיוני (PENSION) - 4 products ==========
      'בסיס זיכוי לפנסיה רובד א` לגיל 60': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי ביטוח מנהלים עצמאים פרט (ללא מגדלור פרט חיסכון)': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי לפנסיה רובד א` גיל בין 60-65': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי ביטוח מנהלים ,עצמאים,פרט (ללא מגדלור פרט חיסכון)': PRODUCT_CATEGORIES.PENSION,

      // ========== ניוד פנסיה (PENSION_TRANSFER) - 2 products ==========
      'בסיס זיכוי ניוד פנסיה (עד גיל 60)': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'בסיס זיכוי ניוד פנסיה - גיל 60-65': PRODUCT_CATEGORIES.PENSION_TRANSFER,

      // ========== סיכונים (RISK) - 2 products ==========
      'בסיס זיכוי ריסק כולל הגדלות': PRODUCT_CATEGORIES.RISK,
      'בסיס זיכוי בריאות וריסק (סיעוד 40% )': PRODUCT_CATEGORIES.RISK,

      // ========== פיננסים (FINANCIAL) - 7 products ==========
      'בסיס זיכוי קשת שוטף ללא פרמית מינימום': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי בגין הפקדות חד פעמיות בקשת': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי מוצרים פיננסים': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי בגין ניודים וחד פעמי ביטוח חיים': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי ניוד פנסיה להמרה לקצבה מעל גיל 65': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי לגמל להשקעה והשתלמות הפקדות שוטפות': PRODUCT_CATEGORIES.FINANCIAL,
      'בסיס זיכוי בגין ניודים וח\"פ קה\"ש , גמל וגמל להשקעה': PRODUCT_CATEGORIES.FINANCIAL
    }
  },

  // ========================================
// 9. MEDIHO (מדיהו)
// ========================================
9: {
  type: 'SIMPLE',
  amountColumn: 'client_premium',
  category: PRODUCT_CATEGORIES.RISK
},

  // ========================================
  // 10. MOR (מור)
  // ========================================
  10: {
    type: 'SIMPLE',
    amountColumn: 'output',  // Changed from 'deposit_amount'
    category: PRODUCT_CATEGORIES.FINANCIAL
  },

  // ========================================
// 11. MENORAH (מנורה)
// ========================================
11: {
  type: 'FILTER_BY_PRODUCT',              // Changed from COLUMN_BASED_WITH_SUBTRACTION
  productColumn: 'product',                // Use 'שם ענף' column
  amountColumn: 'output',                  // Use 'תפוקה נטו'
  excludeAgents: ['דולב רן', 'אורטל יונאי'],
  subtractAgents: ['מזרחי שלי', 'בלאן סמיר'],
  
  categoryMappings: {
    // FINANCIAL (פיננסים)
    'גמל להשקעה': PRODUCT_CATEGORIES.FINANCIAL,
    'ט.פ -חסכון': PRODUCT_CATEGORIES.FINANCIAL,
    'מ.פ-קה"ש': PRODUCT_CATEGORIES.FINANCIAL,
    'מ.פ-קופת גמל': PRODUCT_CATEGORIES.FINANCIAL,
    
    // RISK (סיכונים)
    'בריאות': PRODUCT_CATEGORIES.RISK,
    'מחלות קשות': PRODUCT_CATEGORIES.RISK,
    'משכנתא-מבנה': PRODUCT_CATEGORIES.RISK,
    'משכנתא-ריסק': PRODUCT_CATEGORIES.RISK,
    'סטט מנ-.נוסף': PRODUCT_CATEGORIES.RISK,
    'ריסק1': PRODUCT_CATEGORIES.RISK,
    
    // PENSION (פנסיוני)
    'טופ לעתיד - מנהלים': PRODUCT_CATEGORIES.PENSION,
    'טופ לעתיד - פרט': PRODUCT_CATEGORIES.PENSION,
    'סטט מנ-.חסכון': PRODUCT_CATEGORIES.PENSION,
    'פנסיה': PRODUCT_CATEGORIES.PENSION,
    
    // PENSION TRANSFER (ניודי פנסיה) - from pension transfer file
    'ניוד פנסיה': PRODUCT_CATEGORIES.PENSION_TRANSFER
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