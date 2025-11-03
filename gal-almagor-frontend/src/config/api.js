// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const API_ENDPOINTS = {
  agents: `${API_BASE_URL}/api/agents`,
  upload: `${API_BASE_URL}/api/upload`,
}

export default API_BASE_URL