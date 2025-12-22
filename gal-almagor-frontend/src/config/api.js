import { supabase } from './supabase'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const API_ENDPOINTS = {
  agents: `${API_BASE_URL}/api/agents`,
  upload: `${API_BASE_URL}/api/upload`,
  companies: `${API_BASE_URL}/api/companies`,
  aggregate: `${API_BASE_URL}/api/aggregate`,
  targets: `${API_BASE_URL}/api/targets`,
  goals: `${API_BASE_URL}/api/goals`,
}

/**
 * Get authentication headers with JWT token for API requests
 * @returns {Promise<Object>} Headers object with Authorization token
 */
export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }
  }
  
  return {
    'Content-Type': 'application/json',
  }
}

/**
 * Make an authenticated API request
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  const headers = await getAuthHeaders()
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
}

export default API_BASE_URL