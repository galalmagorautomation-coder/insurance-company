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
    productColumn: 'product',
    amountColumn: 'output',
    categoryMappings: {
      // All products are RISK
      'משכנתא': PRODUCT_CATEGORIES.RISK,
      'ריסק': PRODUCT_CATEGORIES.RISK,
      'בריאות': PRODUCT_CATEGORIES.RISK,
      'מחלות': PRODUCT_CATEGORIES.RISK,
      'שלב': PRODUCT_CATEGORIES.RISK,
      'נכות ומוות מתאונה': PRODUCT_CATEGORIES.RISK
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
            'internal_transfer_by_join_date'       // 'תנועות העברה פנימה לפי תאריך הצטרפות' (Excel col B)
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
  amountColumn: 'output',                // raw_data.output ← mapped from Excel col N 'סהכ תנועות'
  category: PRODUCT_CATEGORIES.FINANCIAL
},

  // ========================================
  // 4. HACHSHARA (הכשרה)
  // ========================================
  4: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'product',
    amountColumn: 'output',
    categoryMappings: {
      'RISK': PRODUCT_CATEGORIES.RISK,
      'FINANCIAL': PRODUCT_CATEGORIES.FINANCIAL
    }
  },

  // ========================================
  // 5. PHOENIX (הפניקס)
  // ========================================
  5: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'product',
    amountColumn: 'output',
    categoryMappings: {
      // פנסיוני
      'אכ"ע': PRODUCT_CATEGORIES.PENSION,
      'פנסיה': PRODUCT_CATEGORIES.PENSION,

      // סיכונים
      'ביטוח חד"פ': PRODUCT_CATEGORIES.RISK,
      'בריאות פרט': PRODUCT_CATEGORIES.RISK,
      'מחלות קשות': PRODUCT_CATEGORIES.RISK,
      'משכנתא': PRODUCT_CATEGORIES.RISK,
      'ריסק פרט': PRODUCT_CATEGORIES.RISK,

      // פיננסים
      'גמל': PRODUCT_CATEGORIES.FINANCIAL,
      'גמל העברות': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול לזמן פרישה': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול פרט': PRODUCT_CATEGORIES.FINANCIAL,
      'מסלול פרט חד"פ': PRODUCT_CATEGORIES.FINANCIAL,

      // ניודי פנסיה
      'פנסיה העברות': PRODUCT_CATEGORIES.PENSION_TRANSFER
    }
  },

  // ========================================
  // 6. HAREL (הראל)
  // ========================================
  6: {
    type: 'COLUMN_BASED',
    formulas: {
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['pension_harel'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['private_risk'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['savings_products_no_financials'],
        operation: 'SUM'
      }
    }
  },

  // ========================================
  // 7. CLAL (כלל)
  // ========================================
  // 3 files, all cumulative YTD:
  // - Set 1 (finance.xlsx): total_financial column → FINANCIAL
  // - Set 2 (pension_transfer.xlsx): net_transfer column → PENSION_TRANSFER
  // - Set 3 (דוח תפוקה - רמת עוסק מורשה): health_business + risk_business → RISK, new_pension_fund → PENSION
  7: {
    type: 'COLUMN_BASED',
    formulas: {
      [PRODUCT_CATEGORIES.RISK]: {
        columns: ['health_business', 'risk_business'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.PENSION]: {
        columns: ['new_pension_fund'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.FINANCIAL]: {
        columns: ['total_financial'],
        operation: 'SUM'
      },
      [PRODUCT_CATEGORIES.PENSION_TRANSFER]: {
        columns: ['net_transfer'],
        operation: 'SUM'
      }
    }
  },

  // ========================================
  // 8. MIGDAL (מגדל)
  // ========================================
  8: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'measurement_basis_name',
    amountColumn: 'output',
    excludeAgents: ['אורלי יונאי'],
    categoryMappings: {
      // ========== פנסיוני (PENSION) - 3 products ==========
      'בסיס זיכוי לפנסיה רובד א` גיל בין 60-65,לשנת 2026': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי לפנסיה רובד א` עד גיל 60 ,לשנת 2026': PRODUCT_CATEGORIES.PENSION,
      'בסיס זיכוי  הפקדות שוטפות  קה"ש , גמל וגמל להשקעה': PRODUCT_CATEGORIES.PENSION,

      // ========== ניוד פנסיה (PENSION_TRANSFER) - 2 products ==========
      'בסיס זיכוי ניוד פנסיה 2026 (עד גיל 60)': PRODUCT_CATEGORIES.PENSION_TRANSFER,
      'בסיס זיכוי ניוד פנסיה להמרה לקצבה מעל גיל 65': PRODUCT_CATEGORIES.PENSION_TRANSFER,

      // ========== פיננסים (FINANCIAL) - 1 product ==========
      'בסיס זיכוי מוצרים פיננסים 2026': PRODUCT_CATEGORIES.FINANCIAL,

      // ========== סיכונים (RISK) - 2 products ==========
      'בסיס זיכוי ריסק כולל הגדלות לשנת 2026': PRODUCT_CATEGORIES.RISK,
      'בריאות כולל הגדלות - בסיס תפוקה לזיכוי סיעוד 40% שקלול לשנת 2026': PRODUCT_CATEGORIES.RISK
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
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'product',                // Column F - 'ענף ראשי'
    amountColumn: 'output',                  // Column T - 'תפוקה נטו'

    categoryMappings: {
      // RISK (סיכונים)
      '91  מוצרי פרט': PRODUCT_CATEGORIES.RISK,

      // PENSION (פנסיוני)
      '92  פנסיוני שוטף - סה"כ': PRODUCT_CATEGORIES.PENSION,
      '94  פנסיוני ח"פ-סה"כ': PRODUCT_CATEGORIES.PENSION,

      // FINANCIAL (פיננסים)
      '93  פיננסי שוטף - סה"כ': PRODUCT_CATEGORIES.FINANCIAL,
      '95  פיננסי ח"פ-סה"כ': PRODUCT_CATEGORIES.FINANCIAL,

      // PENSION TRANSFER (ניודי פנסיה) - from separate pension transfer file
      'ניוד פנסיה': PRODUCT_CATEGORIES.PENSION_TRANSFER
    }
  },

  // ========================================
  // 28. MEITAV (מיטב)
  // ========================================
  // Meitav file formats, each tagged in the product field by the upload handler:
  // - Set 1: הפקדות (Pension) → every row product = 'PENSION'
  // - Set 2+3 combined (פיננסים + ניודי פנסיה): per-row tagging from סוג קופה —
  //     contains "פנסיה" → 'PENSION_TRANSFER', else → 'FINANCIAL'
  // - Legacy Set 2 / Set 3 separate files (≤ Jan 2026) → 'FINANCIAL' / 'PENSION_TRANSFER'
  // No risk products.
  28: {
    type: 'FILTER_BY_PRODUCT',
    productColumn: 'product',
    amountColumn: 'output',
    categoryMappings: {
      'PENSION': PRODUCT_CATEGORIES.PENSION,
      'FINANCIAL': PRODUCT_CATEGORIES.FINANCIAL,
      'PENSION_TRANSFER': PRODUCT_CATEGORIES.PENSION_TRANSFER
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
 * Return the company config with DB-stored product mappings merged into
 * categoryMappings. For FILTER_BY_PRODUCT companies the boss can add new
 * products through the UI, which writes to product_category_mappings;
 * we layer those on top of the hardcoded mappings here so the upload
 * pipeline picks them up without a code change.
 *
 * Non-FILTER_BY_PRODUCT companies pass through unchanged.
 *
 * @param {number} companyId
 * @param {object} supabase  Authenticated Supabase client (service role)
 * @returns {Promise<object|null>}
 */
async function getAugmentedConfig(companyId, supabase) {
  const baseConfig = COMPANY_CONFIGS[companyId];
  if (!baseConfig) return null;
  if (baseConfig.type !== 'FILTER_BY_PRODUCT') return baseConfig;

  const { data, error } = await supabase
    .from('product_category_mappings')
    .select('product_name, category')
    .eq('company_id', companyId);

  if (error) {
    console.warn(`[productMappings] failed to load DB mappings for company ${companyId}:`, error.message);
    return baseConfig;
  }
  if (!data || data.length === 0) return baseConfig;

  // DB mappings layered on top of hardcoded ones (DB wins on conflict).
  const merged = { ...(baseConfig.categoryMappings || {}) };
  for (const row of data) {
    merged[row.product_name] = row.category;
  }
  return { ...baseConfig, categoryMappings: merged };
}

/**
 * Return the unique list of products in `rows` that aren't categorized
 * yet (neither in hardcoded mappings nor in the DB). Only meaningful for
 * FILTER_BY_PRODUCT companies; returns [] otherwise.
 *
 * Skips known excluded products (config.excludeProducts).
 */
async function findUnmappedProducts(companyId, rows, supabase) {
  const config = await getAugmentedConfig(companyId, supabase);
  if (!config || config.type !== 'FILTER_BY_PRODUCT') return [];

  const known = new Set(Object.keys(config.categoryMappings || {}));
  const excluded = new Set(config.excludeProducts || []);
  const productColumn = config.productColumn || 'product';

  const seen = new Set();
  const unmapped = [];
  for (const row of rows) {
    const p = row[productColumn];
    if (!p || typeof p !== 'string') continue;
    if (known.has(p) || excluded.has(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    unmapped.push(p);
  }
  return unmapped;
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
  getAugmentedConfig,
  findUnmappedProducts,
  shouldExcludeAgent,
  shouldExcludeProduct,
  getProductCategory,
  calculateCategoryTotals
};
