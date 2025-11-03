import { useState } from 'react'
import { Users, FileText, TrendingUp, Upload, BarChart3, Clock, AlertTriangle, CheckCircle, Bell, Calendar, Building2, DollarSign, Eye, Download, UserCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useLanguage } from '../contexts/LanguageContext'

function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  
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

  // Generate timestamp
  const getTimeAgo = (hours) => {
    if (hours < 1) return `${Math.floor(hours * 60)} minutes ago`
    if (hours < 24) return `${Math.floor(hours)} hours ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  const recentActivities = [
    { type: 'upload', message: 'Company 7 report uploaded', time: 2, icon: Upload, color: 'blue' },
    { type: 'policy', message: 'Sarah Johnson added 3 new policies', time: 3.5, icon: FileText, color: 'green' },
    { type: 'update', message: `${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long' })} targets updated`, time: 5, icon: TrendingUp, color: 'purple' },
    { type: 'import', message: 'Company 2 data imported successfully', time: 8, icon: CheckCircle, color: 'emerald' },
    { type: 'policy', message: 'Michael Chen submitted 5 policies', time: 12, icon: FileText, color: 'green' },
    { type: 'download', message: 'Monthly report exported by Admin', time: 15, icon: Download, color: 'orange' },
  ]

  const notifications = [
    { type: 'warning', message: 'Company 5 - Data not uploaded for this month', severity: 'high', icon: AlertTriangle },
    { type: 'alert', message: '8 agents below target threshold', severity: 'medium', icon: Users },
    { type: 'pending', message: 'Commission calculations pending for July', severity: 'medium', icon: DollarSign },
    { type: 'missing', message: 'Company 9 - Missing monthly report', severity: 'high', icon: FileText },
  ]

  const todayStats = {
    policiesAdded: Math.floor(Math.random() * 20 + 15),
    totalPremium: `$${(Math.random() * 50 + 80).toFixed(1)}K`,
    agentsActive: Math.floor(Math.random() * 30 + 45),
    reportsGenerated: Math.floor(Math.random() * 8 + 5)
  }

  const quickStats = {
    monthlyOutput: `$${(Math.random() * 500 + 800).toFixed(0)}K`,
    policiesSold: Math.floor(Math.random() * 150 + 280),
    activeAgents: Math.floor(Math.random() * 40 + 120),
    uploadProgress: Math.floor(Math.random() * 20 + 75)
  }

  const pendingActions = [
    { action: 'Reports waiting for review', count: 3, color: 'blue' },
    { action: 'Data waiting to be uploaded', count: 2, color: 'orange' },
    { action: 'Missing monthly reports (August - Company 8)', count: 1, color: 'red' },
    { action: 'Agents to follow up with', count: 5, color: 'purple' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('dashboard')}</h2>
          <p className="text-gray-600">{t('realTimeActivity')}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Filter */}
            <div>
              <label htmlFor="company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                {t('filterByCompany')}
              </label>
              <select
                id="company-filter"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="block w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all outline-none text-gray-900 font-medium"
              >
                <option value="">{t('allCompanies')}</option>
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
                {t('filterByMonth')}
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
        </div>


        {/* Today's Summary */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('todaySummary')}</h3>
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <p className="text-3xl font-bold mb-1">{todayStats.policiesAdded}</p>
                <p className="text-sm opacity-90">{t('policiesAdded')}</p>
              </div>
              <div className="text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <p className="text-3xl font-bold mb-1">{todayStats.totalPremium}</p>
                <p className="text-sm opacity-90">{t('totalPremium')}</p>
              </div>
              <div className="text-center">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <p className="text-3xl font-bold mb-1">{todayStats.agentsActive}</p>
                <p className="text-sm opacity-90">{t('agentsActive')}</p>
              </div>
              <div className="text-center">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <p className="text-3xl font-bold mb-1">{todayStats.reportsGenerated}</p>
                <p className="text-sm opacity-90">{t('reportsGenerated')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid - Activities and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('recentActivities')}</h3>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon
                const colorClasses = {
                  blue: 'bg-blue-100 text-blue-600',
                  green: 'bg-green-100 text-green-600',
                  purple: 'bg-purple-100 text-purple-600',
                  emerald: 'bg-emerald-100 text-emerald-600',
                  orange: 'bg-orange-100 text-orange-600'
                }
                
                return (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-10 h-10 ${colorClasses[activity.color]} rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{getTimeAgo(activity.time)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notifications/Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('notificationsAlerts')}</h3>
              <Bell className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-3">
              {notifications.map((notification, index) => {
                const Icon = notification.icon
                const severityColors = {
                  high: 'bg-red-50 border-red-200 text-red-800',
                  medium: 'bg-orange-50 border-orange-200 text-orange-800'
                }
                const iconColors = {
                  high: 'text-red-500',
                  medium: 'text-orange-500'
                }
                
                return (
                  <div key={index} className={`${severityColors[notification.severity]} border-2 rounded-lg p-4 flex items-start gap-3`}>
                    <Icon className={`w-5 h-5 ${iconColors[notification.severity]} shrink-0 mt-0.5`} />
                    <p className="text-sm font-semibold flex-1">{notification.message}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('pendingActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pendingActions.map((pending, index) => {
              const colorClasses = {
                blue: 'border-blue-300 bg-blue-50',
                orange: 'border-orange-300 bg-orange-50',
                red: 'border-red-300 bg-red-50',
                purple: 'border-purple-300 bg-purple-50'
              }
              const badgeColors = {
                blue: 'bg-blue-500',
                orange: 'bg-orange-500',
                red: 'bg-red-500',
                purple: 'bg-purple-500'
              }
              
              return (
                <div key={index} className={`${colorClasses[pending.color]} border-2 rounded-xl p-5 relative`}>
                  <div className={`absolute top-3 right-3 ${badgeColors[pending.color]} text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold`}>
                    {pending.count}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 pr-8">{pending.action}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/upload')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white text-left hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('uploadCSVFiles')}</h3>
            <p className="text-blue-100">{t('uploadProcess')}</p>
          </button>

          <button
            onClick={() => navigate('/insights')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white text-left hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('viewInsights')}</h3>
            <p className="text-purple-100">{t('exploreAnalytics')}</p>
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard

