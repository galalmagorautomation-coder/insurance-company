import React, { useState, useEffect, useMemo } from 'react'
import { Calendar, Building2, Users, Loader, Filter, TrendingUp, FileText, ArrowUpDown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Insights() {
  const { t, language } = useLanguage()
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('all')

  // Life Insurance date filters
  const [lifeInsuranceStartMonth, setLifeInsuranceStartMonth] = useState(() => {
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    
    // If January, set start to January to avoid cross-year default
    if (currentMonth === 0) {
      return `${now.getFullYear()}-01`
    }
    
    // Otherwise, use last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  })
  const [lifeInsuranceEndMonth, setLifeInsuranceEndMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Elementary date filters
  const [elementaryStartMonth, setElementaryStartMonth] = useState(() => {
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    
    // If January, set start to January to avoid cross-year default
    if (currentMonth === 0) {
      return `${now.getFullYear()}-01`
    }
    
    // Otherwise, use last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  })
  const [elementaryEndMonth, setElementaryEndMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Handle life insurance start month change with validation
  const handleLifeInsuranceStartMonthChange = (value) => {
    const startYear = new Date(value + '-01').getFullYear()
    const endYear = new Date(lifeInsuranceEndMonth + '-01').getFullYear()
    
    setLifeInsuranceStartMonth(value)
    
    // If different years, auto-adjust end date to December of the new start year
    if (startYear !== endYear) {
      setLifeInsuranceEndMonth(`${startYear}-12`)
    } else if (value > lifeInsuranceEndMonth) {
      // If same year but start is after end, update end to match start
      setLifeInsuranceEndMonth(value)
    }
  }

  // Handle life insurance end month change with validation
  const handleLifeInsuranceEndMonthChange = (value) => {
    const startYear = new Date(lifeInsuranceStartMonth + '-01').getFullYear()
    const endYear = new Date(value + '-01').getFullYear()
    
    setLifeInsuranceEndMonth(value)
    
    // If different years, auto-adjust start date to January of the new end year
    if (endYear !== startYear) {
      setLifeInsuranceStartMonth(`${endYear}-01`)
    } else if (value < lifeInsuranceStartMonth) {
      // If same year but end is before start, update start to match end
      setLifeInsuranceStartMonth(value)
    }
  }

  // Handle elementary start month change with validation
  const handleElementaryStartMonthChange = (value) => {
    const startYear = new Date(value + '-01').getFullYear()
    const endYear = new Date(elementaryEndMonth + '-01').getFullYear()
    
    setElementaryStartMonth(value)
    
    // If different years, auto-adjust end date to December of the new start year
    if (startYear !== endYear) {
      setElementaryEndMonth(`${startYear}-12`)
    } else if (value > elementaryEndMonth) {
      // If same year but start is after end, update end to match start
      setElementaryEndMonth(value)
    }
  }

  // Handle elementary end month change with validation
  const handleElementaryEndMonthChange = (value) => {
    const startYear = new Date(elementaryStartMonth + '-01').getFullYear()
    const endYear = new Date(value + '-01').getFullYear()
    
    setElementaryEndMonth(value)
    
    // If different years, auto-adjust start date to January of the new end year
    if (endYear !== startYear) {
      setElementaryStartMonth(`${endYear}-01`)
    } else if (value < elementaryStartMonth) {
      // If same year but end is before start, update start to match end
      setElementaryStartMonth(value)
    }
  }
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [selectedInspector, setSelectedInspector] = useState('all')
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [allAgents, setAllAgents] = useState([]) // Store all available agents for dropdown
  const [selectedElementaryAgent, setSelectedElementaryAgent] = useState('all')
  const [allElementaryAgents, setAllElementaryAgents] = useState([]) // Store all available elementary agents for dropdown

  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [currentYearData, setCurrentYearData] = useState([])
  const [totalPolicies, setTotalPolicies] = useState(0)
  const [loadingData, setLoadingData] = useState(false)
  const [processingGroupedData, setProcessingGroupedData] = useState(false)
  const [lifeInsuranceMonths, setLifeInsuranceMonths] = useState([])
  const [lifeInsurancePrevMonths, setLifeInsurancePrevMonths] = useState([])
  const [lifeInsuranceCurrentYear, setLifeInsuranceCurrentYear] = useState(new Date().getFullYear())
  const [lifeInsurancePreviousYear, setLifeInsurancePreviousYear] = useState(new Date().getFullYear() - 1)

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
  const [elementarySortBy, setElementarySortBy] = useState('default') // 'default', 'gross_premium_desc', 'gross_premium_asc', 'change_desc', 'change_asc'
  const [lifeInsuranceSortBy, setLifeInsuranceSortBy] = useState('default') // 'default', 'total_desc', 'total_asc', 'pension_desc', 'pension_asc', 'risk_desc', 'risk_asc', 'financial_desc', 'financial_asc', 'transfer_desc', 'transfer_asc', 'name_asc', 'name_desc'

  // Edit mode states for Elementary table
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedValues, setEditedValues] = useState({}) // Structure: { agentId: { month: value } }
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Edit mode states for Life Insurance table
  const [isLifeEditMode, setIsLifeEditMode] = useState(false)
  const [lifeEditedValues, setLifeEditedValues] = useState({}) // Structure: { agentId: { month: { product: value } } }
  const [isLifeSaving, setIsLifeSaving] = useState(false)
  const [showLifeConfirmDialog, setShowLifeConfirmDialog] = useState(false)
  const [lifeSaveError, setLifeSaveError] = useState(null)

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' }) // type: 'success' | 'error' | 'info'

  // Company chart data states
  const [lifeInsuranceCompanyData, setLifeInsuranceCompanyData] = useState([])
  const [loadingLifeInsuranceCompanyData, setLoadingLifeInsuranceCompanyData] = useState(false)
  const [elementaryCompanyData, setElementaryCompanyData] = useState([])
  const [loadingElementaryCompanyData, setLoadingElementaryCompanyData] = useState(false)

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
  }

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ ...toast, show: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

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
    setSelectedElementaryAgent('all')
  }, [activeTab])

  // Fetch all available agents for dropdown (Life Insurance only)
  useEffect(() => {
    if (!lifeInsuranceStartMonth || !lifeInsuranceEndMonth || activeTab !== 'life-insurance') return

    const fetchAllAgents = async () => {
      try {
        // Build query params WITHOUT agent filter to get all agents
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', lifeInsuranceStartMonth)
        params.append('end_month', lifeInsuranceEndMonth)
        if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
        if (selectedInspector !== 'all') params.append('inspector', selectedInspector)
        // Note: NOT including agent_name filter here
        params.append('limit', '10000')

        const url = `${API_ENDPOINTS.aggregate}/agents?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success && result.data) {
          // Extract unique agent names
          const agents = [...new Set(result.data.map(row => row.agent_name))].filter(Boolean).sort()
          setAllAgents(agents)
        }
      } catch (err) {
        console.error('Error fetching all agents:', err)
      }
    }

    fetchAllAgents()
  }, [selectedCompanyId, lifeInsuranceStartMonth, lifeInsuranceEndMonth, selectedDepartment, selectedInspector, activeTab])

  // Fetch aggregated data when filters change (Life Insurance only)
  useEffect(() => {
    if (!lifeInsuranceStartMonth || !lifeInsuranceEndMonth || activeTab !== 'life-insurance') return

    const fetchData = async () => {
      setLoadingData(true)
      setProcessingGroupedData(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', lifeInsuranceStartMonth)
        params.append('end_month', lifeInsuranceEndMonth)
        if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
        if (selectedInspector !== 'all') params.append('inspector', selectedInspector)
        if (selectedAgent !== 'all') params.append('agent_name', selectedAgent)
        
        // Add limit parameter to get more data
        params.append('limit', '10000')

        const url = `${API_ENDPOINTS.aggregate}/agents?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          // Update state
          setLifeInsuranceMonths(result.months || [])
          setLifeInsurancePrevMonths(result.previousYearMonths || [])
          setLifeInsuranceCurrentYear(result.currentYear || new Date().getFullYear())
          setLifeInsurancePreviousYear(result.previousYear || new Date().getFullYear() - 1)
          setTotalPolicies(result.totalPolicies || 0)
          
          // Pass months directly to avoid race condition with state updates
          const groupedData = groupByCategory(
            result.data, 
            selectedProduct, 
            result.months || [], 
            result.previousYearMonths || []
          )
          setCurrentYearData(groupedData)
          setProcessingGroupedData(false)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setProcessingGroupedData(false)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [selectedCompanyId, lifeInsuranceStartMonth, lifeInsuranceEndMonth, selectedDepartment, selectedInspector, selectedAgent, selectedProduct, activeTab])

  // Calculate direct total from currentYearData (matches table grand total)
  const { calculatedDirectTotal, calculatedDirectBreakdown } = useMemo(() => {
    if (!currentYearData || currentYearData.length === 0) {
      return { 
        calculatedDirectTotal: 0, 
        calculatedDirectBreakdown: { pension: 0, risk: 0, financial: 0, pension_transfer: 0 } 
      }
    }

    // Find the grand total row which has all the aggregated data
    const grandTotal = currentYearData.find(row => row.isGrandTotal)
    
    if (!grandTotal) {
      return { 
        calculatedDirectTotal: 0, 
        calculatedDirectBreakdown: { pension: 0, risk: 0, financial: 0, pension_transfer: 0 } 
      }
    }

    // Calculate total based on product filter
    let total = 0
    const breakdown = {
      pension: Math.round(grandTotal.פנסיוני || 0),
      risk: Math.round(grandTotal.סיכונים || 0),
      financial: Math.round(grandTotal.פיננסים || 0),
      pension_transfer: Math.round(grandTotal['ניודי פנסיה'] || 0)
    }

    if (selectedProduct === 'all') {
      total = breakdown.pension + breakdown.risk + breakdown.financial + breakdown.pension_transfer
    } else {
      // Map Hebrew product name to breakdown key
      const productMap = {
        'פנסיוני': 'pension',
        'סיכונים': 'risk',
        'פיננסים': 'financial',
        'ניודי פנסיה': 'pension_transfer'
      }
      const productKey = productMap[selectedProduct]
      total = breakdown[productKey] || 0
    }

    return { calculatedDirectTotal: total, calculatedDirectBreakdown: breakdown }
  }, [currentYearData, selectedProduct])

  // Fetch elementary stats when filters change (Elementary only)
  useEffect(() => {
    if (!elementaryStartMonth || !elementaryEndMonth || activeTab !== 'elementary') return

    const fetchElementaryStats = async () => {
      setLoadingElementaryStats(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', elementaryStartMonth)
        params.append('end_month', elementaryEndMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)
        if (selectedElementaryAgent !== 'all') params.append('agent_name', selectedElementaryAgent)

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
  }, [selectedCompanyId, elementaryStartMonth, elementaryEndMonth, selectedElementaryDepartment, selectedElementaryAgent, activeTab])

  // Fetch all available elementary agents for dropdown (Elementary only)
  useEffect(() => {
    if (!elementaryStartMonth || !elementaryEndMonth || activeTab !== 'elementary') return

    const fetchAllElementaryAgents = async () => {
      try {
        // Build query params WITHOUT agent filter to get all agents
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', elementaryStartMonth)
        params.append('end_month', elementaryEndMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)
        // Note: NOT including agent_name filter here
        params.append('limit', '10000')

        const url = `${API_ENDPOINTS.aggregate}/elementary/agents?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success && result.data) {
          // Extract unique agent names
          const agents = [...new Set(result.data.map(row => row.agent_name))].filter(Boolean).sort()
          setAllElementaryAgents(agents)
        }
      } catch (err) {
        console.error('Error fetching all elementary agents:', err)
      }
    }

    fetchAllElementaryAgents()
  }, [selectedCompanyId, elementaryStartMonth, elementaryEndMonth, selectedElementaryDepartment, activeTab])

  // Fetch elementary agent data for pie charts (Elementary only)
  useEffect(() => {
    if (!elementaryStartMonth || !elementaryEndMonth || activeTab !== 'elementary') return

    const fetchElementaryData = async () => {
      setLoadingElementaryData(true)
      try {
        // Build query params
        const params = new URLSearchParams()
        if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
        params.append('start_month', elementaryStartMonth)
        params.append('end_month', elementaryEndMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)
        if (selectedElementaryAgent !== 'all') params.append('agent_name', selectedElementaryAgent)

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
  }, [selectedCompanyId, elementaryStartMonth, elementaryEndMonth, selectedElementaryDepartment, selectedElementaryAgent, activeTab])

  // Fetch life insurance company data for pie chart
  useEffect(() => {
    if (!lifeInsuranceStartMonth || !lifeInsuranceEndMonth || activeTab !== 'life-insurance') {
      return
    }

    // Clear company data if not viewing all companies
    if (selectedCompanyId !== 'all') {
      setLifeInsuranceCompanyData([])
      return
    }

    const fetchLifeInsuranceCompanyData = async () => {
      setLoadingLifeInsuranceCompanyData(true)
      try {
        const params = new URLSearchParams()
        params.append('start_month', lifeInsuranceStartMonth)
        params.append('end_month', lifeInsuranceEndMonth)
        if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
        if (selectedInspector !== 'all') params.append('inspector', selectedInspector)
        if (selectedAgent !== 'all') params.append('agent_name', selectedAgent)
        if (selectedProduct !== 'all') params.append('product', selectedProduct)

        const url = `${API_ENDPOINTS.aggregate}/companies/life-insurance?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          setLifeInsuranceCompanyData(result.data || [])
        }
      } catch (err) {
        console.error('Error fetching life insurance company data:', err)
      } finally {
        setLoadingLifeInsuranceCompanyData(false)
      }
    }

    fetchLifeInsuranceCompanyData()
  }, [lifeInsuranceStartMonth, lifeInsuranceEndMonth, selectedDepartment, selectedInspector, selectedAgent, selectedProduct, activeTab, selectedCompanyId])

  // Fetch elementary company data for pie chart
  useEffect(() => {
    if (!elementaryStartMonth || !elementaryEndMonth || activeTab !== 'elementary') {
      return
    }

    // Clear company data if not viewing all companies
    if (selectedCompanyId !== 'all') {
      setElementaryCompanyData([])
      return
    }

    const fetchElementaryCompanyData = async () => {
      setLoadingElementaryCompanyData(true)
      try {
        const params = new URLSearchParams()
        params.append('start_month', elementaryStartMonth)
        params.append('end_month', elementaryEndMonth)
        if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)
        if (selectedElementaryAgent !== 'all') params.append('agent_name', selectedElementaryAgent)

        const url = `${API_ENDPOINTS.aggregate}/companies/elementary?${params.toString()}`
        const response = await fetch(url)
        const result = await response.json()

        if (result.success) {
          setElementaryCompanyData(result.data || [])
        }
      } catch (err) {
        console.error('Error fetching elementary company data:', err)
      } finally {
        setLoadingElementaryCompanyData(false)
      }
    }

    fetchElementaryCompanyData()
  }, [elementaryStartMonth, elementaryEndMonth, selectedElementaryDepartment, selectedElementaryAgent, activeTab, selectedCompanyId])

  // Group agents by category with subtotals and monthly breakdown
  const groupByCategory = (data, productFilter = 'all', months = null, prevMonths = null) => {
    // Use passed months or fall back to state
    const currentMonths = months || lifeInsuranceMonths
    const previousMonths = prevMonths || lifeInsurancePrevMonths

    if (!data || data.length === 0) {
      return []
    }

    if (currentMonths.length === 0 || previousMonths.length === 0) {
      return []
    }

    // Helper function to get product value(s) based on filter
    const getProductValue = (monthData) => {
      if (!monthData) return 0

      switch (productFilter) {
        case 'פנסיוני':
          return monthData.pension || 0
        case 'סיכונים':
          return monthData.risk || 0
        case 'פיננסים':
          return monthData.financial || 0
        case 'ניודי פנסיה':
          return monthData.pension_transfer || 0
        case 'all':
        default:
          return (monthData.pension || 0) + (monthData.risk || 0) + (monthData.financial || 0) + (monthData.pension_transfer || 0)
      }
    }

    const categories = {
      'סה"כ ישיר': [],
      'סה"כ חברות בנות': [],
      'סוכנים ערן': [],
      'סוכנים איתי': [],
      'סה"כ פרימיום': [],
      'אחר': [] // "Other" category for uncategorized agents
    }

    // Calculate cumulative and monthly for each agent
    const enrichedData = data.map((agent, index) => {
      // Validate agent data
      if (!agent.current_year_months) {
        agent.current_year_months = {}
      }
      if (!agent.previous_year_months) {
        agent.previous_year_months = {}
      }

      // Calculate cumulative (sum of all months based on product filter)
      let cumulative_current = 0
      let cumulative_previous = 0

      currentMonths.forEach(month => {
        const monthData = agent.current_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
        cumulative_current += getProductValue(monthData)
      })

      previousMonths.forEach(month => {
        const monthData = agent.previous_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
        cumulative_previous += getProductValue(monthData)
      })

      // Calculate monthly (last month's total based on product filter)
      const lastCurrentMonth = currentMonths[currentMonths.length - 1]
      const lastPrevMonth = previousMonths[previousMonths.length - 1]

      const lastCurrentMonthData = agent.current_year_months?.[lastCurrentMonth] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
      const lastPrevMonthData = agent.previous_year_months?.[lastPrevMonth] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }

      const monthly_current = getProductValue(lastCurrentMonthData)
      const monthly_previous = getProductValue(lastPrevMonthData)

      // Calculate change percentage
      let changes = null
      if (monthly_previous > 0) {
        changes = (monthly_current - monthly_previous) / monthly_previous
      } else if (monthly_current > 0) {
        changes = 1
      }

      return {
        ...agent,
        cumulative_current,
        cumulative_previous,
        monthly_current,
        monthly_previous,
        changes
      }
    })

    enrichedData.forEach((agent, index) => {
      if (agent.category && categories[agent.category]) {
        categories[agent.category].push(agent)
      } else {
        // Put uncategorized or unrecognized category agents into "Other"
        categories['אחר'].push(agent)
      }
    })

    const result = []

    // Initialize grand total with monthly breakdown
    const grandTotal = {
      agent_name: 'סה"כ כולל',
      inspector: '',
      department: '',
      category: 'total',
      current_year_months: {},
      previous_year_months: {},
      cumulative_current: 0,
      cumulative_previous: 0,
      monthly_current: 0,
      monthly_previous: 0,
      changes: null,
      פנסיוני: 0,
      סיכונים: 0,
      פיננסים: 0,
      'ניודי פנסיה': 0,
      isSubtotal: true,
      isGrandTotal: true
    }

    // Initialize months in grand total
    currentMonths.forEach(month => {
      grandTotal.current_year_months[month] = {
        pension: 0,
        risk: 0,
        financial: 0,
        pension_transfer: 0
      }
    })
    previousMonths.forEach(month => {
      grandTotal.previous_year_months[month] = {
        pension: 0,
        risk: 0,
        financial: 0,
        pension_transfer: 0
      }
    })

    Object.entries(categories).forEach(([categoryName, agents]) => {
      if (agents.length === 0) return

      agents.forEach(agent => result.push(agent))

      // Initialize subtotal with monthly breakdown
      const subtotal = {
        agent_name: categoryName,
        inspector: '',
        department: '',
        category: categoryName,
        current_year_months: {},
        previous_year_months: {},
        cumulative_current: 0,
        cumulative_previous: 0,
        monthly_current: 0,
        monthly_previous: 0,
        changes: null,
        פנסיוני: 0,
        סיכונים: 0,
        פיננסים: 0,
        'ניודי פנסיה': 0,
        isSubtotal: true
      }

      // Initialize months in subtotal
      currentMonths.forEach(month => {
        subtotal.current_year_months[month] = {
          pension: 0,
          risk: 0,
          financial: 0,
          pension_transfer: 0
        }
      })
      previousMonths.forEach(month => {
        subtotal.previous_year_months[month] = {
          pension: 0,
          risk: 0,
          financial: 0,
          pension_transfer: 0
        }
      })

      // Sum up monthly breakdown and totals
      agents.forEach(agent => {
        // Sum current year months - ALWAYS sum all products for table display
        currentMonths.forEach(month => {
          const monthData = agent.current_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
          subtotal.current_year_months[month].pension += monthData.pension || 0
          subtotal.current_year_months[month].risk += monthData.risk || 0
          subtotal.current_year_months[month].financial += monthData.financial || 0
          subtotal.current_year_months[month].pension_transfer += monthData.pension_transfer || 0
        })

        // Sum previous year months - ALWAYS sum all products for table display
        previousMonths.forEach(month => {
          const monthData = agent.previous_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
          subtotal.previous_year_months[month].pension += monthData.pension || 0
          subtotal.previous_year_months[month].risk += monthData.risk || 0
          subtotal.previous_year_months[month].financial += monthData.financial || 0
          subtotal.previous_year_months[month].pension_transfer += monthData.pension_transfer || 0
        })

        // Sum totals (always sum all products for pie charts and other uses)
        subtotal.פנסיוני += agent.פנסיוני || 0
        subtotal.סיכונים += agent.סיכונים || 0
        subtotal.פיננסים += agent.פיננסים || 0
        subtotal['ניודי פנסיה'] += agent['ניודי פנסיה'] || 0

        // Sum cumulative and monthly
        subtotal.cumulative_current += agent.cumulative_current || 0
        subtotal.cumulative_previous += agent.cumulative_previous || 0
        subtotal.monthly_current += agent.monthly_current || 0
        subtotal.monthly_previous += agent.monthly_previous || 0
      })

      // Calculate changes for subtotal
      if (subtotal.monthly_previous > 0) {
        subtotal.changes = (subtotal.monthly_current - subtotal.monthly_previous) / subtotal.monthly_previous
      } else if (subtotal.monthly_current > 0) {
        subtotal.changes = 1
      }

      result.push(subtotal)

      // Add to grand total - ALWAYS sum all products for table display
      currentMonths.forEach(month => {
        grandTotal.current_year_months[month].pension += subtotal.current_year_months[month].pension
        grandTotal.current_year_months[month].risk += subtotal.current_year_months[month].risk
        grandTotal.current_year_months[month].financial += subtotal.current_year_months[month].financial
        grandTotal.current_year_months[month].pension_transfer += subtotal.current_year_months[month].pension_transfer
      })
      previousMonths.forEach(month => {
        grandTotal.previous_year_months[month].pension += subtotal.previous_year_months[month].pension
        grandTotal.previous_year_months[month].risk += subtotal.previous_year_months[month].risk
        grandTotal.previous_year_months[month].financial += subtotal.previous_year_months[month].financial
        grandTotal.previous_year_months[month].pension_transfer += subtotal.previous_year_months[month].pension_transfer
      })
      // Always sum all products (for pie charts and other uses)
      grandTotal.פנסיוני += subtotal.פנסיוני
      grandTotal.סיכונים += subtotal.סיכונים
      grandTotal.פיננסים += subtotal.פיננסים
      grandTotal['ניודי פנסיה'] += subtotal['ניודי פנסיה']

      // Sum cumulative and monthly to grand total
      console.log(`➕ Adding category "${categoryName}" to grand total:`, {
        subtotal_cumulative_current: subtotal.cumulative_current,
        subtotal_cumulative_previous: subtotal.cumulative_previous,
        grand_total_cumulative_current_before: grandTotal.cumulative_current,
        grand_total_cumulative_current_after: grandTotal.cumulative_current + subtotal.cumulative_current
      })
      grandTotal.cumulative_current += subtotal.cumulative_current
      grandTotal.cumulative_previous += subtotal.cumulative_previous
      grandTotal.monthly_current += subtotal.monthly_current
      grandTotal.monthly_previous += subtotal.monthly_previous
    })

    console.log('📊 Grand Total Cumulative Calculation Summary:', {
      final_cumulative_current: grandTotal.cumulative_current,
      final_cumulative_previous: grandTotal.cumulative_previous,
      productFilter: productFilter,
      months: currentMonths,
      totalCategories: Object.keys(categories).length
    })

    // Calculate changes for grand total
    if (grandTotal.monthly_previous > 0) {
      grandTotal.changes = (grandTotal.monthly_current - grandTotal.monthly_previous) / grandTotal.monthly_previous
    } else if (grandTotal.monthly_current > 0) {
      grandTotal.changes = 1
    }

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
    
    // Filter out departments with zero totals to avoid empty pie slices
    return Object.entries(deptTotals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
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

  // Helper function to determine which product columns to show based on filter
  const getVisibleProducts = () => {
    const allProducts = [
      { key: 'pension', hebrewKey: 'פנסיוני', label: language === 'he' ? 'פנסיוני' : 'Pension' },
      { key: 'risk', hebrewKey: 'סיכונים', label: language === 'he' ? 'סיכונים' : 'Risk' },
      { key: 'financial', hebrewKey: 'פיננסים', label: language === 'he' ? 'פיננסים' : 'Financial' },
      { key: 'pension_transfer', hebrewKey: 'ניודי פנסיה', label: language === 'he' ? 'ניודי פנסיה' : 'Pension Transfer' }
    ]

    if (selectedProduct === 'all') return allProducts

    // Map product filter to product key
    const productMap = {
      'פנסיוני': 'pension',
      'סיכונים': 'risk',
      'פיננסים': 'financial',
      'ניודי פנסיה': 'pension_transfer'
    }

    const selectedKey = productMap[selectedProduct]
    return allProducts.filter(p => p.key === selectedKey)
  }

  const getCompanyChartData = () => {
    console.log('🏢 Company Chart Data:', {
      lifeInsuranceCompanyData,
      mapped: lifeInsuranceCompanyData.map(company => ({
        name: language === 'he' ? company.company_name : company.company_name_en,
        value: company.total
      }))
    })
    
    return lifeInsuranceCompanyData
      .map(company => ({
        name: language === 'he' ? company.company_name : company.company_name_en,
        value: company.total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
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

  // Format percentage change with color
  const getChangeColorClasses = (changeDecimal) => {
    if (changeDecimal === null || changeDecimal === undefined || changeDecimal === 0) {
      return {
        text: 'text-gray-600',
        bg: 'bg-white'
      }
    }
    if (changeDecimal > 0) {
      return {
        text: 'text-green-700 font-semibold',
        bg: 'bg-green-50'
      }
    }
    return {
      text: 'text-red-700 font-semibold',
      bg: 'bg-red-50'
    }
  }

  const formatPercentageChange = (changeDecimal) => {
    if (changeDecimal === null || changeDecimal === undefined || isNaN(changeDecimal)) return '-'
    const percentage = (changeDecimal * 100).toFixed(1)
    if (changeDecimal > 0) return `+${percentage}%`
    if (changeDecimal === 0) return '0%'
    return `${percentage}%`
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

  // Sort elementary data based on selected filter
  const getSortedElementaryData = () => {
    let sorted = [...elementaryData]

    switch (elementarySortBy) {
      case 'gross_premium_desc':
        return sorted.sort((a, b) => (b.gross_premium || 0) - (a.gross_premium || 0))
      case 'gross_premium_asc':
        return sorted.sort((a, b) => (a.gross_premium || 0) - (b.gross_premium || 0))
      case 'change_desc':
        return sorted.sort((a, b) => {
          const changeA = a.changes !== null && a.changes !== undefined ? a.changes : -Infinity
          const changeB = b.changes !== null && b.changes !== undefined ? b.changes : -Infinity
          return changeB - changeA
        })
      case 'change_asc':
        return sorted.sort((a, b) => {
          const changeA = a.changes !== null && a.changes !== undefined ? a.changes : Infinity
          const changeB = b.changes !== null && b.changes !== undefined ? b.changes : Infinity
          return changeA - changeB
        })
      case 'name_asc':
        return sorted.sort((a, b) => (a.agent_name || '').localeCompare(b.agent_name || ''))
      case 'name_desc':
        return sorted.sort((a, b) => (b.agent_name || '').localeCompare(a.agent_name || ''))
      default:
        return sorted
    }
  }

  // Group elementary data by department with subtotals
  const groupElementaryByDepartment = () => {
    if (!elementaryData || elementaryData.length === 0) {
      return []
    }

    // Group agents by department
    const departments = {}
    
    elementaryData.forEach((agent) => {
      const dept = agent.department || 'אחר' // Default to "Other" if no department
      if (!departments[dept]) {
        departments[dept] = []
      }
      departments[dept].push(agent)
    })

    const result = []

    // Initialize grand total
    const grandTotal = {
      agent_name: 'סה"כ כולל',
      department: '',
      gross_premium: 0,
      cumulative_current: 0,
      cumulative_previous: 0,
      monthly_current: 0,
      monthly_previous: 0,
      current_year_months: {},
      previous_year_months: {},
      changes: null,
      isSubtotal: true,
      isGrandTotal: true
    }

    // Initialize months in grand total
    elementaryMonths.forEach(month => {
      grandTotal.current_year_months[month] = 0
    })
    elementaryPrevMonths.forEach(month => {
      grandTotal.previous_year_months[month] = 0
    })

    // Process each department
    Object.entries(departments).forEach(([deptName, agents]) => {
      if (agents.length === 0) return

      // Add all agents in this department
      agents.forEach(agent => result.push(agent))

      // Calculate department subtotal
      const subtotal = {
        agent_name: deptName,
        department: '',
        gross_premium: 0,
        cumulative_current: 0,
        cumulative_previous: 0,
        monthly_current: 0,
        monthly_previous: 0,
        current_year_months: {},
        previous_year_months: {},
        changes: null,
        isSubtotal: true,
        isGrandTotal: false
      }

      // Initialize months in subtotal
      elementaryMonths.forEach(month => {
        subtotal.current_year_months[month] = 0
      })
      elementaryPrevMonths.forEach(month => {
        subtotal.previous_year_months[month] = 0
      })

      // Sum up all agents in this department
      agents.forEach(agent => {
        subtotal.gross_premium += agent.gross_premium || 0

        // Sum monthly data
        elementaryMonths.forEach(month => {
          const value = agent.current_year_months?.[month] || agent.months_breakdown?.[month] || 0
          subtotal.current_year_months[month] += value
        })
        elementaryPrevMonths.forEach(month => {
          const value = agent.previous_year_months?.[month] || agent.prev_months_breakdown?.[month] || 0
          subtotal.previous_year_months[month] += value
        })
      })

      // Calculate cumulative from monthly breakdown
      subtotal.cumulative_current = 0
      elementaryMonths.forEach(month => {
        subtotal.cumulative_current += subtotal.current_year_months[month] || 0
      })
      
      subtotal.cumulative_previous = 0
      elementaryPrevMonths.forEach(month => {
        subtotal.cumulative_previous += subtotal.previous_year_months[month] || 0
      })

      // Calculate monthly current and previous (last month values)
      const lastCurrentMonth = elementaryMonths[elementaryMonths.length - 1]
      const lastPrevMonth = elementaryPrevMonths[elementaryPrevMonths.length - 1]
      subtotal.monthly_current = subtotal.current_year_months[lastCurrentMonth] || 0
      subtotal.monthly_previous = subtotal.previous_year_months[lastPrevMonth] || 0

      // Calculate change for subtotal
      if (subtotal.monthly_previous > 0) {
        subtotal.changes = (subtotal.monthly_current - subtotal.monthly_previous) / subtotal.monthly_previous
      } else if (subtotal.monthly_current > 0) {
        subtotal.changes = 1
      }

      result.push(subtotal)

      // Add to grand total
      grandTotal.gross_premium += subtotal.gross_premium
      elementaryMonths.forEach(month => {
        grandTotal.current_year_months[month] += subtotal.current_year_months[month]
      })
      elementaryPrevMonths.forEach(month => {
        grandTotal.previous_year_months[month] += subtotal.previous_year_months[month]
      })
    })

    // Calculate cumulative from monthly breakdown for grand total
    grandTotal.cumulative_current = 0
    elementaryMonths.forEach(month => {
      grandTotal.cumulative_current += grandTotal.current_year_months[month] || 0
    })
    
    grandTotal.cumulative_previous = 0
    elementaryPrevMonths.forEach(month => {
      grandTotal.cumulative_previous += grandTotal.previous_year_months[month] || 0
    })

    // Calculate monthly current and previous for grand total (last month values)
    const lastCurrentMonth = elementaryMonths[elementaryMonths.length - 1]
    const lastPrevMonth = elementaryPrevMonths[elementaryPrevMonths.length - 1]
    grandTotal.monthly_current = grandTotal.current_year_months[lastCurrentMonth] || 0
    grandTotal.monthly_previous = grandTotal.previous_year_months[lastPrevMonth] || 0

    // Calculate change for grand total
    if (grandTotal.monthly_previous > 0) {
      grandTotal.changes = (grandTotal.monthly_current - grandTotal.monthly_previous) / grandTotal.monthly_previous
    } else if (grandTotal.monthly_current > 0) {
      grandTotal.changes = 1
    }

    result.push(grandTotal)

    return result
  }

  // Get sorted and grouped elementary data
  const getGroupedElementaryData = () => {
    if (elementarySortBy === 'default') {
      return groupElementaryByDepartment()
    }
    return getSortedElementaryData()
  }

  // Edit mode handler functions
  const handleEditClick = () => {
    if (selectedCompanyId === 'all') {
      showToast(language === 'he' ? 'אנא בחר חברה ספציפית לפני עריכה' : 'Please select a specific company before editing', 'error')
      return
    }
    setIsEditMode(true)
    setEditedValues({})
    setSaveError(null)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedValues({})
    setSaveError(null)
  }

  const handleCellChange = (agentId, month, value) => {
    // Validate numeric input (allow negative numbers)
    if (value !== '' && !/^-?\d*\.?\d*$/.test(value)) {
      return // Reject non-numeric values
    }

    // Store the value as-is (string) to allow partial input like "-" or "5."
    setEditedValues(prev => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [month]: value
      }
    }))
  }

  const handleSaveClick = () => {
    if (Object.keys(editedValues).length === 0) {
      // No changes made
      setIsEditMode(false)
      return
    }
    setShowConfirmDialog(true)
  }

  const prepareUpdatePayload = () => {
    const updates = []

    Object.entries(editedValues).forEach(([agentId, monthValues]) => {
      // Find the original agent data
      const agent = elementaryData.find(a => a.agent_id === parseInt(agentId))
      
      Object.entries(monthValues).forEach(([month, value]) => {
        // Determine if this is current year or previous year
        const [yearStr] = month.split('-')
        const year = parseInt(yearStr)
        const isCurrent = year === currentYear
        
        // Get the original value for this cell
        const originalValue = isCurrent 
          ? (agent?.months_breakdown?.[month] || 0)
          : (agent?.prev_months_breakdown?.[month] || 0)
        
        // Handle empty/cleared values
        if (value === '' || value === '-' || value === '.' || value === '-.') {
          // If original value was populated (not 0), treat cleared field as 0
          if (originalValue && originalValue !== 0) {
            updates.push({
              agent_id: parseInt(agentId),
              company_id: selectedCompanyId !== 'all' ? parseInt(selectedCompanyId) : null,
              month: isCurrent ? month : `${currentYear}-${month.split('-')[1]}`,
              field: isCurrent ? 'gross_premium' : 'previous_year_gross_premium',
              value: 0
            })
          }
          // If original was 0 or empty, skip it (don't send update)
          return
        }

        // Parse the value to a number
        const numericValue = parseFloat(value)
        if (isNaN(numericValue)) {
          return
        }

        updates.push({
          agent_id: parseInt(agentId),
          company_id: selectedCompanyId !== 'all' ? parseInt(selectedCompanyId) : null,
          month: isCurrent ? month : `${currentYear}-${month.split('-')[1]}`,
          field: isCurrent ? 'gross_premium' : 'previous_year_gross_premium',
          value: numericValue
        })
      })
    })

    return updates
  }

  const updateLocalData = (updates) => {
    setElementaryData(prevData => {
      return prevData.map(agent => {
        const agentUpdates = updates.filter(u => u.agent_id === agent.agent_id)
        if (agentUpdates.length === 0) return agent

        const updatedAgent = { ...agent }

        agentUpdates.forEach(update => {
          if (update.field === 'gross_premium') {
            updatedAgent.months_breakdown = {
              ...updatedAgent.months_breakdown,
              [update.month]: update.value
            }
          } else {
            const [, monthNum] = update.month.split('-')
            const prevYearMonth = `${previousYear}-${monthNum}`
            updatedAgent.prev_months_breakdown = {
              ...updatedAgent.prev_months_breakdown,
              [prevYearMonth]: update.value
            }
          }
        })

        // Recalculate cumulative and monthly values
        updatedAgent.cumulative_current = Object.values(updatedAgent.months_breakdown || {}).reduce((sum, val) => sum + (val || 0), 0)
        updatedAgent.cumulative_previous = Object.values(updatedAgent.prev_months_breakdown || {}).reduce((sum, val) => sum + (val || 0), 0)

        const lastMonth = elementaryMonths[elementaryMonths.length - 1]
        updatedAgent.monthly_current = updatedAgent.months_breakdown?.[lastMonth] || 0
        updatedAgent.monthly_previous = updatedAgent.prev_months_breakdown?.[elementaryPrevMonths[elementaryPrevMonths.length - 1]] || 0

        // Recalculate changes
        if (updatedAgent.monthly_previous > 0) {
          updatedAgent.changes = (updatedAgent.monthly_current - updatedAgent.monthly_previous) / updatedAgent.monthly_previous
        } else {
          updatedAgent.changes = updatedAgent.monthly_current > 0 ? 1 : null
        }

        return updatedAgent
      })
    })
  }

  const refetchElementaryData = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
      params.append('start_month', elementaryStartMonth)
      params.append('end_month', elementaryEndMonth)
      if (selectedElementaryDepartment !== 'all') params.append('department', selectedElementaryDepartment)

      const url = `${API_ENDPOINTS.aggregate}/elementary/agents?${params.toString()}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setElementaryData(result.data || [])
        setElementaryMonths(result.months || [])
        setElementaryPrevMonths(result.previousYearMonths || [])
      }
    } catch (err) {
      console.error('Error refetching data:', err)
    }
  }

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false)
    setIsSaving(true)
    setSaveError(null)

    try {
      // Prepare update payload
      const updates = prepareUpdatePayload()

      // Make API call
      const response = await fetch(`${API_ENDPOINTS.aggregate}/elementary/agents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to update data')
      }

      // Optimistic update: Update local state
      updateLocalData(updates)

      // Refresh data from server
      await refetchElementaryData()

      // Show success notification
      showToast(language === 'he' ? 'השינויים נשמרו בהצלחה!' : 'Changes saved successfully!', 'success')

      // Exit edit mode
      setIsEditMode(false)
      setEditedValues({})

    } catch (error) {
      console.error('Error saving changes:', error)
      setSaveError(error.message || (language === 'he' ? 'שגיאה בשמירת השינויים. אנא נסה שוב.' : 'Failed to save changes. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  const getCellValue = (agentId, month, originalValue) => {
    if (isEditMode && editedValues[agentId]?.[month] !== undefined) {
      return editedValues[agentId][month]
    }
    return originalValue !== undefined ? originalValue : ''
  }

  // Life Insurance Edit Mode Handlers
  const handleLifeEditClick = () => {
    setIsLifeEditMode(true)
    setLifeEditedValues({})
    setLifeSaveError(null)
  }

  const handleLifeCancelEdit = () => {
    setIsLifeEditMode(false)
    setLifeEditedValues({})
    setLifeSaveError(null)
  }

  const handleLifeCellChange = (agentId, month, product, value) => {
    setLifeEditedValues(prev => {
      const updated = { ...prev }
      if (!updated[agentId]) {
        updated[agentId] = {}
      }
      if (!updated[agentId][month]) {
        updated[agentId][month] = {}
      }
      updated[agentId][month][product] = value
      return updated
    })
  }

  const handleLifeSaveClick = () => {
    // Check if there are any edits
    const hasEdits = Object.keys(lifeEditedValues).some(agentId =>
      Object.keys(lifeEditedValues[agentId]).some(month =>
        Object.keys(lifeEditedValues[agentId][month]).length > 0
      )
    )
    
    if (!hasEdits) {
      // No changes made
      setIsLifeEditMode(false)
      return
    }
    setShowLifeConfirmDialog(true)
  }

  const prepareLifeUpdatePayload = () => {
    const updates = []

    Object.entries(lifeEditedValues).forEach(([agentId, monthValues]) => {
      // Find the original agent data
      const agent = currentYearData.find(a => a.agent_id === parseInt(agentId) && !a.isSubtotal && !a.isGrandTotal)
      
      Object.entries(monthValues).forEach(([month, productValues]) => {
        Object.entries(productValues).forEach(([product, value]) => {
          // Determine if this is current year or previous year
          const [yearStr] = month.split('-')
          const year = parseInt(yearStr)
          const isCurrent = year === lifeInsuranceCurrentYear
          
          // Get the original value for this cell
          const originalValue = isCurrent 
            ? (agent?.current_year_months?.[month]?.[product] || 0)
            : (agent?.previous_year_months?.[month]?.[product] || 0)
          
          // Handle empty/cleared values
          if (value === '' || value === '-' || value === '.' || value === '-.') {
            // If original value was populated (not 0), treat cleared field as 0
            if (originalValue && originalValue !== 0) {
              updates.push({
                agent_id: parseInt(agentId),
                company_id: selectedCompanyId !== 'all' ? parseInt(selectedCompanyId) : null,
                month: month,
                product: product,
                value: 0
              })
            }
            // If original was 0 or empty, skip it (don't send update)
            return
          }

          // Parse the value to a number
          const numericValue = parseFloat(value)
          if (isNaN(numericValue)) {
            return
          }

          updates.push({
            agent_id: parseInt(agentId),
            company_id: selectedCompanyId !== 'all' ? parseInt(selectedCompanyId) : null,
            month: month,
            product: product,
            value: numericValue
          })
        })
      })
    })

    return updates
  }

  const updateLifeLocalData = (updates) => {
    setCurrentYearData(prevData => {
      return prevData.map(row => {
        // Skip subtotals and grand totals - they will be recalculated
        if (row.isSubtotal || row.isGrandTotal) return row

        const agentUpdates = updates.filter(u => u.agent_id === row.agent_id)
        if (agentUpdates.length === 0) return row

        const updatedRow = { ...row }

        agentUpdates.forEach(update => {
          // Ensure the month structure exists
          if (!updatedRow.current_year_months) {
            updatedRow.current_year_months = {}
          }
          if (!updatedRow.previous_year_months) {
            updatedRow.previous_year_months = {}
          }

          // Determine which year this month belongs to
          const [yearStr] = update.month.split('-')
          const year = parseInt(yearStr)
          
          if (year === lifeInsuranceCurrentYear) {
            if (!updatedRow.current_year_months[update.month]) {
              updatedRow.current_year_months[update.month] = { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
            }
            updatedRow.current_year_months[update.month][update.product] = update.value
          } else if (year === lifeInsurancePreviousYear) {
            if (!updatedRow.previous_year_months[update.month]) {
              updatedRow.previous_year_months[update.month] = { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
            }
            updatedRow.previous_year_months[update.month][update.product] = update.value
          }
        })

        return updatedRow
      })
    })
  }

  const refetchLifeInsuranceData = async () => {
    try {
      setLoadingData(true)
      const params = new URLSearchParams()
      if (selectedCompanyId !== 'all') params.append('company_id', selectedCompanyId)
      params.append('start_month', lifeInsuranceStartMonth)
      params.append('end_month', lifeInsuranceEndMonth)
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment)
      if (selectedInspector !== 'all') params.append('inspector', selectedInspector)
      if (selectedAgent !== 'all') params.append('agent_name', selectedAgent)

      const url = `${API_ENDPOINTS.aggregate}/agents?${params.toString()}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.success) {
        setProcessingGroupedData(true)
        const grouped = groupByCategory(result.data || [], selectedProduct, result.months, result.previousYearMonths)
        setCurrentYearData(grouped)
        setTotalPolicies(result.totalPolicies || 0)
        setLifeInsuranceMonths(result.months || [])
        setLifeInsurancePrevMonths(result.previousYearMonths || [])
        setLifeInsuranceCurrentYear(result.currentYear)
        setLifeInsurancePreviousYear(result.previousYear)
        setProcessingGroupedData(false)
      }
    } catch (err) {
      console.error('Error refetching life insurance data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  const handleLifeConfirmSave = async () => {
    setShowLifeConfirmDialog(false)
    setIsLifeSaving(true)
    setLifeSaveError(null)

    try {
      // Prepare update payload
      const updates = prepareLifeUpdatePayload()

      // Make API call
      const response = await fetch(`${API_ENDPOINTS.aggregate}/life-insurance/agents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to update data')
      }

      // Optimistic update: Update local state
      updateLifeLocalData(updates)

      // Refresh data from server
      await refetchLifeInsuranceData()

      // Show success notification
      showToast(language === 'he' ? 'השינויים נשמרו בהצלחה!' : 'Changes saved successfully!', 'success')

      // Exit edit mode
      setIsLifeEditMode(false)
      setLifeEditedValues({})

    } catch (error) {
      console.error('Error saving changes:', error)
      setLifeSaveError(error.message || (language === 'he' ? 'שגיאה בשמירת השינויים. אנא נסה שוב.' : 'Failed to save changes. Please try again.'))
    } finally {
      setIsLifeSaving(false)
    }
  }

  const getLifeCellValue = (agentId, month, product, originalValue) => {
    if (isLifeEditMode && lifeEditedValues[agentId]?.[month]?.[product] !== undefined) {
      return lifeEditedValues[agentId][month][product]
    }
    return originalValue !== undefined ? originalValue : ''
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

  const getElementaryCompanyChartData = () => {
    return elementaryCompanyData
      .map(company => ({
        name: language === 'he' ? company.company_name : company.company_name_en,
        value: company.total
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
  }

  // Generic tooltip component that calculates percentage from the pie chart data
  const GenericPieTooltip = ({ active, payload, data }) => {
    if (active && payload && payload.length) {
      const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0

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
    {data.length === 0 ? (
      <div className="flex items-center justify-center h-[450px]">
        <div className="text-center">
          <div className="mb-4">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto" />
          </div>
          <p className="text-lg font-semibold text-gray-600 mb-2">
            {language === 'he' ? 'אין נתונים זמינים' : 'No Data Available'}
          </p>
          <p className="text-sm text-gray-500">
            {language === 'he' 
              ? 'לא נמצאו נתונים עבור הפילטרים שנבחרו' 
              : 'No data found for the selected filters'}
          </p>
        </div>
      </div>
    ) : (
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
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={(props) => <GenericPieTooltip {...props} data={data} />} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
)

  // Sort life insurance data based on selected filter
  const getSortedLifeInsuranceData = () => {
    // If default sorting, keep the original structure with category groups intact
    if (lifeInsuranceSortBy === 'default') {
      return currentYearData
    }

    // For other sorting, remove subtotals and sort the entire table as a flat list
    // Filter out subtotals and grand total
    const agentsOnly = currentYearData.filter(row => !row.isSubtotal && !row.isGrandTotal)
    
    // Sort all agents based on the selected sort
    let sortedAgents = [...agentsOnly]
    
    switch (lifeInsuranceSortBy) {
      case 'pension_desc':
        sortedAgents.sort((a, b) => (b.פנסיוני || 0) - (a.פנסיוני || 0))
        break
      case 'pension_asc':
        sortedAgents.sort((a, b) => (a.פנסיוני || 0) - (b.פנסיוני || 0))
        break
      case 'risk_desc':
        sortedAgents.sort((a, b) => (b.סיכונים || 0) - (a.סיכונים || 0))
        break
      case 'risk_asc':
        sortedAgents.sort((a, b) => (a.סיכונים || 0) - (b.סיכונים || 0))
        break
      case 'financial_desc':
        sortedAgents.sort((a, b) => (b.פיננסים || 0) - (a.פיננסים || 0))
        break
      case 'financial_asc':
        sortedAgents.sort((a, b) => (a.פיננסים || 0) - (b.פיננסים || 0))
        break
      case 'transfer_desc':
        sortedAgents.sort((a, b) => (b['ניודי פנסיה'] || 0) - (a['ניודי פנסיה'] || 0))
        break
      case 'transfer_asc':
        sortedAgents.sort((a, b) => (a['ניודי פנסיה'] || 0) - (b['ניודי פנסיה'] || 0))
        break
      case 'name_asc':
        sortedAgents.sort((a, b) => (a.agent_name || '').localeCompare(b.agent_name || ''))
        break
      case 'name_desc':
        sortedAgents.sort((a, b) => (b.agent_name || '').localeCompare(a.agent_name || ''))
        break
    }

    // Add grand total at the end
    const grandTotal = currentYearData.find(row => row.isGrandTotal)
    if (grandTotal) {
      sortedAgents.push(grandTotal)
    }

    return sortedAgents
  }

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
                value={lifeInsuranceStartMonth}
                onChange={(e) => handleLifeInsuranceStartMonthChange(e.target.value)}
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
                value={lifeInsuranceEndMonth}
                min={lifeInsuranceStartMonth}
                onChange={(e) => handleLifeInsuranceEndMonthChange(e.target.value)}
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
                {allAgents.map((agent) => (
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
                {loadingData || processingGroupedData ? (
                  <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                ) : (
                  formatNumber(calculatedDirectTotal)
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">{t('totalAmount')}</p>
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


        {selectedCompanyId === 'all' && (
          <div className="grid grid-cols-1 gap-6 mb-8">
            {loadingLifeInsuranceCompanyData ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-primary" />
                  {language === 'he' ? 'סה"כ הכנסה לפי חברות' : 'Total Income by Companies'}
                </h3>
                <div className="flex items-center justify-center h-[450px]">
                  <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                </div>
              </div>
            ) : (
              <PieChartComponent
                data={getCompanyChartData()}
                title={language === 'he' ? 'סה"כ הכנסה לפי חברות' : 'Total Income by Companies'}
                colors={COLORS.agents}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8">
          {selectedAgent === 'all' && (
            <>
              {loadingData || processingGroupedData ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {t('totalIncomeByAgents')}
                  </h3>
                  <div className="flex items-center justify-center h-[450px]">
                    <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                  </div>
                </div>
              ) : (
                <PieChartComponent
                  data={getAgentChartData()}
                  title={t('totalIncomeByAgents')}
                  colors={COLORS.agents}
                />
              )}
              {selectedDepartment === 'all' && (
                <>
                  {loadingData || processingGroupedData ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-primary" />
                        {t('totalIncomeByDepartments')}
                      </h3>
                      <div className="flex items-center justify-center h-[450px]">
                        <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                      </div>
                    </div>
                  ) : (
                    <PieChartComponent
                      data={getDepartmentChartData()}
                      title={t('totalIncomeByDepartments')}
                      colors={COLORS.departments}
                    />
                  )}
                </>
              )}
            </>
          )}
          {selectedProduct === 'all' && (
            <>
              {loadingData || processingGroupedData ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {t('totalIncomeByProducts')}
                  </h3>
                  <div className="flex items-center justify-center h-[450px]">
                    <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                  </div>
                </div>
              ) : (
                <PieChartComponent
                  data={getProductChartData()}
                  title={t('totalIncomeByProducts')}
                  colors={COLORS.products}
                />
              )}
            </>
          )}
        </div>


        {/* Table */}
<div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200 overflow-visible relative">
    <div className="flex items-center justify-between">
      <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <Users className="w-6 h-6 text-brand-primary" />
        {t('agentPerformance')}
      </h3>

      {/* Sort Filter and Edit Buttons */}
      <div className="flex items-center gap-3 relative z-10">
        {!isLifeEditMode ? (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">
                <ArrowUpDown className="w-4 h-4 inline mr-1" />
                {language === 'he' ? 'מיין לפי:' : 'Sort By:'}
              </label>
              <select
                value={lifeInsuranceSortBy}
                onChange={(e) => setLifeInsuranceSortBy(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium text-sm"
              >
                <option value="default">{language === 'he' ? 'ברירת מחדל' : 'Default'}</option>
                <option value="pension_desc">{language === 'he' ? 'פנסיוני (גבוה לנמוך)' : 'Pension (High to Low)'}</option>
                <option value="pension_asc">{language === 'he' ? 'פנסיוני (נמוך לגבוה)' : 'Pension (Low to High)'}</option>
                <option value="risk_desc">{language === 'he' ? 'סיכונים (גבוה לנמוך)' : 'Risk (High to Low)'}</option>
                <option value="risk_asc">{language === 'he' ? 'סיכונים (נמוך לגבוה)' : 'Risk (Low to High)'}</option>
                <option value="financial_desc">{language === 'he' ? 'פיננסים (גבוה לנמוך)' : 'Financial (High to Low)'}</option>
                <option value="financial_asc">{language === 'he' ? 'פיננסים (נמוך לגבוה)' : 'Financial (Low to High)'}</option>
                <option value="transfer_desc">{language === 'he' ? 'ניודי פנסיה (גבוה לנמוך)' : 'Pension Transfer (High to Low)'}</option>
                <option value="transfer_asc">{language === 'he' ? 'ניודי פנסיה (נמוך לגבוה)' : 'Pension Transfer (Low to High)'}</option>
                <option value="name_asc">{language === 'he' ? 'שם סוכן (א-ת)' : 'Agent Name (A-Z)'}</option>
                <option value="name_desc">{language === 'he' ? 'שם סוכן (ת-א)' : 'Agent Name (Z-A)'}</option>
              </select>
            </div>

            {/* Edit Button */}
            <div className="relative">
              <button
                onClick={handleLifeEditClick}
                disabled={selectedCompanyId === 'all'}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedCompanyId === 'all'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-primary text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {language === 'he' ? t('editData') : t('editData')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Error Message */}
            {lifeSaveError && (
              <span className="text-sm text-red-600 font-semibold">
                {lifeSaveError}
              </span>
            )}

            {/* Cancel Button */}
            <button
              onClick={handleLifeCancelEdit}
              disabled={isLifeSaving}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </button>

            {/* Save Button */}
            <button
              onClick={handleLifeSaveClick}
              disabled={isLifeSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLifeSaving && <Loader className="w-4 h-4 animate-spin" />}
              {language === 'he' ? 'שמור' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  </div>

  <div
    className="overflow-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
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
    <table className="w-full">
      <thead>
        <tr>
          <th className="px-6 py-4 text-start text-sm font-bold text-gray-700 bg-gray-50 sticky right-0 z-10 border-b border-gray-300" rowSpan={3}>
            {language === 'he' ? 'שם סוכן' : 'Agent Name'}
          </th>
          <th className="px-6 py-4 text-end text-sm font-bold text-gray-700 bg-gray-50 border-b border-gray-300" rowSpan={3}>
            {language === 'he' ? 'מפקח' : 'Inspector'}
          </th>
          <th className="px-6 py-4 text-end text-sm font-bold text-gray-700 bg-gray-50 border-b border-gray-300" rowSpan={3}>
            {language === 'he' ? 'מחלקה' : 'Department'}
          </th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-white bg-blue-600 border-b border-gray-300" colSpan={getVisibleProducts().length * 2}>
            {language === 'he' ? 'מצטבר' : 'Cumulative'}
          </th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-white bg-amber-600 border-b border-gray-300" colSpan={getVisibleProducts().length * 2}>
            {language === 'he' ? 'חודשי' : 'Monthly'}
          </th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-800 bg-indigo-100 border-b border-gray-300" colSpan={lifeInsuranceMonths.length * getVisibleProducts().length}>
            {lifeInsuranceCurrentYear}
          </th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-800 bg-gray-200 border-b border-gray-300" colSpan={lifeInsurancePrevMonths.length * getVisibleProducts().length}>
            {lifeInsurancePreviousYear}
          </th>
        </tr>
        <tr>
          {/* Cumulative year headers */}
          <th className="px-4 py-3 text-center text-xs font-semibold text-blue-700 bg-blue-50 border-b border-gray-300" colSpan={getVisibleProducts().length}>
            {lifeInsuranceCurrentYear}
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 border-b border-gray-300" colSpan={getVisibleProducts().length}>
            {lifeInsurancePreviousYear}
          </th>
          {/* Monthly year headers */}
          <th className="px-4 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b border-gray-300" colSpan={getVisibleProducts().length}>
            {lifeInsuranceCurrentYear}
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b border-gray-300" colSpan={getVisibleProducts().length}>
            {lifeInsurancePreviousYear}
          </th>
          {lifeInsuranceMonths.map((month) => (
            <th key={`current-${month}`} className="px-4 py-3 text-center text-xs font-semibold text-gray-700 bg-indigo-50 border-b border-gray-300" colSpan={getVisibleProducts().length}>
              {formatMonthName(month)}
            </th>
          ))}
          {lifeInsurancePrevMonths.map((month) => (
            <th key={`prev-${month}`} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300" colSpan={getVisibleProducts().length}>
              {formatMonthName(month)}
            </th>
          ))}
        </tr>
        <tr>
          {/* Cumulative Current Year Products */}
          {getVisibleProducts().map(product => (
            <th key={`cum-curr-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-blue-700 bg-blue-50 border-b border-gray-300">
              {product.label}
            </th>
          ))}
          {/* Cumulative Previous Year Products */}
          {getVisibleProducts().map(product => (
            <th key={`cum-prev-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 border-b border-gray-300">
              {product.label}
            </th>
          ))}
          {/* Monthly Current Year Products */}
          {getVisibleProducts().map(product => (
            <th key={`mon-curr-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b border-gray-300">
              {product.label}
            </th>
          ))}
          {/* Monthly Previous Year Products */}
          {getVisibleProducts().map(product => (
            <th key={`mon-prev-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b border-gray-300">
              {product.label}
            </th>
          ))}
          {lifeInsuranceMonths.map((month) => (
            <React.Fragment key={`current-products-${month}`}>
              {getVisibleProducts().map(product => (
                <th key={`${month}-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 bg-indigo-50 border-b border-gray-300">
                  {product.label}
                </th>
              ))}
            </React.Fragment>
          ))}
          {lifeInsurancePrevMonths.map((month) => (
            <React.Fragment key={`prev-products-${month}`}>
              {getVisibleProducts().map(product => (
                <th key={`${month}-${product.key}`} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300">
                  {product.label}
                </th>
              ))}
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {(loadingData || processingGroupedData) ? (
          <tr>
            <td colSpan={3 + (getVisibleProducts().length * 4) + (lifeInsuranceMonths.length * getVisibleProducts().length) + (lifeInsurancePrevMonths.length * getVisibleProducts().length)} className="px-6 py-12">
              <div className="flex items-center justify-center text-gray-500">
                <div className="flex items-center gap-3">
                  <Loader className="w-6 h-6 text-brand-primary animate-spin" />
                  <span>{processingGroupedData ? (language === 'he' ? 'מעבד נתונים...' : 'Processing data...') : t('loading')}</span>
                </div>
              </div>
            </td>
          </tr>
        ) : currentYearData.length === 0 ? (
          <tr>
            <td colSpan={3 + (getVisibleProducts().length * 4) + (lifeInsuranceMonths.length * getVisibleProducts().length) + (lifeInsurancePrevMonths.length * getVisibleProducts().length)} className="px-6 py-12">
              <div className="flex items-center justify-center text-gray-500">
                <span>{language === 'he' ? 'אין נתונים זמינים עבור הפילטרים שנבחרו' : 'No data available for selected filters'}</span>
              </div>
            </td>
          </tr>
        ) : (
          getSortedLifeInsuranceData().map((row, index) => (
            <tr
              key={index}
              className={`
                ${row.isGrandTotal
                  ? 'bg-indigo-50 font-bold border-t-2 border-indigo-200 border-b-2 border-indigo-300'
                  : row.isSubtotal
                  ? 'bg-blue-50 font-semibold border-t-2 border-blue-400 border-b-2 border-blue-400 shadow-sm'
                  : 'hover:bg-gray-50'
                }
              `}
            >
              <td className={`px-6 py-4 text-start text-sm ${row.isSubtotal ? 'font-bold text-blue-900' : 'font-medium text-gray-900'} sticky right-0 bg-white ${row.isGrandTotal ? 'bg-indigo-50' : row.isSubtotal ? 'bg-blue-50' : 'group-hover:bg-gray-50'} z-10`}>
                {row.agent_name}
              </td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-blue-900 bg-blue-50' : row.isGrandTotal ? 'text-gray-700 bg-white' : 'text-gray-700'}`}>{row.isSubtotal ? '' : (row.inspector || '-')}</td>
              <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-blue-900 bg-blue-50' : row.isGrandTotal ? 'text-gray-700 bg-white' : 'text-gray-700'}`}>{row.isSubtotal ? '' : (row.department || '-')}</td>

              {/* Cumulative Current Year - Product Breakdown */}
              {getVisibleProducts().map((product, idx) => {
                const value = row[product.hebrewKey] || 0
                const isLast = idx === getVisibleProducts().length - 1
                return (
                  <td key={`cum-curr-${product.key}`} className={`px-4 py-4 text-end text-sm font-semibold text-blue-700 bg-blue-50 ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                    {formatNumber(value)}
                  </td>
                )
              })}

              {/* Cumulative Previous Year - Product Breakdown */}
              {(() => {
                // Calculate previous year totals from monthly breakdown
                const prevTotals = { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                lifeInsurancePrevMonths.forEach(month => {
                  const monthData = row.previous_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                  prevTotals.pension += monthData.pension || 0
                  prevTotals.risk += monthData.risk || 0
                  prevTotals.financial += monthData.financial || 0
                  prevTotals.pension_transfer += monthData.pension_transfer || 0
                })
                return getVisibleProducts().map((product, idx) => {
                  const isLast = idx === getVisibleProducts().length - 1
                  return (
                    <td key={`cum-prev-${product.key}`} className={`px-4 py-4 text-end text-sm text-blue-600 bg-blue-50 ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                      {formatNumber(prevTotals[product.key])}
                    </td>
                  )
                })
              })()}

              {/* Monthly Current Year - Product Breakdown (Last Month) */}
              {(() => {
                const lastMonth = lifeInsuranceMonths[lifeInsuranceMonths.length - 1]
                const lastMonthData = row.current_year_months?.[lastMonth] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                return getVisibleProducts().map((product, idx) => {
                  const isLast = idx === getVisibleProducts().length - 1
                  return (
                    <td key={`mon-curr-${product.key}`} className={`px-4 py-4 text-end text-sm font-semibold text-amber-800 bg-amber-50 ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                      {formatNumber(lastMonthData[product.key])}
                    </td>
                  )
                })
              })()}

              {/* Monthly Previous Year - Product Breakdown (Last Month) */}
              {(() => {
                const lastPrevMonth = lifeInsurancePrevMonths[lifeInsurancePrevMonths.length - 1]
                const lastPrevMonthData = row.previous_year_months?.[lastPrevMonth] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                return getVisibleProducts().map((product, idx) => {
                  const isLast = idx === getVisibleProducts().length - 1
                  return (
                    <td key={`mon-prev-${product.key}`} className={`px-4 py-4 text-end text-sm text-amber-700 bg-amber-50 ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                      {formatNumber(lastPrevMonthData[product.key])}
                    </td>
                  )
                })
              })()}

              {/* Current Year Months */}
              {lifeInsuranceMonths.map((month, monthIndex) => {
                const monthData = row.current_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                
                // For subtotal/grand total rows, show monthly breakdown (non-editable)
                if (row.isSubtotal || row.isGrandTotal) {
                  const bgColor = row.isGrandTotal ? 'bg-indigo-50' : 'bg-blue-50'
                  return (
                    <React.Fragment key={`${index}-current-${month}`}>
                      {getVisibleProducts().map((product, idx) => {
                        const isLast = idx === getVisibleProducts().length - 1
                        return (
                          <td key={`${month}-${product.key}`} className={`px-4 py-4 text-end text-sm font-semibold text-gray-800 ${bgColor} ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                            {formatNumber(monthData[product.key])}
                          </td>
                        )
                      })}
                    </React.Fragment>
                  )
                } else {
                  // For regular agent rows, show monthly breakdown with color coding and edit capability
                  const productColors = {
                    pension: 'text-blue-700',
                    risk: 'text-green-700',
                    financial: 'text-purple-700',
                    pension_transfer: 'text-orange-700'
                  }
                  return (
                    <React.Fragment key={`${index}-current-${month}`}>
                      {getVisibleProducts().map((product, idx) => {
                        const isLast = idx === getVisibleProducts().length - 1
                        return (
                          <td key={`${month}-${product.key}`} className={`px-4 py-4 text-end text-sm ${productColors[product.key]} ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr" style={{ minWidth: isLifeEditMode ? '120px' : 'auto' }}>
                            {isLifeEditMode ? (
                              <input
                                type="text"
                                value={getLifeCellValue(row.agent_id, month, product.key, monthData[product.key])}
                                onChange={(e) => handleLifeCellChange(row.agent_id, month, product.key, e.target.value)}
                                className="w-full min-w-[100px] px-3 py-2 border-2 border-blue-300 rounded focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-gray-900 font-medium text-sm bg-white"
                                dir="ltr"
                              />
                            ) : (
                              formatNumber(monthData[product.key])
                            )}
                          </td>
                        )
                      })}
                    </React.Fragment>
                  )
                }
              })}

              {/* Previous Year Months */}
              {lifeInsurancePrevMonths.map((month) => {
                const monthData = row.previous_year_months?.[month] || { pension: 0, risk: 0, financial: 0, pension_transfer: 0 }
                
                // Apply background color for subtotal/grand total rows (non-editable)
                if (row.isSubtotal || row.isGrandTotal) {
                  const bgColor = row.isGrandTotal ? 'bg-indigo-50' : 'bg-blue-50'
                  return (
                    <React.Fragment key={`${index}-prev-${month}`}>
                      {getVisibleProducts().map((product, idx) => {
                        const isLast = idx === getVisibleProducts().length - 1
                        return (
                          <td key={`${month}-${product.key}`} className={`px-4 py-4 text-end text-sm font-semibold text-gray-700 ${bgColor} ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr">
                            {formatNumber(monthData[product.key])}
                          </td>
                        )
                      })}
                    </React.Fragment>
                  )
                }
                
                // Regular agent rows with color coding and edit capability
                const productColors = {
                  pension: 'text-blue-600',
                  risk: 'text-green-600',
                  financial: 'text-purple-600',
                  pension_transfer: 'text-orange-600'
                }
                return (
                  <React.Fragment key={`${index}-prev-${month}`}>
                    {getVisibleProducts().map((product, idx) => {
                      const isLast = idx === getVisibleProducts().length - 1
                      return (
                        <td key={`${month}-${product.key}`} className={`px-4 py-4 text-end text-sm ${productColors[product.key]} bg-gray-50 ${isLast ? 'border-l-2 border-l-gray-300' : ''}`} dir="ltr" style={{ minWidth: isLifeEditMode ? '120px' : 'auto' }}>
                          {isLifeEditMode ? (
                            <input
                              type="text"
                              value={getLifeCellValue(row.agent_id, month, product.key, monthData[product.key])}
                              onChange={(e) => handleLifeCellChange(row.agent_id, month, product.key, e.target.value)}
                              className="w-full min-w-[100px] px-3 py-2 border-2 border-gray-300 rounded focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-gray-900 font-medium text-sm bg-white"
                              dir="ltr"
                            />
                          ) : (
                            formatNumber(monthData[product.key])
                          )}
                        </td>
                      )
                    })}
                  </React.Fragment>
                )
              })}
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
                    value={elementaryStartMonth}
                    onChange={(e) => handleElementaryStartMonthChange(e.target.value)}
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
                    value={elementaryEndMonth}
                    min={elementaryStartMonth}
                    onChange={(e) => handleElementaryEndMonthChange(e.target.value)}
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

                {/* Agent Filter */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    {t('agent')}
                  </label>
                  <select
                    value={selectedElementaryAgent}
                    onChange={(e) => setSelectedElementaryAgent(e.target.value)}
                    className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                  >
                    <option value="all">{t('allAgents')}</option>
                    {allElementaryAgents.map((agent) => (
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
                    {loadingElementaryData ? (
                      <Loader className="w-8 h-8 text-brand-primary animate-spin inline" />
                    ) : (() => {
                      const total = elementaryData.reduce((sum, item) => sum + (item.gross_premium || 0), 0)
                      return formatNumber(total)
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t('totalAmount')}</p>
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

            {/* Elementary Company Pie Chart */}
            {selectedCompanyId === 'all' && (
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {language === 'he' ? 'סה"כ הכנסה לפי חברות' : 'Total Income by Companies'}
                  </h3>
                  {loadingElementaryCompanyData ? (
                    <div className="flex items-center justify-center h-[450px]">
                      <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                    </div>
                  ) : getElementaryCompanyChartData().length === 0 ? (
                    <div className="flex items-center justify-center h-[450px]">
                      <div className="text-center">
                        <div className="mb-4">
                          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto" />
                        </div>
                        <p className="text-lg font-semibold text-gray-600 mb-2">
                          {language === 'he' ? 'אין נתונים זמינים' : 'No Data Available'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {language === 'he'
                            ? 'לא נמצאו נתונים עבור הפילטרים שנבחרו'
                            : 'No data found for the selected filters'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={450}>
                      <PieChart>
                        <Pie
                          data={getElementaryCompanyChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={180}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {getElementaryCompanyChartData().map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.agents[index % COLORS.agents.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={(props) => <GenericPieTooltip {...props} data={getElementaryCompanyChartData()} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Elementary Pie Charts */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Only show agent chart when no specific agent is selected */}
              {selectedElementaryAgent === 'all' && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-primary" />
                    {language === 'he' ? 'סה"כ הכנסה לפי סוכנים' : 'Total Income by Agents'}
                  </h3>
                  {loadingElementaryData ? (
                    <div className="flex items-center justify-center h-[450px]">
                      <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                    </div>
                  ) : getElementaryAgentChartData().length === 0 ? (
                    <div className="flex items-center justify-center h-[450px]">
                      <div className="text-center">
                        <div className="mb-4">
                          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto" />
                        </div>
                        <p className="text-lg font-semibold text-gray-600 mb-2">
                          {language === 'he' ? 'אין נתונים זמינים' : 'No Data Available'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {language === 'he'
                            ? 'לא נמצאו נתונים עבור הפילטרים שנבחרו'
                            : 'No data found for the selected filters'}
                        </p>
                      </div>
                    </div>
                  ) : (
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
                        <Tooltip content={(props) => <GenericPieTooltip {...props} data={getElementaryAgentChartData()} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

                {/* Only show department chart when no specific department is selected */}
                {selectedElementaryDepartment === 'all' && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-brand-primary" />
                      {language === 'he' ? 'סה"כ הכנסה לפי מחלקות' : 'Total Income by Departments'}
                    </h3>
                    {loadingElementaryData ? (
                      <div className="flex items-center justify-center h-[450px]">
                        <Loader className="w-12 h-12 text-brand-primary animate-spin" />
                      </div>
                    ) : getElementaryDepartmentChartData().length === 0 ? (
                      <div className="flex items-center justify-center h-[450px]">
                        <div className="text-center">
                          <div className="mb-4">
                            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto" />
                          </div>
                          <p className="text-lg font-semibold text-gray-600 mb-2">
                            {language === 'he' ? 'אין נתונים זמינים' : 'No Data Available'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {language === 'he'
                              ? 'לא נמצאו נתונים עבור הפילטרים שנבחרו'
                              : 'No data found for the selected filters'}
                          </p>
                        </div>
                      </div>
                    ) : (
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
                          <Tooltip content={(props) => <GenericPieTooltip {...props} data={getElementaryDepartmentChartData()} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </div>

            {/* Elementary Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 bg-blue-50 border-b-2 border-gray-200 overflow-visible relative">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="w-6 h-6 text-brand-primary" />
                    {language === 'he' ? 'ביצועי סוכנים - אלמנטרי' : 'Agent Performance - Elementary'}
                  </h3>

                  {/* Edit Mode Controls */}
                  <div className="flex items-center gap-3 relative z-10">
                    {!isEditMode ? (
                      <>
                        {/* Sort Filter */}
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            <ArrowUpDown className="w-4 h-4 inline mr-1" />
                            {language === 'he' ? 'מיין לפי:' : 'Sort By:'}
                          </label>
                          <select
                            value={elementarySortBy}
                            onChange={(e) => setElementarySortBy(e.target.value)}
                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium text-sm"
                          >
                            <option value="default">{language === 'he' ? 'ברירת מחדל' : 'Default'}</option>
                            <option value="gross_premium_desc">{language === 'he' ? 'ברוטו חודשי (גבוה לנמוך)' : 'Monthly Gross (High to Low)'}</option>
                            <option value="gross_premium_asc">{language === 'he' ? 'ברוטו חודשי (נמוך לגבוה)' : 'Monthly Gross (Low to High)'}</option>
                            <option value="change_desc">{language === 'he' ? 'אחוז שינוי (גבוה לנמוך)' : 'Change Percentage (High to Low)'}</option>
                            <option value="change_asc">{language === 'he' ? 'אחוז שינוי (נמוך לגבוה)' : 'Change Percentage (Low to High)'}</option>
                            <option value="name_asc">{language === 'he' ? 'שם סוכן (א-ת)' : 'Agent Name (A-Z)'}</option>
                            <option value="name_desc">{language === 'he' ? 'שם סוכן (ת-א)' : 'Agent Name (Z-A)'}</option>
                          </select>
                        </div>

                        {/* Edit Button */}
                        <div className="relative">
                          <button
                            onClick={handleEditClick}
                            disabled={selectedCompanyId === 'all'}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                              selectedCompanyId === 'all'
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-brand-primary text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            {language === 'he' ? t('editData') : t('editData')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Save Error Message */}
                        {saveError && (
                          <span className="text-sm text-red-600 font-semibold">
                            {saveError}
                          </span>
                        )}

                        {/* Cancel Button */}
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {language === 'he' ? 'ביטול' : 'Cancel'}
                        </button>

                        {/* Save Button */}
                        <button
                          onClick={handleSaveClick}
                          disabled={isSaving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                          {language === 'he' ? 'שמור' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="overflow-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
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
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-start text-sm font-bold text-gray-800 bg-gray-100 sticky right-0 z-10 border-b border-gray-300" rowSpan={2}>
                        {language === 'he' ? 'שם סוכן' : 'Agent Name'}
                      </th>
                      <th className="px-6 py-4 text-end text-sm font-bold text-gray-800 bg-gray-100 border-b border-gray-300" rowSpan={2}>
                        {language === 'he' ? 'מחלקה' : 'Department'}
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-bold text-white bg-blue-600 border-b border-gray-300" colSpan={2}>
                        {language === 'he' ? 'מצטבר' : 'Cumulative'}
                      </th>
                      <th className="px-5 py-3 text-center text-sm font-bold text-white bg-amber-600 border-b border-gray-300" colSpan={3}>
                        {language === 'he' ? 'חודשי' : 'Monthly'}
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-800 bg-indigo-100 border-b border-gray-300" colSpan={elementaryMonths.length}>
                        {currentYear}
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-800 bg-gray-200 border-b border-gray-300" colSpan={elementaryPrevMonths.length}>
                        {previousYear}
                      </th>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-700 bg-blue-50 border-b-2 border-gray-300">
                        {currentYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 bg-blue-50 border-b-2 border-gray-300">
                        {previousYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b-2 border-gray-300">
                        {currentYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b-2 border-gray-300">
                        {previousYear}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-amber-700 bg-amber-50 border-b-2 border-gray-300">
                        {language === 'he' ? 'שינוי %' : '% Change'}
                      </th>
                      {elementaryMonths.map((month) => (
                        <th key={month} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 bg-indigo-50 border-b-2 border-gray-300">
                          {formatMonthName(month)}
                        </th>
                      ))}
                      {elementaryPrevMonths.map((month) => (
                        <th key={month} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-b-2 border-gray-300">
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
                      getGroupedElementaryData().map((row, index) => (
                        <tr 
                          key={index} 
                          className={`
                            ${row.isGrandTotal
                              ? 'bg-indigo-50 font-bold border-t-2 border-indigo-200 border-b-2 border-indigo-300'
                              : row.isSubtotal
                              ? 'bg-blue-50 font-semibold border-t-2 border-blue-400 border-b-2 border-blue-400 shadow-sm'
                              : 'hover:bg-gray-50/50'
                            }
                            transition-colors group
                          `}
                        >
                          <td className={`px-6 py-4 text-start text-sm ${row.isSubtotal ? 'font-bold text-blue-900' : 'font-medium text-gray-900'} sticky right-0 bg-white ${row.isGrandTotal ? 'bg-indigo-50' : row.isSubtotal ? 'bg-blue-50' : 'group-hover:bg-gray-50/50'} z-10`}>
                            {row.agent_name}
                          </td>
                          <td className={`px-6 py-4 text-end text-sm ${row.isSubtotal ? 'font-bold text-blue-900 bg-blue-50' : row.isGrandTotal ? 'text-gray-700 bg-white' : 'text-gray-700'}`}>
                            {row.isSubtotal ? '' : (row.department || '-')}
                          </td>
                          <td className="px-6 py-4 text-end text-sm font-semibold text-blue-700 bg-blue-50" dir="ltr">
                            {formatNumber(row.cumulative_current || row.gross_premium)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm text-blue-600 bg-blue-50" dir="ltr">
                            {formatNumber(row.cumulative_previous)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm font-semibold text-amber-800 bg-amber-50" dir="ltr">
                            {formatNumber(row.monthly_current)}
                          </td>
                          <td className="px-6 py-4 text-end text-sm text-amber-700 bg-amber-50" dir="ltr">
                            {formatNumber(row.monthly_previous)}
                          </td>
                          <td className={`px-6 py-4 text-sm ${getChangeColorClasses(row.changes).bg} group-hover:${getChangeColorClasses(row.changes).bg}`} dir="ltr">
                            <div className={`text-center font-semibold ${getChangeColorClasses(row.changes).text}`}>
                              {formatPercentageChange(row.changes)}
                            </div>
                          </td>
                          {elementaryMonths.map((month) => (
                            <td key={month} className="px-4 py-4 text-end text-sm text-gray-700" dir="ltr" style={{ minWidth: isEditMode ? '120px' : 'auto' }}>
                              {isEditMode && !row.isSubtotal && !row.isGrandTotal ? (
                                <input
                                  type="text"
                                  value={getCellValue(row.agent_id, month, row.months_breakdown?.[month] || row.current_year_months?.[month])}
                                  onChange={(e) => handleCellChange(row.agent_id, month, e.target.value)}
                                  className="w-full min-w-[100px] px-3 py-2 border-2 border-blue-300 rounded focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-gray-900 font-medium text-sm bg-white"
                                  dir="ltr"
                                />
                              ) : (
                                formatNumber(row.months_breakdown?.[month] || row.current_year_months?.[month])
                              )}
                            </td>
                          ))}
                          {elementaryPrevMonths.map((month) => (
                            <td key={month} className="px-4 py-4 text-end text-sm text-gray-600 bg-gray-50" dir="ltr" style={{ minWidth: isEditMode ? '120px' : 'auto' }}>
                              {isEditMode && !row.isSubtotal && !row.isGrandTotal ? (
                                <input
                                  type="text"
                                  value={getCellValue(row.agent_id, month, row.prev_months_breakdown?.[month] || row.previous_year_months?.[month])}
                                  onChange={(e) => handleCellChange(row.agent_id, month, e.target.value)}
                                  className="w-full min-w-[100px] px-3 py-2 border-2 border-gray-300 rounded focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none text-gray-900 font-medium text-sm bg-white"
                                  dir="ltr"
                                />
                              ) : (
                                formatNumber(row.prev_months_breakdown?.[month] || row.previous_year_months?.[month])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirmation Dialog Modal */}
            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                  <div className="flex flex-col items-center">
                    {/* Warning Icon */}
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {language === 'he' ? 'אישור שמירה' : 'Confirm Save'}
                    </h3>

                    {/* Message */}
                    <p className="text-gray-600 text-center mb-6">
                      {language === 'he'
                        ? `האם אתה בטוח שברצונך לשמור ${Object.keys(editedValues).reduce((count, agentId) => count + Object.keys(editedValues[agentId]).length, 0)} שינויים?`
                        : `Are you sure you want to save ${Object.keys(editedValues).reduce((count, agentId) => count + Object.keys(editedValues[agentId]).length, 0)} changes?`
                      }
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setShowConfirmDialog(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        {language === 'he' ? 'ביטול' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleConfirmSave}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                      >
                        {language === 'he' ? 'אישור' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Life Insurance Confirmation Dialog */}
      {showLifeConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {language === 'he' ? 'אישור שמירה' : 'Confirm Save'}
              </h3>

              {/* Message */}
              <p className="text-gray-600 text-center mb-6">
                {language === 'he'
                  ? `האם אתה בטוח שברצונך לשמור ${Object.keys(lifeEditedValues).reduce((count, agentId) => count + Object.keys(lifeEditedValues[agentId]).reduce((monthCount, month) => monthCount + Object.keys(lifeEditedValues[agentId][month]).length, 0), 0)} שינויים?`
                  : `Are you sure you want to save ${Object.keys(lifeEditedValues).reduce((count, agentId) => count + Object.keys(lifeEditedValues[agentId]).reduce((monthCount, month) => monthCount + Object.keys(lifeEditedValues[agentId][month]).length, 0), 0)} changes?`
                }
              </p>

              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLifeConfirmDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  {language === 'he' ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  onClick={handleLifeConfirmSave}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
                >
                  {language === 'he' ? 'אישור' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-20 right-4 z-[60] transform transition-all duration-300 ease-in-out ${
            toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          <div className={`
            min-w-[320px] max-w-md rounded-xl shadow-2xl p-4 flex items-center gap-3
            ${toast.type === 'success' ? 'bg-green-50 border-2 border-green-500' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border-2 border-red-500' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-2 border-blue-500' : ''}
          `}>
            {/* Icon */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${toast.type === 'success' ? 'bg-green-500' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'info' ? 'bg-blue-500' : ''}
            `}>
              {toast.type === 'success' && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Message */}
            <p className={`
              flex-1 font-semibold text-sm
              ${toast.type === 'success' ? 'text-green-800' : ''}
              ${toast.type === 'error' ? 'text-red-800' : ''}
              ${toast.type === 'info' ? 'text-blue-800' : ''}
            `}>
              {toast.message}
            </p>

            {/* Close Button */}
            <button
              onClick={() => setToast({ ...toast, show: false })}
              className={`
                flex-shrink-0 p-1 rounded-lg transition-colors
                ${toast.type === 'success' ? 'hover:bg-green-200 text-green-700' : ''}
                ${toast.type === 'error' ? 'hover:bg-red-200 text-red-700' : ''}
                ${toast.type === 'info' ? 'hover:bg-blue-200 text-blue-700' : ''}
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Insights