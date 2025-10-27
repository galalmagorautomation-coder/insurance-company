import { useNavigate, useLocation } from 'react-router-dom'
import { Shield, Home, Upload, BarChart3, LogOut } from 'lucide-react'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()

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
            <h1 className="ml-3 text-xl font-bold text-gray-900">Insurance Dashboard</h1>
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
              Dashboard
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
              Upload
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
              Insights
            </button>

            <div className="ml-2 pl-2 border-l border-gray-300">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header

