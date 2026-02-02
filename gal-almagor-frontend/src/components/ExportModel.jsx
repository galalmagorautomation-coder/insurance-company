import React, { useState, useEffect } from 'react';
import {
  X, Calendar, User, Briefcase, Building,
  FileSpreadsheet, FileText, FileDown, FileBox, Search, Database, Download, ArrowRight, ShieldCheck, HeartPulse, Loader
} from 'lucide-react';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';
import { useLanguage } from '../contexts/LanguageContext';

const ExportModal = ({
  isOpen,
  onClose,
  initialProductType = 'Life Insurance',
  initialStartMonth = '',
  initialEndMonth = '',
  initialCompanyId = 'all',
  initialDepartment = 'all',
  initialInspector = 'all',
  initialAgent = 'all'
}) => {
  const { t, language } = useLanguage();
  
  // Translation object
  const translations = {
    en: {
      exportEngine: 'Export Engine',
      configGeneration: 'Configuration & Generation',
      productCategory: 'Product Category',
      elementary: 'Elementary',
      lifeInsurance: 'Life Insurance',
      dataModule: 'Data Module',
      allProducts: 'All Products',
      finance: 'Finance',
      pension: 'Pension',
      pensionTransfer: 'Pension Transfer',
      risk: 'Risk',
      reportingPeriod: 'Reporting Period',
      startDate: 'Start Date',
      endDate: 'End Date',
      entityFilters: 'Entity Filters',
      outputFormat: 'Output Format',
      excel: 'Excel',
      preparing: 'Preparing',
      for: 'for',
      cancel: 'Cancel',
      generateDownload: 'Generate Download',
      generating: 'Generating...',
      selectDatesError: 'Please select both start and end dates'
    },
    he: {
      exportEngine: 'מנוע ייצוא',
      configGeneration: 'תצורה ויצירה',
      productCategory: 'קטגוריית מוצר',
      elementary: 'אלמנטרי',
      lifeInsurance: 'ביטוח חיים',
      dataModule: 'מודול נתונים',
      allProducts: 'כל המוצרים',
      finance: 'פיננסי',
      pension: 'פנסיה',
      pensionTransfer: 'העברת פנסיה',
      risk: 'סיכון',
      reportingPeriod: 'תקופת דיווח',
      startDate: 'תאריך התחלה',
      endDate: 'תאריך סיום',
      entityFilters: 'מסנני ישויות',
      outputFormat: 'פורמט פלט',
      excel: 'אקסל',
      preparing: 'מכין',
      for: 'עבור',
      cancel: 'ביטול',
      generateDownload: 'צור הורדה',
      generating: 'יוצר...',
      selectDatesError: 'אנא בחר תאריכי התחלה וסיום'
    }
  };

  const tr = translations[language] || translations.he;

  const [formData, setFormData] = useState({
    productType: initialProductType,
    dataScope: 'All Products',
    startMonth: initialStartMonth,
    endMonth: initialEndMonth,
    company: initialCompanyId,
    department: initialDepartment,
    inspector: initialInspector,
    agent: initialAgent,
    format: 'excel'
  });

  // Reset form data when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setFormData({
        productType: initialProductType,
        dataScope: 'All Products',
        startMonth: initialStartMonth,
        endMonth: initialEndMonth,
        company: initialCompanyId,
        department: initialDepartment,
        inspector: initialInspector,
        agent: initialAgent,
        format: 'excel'
      });
    }
  }, [isOpen, initialProductType, initialStartMonth, initialEndMonth, initialCompanyId, initialDepartment, initialInspector, initialAgent]);

  // State for dynamic dropdown data
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Fetch companies when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchCompanies = async () => {
      try {
        setLoadingDropdowns(true);
        const response = await fetch(`${API_ENDPOINTS.companies}`);
        const result = await response.json();

        if (result.success && result.data) {
          console.log('Fetched companies:', result.data);
          setCompanies(result.data);
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchCompanies();
  }, [isOpen]);

  // Fetch agents when modal opens or filters change
  useEffect(() => {
    if (!isOpen) return;

    const fetchAgents = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.agents}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Extract unique departments
          const uniqueDepartments = [...new Set(result.data.map(agent => agent.department).filter(Boolean))];
          setDepartments(uniqueDepartments.sort());

          // Extract unique inspectors (only for Life Insurance)
          if (formData.productType === 'Life Insurance') {
            const uniqueInspectors = [...new Set(result.data.map(agent => agent.inspector).filter(Boolean))];
            setInspectors(uniqueInspectors.sort());
          }

          // Filter agents based on selected filters
          let filteredAgents = result.data;

          // Filter by insurance type
          if (formData.productType === 'Life Insurance') {
            filteredAgents = filteredAgents.filter(agent => agent.insurance === true);
          } else {
            filteredAgents = filteredAgents.filter(agent => agent.elementary === true);
          }

          // Filter by company if selected
          if (formData.company && formData.company !== 'all' && formData.company !== 'All Companies') {
            filteredAgents = filteredAgents.filter(agent =>
              agent.company_id && agent.company_id.includes(parseInt(formData.company))
            );
          }

          // Filter by department if selected
          if (formData.department && formData.department !== 'all' && formData.department !== 'All Departments') {
            filteredAgents = filteredAgents.filter(agent => agent.department === formData.department);
          }

          // Filter by inspector if selected (Life Insurance only)
          if (formData.productType === 'Life Insurance' && formData.inspector && formData.inspector !== 'all' && formData.inspector !== 'All Inspectors') {
            filteredAgents = filteredAgents.filter(agent => agent.inspector === formData.inspector);
          }

          // Extract agent names
          const agentNames = filteredAgents.map(agent => agent.agent_name).filter(Boolean).sort();
          setAgents(agentNames);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, [isOpen, formData.productType, formData.company, formData.department, formData.inspector]);

  const formats = [
    // { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-600' },
    { id: 'excel', label: tr.excel, icon: FileSpreadsheet, color: 'text-green-600' },
    // { id: 'pdf', label: 'PDF', icon: FileDown, color: 'text-red-600' },
    // { id: 'word', label: 'Word', icon: FileBox, color: 'text-indigo-600' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleGenerateDownload = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Validate required fields
      if (!formData.startMonth || !formData.endMonth) {
        setExportError(tr.selectDatesError);
        setIsExporting(false);
        return;
      }

      // Determine endpoint based on product type
      // Use template export for Life Insurance
      const endpoint = formData.productType === 'Life Insurance'
        ? `${API_ENDPOINTS.export}/template/life-insurance`
        : `${API_ENDPOINTS.export}/elementary`;

      // Prepare payload
      const payload = {
        startMonth: formData.startMonth,
        endMonth: formData.endMonth,
        company: formData.company,
        department: formData.department,
        agent: formData.agent,
        format: formData.format
      };

      // Add Life Insurance specific fields
      if (formData.productType === 'Life Insurance') {
        payload.dataScope = formData.dataScope;
        payload.inspector = formData.inspector;
      }

      // Make API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${formData.productType.toLowerCase().replace(' ', '_')}_${formData.startMonth}_${formData.endMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal on success
      onClose();

    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message || 'Failed to generate export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Early return after all hooks to maintain hook order
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">{tr.exportEngine}</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tr.configGeneration}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-12 gap-10">
            
            {/* Left Column: Product & Scope (4/12) */}
            <div className="col-span-4 space-y-6">
              
              {/* Product Selection Toggle */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{tr.productCategory}</label>
                <div className="flex p-1.5 bg-slate-100 rounded-xl gap-1">
                  <button
                    onClick={() => setFormData({...formData, productType: 'Elementary'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.productType === 'Elementary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {tr.elementary}
                  </button>
                  <button
                    onClick={() => setFormData({...formData, productType: 'Life Insurance'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.productType === 'Life Insurance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <HeartPulse className="w-4 h-4" />
                    {tr.lifeInsurance}
                  </button>
                </div>
              </div>

              {/* Conditional Data Module (Only for Life Insurance) */}
              {formData.productType === 'Life Insurance' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <SelectGroup
                    icon={Database}
                    label={tr.dataModule}
                    name="dataScope"
                    value={formData.dataScope}
                    onChange={handleChange}
                    options={[
                      { value: 'All Products', label: tr.allProducts },
                      { value: 'Finance', label: tr.finance },
                      { value: 'Pension', label: tr.pension },
                      { value: 'Pension Transfer', label: tr.pensionTransfer },
                      { value: 'Risk', label: tr.risk }
                    ]}
                    isPrimary
                  />
                </div>
              )}

              {/* Reporting Period */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{tr.reportingPeriod}</label>
                <div className="grid grid-cols-1 gap-3">
                  <InputGroup icon={Calendar} label={tr.startDate}>
                    <input type="month" name="startMonth" onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </InputGroup>
                  <InputGroup icon={Calendar} label={tr.endDate}>
                    <input type="month" name="endMonth" onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </InputGroup>
                </div>
              </div>
            </div>

            {/* Right Column: Filters & Output (8/12) */}
            <div className="col-span-8 space-y-8">
              
              {/* Filter Grid */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{tr.entityFilters}</label>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <SelectGroup
                    icon={Building}
                    label={language === 'he' ? 'חברה' : 'Company'}
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    options={[
                      { value: 'all', label: language === 'he' ? 'כל החברות' : 'All Companies' },
                      ...companies.map(c => ({
                        value: c.id,
                        label: language === 'he' ? (c.name_he || c.name) : c.name
                      }))
                    ]}
                    loading={loadingDropdowns}
                  />
                  {formData.productType === 'Life Insurance' && (
                    <SelectGroup
                      icon={Search}
                      label={language === 'he' ? 'בודק' : 'Inspector'}
                      name="inspector"
                      value={formData.inspector}
                      onChange={handleChange}
                      options={[
                        { value: 'all', label: language === 'he' ? 'כל הבודקים' : 'All Inspectors' },
                        ...inspectors
                      ]}
                    />
                  )}
                  <SelectGroup
                    icon={Briefcase}
                    label={language === 'he' ? 'מחלקה' : 'Department'}
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    options={[
                      { value: 'all', label: language === 'he' ? 'כל המחלקות' : 'All Departments' },
                      ...departments
                    ]}
                  />
                  <SelectGroup
                    icon={User}
                    label={language === 'he' ? 'סוכן' : 'Agent'}
                    name="agent"
                    value={formData.agent}
                    onChange={handleChange}
                    options={[
                      { value: 'all', label: language === 'he' ? 'כל הסוכנים' : 'All Agents' },
                      ...agents
                    ]}
                  />
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-4 pt-6 border-t border-slate-50">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{tr.outputFormat}</label>
                <div className="grid grid-cols-4 gap-3">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormData({...formData, format: fmt.id})}
                      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        formData.format === fmt.id 
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm scale-[1.02]' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100/50'
                      }`}
                    >
                      <fmt.icon className={`w-6 h-6 ${formData.format === fmt.id ? fmt.color : 'text-slate-400'}`} />
                      <span className={`text-[10px] font-bold uppercase ${formData.format === fmt.id ? 'text-slate-900' : 'text-slate-500'}`}>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100">
          {/* Error Message */}
          {exportError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {exportError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              {tr.preparing} <span className="text-blue-600 font-bold uppercase">{formData.format}</span> {tr.for}
              <span className="text-slate-800 font-bold ml-1">
                {formData.productType === 'Life Insurance' ? tr.lifeInsurance : tr.elementary} {formData.productType === 'Life Insurance' ? `(${formData.dataScope})` : ''}
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isExporting}
                className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tr.cancel}
              </button>
              <button
                onClick={handleGenerateDownload}
                disabled={isExporting || !formData.startMonth || !formData.endMonth}
                className="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isExporting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {tr.generating}
                  </>
                ) : (
                  <>
                    {tr.generateDownload}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Helpers
const InputGroup = ({ icon: Icon, label, children }) => (
  <div className="space-y-1.5 flex-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      {children}
    </div>
  </div>
);

const SelectGroup = ({ icon: Icon, label, options, name, value, onChange, isPrimary, loading }) => (
  <InputGroup icon={Icon} label={label}>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={loading}
      className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm appearance-none cursor-pointer outline-none transition-all ${
        isPrimary
        ? 'bg-blue-600 border-blue-700 text-white font-bold shadow-md shadow-blue-100'
        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {options.map(o => {
        // Handle both string options and object options with value/label
        const optionValue = typeof o === 'string' ? o : o.value;
        const optionLabel = typeof o === 'string' ? o : o.label;
        return (
          <option key={optionValue} value={optionValue} className="text-slate-900 bg-white font-normal">
            {optionLabel}
          </option>
        );
      })}
    </select>
    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isPrimary ? 'text-blue-200' : 'text-slate-400'}`}>
       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    </div>
  </InputGroup>
);

export default ExportModal;