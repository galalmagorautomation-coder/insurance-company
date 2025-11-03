import { useState, useEffect } from 'react'
import { Calendar, Building2, Users, Loader } from 'lucide-react'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'
import { API_ENDPOINTS } from '../config/api'

function Insights() {
  const { t, language } = useLanguage()
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [currentYearData, setCurrentYearData] = useState([])
  const [previousYearData, setPreviousYearData] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  // Calculate previous year month
  const getPreviousYearMonth = (currentMonth) => {
    const [year, month] = currentMonth.split('-')
    const prevYear = parseInt(year) - 1
    return `${prevYear}-${month}`
  }

  const previousYearMonth = getPreviousYearMonth(selectedMonth)

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

  // Fetch aggregated data when filters change
  useEffect(() => {
    if (!selectedCompanyId || !selectedMonth) return

    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Fetch current year data
        const currentUrl = `${API_ENDPOINTS.aggregate}/agents?company_id=${selectedCompanyId}&month=${selectedMonth}`
        const currentResponse = await fetch(currentUrl)
        const currentResult = await currentResponse.json()

        // Fetch previous year data
        const prevUrl = `${API_ENDPOINTS.aggregate}/agents?company_id=${selectedCompanyId}&month=${previousYearMonth}`
        const prevResponse = await fetch(prevUrl)
        const prevResult = await prevResponse.json()

        if (currentResult.success) {
          setCurrentYearData(groupByCategory(currentResult.data))
        }
        if (prevResult.success) {
          setPreviousYearData(groupByCategory(prevResult.data))
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [selectedCompanyId, selectedMonth, previousYearMonth])

  // Group agents by category with subtotals
  const groupByCategory = (data) => {
    const categories = {
      'סה"כ ישיר': [],
      'סה"כ חברות בנות': [],
      'סוכנים ערן': [],
      'סוכנים איתי': [],
      'סה"כ פרימיום': []
    }

    // Group agents by category
    data.forEach(agent => {
      if (agent.category && categories[agent.category]) {
        categories[agent.category].push(agent)
      }
    })

    // Build result with agents and subtotals
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

      // Add agents
      agents.forEach(agent => result.push(agent))

      // Calculate subtotal
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

      // Add to grand total
      grandTotal.פנסיוני += subtotal.פנסיוני
      grandTotal.סיכונים += subtotal.סיכונים
      grandTotal.פיננסים += subtotal.פיננסים
      grandTotal['ניודי פנסיה'] += subtotal['ניודי פנסיה']
    })

    // Add grand total
    result.push(grandTotal)

    return result
  }

  // Format numbers with commas
  const formatNumber = (num) => {
    if (!num) return '-'
    return Math.round(num).toLocaleString('en-US')
  }

  const selectedCompany = companies.find(c => c.id === parseInt(selectedCompanyId))

  const renderTable = (data, title) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-brand-primary" />
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">{t('agentName')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">{t('inspector')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">{t('department')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-blue-700">{t('pension')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-green-700">{t('risk')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-purple-700">{t('financial')}</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-orange-700">{t('pensionTransfer')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
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
                data.map((row, index) => (
                  <tr 
                    key={index} 
                    className={`
                      ${row.isGrandTotal 
                        ? 'bg-gradient-to-r from-indigo-100 to-purple-100 font-bold border-t-2 border-indigo-300' 
                        : row.isSubtotal 
                        ? 'bg-gradient-to-r from-gray-50 to-blue-50 font-semibold border-t border-gray-300' 
                        : 'hover:bg-blue-50'
                      } transition-colors
                    `}
                  >
                    <td className={`px-6 py-4 text-right text-sm ${row.isSubtotal ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                      {row.agent_name}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">{row.inspector || '-'}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">{row.department || '-'}</td>
                    <td className={`px-6 py-4 text-right text-sm ${row.isSubtotal ? 'font-bold text-blue-900' : 'text-blue-700'}`}>
                      {formatNumber(row.פנסיוני)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm ${row.isSubtotal ? 'font-bold text-green-900' : 'text-green-700'}`}>
                      {formatNumber(row.סיכונים)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm ${row.isSubtotal ? 'font-bold text-purple-900' : 'text-purple-700'}`}>
                      {formatNumber(row.פיננסים)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm ${row.isSubtotal ? 'font-bold text-orange-900' : 'text-orange-700'}`}>
                      {formatNumber(row['ניודי פנסיה'])}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('analyticsInsights')}</h2>
          <p className="text-gray-600">{t('comprehensiveMetrics')}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Filter */}
            <div>
              <label htmlFor="company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('selectCompany')}
              </label>
              <select
                id="company-filter"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
                disabled={loadingCompanies}
              >
                <option value="">
                  {loadingCompanies ? 'Loading companies...' : t('chooseCompany')}
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {language === 'he' ? company.name : company.name_en}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label htmlFor="month-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                {t('selectMonth')}
              </label>
              <input
                type="month"
                id="month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              />
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedCompanyId || selectedMonth) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm">
              <span className="text-gray-600 font-semibold">{t('activeFilters')}:</span>
              {selectedCompanyId && selectedCompany && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {language === 'he' ? selectedCompany.name : selectedCompany.name_en}
                </span>
              )}
              {selectedMonth && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {new Date(selectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tables */}
        {renderTable(
          currentYearData,
          selectedMonth 
            ? new Date(selectedMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })
            : 'Current Year'
        )}

        {renderTable(
          previousYearData,
          previousYearMonth 
            ? new Date(previousYearMonth + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' })
            : 'Previous Year'
        )}
      </main>
    </div>
  )
}

export default Insights