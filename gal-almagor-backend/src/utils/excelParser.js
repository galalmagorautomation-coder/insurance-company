/**
 * Excel Parser Utility
 * Handles parsing and transforming Excel data based on company mappings
 */

const { getCompanyMapping, getHachsharaMapping } = require('../config/companyMappings');

/**
 * Helper function to format dates to YYYY-MM-DD
 */
const formatDate = (date) => {
  if (!date) return null;
  
  // Handle "-" or empty string as null
  if (date === '-' || date === '' || date === ' ') return null;
  
  // Handle Date objects
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // ✅ ADD: Handle MM/YYYY format (convert to first day of month: YYYY-MM-01)
  if (typeof date === 'string' && /^\d{2}\/\d{4}$/.test(date)) {
    const [month, year] = date.split('/');
    return `${year}-${month}-01`;
  }
  
  // Handle DD/MM/YYYY string format
  if (typeof date === 'string' && date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  
  return date;
};

/**
 * Parse Excel data and transform to database format
 * @param {Array} excelData - Raw data from Excel file
 * @param {number} companyId - Company ID from database
 * @param {string} companyName - Company name (Hebrew)
 * @param {string} uploadMonth - Upload month (YYYY-MM format)
 * @returns {Object} - { success: boolean, data: Array, errors: Array }
 */
function parseExcelData(excelData, companyId, companyName, uploadMonth) {
  let mapping = getCompanyMapping(companyName);

  if (!mapping) {
    return {
      success: false,
      data: [],
      errors: [`No mapping configuration found for company: ${companyName}`]
    };
  }

  // For Hachshara company, use auto-detection based on Excel columns
  if (companyName === 'הכשרה' || companyName === 'Hachshara') {
    if (excelData && excelData.length > 0) {
      const columns = Object.keys(excelData[0]);
      mapping = getHachsharaMapping(columns);
      console.log(`Auto-detected Hachshara mapping: ${mapping.description}`);
    }
  }

  const transformedData = [];
  const errors = [];

  // Parse each row
  excelData.forEach((row, index) => {
    try {
      // Skip completely empty rows
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ''
      );
      if (!hasData) {
        return;
      }

      // ✅ ADD HERE - Direct check for Harel header row
    if (companyName === 'הראל') {
      const harelFirstValue = row['סיכוני פרט'];
      if (harelFirstValue && typeof harelFirstValue === 'string' && 
          (harelFirstValue.includes('תפוקה') || harelFirstValue.includes('נטו'))) {
        return;
      }
    }
    
      // ✅ IMPROVED: Skip header/sub-header rows - only check NUMERIC columns, not all columns
      const numericColumns = [
        mapping.columns.output,
        mapping.columns.privateRisk,
        mapping.columns.pensionHarel,
        mapping.columns.clientPremium,
        mapping.columns.totalMeasuredPremium,
        mapping.columns.pensionTransferNet,
        mapping.columns.savingsProductsNoFinancials
      ].filter(col => col); // Remove undefined columns
      
      const hasHeaderText = numericColumns.some(col => {
        const value = row[col];
        return typeof value === 'string' && (
          value.includes('תפוקה') || 
          value.includes('נטו') ||
          value.includes('Header') ||
          value.includes('Total')
        );
      });
    
      if (hasHeaderText) {
        return;
      }
      
      // ✅ ADD: Extra validation - skip rows where ALL numeric fields are strings
      if (companyName === 'הראל') {
        const allNumericFields = [
          row[mapping.columns.privateRisk],
          row[mapping.columns.pensionHarel],
          row[mapping.columns.savingsProductsNoFinancials],
          row[mapping.columns.pensionTransferNet]
        ];
        
        const allAreStrings = allNumericFields.every(val => 
          val && typeof val === 'string' && isNaN(parseFloat(val))
        );
        
        if (allAreStrings) {
          return;
        }
      }

      // Get agent name and clean it
      let agentName = row[mapping.columns.agentName];
      let agentNumber = row[mapping.columns.agentNumber];

      // ✅ ADD: Special handling for Harel - agent name and number in same column
if (companyName === 'הראל' && agentName && typeof agentName === 'string') {
  // Format: "גל אלמגור-דאוד סוכנות - 85646"
  const match = agentName.match(/^(.+?)\s*-\s*(\d+)$/);
  if (match) {
    agentName = match[1].trim();  // "גל אלמגור-דאוד סוכנות"
    agentNumber = match[2].trim(); // "85646"
  }
  
  // Skip summary rows like "סה"כ"
  if (agentName.includes('סה"כ') || agentName === 'סה"כ') {
    return;
  }
}
      // Clean agent name - remove parentheses and agent numbers
      if (agentName && typeof agentName === 'string') {
        // Extract agent number if it's in the same field (for companies like Ayalon)
        const numberMatch = agentName.match(/^\d+/);
        if (numberMatch) {
          agentNumber = numberMatch[0];
        }

        // Remove agent number patterns from name
        agentName = agentName.replace(/^\d+-\([^)]+\)/, '');     // Remove "70504-(2020)"
        agentName = agentName.replace(/^\d+-/, '');              // Remove leading "70504-"
        agentName = agentName.replace(/\s*\(\d+\)\s*/g, '');     // ✅ CHANGE: Remove "(2020)" anywhere
        agentName = agentName.replace(/^\(/, '');                // Remove leading "("
        agentName = agentName.replace(/\s*\(\d+\)?$/, '');       // Remove trailing "(number)"
        agentName = agentName.trim();
      }

      // ✅ ADD: Special cleaning for Analyst company agent_number
      if (companyName === 'אנליסט' && agentNumber && typeof agentNumber === 'string') {
        // Clean agent_number by removing patterns (same cleaning as agent_name)
        agentNumber = agentNumber.replace(/^\d+-\([^)]+\)/, '');     // Remove "70504-(2020)"
        agentNumber = agentNumber.replace(/^\d+-/, '');              // Remove leading "70504-"
        agentNumber = agentNumber.replace(/\s*\(\d+\)\s*/g, '');     // Remove "(2020)" anywhere
        agentNumber = agentNumber.replace(/^\(/, '');                // Remove leading "("
        agentNumber = agentNumber.replace(/\s*\(\d+\)?$/, '');       // Remove trailing "(number)"
        agentNumber = agentNumber.trim();
      }

      const product = row[mapping.columns.product];

      // Parse output amount
      const outputStr = row[mapping.columns.output];
      const output = parseFloat(
        String(outputStr || 0).replace(/"/g, '').replace(/,/g, '')
      ) || 0;

      // Map all columns to database structure
      transformedData.push({
        company_id: companyId,
        month: uploadMonth,
        agent_name: agentName,
        agent_number: String(agentNumber),
        policy_number: row[mapping.columns.policyNumber] || null,
        collective: row[mapping.columns.collective] || null,
        insured_id: row[mapping.columns.insuredId] || null,
        insured_name: row[mapping.columns.insuredName] || null,
        secondary_insured_id: row[mapping.columns.secondaryInsuredId] || null,
        product_group: row[mapping.columns.productGroup] || null,
        product: product,
        coverage_type: row[mapping.columns.coverageType] || null,
        submission_date: formatDate(row[mapping.columns.submissionDate]),   
        production_date: formatDate(row[mapping.columns.productionDate]),    
        output: output,
        policy_status: row[mapping.columns.policyStatus] || null,
        life_monthly: row[mapping.columns.lifeMonthly] || null,
        arrears_months: row[mapping.columns.arrearsMonths] || null,

        // Ayalon-specific columns
        district: row[mapping.columns.district] || null,
        supervisor_name: row[mapping.columns.supervisorName] || null,
        main_agent_name_number: row[mapping.columns.mainAgentNameNumber] || null,
        main_agent_id: row[mapping.columns.mainAgentId] || null,
        secondary_agent_id: row[mapping.columns.secondaryAgentId] || null,
        insurance_type_name: row[mapping.columns.insuranceTypeName] || null,
        tariff: row[mapping.columns.tariff] || null,
        insured_birth_date: formatDate(row[mapping.columns.insuredBirthDate]),
        proposal_policy: row[mapping.columns.proposalPolicy] || null,
        tariff_number: row[mapping.columns.tariffNumber] || null,
        tariff_name: row[mapping.columns.tariffName] || null,
        tariff_status: row[mapping.columns.tariffStatus] || null,
        tariff_start_date: formatDate(row[mapping.columns.tariffStartDate]),
        tariff_cancellation_date: formatDate(row[mapping.columns.tariffCancellationDate]),
        proposal_date: formatDate(row[mapping.columns.proposalDate]),
        registration_date: formatDate(row[mapping.columns.registrationDate]),
        insurance_start_process: formatDate(row[mapping.columns.insuranceStartProcess]),
        policy_production_date: formatDate(row[mapping.columns.policyProductionDate]),
        coverage_production_date: formatDate(row[mapping.columns.coverageProductionDate]),
        proposal_date_alt: formatDate(row[mapping.columns.proposalDateAlt]),
        previous_policy_status: row[mapping.columns.previousPolicyStatus] || null,
        commission_type: row[mapping.columns.commissionType] || null,
        net_collection_premium: row[mapping.columns.netCollectionPremium] || null,
        gross_collection_premium: row[mapping.columns.grossCollectionPremium] || null,
        commission_premium_amount: row[mapping.columns.commissionPremiumAmount] || null,

        // Analyst-specific columns
        entity_type: row[mapping.columns.entityType] || null,
        valuation: row[mapping.columns.valuation] || null,
        agreement: row[mapping.columns.agreement] || null,
        recruiting_agreement: row[mapping.columns.recruitingAgreement] || null,
        agency_number: row[mapping.columns.agencyNumber] || null,
        agency_name: row[mapping.columns.agencyName] || null,
        member: row[mapping.columns.member] || null,
        account_code: row[mapping.columns.accountCode] || null,
        super_fund: row[mapping.columns.superFund] || null,
        branch: row[mapping.columns.branch] || null,
        account: row[mapping.columns.account] || null,
        branch_track_account: row[mapping.columns.branchTrackAccount] || null,
        join_date: formatDate(row[mapping.columns.joinDate]),
        balance: row[mapping.columns.balance] || null,
        commission_payable: row[mapping.columns.commissionPayable] || null,

        // Menorah-specific columns
        agent_license_hierarchy: row[mapping.columns.agentLicenseHierarchy] || null,
        agent_name_in_license_hierarchy: row[mapping.columns.agentNameInLicenseHierarchy] || null,
        consolidating_branch_license: row[mapping.columns.consolidatingBranchLicense] || null,
        branch_license: row[mapping.columns.branchLicense] || null,
        consolidating_agent_license: row[mapping.columns.consolidatingAgentLicense] || null,
        agent_license: row[mapping.columns.agentLicense] || null,
        managers_independents_status: row[mapping.columns.managersIndependentsStatus] || null,
        pension: row[mapping.columns.pension] || null,
        total_pension: row[mapping.columns.totalPension] || null,
        health_compensation: row[mapping.columns.healthCompensation] || null,
        health_branch_no_accidents: row[mapping.columns.healthBranchNoAccidents] || null,
        nursing_care: row[mapping.columns.nursingCare] || null,
        top_accidents: row[mapping.columns.topAccidents] || null,
        risk_no_mortgage_managers: row[mapping.columns.riskNoMortgageManagers] || null,
        risk_no_mortgage_private: row[mapping.columns.riskNoMortgagePrivate] || null,
        mortgage_risk: row[mapping.columns.mortgageRisk] || null,
        step_death_disability: row[mapping.columns.stepDeathDisability] || null,
        total_insurance: row[mapping.columns.totalInsurance] || null,
        gemel_training: row[mapping.columns.gemelTraining] || null,
        top_finance_investment_savings: row[mapping.columns.topFinanceInvestmentSavings] || null,
        third_age: row[mapping.columns.thirdAge] || null,
        total_financial: row[mapping.columns.totalFinancial] || null,

        // Mor-specific columns
        member_id: row[mapping.columns.memberId] || null,
        member_name: row[mapping.columns.memberName] || null,
        fund_number: row[mapping.columns.fundNumber] || null,
        fund_opening_date: formatDate(row[mapping.columns.fundOpeningDate]),
        product_type: row[mapping.columns.productType] || null,
        valid_forms_receipt_date: formatDate(row[mapping.columns.validFormsReceiptDate]),
        transaction_type: row[mapping.columns.transactionType] || null,
        value_date: formatDate(row[mapping.columns.valueDate]),
        transfer_date: formatDate(row[mapping.columns.transferDate]),
        transaction_amount: row[mapping.columns.transactionAmount] || null,
        supervising_agent: row[mapping.columns.supervisingAgent] || null,
        rewarded_agent_number: row[mapping.columns.rewardedAgentNumber] || null,
        rewarded_agent_license_number: row[mapping.columns.rewardedAgentLicenseNumber] || null,
        rewarded_agent_name: row[mapping.columns.rewardedAgentName] || null,
        rewarded_agent_type: row[mapping.columns.rewardedAgentType] || null,
        column1: row[mapping.columns.column1] || null,
        column2: row[mapping.columns.column2] || null,
        rewarded_agent_house_license_number: row[mapping.columns.rewardedAgentHouseLicenseNumber] || null,
        rewarded_agent_house_name: row[mapping.columns.rewardedAgentHouseName] || null,
        recruitment_month: row[mapping.columns.recruitmentMonth] || null,
        supervisor: row[mapping.columns.supervisor] || null,
        distribution_channel: row[mapping.columns.distributionChannel] || null,
        monthly_target: row[mapping.columns.monthlyTarget] || null,
        employer_id: row[mapping.columns.employerId] || null,
        employer_name: row[mapping.columns.employerName] || null,
        incentive: row[mapping.columns.incentive] || null,
        group_name: row[mapping.columns.groupName] || null,

        // ✅ ADD Mediho-specific columns
paid: row[mapping.columns.paid] || null,
report_date: formatDate(row[mapping.columns.reportDate]),
reference_date: formatDate(row[mapping.columns.referenceDate]),
client_id: row[mapping.columns.clientId] || null,
client_name: row[mapping.columns.clientName] || null,
agent_id: row[mapping.columns.agentId] || null,
mentor: row[mapping.columns.mentor] || null,
client_premium: row[mapping.columns.clientPremium] || null,
quantity: row[mapping.columns.quantity] || null,
weighted_client_premium: row[mapping.columns.weightedClientPremium] || null,
agent_commission: row[mapping.columns.agentCommission] || null,
details: row[mapping.columns.details] || null,
classification: row[mapping.columns.classification] || null,
notes: row[mapping.columns.notes] || null,

// ✅ ADD Migdal-specific columns
measurement_basis_name: row[mapping.columns.measurementBasisName] || null,
total_measured_premium: row[mapping.columns.totalMeasuredPremium] || null,

// ✅ ADD Harel-specific columns
private_risk: row[mapping.columns.privateRisk] || null,
pension_harel: row[mapping.columns.pensionHarel] || null,
savings_products_no_financials: row[mapping.columns.savingsProductsNoFinancials] || null,
pension_transfer_net: row[mapping.columns.pensionTransferNet] || null,
nursing_care_harel: row[mapping.columns.nursingCareHarel] || null,

// ✅ ADD Hachshara-specific columns
agent_name: row[mapping.columns.agentName] || null,
agent_number: row[mapping.columns.agentNumber] || null,
output: row[mapping.columns.output] || null,
measurement_basis_name: row[mapping.columns.measurementBasisName] || null,
total_measured_premium: row[mapping.columns.totalMeasuredPremium] || null,
      });

    } catch (error) {
      errors.push(`Row ${index + 2}: ${error.message}`);
    }
  });

  return {
    success: errors.length === 0,
    data: transformedData,
    errors: errors,
    summary: {
      totalRows: excelData.length,
      rowsProcessed: transformedData.length,
      errorsCount: errors.length
    }
  };
}

module.exports = {
  parseExcelData
};