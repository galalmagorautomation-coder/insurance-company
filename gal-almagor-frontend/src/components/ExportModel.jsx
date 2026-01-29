import React, { useState } from 'react';
import { 
  X, Calendar, User, Briefcase, Building, 
  FileSpreadsheet, FileText, FileDown, FileBox, Search, Database, Download, ArrowRight, ShieldCheck, HeartPulse
} from 'lucide-react';

const ExportModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    productType: 'Life Insurance', // 'Elementary' or 'Life Insurance'
    dataScope: 'Finance',
    startMonth: '',
    endMonth: '',
    company: 'All Companies',
    department: 'All Departments',
    inspector: 'All Inspectors',
    agent: 'All Agents',
    format: 'csv' 
  });

  const formats = [
    // { id: 'csv', label: 'CSV', icon: FileText, color: 'text-blue-600' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
    // { id: 'pdf', label: 'PDF', icon: FileDown, color: 'text-red-600' },
    // { id: 'word', label: 'Word', icon: FileBox, color: 'text-indigo-600' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Export Engine</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Configuration & Generation</p>
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product Category</label>
                <div className="flex p-1.5 bg-slate-100 rounded-xl gap-1">
                  <button 
                    onClick={() => setFormData({...formData, productType: 'Elementary'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.productType === 'Elementary' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Elementary
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, productType: 'Life Insurance'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.productType === 'Life Insurance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <HeartPulse className="w-4 h-4" />
                    Life Insurance
                  </button>
                </div>
              </div>

              {/* Conditional Data Module (Only for Life Insurance) */}
              {formData.productType === 'Life Insurance' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <SelectGroup 
                    icon={Database} 
                    label="Data Module" 
                    name="dataScope" 
                    value={formData.dataScope} 
                    onChange={handleChange} 
                    options={["Finance", "Pension", "Pension Transfer", "Risk"]} 
                    isPrimary
                  />
                </div>
              )}

              {/* Reporting Period */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reporting Period</label>
                <div className="grid grid-cols-1 gap-3">
                  <InputGroup icon={Calendar} label="Start Date">
                    <input type="month" name="startMonth" onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </InputGroup>
                  <InputGroup icon={Calendar} label="End Date">
                    <input type="month" name="endMonth" onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </InputGroup>
                </div>
              </div>
            </div>

            {/* Right Column: Filters & Output (8/12) */}
            <div className="col-span-8 space-y-8">
              
              {/* Filter Grid */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Entity Filters</label>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <SelectGroup icon={Building} label="Company" name="company" value={formData.company} onChange={handleChange} options={["All Companies", "Direct Group", "Standard Life"]} />
                  <SelectGroup icon={Search} label="Inspector" name="inspector" value={formData.inspector} onChange={handleChange} options={["All Inspectors", "John Smith", "David Miller"]} />
                  <SelectGroup icon={Briefcase} label="Department" name="department" value={formData.department} onChange={handleChange} options={["All Depts", "Finance", "Sales", "Operations"]} />
                  <SelectGroup icon={User} label="Agent" name="agent" value={formData.agent} onChange={handleChange} options={["All Agents", "Agent X", "Agent Y"]} />
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-4 pt-6 border-t border-slate-50">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Output Format</label>
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
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Preparing <span className="text-blue-600 font-bold uppercase">{formData.format}</span> for 
            <span className="text-slate-800 font-bold ml-1">
              {formData.productType} {formData.productType === 'Life Insurance' ? `(${formData.dataScope})` : ''}
            </span>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
              Cancel
            </button>
            <button className="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all transform active:scale-95">
              Generate Download
              <ArrowRight className="w-4 h-4" />
            </button>
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

const SelectGroup = ({ icon: Icon, label, options, name, value, onChange, isPrimary }) => (
  <InputGroup icon={Icon} label={label}>
    <select 
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm appearance-none cursor-pointer outline-none transition-all ${
        isPrimary 
        ? 'bg-blue-600 border-blue-700 text-white font-bold shadow-md shadow-blue-100' 
        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
      }`}
    >
      {options.map(o => <option key={o} value={o} className="text-slate-900 bg-white font-normal">{o}</option>)}
    </select>
    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isPrimary ? 'text-blue-200' : 'text-slate-400'}`}>
       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    </div>
  </InputGroup>
);

export default ExportModal;