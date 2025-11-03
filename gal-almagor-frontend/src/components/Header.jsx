import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Home, Upload, BarChart3, LogOut, Globe, Users } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t } = useLanguage()

  const handleLogout = () => {
    navigate('/')
  }

  // Helper function to check if a route is active
  const isActive = (path) => location.pathname === path

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="ml-3 text-xl font-bold text-gray-900">{t('insuranceDashboard')}</h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                isActive('/dashboard')
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-700 hover:text-brand-primary hover:bg-gray-100'
              }`}
            >
              <Home className="w-5 h-5 mr-2" />
              {t('dashboard')}
            </button>

            <button
              onClick={() => navigate('/upload')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                isActive('/upload')
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-700 hover:text-brand-primary hover:bg-gray-100'
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              {t('upload')}
            </button>

            <button
              onClick={() => navigate('/insights')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                isActive('/insights')
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-700 hover:text-brand-primary hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              {t('insights')}
            </button>

            <button
              onClick={() => navigate('/agents')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                isActive('/agents')
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-700 hover:text-brand-primary hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              {t('agentsHeader')}
            </button>

            {/* Language Picker */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
              <Globe className="w-5 h-5 text-gray-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all cursor-pointer"
              >
                <option value="en">English</option>
                <option value="he">Hebrew</option>
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all ml-2 pl-2 border-l border-gray-300"
            >
              <LogOut className="w-5 h-5 mr-2" />
              {t('logout')}
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header

