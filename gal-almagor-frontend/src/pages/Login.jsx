import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, Lock, ArrowRight, Globe, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { language, setLanguage, t } = useLanguage()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Accept any email and password for now
    navigate('/insights')
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Language Picker - Upper Right */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 rounded-lg px-4 py-2">
        <Globe className="w-5 h-5 text-gray-600" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all cursor-pointer"
        >
          <option value="en">English</option>
          <option value="he">Hebrew</option>
        </select>
      </div>
      {/* Left Side - Image with Diagonal Cut */}
      <div className="hidden lg:block lg:w-3/5 relative overflow-hidden">
        {/* Diagonal overlay */}
        <div 
          className="absolute inset-0 bg-brand-primary opacity-20 z-10"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'
          }}
        ></div>
        
        {/* Image with diagonal clip */}
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/login-page.jpg)',
            clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'
          }}
        >
          {/* Gradient Overlay */}
          <div className="w-full h-full bg-gradient-to-br from-brand-primary/60 to-primary-900/40 flex items-center justify-center p-12">
            <div className="text-white max-w-lg">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-3xl font-bold ml-4">{t('insuranceDashboard')}</h2>
              </div>
              <h3 className="text-4xl font-bold mb-4">{t('simplifyAnalytics')}</h3>
              <p className="text-xl text-white/90 leading-relaxed">
                {t('trackPerformance')}
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm text-white/80">{t('activeAgents')}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-sm text-white/80">{t('policies')}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">98%</div>
                  <div className="text-sm text-white/80">{t('satisfaction')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-primary rounded-xl mb-4">
              <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('insuranceDashboard')}</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('welcome')}</h2>
            <p className="text-gray-600">{t('signInAccess')}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none bg-white"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none bg-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  {t('rememberMe')}
                </label>
              </div>
              <a href="#" className="text-sm font-semibold text-brand-primary hover:text-primary-700 transition-colors">
                {t('forgotPassword')}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-brand-primary text-white py-3.5 rounded-xl font-semibold hover:bg-primary-600 transition-all flex items-center justify-center group shadow-lg hover:shadow-xl"
            >
              {t('signIn')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {t('needHelp')}{' '}
              <a href="#" className="font-semibold text-brand-primary hover:text-primary-700 transition-colors">
                {t('contactSupport')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login