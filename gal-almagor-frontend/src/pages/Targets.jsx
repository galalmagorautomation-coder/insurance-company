import React, { useState, useEffect } from 'react'
import { Calendar, Save, X, Edit3, Loader, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Targets() {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState('goals')

  // Set Target tab state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [goalsData, setGoalsData] = useState([])
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedValues, setEditedValues] = useState({}) // { agent_id: { pension_goal: value, risk_goal: value, ... } }
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // Set Target Percentage tab state
  const [percentageYear, setPercentageYear] = useState(new Date().getFullYear())
  const [percentageData, setPercentageData] = useState({})
  const [loadingPercentages, setLoadingPercentages] = useState(false)
  const [isPercentageEditMode, setIsPercentageEditMode] = useState(false)
  const [editedPercentages, setEditedPercentages] = useState({}) // { month: { pension_monthly: value, ... } }
  const [isSavingPercentages, setIsSavingPercentages] = useState(false)
  const [showPercentageConfirmDialog, setShowPercentageConfirmDialog] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Performance data state for comparison tab
  const [performanceData, setPerformanceData] = useState([])
  const [loadingPerformance, setLoadingPerformance] = useState(false)
  const [performanceMonths, setPerformanceMonths] = useState([])
  const [performanceYear, setPerformanceYear] = useState(new Date().getFullYear())
  const [performanceSelectedMonth, setPerformanceSelectedMonth] = useState('all')

  // Generate year options (current year - 5 to current year + 5)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i)
    }
    return years
  }

  // Month names
  const months = [
    { en: 'January', he: 'ינואר', value: 1 },
    { en: 'February', he: 'פברואר', value: 2 },
    { en: 'March', he: 'מרץ', value: 3 },
    { en: 'April', he: 'אפריל', value: 4 },
    { en: 'May', he: 'מאי', value: 5 },
    { en: 'June', he: 'יוני', value: 6 },
    { en: 'July', he: 'יולי', value: 7 },
    { en: 'August', he: 'אוגוסט', value: 8 },
    { en: 'September', he: 'ספטמבר', value: 9 },
    { en: 'October', he: 'אוקטובר', value: 10 },
    { en: 'November', he: 'נובמבר', value: 11 },
    { en: 'December', he: 'דצמבר', value: 12 }
  ]

  // Fetch goals data when year changes
  useEffect(() => {
    if (activeTab === 'goals' || activeTab === 'comparison') {
      fetchGoalsData()
    }
  }, [selectedYear, performanceYear, activeTab])

  // Fetch percentage data when year changes
  useEffect(() => {
    if (activeTab === 'percentages' || activeTab === 'comparison') {
      fetchPercentageData()
    }
  }, [percentageYear, performanceYear, activeTab])

  // Fetch performance data for comparison tab
  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchPerformanceData()
    }
  }, [performanceYear, activeTab])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  const fetchGoalsData = async () => {
    setLoadingGoals(true)
    try {
      // Use performanceYear for comparison tab, selectedYear for goals tab
      const year = activeTab === 'comparison' ? performanceYear : selectedYear
      const response = await fetch(`${API_ENDPOINTS.goals}/${year}`)
      const result = await response.json()

      if (result.success) {
        setGoalsData(result.data)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
      showToast(language === 'he' ? 'שגיאה בטעינת יעדים' : 'Error loading goals', 'error')
    } finally {
      setLoadingGoals(false)
    }
  }

  // Fetch percentage data
  const fetchPercentageData = async () => {
    setLoadingPercentages(true)
    try {
      // Use performanceYear for comparison tab, percentageYear for percentage tab
      const year = activeTab === 'comparison' ? performanceYear : percentageYear
      const response = await fetch(`${API_ENDPOINTS.targets}/percentages/${year}`)
      const result = await response.json()

      if (result.success) {
        // Convert array to object keyed by month
        const dataByMonth = {}
        result.data.forEach(item => {
          dataByMonth[item.month] = item
        })
        console.log('Percentage data loaded:', dataByMonth)
        setPercentageData(dataByMonth)
      }
    } catch (error) {
      console.error('Error fetching percentages:', error)
      showToast(language === 'he' ? 'שגיאה בטעינת אחוזי יעד' : 'Error loading target percentages', 'error')
    } finally {
      setLoadingPercentages(false)
    }
  }

  // Fetch performance data from agent_aggregations
  const fetchPerformanceData = async () => {
    setLoadingPerformance(true)
    try {
      // Get start and end month for the selected year
      const startMonth = `${performanceYear}-01`
      const endMonth = `${performanceYear}-12`
      
      const params = new URLSearchParams()
      params.append('start_month', startMonth)
      params.append('end_month', endMonth)
      // Don't filter by company - get all companies
      params.append('limit', '10000')

      const url = `${API_ENDPOINTS.aggregate}/agents?${params.toString()}`
      console.log('Fetching performance data from:', url)
      const response = await fetch(url)
      const result = await response.json()

      console.log('Performance data result:', result)

      if (result.success) {
        // Aggregate data by agent across all companies
        const aggregatedData = {}
        
        if (result.data && Array.isArray(result.data)) {
          console.log(`Processing ${result.data.length} agent records`)
          result.data.forEach(agent => {
            const agentName = agent.agent_name
            
            if (!aggregatedData[agentName]) {
              aggregatedData[agentName] = {
                agent_name: agentName,
                current_year_months: {}
              }
            }
            
            // Aggregate monthly data
            if (agent.current_year_months) {
              Object.keys(agent.current_year_months).forEach(month => {
                if (!aggregatedData[agentName].current_year_months[month]) {
                  aggregatedData[agentName].current_year_months[month] = {
                    pension: 0,
                    risk: 0,
                    financial: 0,
                    pension_transfer: 0
                  }
                }
                
                const monthData = agent.current_year_months[month]
                aggregatedData[agentName].current_year_months[month].pension += monthData.pension || 0
                aggregatedData[agentName].current_year_months[month].risk += monthData.risk || 0
                aggregatedData[agentName].current_year_months[month].financial += monthData.financial || 0
                aggregatedData[agentName].current_year_months[month].pension_transfer += monthData.pension_transfer || 0
              })
            }
          })
        }
        
        // Convert aggregated object to array
        const aggregatedArray = Object.values(aggregatedData)
        console.log('Aggregated performance data:', aggregatedArray)
        setPerformanceData(aggregatedArray)
        setPerformanceMonths(result.months || [])
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      showToast(language === 'he' ? 'שגיאה בטעינת נתוני ביצוע' : 'Error loading performance data', 'error')
    } finally {
      setLoadingPerformance(false)
    }
  }

  // Calculate cumulative percentage
  const calculateCumulative = (product) => {
    let cumulative = 0
    const cumulatives = {}
    months.forEach(month => {
      const monthValue = month.value
      const monthlyValue = parseFloat(
        isPercentageEditMode && editedPercentages[monthValue]?.[`${product}_monthly`] !== undefined
          ? editedPercentages[monthValue][`${product}_monthly`]
          : percentageData[monthValue]?.[`${product}_monthly`] || 0
      )
      
      // Only show cumulative if current month has a value
      if (monthlyValue > 0) {
        cumulative += monthlyValue
        cumulatives[monthValue] = cumulative
      } else {
        cumulatives[monthValue] = null // Don't show cumulative for empty months
      }
    })
    return cumulatives
  }

  // Format percentage
  const formatPercentage = (num) => {
    if (num === null || num === undefined || num === 0) return '-'
    return `${parseFloat(num).toFixed(2)}%`
  }

  // Handle percentage cell change
  const handlePercentageChange = (month, field, value) => {
    // Allow empty, numbers, and decimals
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return
    }

    // Validate not exceeding 100%
    const numValue = parseFloat(value) || 0
    if (numValue > 100) {
      setValidationError(language === 'he' ? 'הערך לא יכול לעבור 100%' : 'Value cannot exceed 100%')
      return
    }

    setValidationError('')

    const newEdited = {
      ...editedPercentages,
      [month]: {
        ...(editedPercentages[month] || {}),
        [field]: value
      }
    }

    // Check if total cumulative exceeds 100%
    const product = field.replace('_monthly', '')
    let total = 0
    months.forEach(m => {
      const val = parseFloat(
        newEdited[m.value]?.[`${product}_monthly`] !== undefined
          ? newEdited[m.value][`${product}_monthly`]
          : percentageData[m.value]?.[`${product}_monthly`] || 0
      )
      total += val
    })

    if (total > 100) {
      setValidationError(language === 'he' ? 'סך כל האחוזים לא יכול לעבור 100%' : 'Total percentage cannot exceed 100%')
      return
    }

    setEditedPercentages(newEdited)
  }

  // Get percentage cell value
  const getPercentageCellValue = (month, field) => {
    if (isPercentageEditMode && editedPercentages[month]?.[field] !== undefined) {
      return editedPercentages[month][field]
    }
    return percentageData[month]?.[field] || ''
  }

  // Handle percentage edit mode
  const handlePercentageEditClick = () => {
    setIsPercentageEditMode(true)
    setEditedPercentages({})
    setValidationError('')
  }

  const handlePercentageCancelEdit = () => {
    setIsPercentageEditMode(false)
    setEditedPercentages({})
    setValidationError('')
  }

  const handlePercentageSaveClick = () => {
    if (Object.keys(editedPercentages).length === 0) {
      setIsPercentageEditMode(false)
      return
    }
    setShowPercentageConfirmDialog(true)
  }

  const handleConfirmPercentageSave = async () => {
    setShowPercentageConfirmDialog(false)
    setIsSavingPercentages(true)

    try {
      const updates = []

      months.forEach(month => {
        const monthValue = month.value
        const edited = editedPercentages[monthValue] || {}
        const current = percentageData[monthValue] || {}

        const update = {
          year: percentageYear,
          month: monthValue,
          pension_monthly: parseFloat(edited.pension_monthly !== undefined ? edited.pension_monthly : current.pension_monthly) || 0,
          risk_monthly: parseFloat(edited.risk_monthly !== undefined ? edited.risk_monthly : current.risk_monthly) || 0,
          financial_monthly: parseFloat(edited.financial_monthly !== undefined ? edited.financial_monthly : current.financial_monthly) || 0,
          pension_transfer_monthly: parseFloat(edited.pension_transfer_monthly !== undefined ? edited.pension_transfer_monthly : current.pension_transfer_monthly) || 0
        }

        updates.push(update)
      })

      const response = await fetch(`${API_ENDPOINTS.targets}/percentages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to update percentages')
      }

      // Refresh data
      await fetchPercentageData()

      showToast(language === 'he' ? 'אחוזי היעד נשמרו בהצלחה!' : 'Target percentages saved successfully!', 'success')
      setIsPercentageEditMode(false)
      setEditedPercentages({})
      setValidationError('')

    } catch (error) {
      console.error('Error saving percentages:', error)
      showToast(language === 'he' ? 'שגיאה בשמירת אחוזי היעד' : 'Error saving target percentages', 'error')
    } finally {
      setIsSavingPercentages(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  const handleEditClick = () => {
    setIsEditMode(true)
    setEditedValues({})
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedValues({})
  }

  const handleCellChange = (agentId, field, value) => {
    // Validate numeric input
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) {
      return
    }

    setEditedValues(prev => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [field]: value
      }
    }))
  }

  const getCellValue = (agent, field) => {
    if (isEditMode && editedValues[agent.agent_id]?.[field] !== undefined) {
      return editedValues[agent.agent_id][field]
    }
    return agent[field] || ''
  }

  const handleSaveClick = () => {
    if (Object.keys(editedValues).length === 0) {
      setIsEditMode(false)
      return
    }
    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false)
    setIsSaving(true)

    try {
      const updates = []

      Object.entries(editedValues).forEach(([agentId, values]) => {
        const agent = goalsData.find(a => a.agent_id === parseInt(agentId))

        const update = {
          agent_id: parseInt(agentId),
          year: selectedYear,
          pension_goal: parseFloat(values.pension_goal !== undefined ? values.pension_goal : agent.pension_goal) || 0,
          risk_goal: parseFloat(values.risk_goal !== undefined ? values.risk_goal : agent.risk_goal) || 0,
          financial_goal: parseFloat(values.financial_goal !== undefined ? values.financial_goal : agent.financial_goal) || 0,
          pension_transfer_goal: parseFloat(values.pension_transfer_goal !== undefined ? values.pension_transfer_goal : agent.pension_transfer_goal) || 0
        }

        updates.push(update)
      })

      const response = await fetch(`${API_ENDPOINTS.goals}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to update goals')
      }

      // Refresh data
      await fetchGoalsData()

      showToast(language === 'he' ? 'היעדים נשמרו בהצלחה!' : 'Goals saved successfully!', 'success')
      setIsEditMode(false)
      setEditedValues({})

    } catch (error) {
      console.error('Error saving goals:', error)
      showToast(language === 'he' ? 'שגיאה בשמירת היעדים' : 'Error saving goals', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const formatNumber = (num) => {
    if (!num) return '-'
    return Math.round(num).toLocaleString('en-US')
  }

  // Filter months based on performanceSelectedMonth
  const getFilteredMonths = () => {
    if (performanceSelectedMonth === 'all') {
      return months
    }
    return months.filter(m => m.value === parseInt(performanceSelectedMonth))
  }

  // Get performance data for a specific agent
  const getAgentPerformance = (agentName) => {
    return performanceData.find(p => p.agent_name === agentName)
  }

  // Group agents by category with subtotals for Performance Analytics
  const groupAgentsByCategory = (agents) => {
    if (!agents || agents.length === 0) return []

    // Map department to category (matching Insights logic)
    const departmentToCategoryMap = {
      'ישירים': 'סה"כ ישיר',
      'שותפים': 'סה"כ חברות בנות',
      'סוכנים': 'סוכנים ערן',  // Default to ערן
      'פרמיום': 'סה"כ פרימיום'
    }

    const categories = {
      'סה"כ ישיר': [],
      'סה"כ חברות בנות': [],
      'סוכנים ערן': [],
      'סוכנים איתי': [],
      'סה"כ פרימיום': [],
      'אחר': []
    }

    // Group agents by category
    agents.forEach(agent => {
      // First check if agent has category field directly
      let categoryName = agent.category
      
      // If no category, map from department
      if (!categoryName && agent.department) {
        categoryName = departmentToCategoryMap[agent.department]
        
        // Special handling for "סוכנים" - split by inspector
        if (agent.department === 'סוכנים') {
          if (agent.inspector === 'איתי אדן') {
            categoryName = 'סוכנים איתי'
          } else {
            categoryName = 'סוכנים ערן'
          }
        }
      }
      
      // Set the category on the agent object for later filtering
      agent.category = categoryName
      
      // Add to appropriate category
      if (categoryName && categories[categoryName]) {
        categories[categoryName].push(agent)
      } else {
        agent.category = 'אחר'
        categories['אחר'].push(agent)
      }
    })

    const result = []

    // Define category colors for visual distinction
    const categoryColors = {
      'סה"כ ישיר': 'bg-gradient-to-r from-blue-100 to-blue-50',
      'סה"כ חברות בנות': 'bg-gradient-to-r from-purple-100 to-purple-50',
      'סוכנים ערן': 'bg-gradient-to-r from-green-100 to-green-50',
      'סוכנים איתי': 'bg-gradient-to-r from-amber-100 to-amber-50',
      'סה"כ פרימיום': 'bg-gradient-to-r from-pink-100 to-pink-50',
      'אחר': 'bg-gradient-to-r from-gray-100 to-gray-50'
    }

    // Process each category
    Object.entries(categories).forEach(([categoryName, categoryAgents]) => {
      if (categoryAgents.length === 0) return

      // Add agents in this category
      categoryAgents.forEach(agent => result.push(agent))

      // Calculate subtotal for this category
      const subtotal = {
        agent_id: `subtotal-${categoryName}`,
        agent_name: categoryName,
        inspector: null,
        category: categoryName,
        pension_goal: 0,
        risk_goal: 0,
        financial_goal: 0,
        pension_transfer_goal: 0,
        isSubtotal: true,
        subtotalColor: categoryColors[categoryName]
      }

      // Sum up goals
      categoryAgents.forEach(agent => {
        subtotal.pension_goal += agent.pension_goal || 0
        subtotal.risk_goal += agent.risk_goal || 0
        subtotal.financial_goal += agent.financial_goal || 0
        subtotal.pension_transfer_goal += agent.pension_transfer_goal || 0
      })

      result.push(subtotal)
    })

    return result
  }

  const tabs = [
    {
      id: 'goals',
      labelEn: 'Set Target',
      labelHe: 'הגדרת יעדים',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      id: 'percentages',
      labelEn: 'Set Target Percentage',
      labelHe: 'הגדרת אחוז יעד',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'comparison',
      labelEn: 'Performance Analytics',
      labelHe: 'ניתוח ביצועים',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            {language === 'he' ? 'יעדים' : 'Targets'}
          </h2>
          <p className="text-gray-600 text-lg">
            {language === 'he'
              ? 'ניהול יעדים שנתיים ומעקב אחר תפוקה'
              : 'Manage yearly goals and track performance'}
          </p>
        </div>

        {/* Tabs Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <nav className="flex -mb-px" dir={language === 'he' ? 'rtl' : 'ltr'}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 group relative min-w-0 overflow-hidden py-4 px-6 text-center font-medium text-base
                    transition-all duration-200 ease-in-out
                    ${activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Active Tab Indicator */}
                  <div
                    className={`
                      absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600
                      transition-all duration-300 ease-in-out
                      ${activeTab === tab.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                    `}
                  />

                  {/* Tab Content */}
                  <div className="flex items-center justify-center gap-2">
                    {tab.icon}
                    <span className={`
                      font-semibold
                      ${activeTab === tab.id ? 'text-blue-600' : ''}
                    `}>
                      {language === 'he' ? tab.labelHe : tab.labelEn}
                    </span>
                  </div>

                  {/* Hover Effect */}
                  <div
                    className={`
                      absolute inset-0 bg-blue-50
                      transition-opacity duration-200
                      ${activeTab === tab.id ? 'opacity-10' : 'opacity-0 group-hover:opacity-5'}
                    `}
                  />
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'goals' && (
              <>
                {/* Filters and Actions Bar */}
                <div className="flex items-center justify-between mb-6 gap-4">
                  {/* Year Filter */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <label className="text-sm font-semibold text-gray-700">
                      {language === 'he' ? 'שנה:' : 'Year:'}
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      disabled={isEditMode}
                      className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Edit/Save Actions */}
                  <div className="flex items-center gap-3">
                    {!isEditMode ? (
                      <button
                        onClick={handleEditClick}
                        disabled={loadingGoals}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-4 h-4" />
                        {language === 'he' ? 'ערוך יעדים' : 'Edit Target'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          {language === 'he' ? 'ביטול' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleSaveClick}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {isSaving ? (language === 'he' ? 'שומר...' : 'Saving...') : (language === 'he' ? 'שמור שינויים' : 'Save Changes')}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Goals Table */}
                {loadingGoals ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                ) : goalsData.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {language === 'he' ? 'אין סוכנים זמינים' : 'No Agents Available'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'he'
                        ? 'לא נמצאו סוכנים במערכת'
                        : 'No agents found in the system'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse" dir={language === 'he' ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <th className={`sticky ${language === 'he' ? 'right-0' : 'left-0'} z-10 px-6 py-4 ${language === 'he' ? 'text-right' : 'text-left'} font-bold text-gray-900 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-gray-300 min-w-[200px]`}>
                            {language === 'he' ? 'שם סוכן' : 'Agent Name'}
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-gray-900 border-b-2 border-gray-300 min-w-[150px]">
                            {language === 'he' ? 'פנסיוני' : 'Pension'}
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-gray-900 border-b-2 border-gray-300 min-w-[150px]">
                            {language === 'he' ? 'סיכונים' : 'Risk'}
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-gray-900 border-b-2 border-gray-300 min-w-[150px]">
                            {language === 'he' ? 'פיננסים' : 'Financial'}
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-gray-900 border-b-2 border-gray-300 min-w-[180px]">
                            {language === 'he' ? 'ניודי פנסיה' : 'Pension Transfer'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {goalsData.map((agent, index) => (
                          <tr
                            key={agent.agent_id}
                            className={`
                              ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                              hover:bg-blue-50 transition-colors
                            `}
                          >
                            {/* Agent Name - Sticky */}
                            <td className={`
                              sticky right-0 z-10 px-6 py-4 font-semibold text-gray-900 border-b border-gray-200
                              ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                              hover:bg-blue-50
                            `}>
                              {agent.agent_name}
                            </td>

                            {/* Pension Goal */}
                            <td className="px-6 py-4 text-center border-b border-gray-200">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={getCellValue(agent, 'pension_goal')}
                                  onChange={(e) => handleCellChange(agent.agent_id, 'pension_goal', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {formatNumber(agent.pension_goal)}
                                </span>
                              )}
                            </td>

                            {/* Risk Goal */}
                            <td className="px-6 py-4 text-center border-b border-gray-200">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={getCellValue(agent, 'risk_goal')}
                                  onChange={(e) => handleCellChange(agent.agent_id, 'risk_goal', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {formatNumber(agent.risk_goal)}
                                </span>
                              )}
                            </td>

                            {/* Financial Goal */}
                            <td className="px-6 py-4 text-center border-b border-gray-200">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={getCellValue(agent, 'financial_goal')}
                                  onChange={(e) => handleCellChange(agent.agent_id, 'financial_goal', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {formatNumber(agent.financial_goal)}
                                </span>
                              )}
                            </td>

                            {/* Pension Transfer Goal */}
                            <td className="px-6 py-4 text-center border-b border-gray-200">
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={getCellValue(agent, 'pension_transfer_goal')}
                                  onChange={(e) => handleCellChange(agent.agent_id, 'pension_transfer_goal', e.target.value)}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-900 font-medium">
                                  {formatNumber(agent.pension_transfer_goal)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'percentages' && (
              <>
                {/* Filters and Actions Bar */}
                <div className="flex items-center justify-between mb-6 gap-4">
                  {/* Year Filter */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <label className="text-sm font-semibold text-gray-700">
                      {language === 'he' ? 'שנה:' : 'Year:'}
                    </label>
                    <select
                      value={percentageYear}
                      onChange={(e) => setPercentageYear(parseInt(e.target.value))}
                      disabled={isPercentageEditMode}
                      className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Edit/Save Actions */}
                  <div className="flex items-center gap-3">
                    {!isPercentageEditMode ? (
                      <button
                        onClick={handlePercentageEditClick}
                        disabled={loadingPercentages}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Edit3 className="w-4 h-4" />
                        {language === 'he' ? 'ערוך אחוזים' : 'Edit Percentages'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handlePercentageCancelEdit}
                          disabled={isSavingPercentages}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          {language === 'he' ? 'ביטול' : 'Cancel'}
                        </button>
                        <button
                          onClick={handlePercentageSaveClick}
                          disabled={isSavingPercentages || validationError}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingPercentages ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {isSavingPercentages ? (language === 'he' ? 'שומר...' : 'Saving...') : (language === 'he' ? 'שמור שינויים' : 'Save Changes')}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Validation Error */}
                {validationError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{validationError}</span>
                  </div>
                )}

                {/* Percentage Table */}
                {loadingPercentages ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse" dir={language === 'he' ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                          <th className="px-6 py-4 text-center font-bold text-gray-900 border-b-2 border-r-2 border-gray-300 min-w-[120px]" rowSpan="2">
                            {language === 'he' ? 'חודש' : 'Month'}
                          </th>
                          <th className="px-6 py-3 text-center font-bold text-gray-900 border-b border-r-2 border-gray-300" colSpan="2">
                            {language === 'he' ? 'פנסיוני' : 'Pension'}
                          </th>
                          <th className="px-6 py-3 text-center font-bold text-gray-900 border-b border-r-2 border-gray-300" colSpan="2">
                            {language === 'he' ? 'סיכונים' : 'Risk'}
                          </th>
                          <th className="px-6 py-3 text-center font-bold text-gray-900 border-b border-r-2 border-gray-300" colSpan="2">
                            {language === 'he' ? 'פיננסים' : 'Financial'}
                          </th>
                          <th className="px-6 py-3 text-center font-bold text-gray-900 border-b border-gray-300" colSpan="2">
                            {language === 'he' ? 'ניודי פנסיה' : 'Pension Transfer'}
                          </th>
                        </tr>
                        <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                          {['pension', 'risk', 'financial', 'pension_transfer'].map((product, idx) => (
                            <>
                              <th key={`${product}-cum`} className={`px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-300 ${language === 'he' ? 'bg-blue-100' : 'bg-blue-50'} min-w-[100px]`}>
                                {language === 'he' ? 'מצטבר' : 'Cumulative'}
                              </th>
                              <th key={`${product}-mon`} className={`px-4 py-3 text-center font-semibold text-gray-700 border-b-2 ${idx < 3 ? 'border-r-2' : ''} border-gray-300 bg-white min-w-[100px]`}>
                                {language === 'he' ? 'חודשי' : 'Monthly'}
                              </th>
                            </>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((month, index) => {
                          const pensionCumulative = calculateCumulative('pension')[month.value]
                          const riskCumulative = calculateCumulative('risk')[month.value]
                          const financialCumulative = calculateCumulative('financial')[month.value]
                          const pensionTransferCumulative = calculateCumulative('pension_transfer')[month.value]

                          return (
                            <tr
                              key={month.value}
                              className={`
                                ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                hover:bg-blue-50 transition-colors
                              `}
                            >
                              {/* Month */}
                              <td className="px-6 py-4 text-center font-semibold text-gray-900 border-b border-r-2 border-gray-200">
                                {language === 'he' ? month.he : month.en}
                              </td>

                              {/* Pension */}
                              <td className={`px-4 py-4 text-center border-b border-gray-200 ${language === 'he' ? 'bg-blue-50/30' : 'bg-blue-50/50'}`}>
                                <span className="text-gray-900 font-medium">
                                  {formatPercentage(pensionCumulative)}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-center border-b border-r-2 border-gray-200 ${language === 'he' ? 'bg-white' : ''}`}>
                                {isPercentageEditMode ? (
                                  <input
                                    type="text"
                                    value={getPercentageCellValue(month.value, 'pension_monthly')}
                                    onChange={(e) => handlePercentageChange(month.value, 'pension_monthly', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-medium">
                                    {formatPercentage(percentageData[month.value]?.pension_monthly)}
                                  </span>
                                )}
                              </td>

                              {/* Risk */}
                              <td className={`px-4 py-4 text-center border-b border-gray-200 ${language === 'he' ? 'bg-blue-50/30' : 'bg-blue-50/50'}`}>
                                <span className="text-gray-900 font-medium">
                                  {formatPercentage(riskCumulative)}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-center border-b border-r-2 border-gray-200 ${language === 'he' ? 'bg-white' : ''}`}>
                                {isPercentageEditMode ? (
                                  <input
                                    type="text"
                                    value={getPercentageCellValue(month.value, 'risk_monthly')}
                                    onChange={(e) => handlePercentageChange(month.value, 'risk_monthly', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-medium">
                                    {formatPercentage(percentageData[month.value]?.risk_monthly)}
                                  </span>
                                )}
                              </td>

                              {/* Financial */}
                              <td className={`px-4 py-4 text-center border-b border-gray-200 ${language === 'he' ? 'bg-blue-50/30' : 'bg-blue-50/50'}`}>
                                <span className="text-gray-900 font-medium">
                                  {formatPercentage(financialCumulative)}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-center border-b border-r-2 border-gray-200 ${language === 'he' ? 'bg-white' : ''}`}>
                                {isPercentageEditMode ? (
                                  <input
                                    type="text"
                                    value={getPercentageCellValue(month.value, 'financial_monthly')}
                                    onChange={(e) => handlePercentageChange(month.value, 'financial_monthly', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-medium">
                                    {formatPercentage(percentageData[month.value]?.financial_monthly)}
                                  </span>
                                )}
                              </td>

                              {/* Pension Transfer */}
                              <td className={`px-4 py-4 text-center border-b border-gray-200 ${language === 'he' ? 'bg-blue-50/30' : 'bg-blue-50/50'}`}>
                                <span className="text-gray-900 font-medium">
                                  {formatPercentage(pensionTransferCumulative)}
                                </span>
                              </td>
                              <td className={`px-4 py-4 text-center border-b border-gray-200 ${language === 'he' ? 'bg-white' : ''}`}>
                                {isPercentageEditMode ? (
                                  <input
                                    type="text"
                                    value={getPercentageCellValue(month.value, 'pension_transfer_monthly')}
                                    onChange={(e) => handlePercentageChange(month.value, 'pension_transfer_monthly', e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-medium">
                                    {formatPercentage(percentageData[month.value]?.pension_transfer_monthly)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Info Note */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{language === 'he' ? 'הערה:' : 'Note:'}</strong>{' '}
                    {language === 'he'
                      ? 'ערכים מצטברים מחושבים אוטומטית מינואר ועד לחודש הנוכחי ולא יכולים לעבור 100%.'
                      : 'Cumulative values are automatically calculated from January through the current month and cannot exceed 100%.'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'comparison' && (
              <>
                {/* Info Message */}
                <div className={`mb-6 p-4 bg-blue-50 ${language === 'he' ? 'border-r-4' : 'border-l-4'} border-blue-500 rounded-lg`} dir={language === 'he' ? 'rtl' : 'ltr'}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 mb-1">
                        {language === 'he' ? 'הערה חשובה' : 'Important Note'}
                      </h4>
                      <p className="text-sm text-blue-800">
                        {language === 'he'
                          ? 'כדי שנתוני הביצוע של הסוכנים יוצגו בטבלה, יש להגדיר תחילה את היעד השנתי (בלשונית "הגדר יעד") ואת אחוזי היעד החודשיים (בלשונית "הגדר אחוזי יעד") עבור כל סוכן ומוצר.'
                          : 'For agent performance data to appear in the table, you must first set the Annual Target (in "Set Target" tab) and the Monthly Target Percentages (in "Set Target Percentage" tab) for each agent and product.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Year and Month Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center" dir={language === 'he' ? 'rtl' : 'ltr'}>
                  {/* Year Filter */}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-gray-700">
                      {language === 'he' ? 'שנה:' : 'Year:'}
                    </label>
                    <select
                      value={performanceYear}
                      onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
                      className="px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white"
                    >
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-700">
                      {language === 'he' ? 'חודש:' : 'Month:'}
                    </label>
                    <select
                      value={performanceSelectedMonth}
                      onChange={(e) => setPerformanceSelectedMonth(e.target.value)}
                      className="px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white"
                    >
                      <option value="all">{language === 'he' ? 'כל החודשים' : 'All Months'}</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>
                          {language === 'he' ? month.he : month.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Performance Analytics Table */}
                {loadingGoals || loadingPercentages || loadingPerformance ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600">
                      {language === 'he' ? 'טוען נתונים...' : 'Loading data...'}
                    </p>
                  </div>
                ) : goalsData.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {language === 'he' ? 'אין נתונים זמינים' : 'No Data Available'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'he'
                        ? 'לא נמצאו נתוני סוכנים'
                        : 'No agent data found'}
                    </p>
                  </div>
                ) : (
                  <div
                    className="overflow-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden rounded-lg border border-gray-200"
                    dir={language === 'he' ? 'rtl' : 'ltr'}
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
                    <table className="w-full border-collapse">
                      <thead>
                        {/* Main Header Row */}
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                          <th rowSpan="4" className={`sticky ${language === 'he' ? 'right-0' : 'left-0'} z-20 px-4 py-4 ${language === 'he' ? 'text-right' : 'text-left'} font-bold text-white bg-blue-600 border-b-2 border-r-2 border-blue-500 min-w-[180px]`}>
                            {language === 'he' ? 'שם סוכן' : 'Agent Name'}
                          </th>
                          <th rowSpan="4" className="px-4 py-4 text-center font-bold text-white border-b-2 border-r-2 border-blue-500 min-w-[120px]">
                            {language === 'he' ? 'מפקח' : 'Inspector'}
                          </th>
                          <th colSpan="4" className="px-4 py-3 text-center font-bold text-white border-b border-r-2 border-blue-500">
                            {language === 'he' ? 'יעד' : 'Target'}
                          </th>
                          <th colSpan={getFilteredMonths().length * 4} className="px-4 py-3 text-center font-bold text-white border-b border-r-2 border-blue-500">
                            {language === 'he' ? 'התפלגות חודשית' : 'Monthly Distribution'}
                          </th>
                          <th colSpan={getFilteredMonths().length * 4} className="px-4 py-3 text-center font-bold text-white border-b border-blue-500">
                            {language === 'he' ? 'התפלגות שנתית (מצטבר)' : 'Annual Distribution (Cumulative)'}
                          </th>
                        </tr>

                        {/* Second Header Row - Month Names */}
                        <tr className="bg-gradient-to-r from-blue-500 to-blue-600">
                          {/* Target - No second header */}
                          <th colSpan="4" className="border-b border-r-2 border-blue-400"></th>
                          
                          {/* Monthly Distribution - Month Names */}
                          {getFilteredMonths().map((month, idx) => (
                            <th 
                              key={`monthly-${month.value}`} 
                              colSpan="4" 
                              className={`px-3 py-2 text-center font-semibold text-white border-b ${idx < getFilteredMonths().length - 1 ? 'border-r-2' : 'border-r-2'} border-blue-400 min-w-[400px]`}
                            >
                              {language === 'he' ? month.he : month.en}
                            </th>
                          ))}
                          
                          {/* Annual Distribution - Month Names */}
                          {getFilteredMonths().map((month, idx) => (
                            <th 
                              key={`cumulative-${month.value}`} 
                              colSpan="4" 
                              className={`px-3 py-2 text-center font-semibold text-white border-b ${idx < getFilteredMonths().length - 1 ? 'border-r-2' : ''} border-blue-400 min-w-[400px]`}
                            >
                              {language === 'he' ? month.he : month.en}
                            </th>
                          ))}
                        </tr>

                        {/* Product Names Row */}
                        <tr className="bg-gradient-to-r from-blue-400 to-blue-500">
                          {/* Target Products - span 2 rows to include percentage row */}
                          <th rowSpan="2" className="px-2 py-2 text-center text-xs font-semibold text-white border-b-2 border-r border-blue-300 min-w-[100px]">
                            {language === 'he' ? 'פנסיוני' : 'Pension'}
                          </th>
                          <th rowSpan="2" className="px-2 py-2 text-center text-xs font-semibold text-white border-b-2 border-r border-blue-300 min-w-[100px]">
                            {language === 'he' ? 'סיכונים' : 'Risk'}
                          </th>
                          <th rowSpan="2" className="px-2 py-2 text-center text-xs font-semibold text-white border-b-2 border-r border-blue-300 min-w-[100px]">
                            {language === 'he' ? 'פיננסים' : 'Financial'}
                          </th>
                          <th rowSpan="2" className="px-2 py-2 text-center text-xs font-semibold text-white border-b-2 border-r-2 border-blue-300 min-w-[100px]">
                            {language === 'he' ? 'ניוד פנסיה' : 'Pension Transfer'}
                          </th>

                          {/* Monthly Distribution - Products */}
                          {getFilteredMonths().map((month) => (
                            <>
                              <th key={`monthly-${month.value}-pension`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'פנסיוני' : 'Pension'}
                              </th>
                              <th key={`monthly-${month.value}-risk`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'סיכונים' : 'Risk'}
                              </th>
                              <th key={`monthly-${month.value}-financial`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'פיננסים' : 'Financial'}
                              </th>
                              <th key={`monthly-${month.value}-transfer`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r-2 border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'ניוד פנסיה' : 'Pension Transfer'}
                              </th>
                            </>
                          ))}
                          
                          {/* Annual Distribution - Products */}
                          {getFilteredMonths().map((month, monthIdx) => (
                            <>
                              <th key={`cumulative-${month.value}-pension`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'פנסיוני' : 'Pension'}
                              </th>
                              <th key={`cumulative-${month.value}-risk`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'סיכונים' : 'Risk'}
                              </th>
                              <th key={`cumulative-${month.value}-financial`} className="px-2 py-2 text-center text-xs font-semibold text-white border-b border-r border-blue-300 min-w-[100px]">
                                {language === 'he' ? 'פיננסים' : 'Financial'}
                              </th>
                              <th key={`cumulative-${month.value}-transfer`} className={`px-2 py-2 text-center text-xs font-semibold text-white border-b ${monthIdx < months.length - 1 ? 'border-r-2' : ''} border-blue-300 min-w-[100px]`}>
                                {language === 'he' ? 'ניוד פנסיה' : 'Pension Transfer'}
                              </th>
                            </>
                          ))}
                        </tr>

                        {/* Percentage Row */}
                        <tr className="bg-gradient-to-r from-blue-300 to-blue-400">
                          {/* Monthly Distribution - Percentages */}
                          {getFilteredMonths().map((month) => {
                            const pensionPct = formatPercentage(percentageData[month.value]?.pension_monthly)
                            const riskPct = formatPercentage(percentageData[month.value]?.risk_monthly)
                            const financialPct = formatPercentage(percentageData[month.value]?.financial_monthly)
                            const transferPct = formatPercentage(percentageData[month.value]?.pension_transfer_monthly)
                            return (
                              <>
                                <th key={`monthly-pct-${month.value}-pension`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{pensionPct}</th>
                                <th key={`monthly-pct-${month.value}-risk`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{riskPct}</th>
                                <th key={`monthly-pct-${month.value}-financial`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{financialPct}</th>
                                <th key={`monthly-pct-${month.value}-transfer`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r-2 border-blue-300">{transferPct}</th>
                              </>
                            )
                          })}

                          {/* Annual Distribution - Percentages (Cumulative) */}
                          {getFilteredMonths().map((month, monthIdx) => {
                            const pensionCumulative = calculateCumulative('pension')[month.value]
                            const riskCumulative = calculateCumulative('risk')[month.value]
                            const financialCumulative = calculateCumulative('financial')[month.value]
                            const transferCumulative = calculateCumulative('pension_transfer')[month.value]
                            return (
                              <>
                                <th key={`cumulative-pct-${month.value}-pension`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{formatPercentage(pensionCumulative)}</th>
                                <th key={`cumulative-pct-${month.value}-risk`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{formatPercentage(riskCumulative)}</th>
                                <th key={`cumulative-pct-${month.value}-financial`} className="px-2 py-1 text-center text-xs font-medium text-white border-b-2 border-r border-blue-300">{formatPercentage(financialCumulative)}</th>
                                <th key={`cumulative-pct-${month.value}-transfer`} className={`px-2 py-1 text-center text-xs font-medium text-white border-b-2 ${monthIdx < getFilteredMonths().length - 1 ? 'border-r-2' : ''} border-blue-300`}>{formatPercentage(transferCumulative)}</th>
                              </>
                            )
                          })}
                        </tr>
                      </thead>

                      <tbody>
                        {groupAgentsByCategory(goalsData).map((agent, index) => (
                          <tr
                            key={agent.agent_id}
                            className={`
                              ${agent.isSubtotal 
                                ? `${agent.subtotalColor || 'bg-gradient-to-r from-blue-100 to-blue-50'} font-bold border-t-2 border-b-2 ${
                                    agent.category === 'סה"כ ישיר' ? 'border-blue-400' :
                                    agent.category === 'סה"כ חברות בנות' ? 'border-purple-400' :
                                    agent.category === 'סוכנים ערן' ? 'border-green-400' :
                                    agent.category === 'סוכנים איתי' ? 'border-amber-400' :
                                    agent.category === 'סה"כ פרימיום' ? 'border-pink-400' :
                                    'border-gray-400'
                                  }`
                                : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }
                              hover:bg-blue-50 transition-colors
                            `}
                          >
                            {/* Agent Name - Sticky */}
                            <td className={`
                              sticky ${language === 'he' ? 'right-0' : 'left-0'} z-10 px-4 py-3 ${agent.isSubtotal ? 'font-bold' : 'font-semibold'} text-gray-900 border-b border-r-2 border-gray-200
                              ${agent.isSubtotal 
                                ? agent.subtotalColor || 'bg-gradient-to-r from-blue-100 to-blue-50'
                                : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }
                              hover:bg-blue-50
                            `}>
                              <span className={`${agent.isSubtotal ? 'font-bold text-base' : 'font-semibold text-sm'}`}>
                                {agent.agent_name}
                              </span>
                            </td>

                            {/* Inspector */}
                            <td className="px-4 py-3 text-center border-b border-r-2 border-gray-200">
                              <span className="text-sm text-gray-700">
                                {agent.isSubtotal ? '' : (agent.inspector || '-')}
                              </span>
                            </td>

                            {/* Target - 4 Products */}
                            <td className="px-3 py-3 text-center border-b border-r border-gray-200">
                              <span className="text-sm font-medium text-blue-700">
                                {formatNumber(agent.pension_goal)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center border-b border-r border-gray-200">
                              <span className="text-sm font-medium text-green-700">
                                {formatNumber(agent.risk_goal)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center border-b border-r border-gray-200">
                              <span className="text-sm font-medium text-purple-700">
                                {formatNumber(agent.financial_goal)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center border-b border-r-2 border-gray-200">
                              <span className="text-sm font-medium text-orange-700">
                                {formatNumber(agent.pension_transfer_goal)}
                              </span>
                            </td>

                            {/* Monthly Distribution - All Months */}
                            {getFilteredMonths().map((month) => {
                              // Calculate monthly targets based on annual goal * monthly percentage
                              const monthPercentage = percentageData && typeof percentageData === 'object' ? percentageData[month.value] : {}
                              const pensionMonthlyPct = monthPercentage?.pension_monthly || 0
                              const riskMonthlyPct = monthPercentage?.risk_monthly || 0
                              const financialMonthlyPct = monthPercentage?.financial_monthly || 0
                              const transferMonthlyPct = monthPercentage?.pension_transfer_monthly || 0

                              const pensionTarget = (agent.pension_goal || 0) * (pensionMonthlyPct / 100)
                              const riskTarget = (agent.risk_goal || 0) * (riskMonthlyPct / 100)
                              const financialTarget = (agent.financial_goal || 0) * (financialMonthlyPct / 100)
                              const transferTarget = (agent.pension_transfer_goal || 0) * (transferMonthlyPct / 100)

                              let pensionActual = 0, riskActual = 0, financialActual = 0, transferActual = 0

                              if (agent.isSubtotal) {
                                // For subtotals, aggregate performance from all agents in this category
                                // Only include agents that have both annual goal AND percentage set
                                const categoryAgents = groupAgentsByCategory(goalsData).filter(a => 
                                  !a.isSubtotal && a.category === agent.category
                                )
                                const monthKey = `${performanceYear}-${String(month.value).padStart(2, '0')}`
                                
                                categoryAgents.forEach(catAgent => {
                                  const perf = getAgentPerformance(catAgent.agent_name)
                                  const mData = perf?.current_year_months?.[monthKey] || {}
                                  // Only include if agent has goal set and percentage is set
                                  if ((catAgent.pension_goal > 0) && pensionMonthlyPct > 0) {
                                    pensionActual += mData.pension || 0
                                  }
                                  if ((catAgent.risk_goal > 0) && riskMonthlyPct > 0) {
                                    riskActual += mData.risk || 0
                                  }
                                  if ((catAgent.financial_goal > 0) && financialMonthlyPct > 0) {
                                    financialActual += mData.financial || 0
                                  }
                                  if ((catAgent.pension_transfer_goal > 0) && transferMonthlyPct > 0) {
                                    transferActual += mData.pension_transfer || 0
                                  }
                                })
                              } else {
                                // For individual agents
                                const performance = getAgentPerformance(agent.agent_name)
                                const monthKey = `${performanceYear}-${String(month.value).padStart(2, '0')}`
                                const monthData = performance?.current_year_months?.[monthKey] || {}
                                pensionActual = monthData.pension || 0
                                riskActual = monthData.risk || 0
                                financialActual = monthData.financial || 0
                                transferActual = monthData.pension_transfer || 0
                              }

                              // Calculate achievement percentages
                              const pensionAchievement = pensionTarget > 0 ? (pensionActual / pensionTarget * 100) : 0
                              const riskAchievement = riskTarget > 0 ? (riskActual / riskTarget * 100) : 0
                              const financialAchievement = financialTarget > 0 ? (financialActual / financialTarget * 100) : 0
                              const transferAchievement = transferTarget > 0 ? (transferActual / transferTarget * 100) : 0

                              const getAchievementColor = (achievement) => {
                                if (achievement >= 100) return 'text-green-700'
                                if (achievement >= 75) return 'text-blue-700'
                                if (achievement >= 50) return 'text-amber-700'
                                return 'text-red-700'
                              }

// Check if cell should be blank (requires both annual goal AND percentage to be set)
              const showPensionCell = (agent.pension_goal > 0) && pensionMonthlyPct > 0
              const showRiskCell = (agent.risk_goal > 0) && riskMonthlyPct > 0
              const showFinancialCell = (agent.financial_goal > 0) && financialMonthlyPct > 0
              const showTransferCell = (agent.pension_transfer_goal > 0) && transferMonthlyPct > 0
                              return (
                                <React.Fragment key={`monthly-${agent.agent_id}-${month.value}`}>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showPensionCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(pensionTarget)} :ת` : `T: ${formatNumber(pensionTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(pensionActual)} :ב` : `P: ${formatNumber(pensionActual)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(pensionAchievement)}`}>
                                          {pensionAchievement > 0 ? `${pensionAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showRiskCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(riskTarget)} :ת` : `T: ${formatNumber(riskTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(riskActual)} :ב` : `P: ${formatNumber(riskActual)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(riskAchievement)}`}>
                                          {riskAchievement > 0 ? `${riskAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showFinancialCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(financialTarget)} :ת` : `T: ${formatNumber(financialTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(financialActual)} :ב` : `P: ${formatNumber(financialActual)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(financialAchievement)}`}>
                                          {financialAchievement > 0 ? `${financialAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-center border-b border-r-2 border-gray-200 bg-gray-50/30">
                                    {showTransferCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(transferTarget)} :ת` : `T: ${formatNumber(transferTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(transferActual)} :ב` : `P: ${formatNumber(transferActual)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(transferAchievement)}`}>
                                          {transferAchievement > 0 ? `${transferAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                </React.Fragment>
                              )
                            })}

                            {/* Annual Distribution (Cumulative) - All Months */}
                            {getFilteredMonths().map((month, monthIdx) => {
                              // Get cumulative performance for this agent up to this month
                              // Calculate cumulative actuals
                              let cumulativePension = 0, cumulativeRisk = 0, cumulativeFinancial = 0, cumulativeTransfer = 0
                              
                              if (agent.isSubtotal) {
                                // For subtotals, aggregate cumulative performance from all agents in this category
                                // Only include agents that have both annual goal AND percentage set
                                const categoryAgents = groupAgentsByCategory(goalsData).filter(a => 
                                  !a.isSubtotal && a.category === agent.category
                                )
                                
                                categoryAgents.forEach(catAgent => {
                                  const performance = getAgentPerformance(catAgent.agent_name)
                                  if (performance) {
                                    for (let m = 1; m <= month.value; m++) {
                                      const monthKey = `${performanceYear}-${String(m).padStart(2, '0')}`
                                      // Get the percentage for this month
                                      const monthPercentageForM = percentageData && typeof percentageData === 'object' ? percentageData[m] : {}
                                      const pensionMonthlyPctForM = monthPercentageForM?.pension_monthly || 0
                                      const riskMonthlyPctForM = monthPercentageForM?.risk_monthly || 0
                                      const financialMonthlyPctForM = monthPercentageForM?.financial_monthly || 0
                                      const transferMonthlyPctForM = monthPercentageForM?.pension_transfer_monthly || 0
                                      
                                      const mData = performance.current_year_months?.[monthKey] || {}
                                      // Only include if agent has goal set and percentage is set for this month
                                      if ((catAgent.pension_goal > 0) && pensionMonthlyPctForM > 0) {
                                        cumulativePension += mData.pension || 0
                                      }
                                      if ((catAgent.risk_goal > 0) && riskMonthlyPctForM > 0) {
                                        cumulativeRisk += mData.risk || 0
                                      }
                                      if ((catAgent.financial_goal > 0) && financialMonthlyPctForM > 0) {
                                        cumulativeFinancial += mData.financial || 0
                                      }
                                      if ((catAgent.pension_transfer_goal > 0) && transferMonthlyPctForM > 0) {
                                        cumulativeTransfer += mData.pension_transfer || 0
                                      }
                                    }
                                  }
                                })
                              } else {
                                // For individual agents, sum their own cumulative performance
                                const performance = getAgentPerformance(agent.agent_name)
                                if (performance) {
                                  for (let m = 1; m <= month.value; m++) {
                                    const monthKey = `${performanceYear}-${String(m).padStart(2, '0')}`
                                    const mData = performance.current_year_months?.[monthKey] || {}
                                    cumulativePension += mData.pension || 0
                                    cumulativeRisk += mData.risk || 0
                                    cumulativeFinancial += mData.financial || 0
                                    cumulativeTransfer += mData.pension_transfer || 0
                                  }
                                }
                              }

                              // Calculate cumulative targets based on annual goal * cumulative percentage
                              const pensionCumulativePct = calculateCumulative('pension')[month.value] || 0
                              const riskCumulativePct = calculateCumulative('risk')[month.value] || 0
                              const financialCumulativePct = calculateCumulative('financial')[month.value] || 0
                              const transferCumulativePct = calculateCumulative('pension_transfer')[month.value] || 0

                              const pensionCumulativeTarget = (agent.pension_goal || 0) * (pensionCumulativePct / 100)
                              const riskCumulativeTarget = (agent.risk_goal || 0) * (riskCumulativePct / 100)
                              const financialCumulativeTarget = (agent.financial_goal || 0) * (financialCumulativePct / 100)
                              const transferCumulativeTarget = (agent.pension_transfer_goal || 0) * (transferCumulativePct / 100)

                              // Calculate achievement percentages
                              const pensionAchievement = pensionCumulativeTarget > 0 ? (cumulativePension / pensionCumulativeTarget * 100) : 0
                              const riskAchievement = riskCumulativeTarget > 0 ? (cumulativeRisk / riskCumulativeTarget * 100) : 0
                              const financialAchievement = financialCumulativeTarget > 0 ? (cumulativeFinancial / financialCumulativeTarget * 100) : 0
                              const transferAchievement = transferCumulativeTarget > 0 ? (cumulativeTransfer / transferCumulativeTarget * 100) : 0

                              const getAchievementColor = (achievement) => {
                                if (achievement >= 100) return 'text-green-700'
                                if (achievement >= 75) return 'text-blue-700'
                                if (achievement >= 50) return 'text-amber-700'
                                return 'text-red-700'
                              }

// Check if cells should be displayed (requires both annual goal AND percentage to be set)
              const showPensionCell = (agent.pension_goal > 0) && pensionCumulativePct > 0
              const showRiskCell = (agent.risk_goal > 0) && riskCumulativePct > 0
              const showFinancialCell = (agent.financial_goal > 0) && financialCumulativePct > 0
              const showTransferCell = (agent.pension_transfer_goal > 0) && transferCumulativePct > 0

                              return (
                                <React.Fragment key={`cumulative-${agent.agent_id}-${month.value}`}>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showPensionCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(pensionCumulativeTarget)} :ת` : `T: ${formatNumber(pensionCumulativeTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(cumulativePension)} :ב` : `P: ${formatNumber(cumulativePension)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(pensionAchievement)}`}>
                                          {pensionAchievement > 0 ? `${pensionAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showRiskCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(riskCumulativeTarget)} :ת` : `T: ${formatNumber(riskCumulativeTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(cumulativeRisk)} :ב` : `P: ${formatNumber(cumulativeRisk)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(riskAchievement)}`}>
                                          {riskAchievement > 0 ? `${riskAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-center border-b border-r border-gray-200 bg-gray-50/30">
                                    {showFinancialCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(financialCumulativeTarget)} :ת` : `T: ${formatNumber(financialCumulativeTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(cumulativeFinancial)} :ב` : `P: ${formatNumber(cumulativeFinancial)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(financialAchievement)}`}>
                                          {financialAchievement > 0 ? `${financialAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                  <td className={`px-2 py-2 text-center border-b ${monthIdx < months.length - 1 ? 'border-r-2' : ''} border-gray-200 bg-gray-50/30`}>
                                    {showTransferCell ? (
                                      <>
                                        <div className="text-[10px] text-gray-600" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(transferCumulativeTarget)} :ת` : `T: ${formatNumber(transferCumulativeTarget)}`}
                                        </div>
                                        <div className="text-[10px] text-gray-800 font-medium" dir={language === 'he' ? 'rtl' : 'ltr'}>
                                          {language === 'he' ? `\u200F${formatNumber(cumulativeTransfer)} :ב` : `P: ${formatNumber(cumulativeTransfer)}`}
                                        </div>
                                        <div className={`text-[10px] font-bold ${getAchievementColor(transferAchievement)}`}>
                                          {transferAchievement > 0 ? `${transferAchievement.toFixed(0)}%` : '-'}
                                        </div>
                                      </>
                                    ) : null}
                                  </td>
                                </React.Fragment>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Dialog for Goals */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {language === 'he' ? 'אישור שמירה' : 'Confirm Save'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {language === 'he'
                ? 'האם אתה בטוח שברצונך לשמור את השינויים ביעדים?'
                : 'Are you sure you want to save the changes to the goals?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {language === 'he' ? 'אישור' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Percentages */}
      {showPercentageConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {language === 'he' ? 'אישור שמירה' : 'Confirm Save'}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {language === 'he'
                ? 'האם אתה בטוח שברצונך לשמור את השינויים באחוזי היעד?'
                : 'Are you sure you want to save the changes to the target percentages?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPercentageConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmPercentageSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {language === 'he' ? 'אישור' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`
            rounded-lg shadow-lg px-6 py-4 flex items-center gap-3 min-w-[300px]
            ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}
            text-white
          `}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Targets
