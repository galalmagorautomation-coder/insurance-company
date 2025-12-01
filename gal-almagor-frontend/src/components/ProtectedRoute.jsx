import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'
import { useEffect } from 'react'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Clear any stale session data if not authenticated after loading
  useEffect(() => {
    if (!loading && !user) {
      // Clear potentially corrupted session data
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }
  }, [loading, user])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-xl mb-4 animate-pulse">
            <Shield className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Render the protected content if authenticated
  return children
}

export default ProtectedRoute

