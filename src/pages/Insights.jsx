import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, Activity, Calendar, Building2, Target, Award, AlertTriangle, CheckCircle, XCircle, ArrowUp, ArrowDown, Minus, Download } from 'lucide-react'
import Header from '../components/Header'

function Insights() {
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // List of companies
  const companies = [
    'Company 1',
    'Company 2',
    'Company 3',
    'Company 4',
    'Company 5',
    'Company 6',
    'Company 7',
    'Company 8',
    'Company 9',
    'Company 10',
    'Company 11',
    'Company 12'
  ]

  // Generate random data based on filters (simulating dynamic data)
  const generateRandomData = () => {
    const seed = selectedCompany.length + selectedMonth.length
    return Math.floor(Math.random() * 1000) + seed
  }

  // Sample data that changes with filters
  const performanceMetrics = {
    totalOutput: `$${(generateRandomData() * 3.5).toFixed(1)}K`,
    monthlyOutput: `$${(generateRandomData() * 0.8).toFixed(1)}K`,
    ytd: `$${(generateRandomData() * 12).toFixed(1)}K`,
    growthRate: `${(Math.random() * 30 + 5).toFixed(1)}%`,
    targetAchievement: `${(Math.random() * 50 + 70).toFixed(1)}%`,
    policiesCount: generateRandomData() + 450
  }

  const comparisons = {
    vsLastYear: { value: `${(Math.random() * 30 + 5).toFixed(1)}%`, trend: 'up' },
    vsLastMonth: { value: `${(Math.random() * 20 - 5).toFixed(1)}%`, trend: Math.random() > 0.3 ? 'up' : 'down' },
    vsTarget: { value: `${(Math.random() * 15 + 5).toFixed(1)}%`, trend: 'up' },
    vsIndustry: { value: `${(Math.random() * 10 + 2).toFixed(1)}%`, trend: 'up' }
  }

  const topPerformers = [
    { name: 'Sarah Johnson', value: '$' + (Math.random() * 50 + 80).toFixed(1) + 'K', change: '+18%' },
    { name: 'Michael Chen', value: '$' + (Math.random() * 50 + 70).toFixed(1) + 'K', change: '+15%' },
    { name: 'Emily Rodriguez', value: '$' + (Math.random() * 50 + 60).toFixed(1) + 'K', change: '+12%' },
  ]

  const bottomPerformers = [
    { name: 'John Davis', value: '$' + (Math.random() * 20 + 10).toFixed(1) + 'K', change: '-5%' },
    { name: 'Lisa Martinez', value: '$' + (Math.random() * 20 + 15).toFixed(1) + 'K', change: '-3%' },
    { name: 'Robert Wilson', value: '$' + (Math.random() * 20 + 12).toFixed(1) + 'K', change: '-2%' },
  ]

  const mostImproved = [
    { name: 'Amanda Lee', improvement: '+45%', from: '$25K', to: '$36K' },
    { name: 'James Taylor', improvement: '+38%', from: '$30K', to: '$41K' },
    { name: 'Maria Garcia', improvement: '+32%', from: '$28K', to: '$37K' },
  ]

  const monthlyTrend = [
    { month: 'Jan', value: 65 + Math.random() * 10 },
    { month: 'Feb', value: 70 + Math.random() * 10 },
    { month: 'Mar', value: 75 + Math.random() * 10 },
    { month: 'Apr', value: 68 + Math.random() * 10 },
    { month: 'May', value: 82 + Math.random() * 10 },
    { month: 'Jun', value: 88 + Math.random() * 10 },
  ]

  const byInsuranceType = [
    { type: 'Auto Insurance', count: Math.floor(Math.random() * 500 + 800), percentage: 42 },
    { type: 'Health Insurance', count: Math.floor(Math.random() * 400 + 600), percentage: 29 },
    { type: 'Life Insurance', count: Math.floor(Math.random() * 300 + 400), percentage: 18 },
    { type: 'Property Insurance', count: Math.floor(Math.random() * 200 + 250), percentage: 11 },
  ]

  const statusIndicators = {
    onTrack: Math.floor(Math.random() * 30 + 45),
    offTrack: Math.floor(Math.random() * 15 + 8),
    aboveTarget: Math.floor(Math.random() * 35 + 40),
    belowTarget: Math.floor(Math.random() * 20 + 15),
    positiveGrowth: Math.floor(Math.random() * 40 + 50),
    negativeGrowth: Math.floor(Math.random() * 15 + 5),
    activeAgents: Math.floor(Math.random() * 50 + 120),
    inactiveAgents: Math.floor(Math.random() * 10 + 5)
  }

  const financial = {
    totalPremium: `$${(Math.random() * 5 + 8).toFixed(1)}M`,
    totalCommission: `$${(Math.random() * 500 + 800).toFixed(0)}K`,
    avgPolicyValue: `$${(Math.random() * 2 + 2.5).toFixed(1)}K`,
    revenuePerAgent: `$${(Math.random() * 20 + 35).toFixed(1)}K`
  }

  const alerts = [
    { type: 'warning', message: '5 agents underperforming this month', icon: AlertTriangle, color: 'orange' },
    { type: 'danger', message: '3 departments missing targets', icon: XCircle, color: 'red' },
    { type: 'success', message: '12 agents with outstanding performance', icon: CheckCircle, color: 'green' },
    { type: 'info', message: 'Data upload completed for all companies', icon: FileText, color: 'blue' },
  ]

  const handleExportCSV = () => {
    // Export functionality placeholder
    console.log('Export to CSV clicked')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h2>
            <p className="text-gray-600">Comprehensive performance metrics and analytics dashboard</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Export to CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Filter */}
            <div>
              <label htmlFor="company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Filter by Company
              </label>
              <select
                id="company-filter"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="">All Companies</option>
                {companies.map((company, index) => (
                  <option key={index} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label htmlFor="month-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Filter by Month
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
          {(selectedCompany || selectedMonth) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm">
              <span className="text-gray-600 font-semibold">Active Filters:</span>
              {selectedCompany && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {selectedCompany}
                </span>
              )}
              {selectedMonth && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Total Output</span>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.totalOutput}</p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                +12% from last period
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Monthly Output</span>
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.monthlyOutput}</p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                +8% from last month
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Year-to-Date (YTD)</span>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.ytd}</p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                +15% YoY
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Growth Rate</span>
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.growthRate}</p>
              <p className="text-xs text-gray-500 mt-2">Month-over-Month</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Target Achievement</span>
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.targetAchievement}</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: performanceMetrics.targetAchievement }}></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">Policies Count</span>
                <FileText className="w-5 h-5 text-teal-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{performanceMetrics.policiesCount}</p>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                +24 new policies
              </p>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Comparisons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm font-semibold opacity-90 mb-2">vs Last Year</p>
              <p className="text-3xl font-bold mb-2">{comparisons.vsLastYear.value}</p>
              <div className="flex items-center text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>Year-over-Year</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm font-semibold opacity-90 mb-2">vs Last Month</p>
              <p className="text-3xl font-bold mb-2">{comparisons.vsLastMonth.value}</p>
              <div className="flex items-center text-sm">
                {comparisons.vsLastMonth.trend === 'up' ? (
                  <><ArrowUp className="w-4 h-4 mr-1" /><span>Month-over-Month</span></>
                ) : (
                  <><ArrowDown className="w-4 h-4 mr-1" /><span>Month-over-Month</span></>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm font-semibold opacity-90 mb-2">vs Target</p>
              <p className="text-3xl font-bold mb-2">{comparisons.vsTarget.value}</p>
              <div className="flex items-center text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>Above Target</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm font-semibold opacity-90 mb-2">vs Industry Average</p>
              <p className="text-3xl font-bold mb-2">{comparisons.vsIndustry.value}</p>
              <div className="flex items-center text-sm">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>Above Average</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Rankings & Performance</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Performers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-500" />
                <h4 className="text-lg font-bold text-gray-900">Top Performers</h4>
              </div>
              <div className="space-y-3">
                {topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{performer.name}</p>
                        <p className="text-xs text-gray-600">{performer.value}</p>
                      </div>
                    </div>
                    <span className="text-green-600 font-bold text-sm">{performer.change}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Performers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <h4 className="text-lg font-bold text-gray-900">Bottom Performers</h4>
              </div>
              <div className="space-y-3">
                {bottomPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{performer.name}</p>
                        <p className="text-xs text-gray-600">{performer.value}</p>
                      </div>
                    </div>
                    <span className="text-red-600 font-bold text-sm">{performer.change}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Improved */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h4 className="text-lg font-bold text-gray-900">Most Improved</h4>
              </div>
              <div className="space-y-3">
                {mostImproved.map((performer, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm">{performer.name}</p>
                      <span className="text-blue-600 font-bold text-sm">{performer.improvement}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{performer.from}</span>
                      <ArrowUp className="w-3 h-3 text-blue-500" />
                      <span className="font-semibold text-blue-600">{performer.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trends & Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Monthly Trend</h4>
            <div className="space-y-3">
              {monthlyTrend.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.month}</span>
                    <span className="font-semibold text-gray-900">{item.value.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Insurance Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Breakdown by Insurance Type</h4>
            <div className="space-y-4">
              {byInsuranceType.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.type}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Status Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{statusIndicators.onTrack}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">On Track</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-6 h-6 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{statusIndicators.offTrack}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Off Track</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <ArrowUp className="w-6 h-6 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">{statusIndicators.aboveTarget}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Above Target</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <ArrowDown className="w-6 h-6 text-orange-500" />
                <span className="text-2xl font-bold text-orange-600">{statusIndicators.belowTarget}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Below Target</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                <span className="text-2xl font-bold text-emerald-600">{statusIndicators.positiveGrowth}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Positive Growth</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-rose-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 text-rose-500" />
                <span className="text-2xl font-bold text-rose-600">{statusIndicators.negativeGrowth}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Negative Growth</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-teal-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-6 h-6 text-teal-500" />
                <span className="text-2xl font-bold text-teal-600">{statusIndicators.activeAgents}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Active Agents</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300 p-5">
              <div className="flex items-center justify-between mb-2">
                <Minus className="w-6 h-6 text-gray-500" />
                <span className="text-2xl font-bold text-gray-600">{statusIndicators.inactiveAgents}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700">Inactive Agents</p>
            </div>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Financial Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <DollarSign className="w-8 h-8 mb-3 opacity-90" />
              <p className="text-sm font-semibold opacity-90 mb-1">Total Premium</p>
              <p className="text-3xl font-bold">{financial.totalPremium}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
              <DollarSign className="w-8 h-8 mb-3 opacity-90" />
              <p className="text-sm font-semibold opacity-90 mb-1">Total Commission</p>
              <p className="text-3xl font-bold">{financial.totalCommission}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <FileText className="w-8 h-8 mb-3 opacity-90" />
              <p className="text-sm font-semibold opacity-90 mb-1">Avg Policy Value</p>
              <p className="text-3xl font-bold">{financial.avgPolicyValue}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <Users className="w-8 h-8 mb-3 opacity-90" />
              <p className="text-sm font-semibold opacity-90 mb-1">Revenue per Agent</p>
              <p className="text-3xl font-bold">{financial.revenuePerAgent}</p>
            </div>
          </div>
        </div>

        {/* Alerts & Highlights */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Alerts & Highlights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert, index) => {
              const Icon = alert.icon
              const colorClasses = {
                orange: 'bg-orange-50 border-orange-200 text-orange-800',
                red: 'bg-red-50 border-red-200 text-red-800',
                green: 'bg-green-50 border-green-200 text-green-800',
                blue: 'bg-blue-50 border-blue-200 text-blue-800'
              }
              const iconColors = {
                orange: 'text-orange-500',
                red: 'text-red-500',
                green: 'text-green-500',
                blue: 'text-blue-500'
              }
              
              return (
                <div key={index} className={`${colorClasses[alert.color]} border-2 rounded-xl p-4 flex items-center gap-4`}>
                  <Icon className={`w-6 h-6 ${iconColors[alert.color]} shrink-0`} />
                  <p className="font-semibold text-sm">{alert.message}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Time Periods Summary */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">This Month</p>
              <p className="text-2xl font-bold">${(Math.random() * 200 + 500).toFixed(0)}K</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">This Quarter</p>
              <p className="text-2xl font-bold">${(Math.random() * 500 + 1500).toFixed(0)}K</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">This Year</p>
              <p className="text-2xl font-bold">${(Math.random() * 2 + 6).toFixed(1)}M</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">YoY Growth</p>
              <p className="text-2xl font-bold">+{(Math.random() * 20 + 15).toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm opacity-90 mb-2">MoM Growth</p>
              <p className="text-2xl font-bold">+{(Math.random() * 10 + 5).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Insights
