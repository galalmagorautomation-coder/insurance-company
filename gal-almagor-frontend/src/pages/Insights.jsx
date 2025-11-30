import { useState, useEffect } from 'react'
import { Calendar, Building2, Users, Loader, Filter, TrendingUp, FileText } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Insights() {
  const { t, language } = useLanguage()
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('all')
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-01`
  })
  const [endMonth, setEndMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Handle start month change with validation
  const handleStartMonthChange = (value) => {
    setStartMonth(value)
    // If new start month is after current end month, update end month to match
    if (value > endMonth) {
      setEndMonth(value)
    }
  }

  // Handle end month change with validation
  const handleEndMonthChange = (value) => {
    // Only update if end month is not before start month
    if (value >= startMonth) {
      setEndMonth(value)
    }
  }
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [selectedInspector, setSelectedInspector] = useState('all')
  const [selectedAgent, setSelectedAgent] = useState('all')

  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [currentYearData, setCurrentYearData] = useState([])
  const [totalPolicies, setTotalPolicies] = useState(0)
  const [loadingData, setLoadingData] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState('life-insurance')

  // Elementary state
  const [elementaryDepartments, setElementaryDepartments] = useState([])
  const [selectedElementaryDepartment, setSelectedElementaryDepartment] = useState('all')
  const [elementaryPolicies, setElementaryPolicies] = useState(0)
  const [loadingElementaryStats, setLoadingElementaryStats] = useState(false)
  const [elementaryData, setElementaryData] = useState([])
  const [loadingElementaryData, setLoadingElementaryData] = useState(false)
  const [elementaryMonths, setElementaryMonths] = useState([])
  const [elementaryPrevMonths, setElementaryPrevMonths] = useState([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [previousYear, setPreviousYear] = useState(new Date().getFullYear() - 1)

  // Tab configuration
  const tabs = [
    { id: 'life-insurance', labelEn: 'Life Insurance', labelHe: 'ביטוח חיים' },
    { id: 'elementary', labelEn: 'Elementary', labelHe: 'אלמנטרי' }
  ]

  const departments = ['ישירים', 'שותפים', 'סוכנים', 'פרמיום']
  const products = ['פנסיוני', 'סיכונים', 'פיננסים', 'ניודי פנסיה']
  const inspectors = ['יוסי אביב', 'ערן גירוני', 'איתי אדן', 'לא מפוקחים']

  const COLORS = {
    agents: [
      '#60a5fa', // soft blue
      '#a78bfa', // soft purple
      '#f472b6', // soft pink
      '#fb923c', // soft orange
      '#4ade80', // soft green
      '#38bdf8', // soft sky
      '#818cf8', // soft indigo
      '#fb7185'  // soft rose
    ],
    departments: [
      '#60a5fa', // soft blue
      '#a78bfa', // soft purple
      '#f472b6', // soft pink
      '#fb923c'  // soft orange
    ],
    products: [
      '#60a5fa', // soft blue
      '#4ade80', // soft green
      '#a78bfa', // soft purple
      '#fb923c'  // soft orange
    ]
  }

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.companies)
        const result = await response.json()

        if (result.success) {
          setCompanies(result.data)
        }
      } catch (err) {
        console.error('Error fetching companies:', err)
      } finally {
        setLoadingCompanies(false)
      }
    }

    fetchCompanies()
  }, [])

  // Fetch elementary departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.aggregate}/elementary/departments`)
        const result = await response.json()

        if (result.success) {
          setElementaryDepartments(result.data)
        }
      } catch (err) {
        console.error('Error fetching departments:', err)
      }
    }

    fetchDepartments()
  }, [])

  // Reset filters when switching tabs
  useEffect(() => {
    setSelectedCompanyId('all')
    setSelectedDepartment('all')
    setSelectedProduct('all')
    setSelectedInspector('all')
    setSelectedAgent('all')
    setSelectedElementaryDepartment('all')
  }, [activeTab])

  // Fetch aggregated data when filters change (Life Insurance only)
  useEffect(() => {
    if (!startMonth || !endMonth || activeTab !== 'life-insurance') return

    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', startMonth)
        params.append('end_month', endMonth)
        if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
        if (selectedInspector !== 'all') params.append('inspector', selectedInspector)
        if (selectedAgent !== 'all') params.append('agent_name', selectedAgent)

        const url = `${API_ENDPOINTS.aggregate}/agents?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          setCurrentYearData(groupByCategory(result.data))
          setTotalPolicies(result.totalPolicies || 0)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [selectedCompanyId, startMonth, endMonth, selectedDepartment, selectedInspector, selectedAgent, activeTab])

  // Fetch elementary stats when filters change (Elementary only)
  useEffect(() => {
    if (!startMonth || !endMonth || activeTab !== 'elementary') return

    const fetchElementaryStats = async () => {
      setLoadingElementaryStats(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', startMonth)
        params.append('end_month', endMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)

        const url = `${API_ENDPOINTS.aggregate}/elementary/stats?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          setElementaryPolicies(result.data.totalPolicies || 0)
        }
      } catch (err) {
        console.error('Error fetching elementary stats:', err)
      } finally {
        setLoadingElementaryStats(false)
      }
    }

    fetchElementaryStats()
  }, [selectedCompanyId, startMonth, endMonth, selectedElementaryDepartment, activeTab])

  // Fetch elementary agent data for pie charts (Elementary only)
  useEffect(() => {
    if (!startMonth || !endMonth || activeTab !== 'elementary') return

    const fetchElementaryData = async () => {
      setLoadingElementaryData(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', startMonth)
        params.append('end_month', endMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)

        const url = `${API_ENDPOINTS.aggregate}/elementary/agents?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          setElementaryData(result.data || [])
          setElementaryMonths(result.months || [])
          setElementaryPrevMonths(result.previousYearMonths || [])
          setCurrentYear(result.currentYear || new Date().getFullYear())
          setPreviousYear(result.previousYear || new Date().getFullYear() - 1)
        }
      } catch (err) {
        console.error('Error fetching elementary data:', err)
      } finally {
        setLoadingElementaryData(false)
      }
    }

    fetchElementaryData()
  }, [selectedCompanyId, startMonth, endMonth, selectedElementaryDepartment, activeTab])

  // Group agents by category with subtotals
  const groupByCategory = (data) => {
    const categories = {
      'סה"כ ישיר': [],
      'סה"כ חברות בנות': [],
      'סוכנים ערן': [],
      'סוכנים איתי': [],
      'סה"כ פרימיום': []
    }

    data.forEach(agent => {
      if (agent.category && categories[agent.category]) {
        categories[agent.category].push(agent)
      }
    })

    const result = []
    const grandTotal = {
      agent_name: 'סה"כ כולל',
      inspector: '',
      department: '',
      category: 'total',
      פנסיוני: 0,
      סיכונים: 0,
      פיננסים: 0,
      'ניודי פנסיה': 0,
      isSubtotal: true,
      isGrandTotal: true
    }

    Object.entries(categories).forEach(([categoryName, agents]) => {
      if (agents.length === 0) return

      agents.forEach(agent => result.push(agent))

      const subtotal = {
        agent_name: categoryName,
        inspector: '',
        department: '',
        category: categoryName,
        פנסיוני: agents.reduce((sum, a) => sum + (a.פנסיוני || 0), 0),
        סיכונים: agents.reduce((sum, a) => sum + (a.סיכונים || 0), 0),
        פיננסים: agents.reduce((sum, a) => sum + (a.פיננסים || 0), 0),
        'ניודי פנסיה': agents.reduce((sum, a) => sum + (a['ניודי פנסיה'] || 0), 0),
        isSubtotal: true
      }

      result.push(subtotal)

      grandTotal.פנסיוני += subtotal.פנסיוני
      grandTotal.סיכונים += subtotal.סיכונים
      grandTotal.פיננסים += subtotal.פיננסים
      grandTotal['ניודי פנסיה'] += subtotal['ניודי פנסיה']
    })

    result.push(grandTotal)
    return result
  }

  // Prepare chart data
  const getAgentChartData = () => {
    const agentTotals = {}
    currentYearData.forEach(row => {
      if (!row.isSubtotal && !row.isGrandTotal) {
        const total = (row.פנסיוני || 0) + (row.סיכונים || 0) + (row.פיננסים || 0) + (row['ניודי פנסיה'] || 0)
        agentTotals[row.agent_name] = (agentTotals[row.agent_name] || 0) + total
      }
    })
    return Object.entries(agentTotals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0) // Only show agents with value
      .sort((a, b) => b.value - a.value) // Sort highest to lowest
  }

  const getDepartmentChartData = () => {
    const deptTotals = {}
    currentYearData.forEach(row => {
      if (!row.isSubtotal && !row.isGrandTotal && row.department) {
        const total = (row.פנסיוני || 0) + (row.סיכונים || 0) + (row.פיננסים || 0) + (row['ניודי פנסיה'] || 0)
        deptTotals[row.department] = (deptTotals[row.department] || 0) + total
      }
    })
    return Object.entries(deptTotals).map(([name, value]) => ({ name, value }))
  }

  const getProductChartData = () => {
    const grandTotal = currentYearData.find(row => row.isGrandTotal)
    if (!grandTotal) return []
    
    return [
      { name: 'פנסיוני', value: grandTotal.פנסיוני || 0 },
      { name: 'סיכונים', value: grandTotal.סיכונים || 0 },
      { name: 'פיננסים', value: grandTotal.פיננסים || 0 },
      { name: 'ניודי פנסיה', value: grandTotal['ניודי פנסיה'] || 0 }
    ].filter(item => item.value > 0)
  }

  const formatNumber = (num) => {
    if (!num) return '-'
    return Math.round(num).toLocaleString('en-US')
  }

  // Format month for display (e.g., "2025-01" -> "ינואר" or "Jan")
  const formatMonthName = (monthStr) => {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    const monthNames = {
      he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
      en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
    const monthIndex = parseInt(month) - 1
    return language === 'he' ? monthNames.he[monthIndex] : monthNames.en[monthIndex]
  }

  // Elementary chart data helpers
  const getElementaryAgentChartData = () => {
    return elementaryData
      .filter(item => item.gross_premium > 0)
      .map(item => ({
        name: item.agent_name,
        value: item.gross_premium
      }))
      .sort((a, b) => b.value - a.value)
  }

  const getElementaryDepartmentChartData = () => {
    const deptTotals = {}
    elementaryData.forEach(item => {
      if (item.department) {
        deptTotals[item.department] = (deptTotals[item.department] || 0) + item.gross_premium
      }
    })
    return Object.entries(deptTotals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = currentYearData.find(row => row.isGrandTotal)
      let percentage = 0

      if (total) {
        const grandTotalValue = (total.פנסיוני || 0) + (total.סיכונים || 0) + (total.פיננסים || 0) + (total['ניודי פנסיה'] || 0)
        percentage = ((data.value / grandTotalValue) * 100).toFixed(1)
      }

      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-brand-primary font-bold">₪{formatNumber(payload[0].value)}</p>
          <p className="text-sm text-gray-600">{percentage}%</p>
        </div>
      )
    }
    return null
  }

  const ElementaryCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const totalGrossPremium = elementaryData.reduce((sum, item) => sum + (item.gross_premium || 0), 0)
      const percentage = totalGrossPremium > 0 ? ((data.value / totalGrossPremium) * 100).toFixed(1) : 0

      return (
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-brand-primary font-bold">₪{formatNumber(payload[0].value)}</p>
          <p className="text-sm text-gray-600">{percentage}%</p>
        </div>
      )
    }
    return null
  }

  // Replace the PieChartComponent
  // Replace the PieChartComponent
const PieChartComponent = ({ data, title, colors }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-brand-primary" />
      {title}
    </h3>
    <ResponsiveContainer width="100%" height={450}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={180}
          fill="#8884d8"
          dataKey="value"
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  </div>
)

  // Get unique agents from data
  const uniqueAgents = [...new Set(currentYearData
    .filter(row => !row.isSubtotal && !row.isGrandTotal)
    .map(row => row.agent_name))]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            {t('analyticsInsights')} - {' '}
            {activeTab === 'life-insurance' && (language === 'he' ? 'ביטוח חיים' : 'Life Insurance')}
            {activeTab === 'elementary' && (language === 'he' ? 'אלמנטרי' : 'Elementary')}
          </h2>
          <p className="text-gray-600 text-lg">{t('comprehensiveMetrics')}</p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-semibold transition-all
                    ${activeTab === tab.id
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  {language === 'he' ? tab.labelHe : tab.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Life Insurance Tab Content */}
        {activeTab === 'life-insurance' && (
          <>
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-brand-primary" />
            <h3 className="text-lg font-bold text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Company Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('selectCompany')}
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                disabled={loadingCompanies}
              >
                <option value="all">{t('allCompanies')}</option>
                {companies.filter(company => {
                  if (activeTab === 'life-insurance') return company.insurance
                  if (activeTab === 'elementary') return company.elementary
                  return true
                }).map((company) => (
                  <option key={company.id} value={company.id}>
                    {language === 'he' ? company.name : company.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('startMonth')}
              </label>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => handleStartMonthChange(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              />
            </div>

            {/* End Month */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('endMonth')}
              </label>
              <input
                type="month"
                value={endMonth}
                min={startMonth}
                onChange={(e) => handleEndMonthChange(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                {t('department')}
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="all">{t('allDepartments')}</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-2" />
                {t('productType')}
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="all">{t('allProducts')}</option>
                {products.map((prod) => (
                  <option key={prod} value={prod}>{prod}</option>
                ))}
              </select>
            </div>

            {/* Inspector Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                {t('inspector')}
              </label>
              <select
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="all">{t('allInspectors')}</option>
                {inspectors.map((insp) => (
                  <option key={insp} value={insp}>{insp}</option>
                ))}
              </select>
            </div>

            {/* Agent Filter */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                {t('agent')}
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="all">{t('allAgents')}</option>
                {uniqueAgents.map((agent) => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('quickStats')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">{t('totalOutput')}</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loadingData ? (
                  <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                ) : (() => {
                  const grandTotal = currentYearData.find(row => row.isGrandTotal)
                  if (!grandTotal) return '0'
                  const total = (grandTotal.פנסיוני || 0) + (grandTotal.סיכונים || 0) + (grandTotal.פיננסים || 0) + (grandTotal['ניודי פנסיה'] || 0)
                  return formatNumber(total)
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-2">{t('totalCommission')}</p>
            </div>


            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">{t('activeAgents')}</span>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loadingData ? (
                  <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                ) : (
                  currentYearData.filter(row => {
                    if (row.isSubtotal || row.isGrandTotal) return false
                    const total = (row.פנסיוני || 0) + (row.סיכונים || 0) + (row.פיננסים || 0) + (row['ניודי פנסיה'] || 0)
                    return total > 0
                  }).length
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">{t('agentsWithSales')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">{t('policiesSold')}</span>
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loadingData ? (
                  <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                ) : (
                  formatNumber(totalPolicies)
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">{t('totalPolicies')}</p>
            </div>
          </div>
        </div>

     
        {currentYearData.length > 0 && (
  <div className="grid grid-cols-1 gap-6 mb-8">
    <PieChartComponent 
      data={getAgentChartData()} 
      title={t('totalIncomeByAgents')} 
      colors={COLORS.agents}
    />
    <PieChartComponent 
      data={getDepartmentChartData()} 
      title={t('totalIncomeByDepartments')} 
      colors={COLORS.departments}
    />
    <PieChartComponent 
      data={getProductChartData()} 
      title={t('totalIncomeByProducts')} 
      colors={COLORS.products}
    />
  </div>
)}


        {/* Table */}
<div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
      <Users className="w-6 h-6 text-brand-primary" />
      {t('agentPerformance')}
    </h3>
  </div>
  
  <div className="overflow-x-auto" dir="rtl">
    <table className="w-full">
      <thead className="bg-gradient-to-r from-gray-100 to-blue-100">
        <tr>
          <th className="px-6 py-4 text-start text-sm font-bold text-gray-700">{t('agentName')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-gray-700">{t('inspector')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-gray-700">{t('department')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-blue-700">{t('pension')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-green-700">{t('risk')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-purple-700">{t('financial')}</th>
          <th className="px-6 py-4 text-end text-sm font-bold text-orange-700">{t('pensionTransfer')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {currentYearData.length === 0 ? (
          <tr>
            <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
              {loadingData ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader className="w-6 h-6 text-brand-primary animate-spin" />
                  <span>{t('loading')}</span>
                </div>
              ) : (
                'No data available for selected filters'
              )}
            </td>
          </tr>
        ) : (
          currentYearData.map((row, index) => (
            <tr 
              key={index} 
              className={`
                ${row.isGrandTotal 
                  ? 'bg-gradient-to-r from-indigo-100 to-purple-100 font-bold border-t-4 border-indigo-400' 
                  : row.isSubtotal 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold border-t-2 border-blue-200' 
                  : 'hover:bg-blue-50'
                } transition-all duration-200
              `}
            >
              <td className={`px-6 py-4 text-start text-sm ${row.isSubtotal ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                {row.agent_name}
              </td>
              <td className="px-6 py-4 text-end text-sm text-gray-700">{row.inspector || '-'}</td>
              <td className="px-6 py-4 text-end text-sm text-gray-700">{row.department || '-'}</td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-blue-900' : 'text-blue-700'}`}>
                {formatNumber(row.פנסיוני)}
              </td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-green-900' : 'text-green-700'}`}>
                {formatNumber(row.סיכונים)}
              </td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-purple-900' : 'text-purple-700'}`}>
                {formatNumber(row.פיננסים)}
              </td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-orange-900' : 'text-orange-700'}`}>
                {formatNumber(row['ניודי פנסיה'])}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
          </>
        )}

        {/* Elementary Tab Content */}
        {activeTab === 'elementary' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-brand-primary" />
                <h3 className="text-lg font-bold text-gray-900">Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Company Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    {t('selectCompany')}
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                    disabled={loadingCompanies}
                  >
                    <option value="all">{t('allCompanies')}</option>
                    {companies.filter(company => company.elementary).map((company) => (
                      <option key={company.id} value={company.id}>
                        {language === 'he' ? company.name : company.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Month */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    {t('startMonth')}
                  </label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => handleStartMonthChange(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                  />
                </div>

                {/* End Month */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    {t('endMonth')}
                  </label>
                  <input
                    type="month"
                    value={endMonth}
                    min={startMonth}
                    onChange={(e) => handleEndMonthChange(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                  />
                </div>

                {/* Classification Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    {language === 'he' ? 'מחלקה' : 'Department'}
                  </label>
                  <select
                    value={selectedElementaryDepartment}
                    onChange={(e) => setSelectedElementaryDepartment(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                  >
                    <option value="all">{language === 'he' ? 'כל המחלקות' : 'All Departments'}</option>
                    {elementaryDepartments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('quickStats')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-600">{t('totalOutput')}</span>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {loadingElementaryData ? (
                      <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                    ) : (() => {
                      const total = elementaryData.reduce((sum, item) => sum + (item.gross_premium || 0), 0)
                      return formatNumber(total)
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('totalCommission')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-600">{t('activeAgents')}</span>
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {loadingElementaryData ? (
                      <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                    ) : (
                      elementaryData.filter(item => item.gross_premium > 0).length
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('agentsWithSales')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-600">{t('policiesSold')}</span>
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {loadingElementaryStats ? (
                      <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                    ) : (
                      formatNumber(elementaryPolicies)
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('totalPolicies')}</p>
                </div>
              </div>
            </div>

            {/* Elementary Pie Charts */}
            {elementaryData.length > 0 && (
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {language === 'he' ? 'סה"כ הכנסה לפי סוכנים' : 'Total Income by Agents'}
                  </h3>
                  <ResponsiveContainer width="100%" height={450}>
                    <PieChart>
                      <Pie
                        data={getElementaryAgentChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={180}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {getElementaryAgentChartData().map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.agents[index % COLORS.agents.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ElementaryCustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {language === 'he' ? 'סה"כ הכנסה לפי מחלקות' : 'Total Income by Departments'}
                  </h3>
                  <ResponsiveContainer width="100%" height={450}>
                    <PieChart>
                      <Pie
                        data={getElementaryDepartmentChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={180}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {getElementaryDepartmentChartData().map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.departments[index % COLORS.departments.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ElementaryCustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Elementary Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 bg-blue-50 border-b-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Users className="w-6 h-6 text-brand-primary" />
                  {language === 'he' ? 'ביצועי סוכנים - אלמנטרי' : 'Agent Performance - Elementary'}
                </h3>
              </div>

              <div
                className="overflow-x-auto cursor-grab active:cursor-grabbing"
                dir="rtl"
                onMouseDown={(e) => {
                  const slider = e.currentTarget
                  let isDown = true
                  let startX = e.pageX - slider.offsetLeft
                  let scrollLeft = slider.scrollLeft

                  const handleMouseMove = (e) => {
                    if (!isDown) return
                    e.preventDefault()
                    const x = e.pageX - slider.offsetLeft
                    const walk = (x - startX) * 2
                    slider.scrollLeft = scrollLeft - walk
                  }

                  const handleMouseUp = () => {
                    isDown = false
                    slider.classList.remove('active:cursor-grabbing')
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }

                  slider.classList.add('active:cursor-grabbing')
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-start text-sm font-bold text-gray-800 bg-gray-100 sticky right-0 z-10 border-b border-r-2 border-gray-300" rowSpan="2">
                        {language === 'he' ? 'שם סוכן' : 'Agent Name'}
                      </th>
                      <th className="px-6 py-4 text-end text-sm font-bold text-gray-800 bg-gray-100 border-b border-gray-300" rowSpan="2">
                        {language === 'he' ? 'מחלקה' : 'Department'}
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-bold text-white bg-blue-600 border-l-2 border-b border-gray-300" colSpan="2">
                        {language === 'he' ? 'מצטבר' : 'Cumulative'}
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-bold text-white bg-green-600 border-l-2 border-b border-gray-300" colSpan="2">
                        {language === 'he' ? 'חודשי' : 'Monthly'}
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-800 bg-indigo-100 border-l-2 border-b border-gray-300" colSpan={elementaryMonths.length}>
                        {currentYear}
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-800 bg-gray-200 border-l-2 border-b border-gray-300" colSpan={elementaryPrevMonths.length}>
                        {previousYear}
                      </th>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-700 bg-blue-50 border-l-2 border-b-2 border-gray-300">
                        {currentYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 border-b-2 border-gray-300">
                        {previousYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 bg-green-50 border-l-2 border-b-2 border-gray-300">
                        {currentYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-green-600 bg-green-50 border-b-2 border-gray-300">
                        {previousYear}
                      </th>
                      {elementaryMonths.map((month) => (
                        <th key={month} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 bg-indigo-50 border-l border-gray-200 border-b-2">
                          {formatMonthName(month)}
                        </th>
                      ))}
                      {elementaryPrevMonths.map((month) => (
                        <th key={month} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-l border-gray-200 border-b-2">
                          {formatMonthName(month)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {elementaryData.length === 0 ? (
                      <tr>
                        <td colSpan={6 + elementaryMonths.length + elementaryPrevMonths.length} className="px-6 py-12">
                          <div className="flex items-center justify-center text-gray-500">
                            {loadingElementaryData ? (
                              <div className="flex items-center gap-3">
                                <Loader className="w-6 h-6 text-brand-primary animate-spin" />
                                <span>{t('loading')}</span>
                              </div>
                            ) : (
                              <span>{language === 'he' ? 'אין נתונים זמינים עבור הפילטרים שנבחרו' : 'No data available for selected filters'}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      elementaryData.map((row, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 text-start text-sm font-medium text-gray-900 sticky right-0 bg-white z-10 border-r-2 border-gray-200">
                            {row.agent_name}
                          </td>
                          <td className="px-6 py-4 text-end text-sm text-gray-700">
                            {row.department || '-'}
                          </td>
                          <td className="px-6 py-4 text-end text-sm font-semibold text-blue-700 bg-blue-50 border-l-2 border-gray-300">
                            {formatNumber(row.cumulative_current)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm text-blue-600 bg-blue-50">
                            {formatNumber(row.cumulative_previous)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm font-semibold text-green-700 bg-green-50 border-l-2 border-gray-300">
                            {formatNumber(row.monthly_current)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm text-green-600 bg-green-50">
                            {formatNumber(row.monthly_previous)}
                          </td>
                          {elementaryMonths.map((month) => (
                            <td key={month} className="px-4 py-4 text-end text-sm text-gray-700 border-l border-gray-200">
                              {formatNumber(row.months_breakdown?.[month])}
                            </td>
                          ))}
                          {elementaryPrevMonths.map((month) => (
                            <td key={month} className="px-4 py-4 text-end text-sm text-gray-600 bg-gray-50 border-l border-gray-200">
                              {formatNumber(row.prev_months_breakdown?.[month])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Insights