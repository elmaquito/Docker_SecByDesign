/**
 * API Configuration
 * 
 * Dynamically determines the API base URL based on environment variables
 * or falls back to detecting the current hostname to ensure cookies work
 * correctly regardless of whether the user accesses the app via 'localhost' or '127.0.0.1'.
 * 
 * Environment Variables:
 * - VITE_API_URL: Full API URL (e.g., 'http://localhost:3001')
 * - VITE_API_HOST: API hostname/IP (e.g., 'localhost' or '127.0.0.1')
 * - VITE_API_PORT: API port (default: '3001')
 * - VITE_API_PROTOCOL: API protocol (default: 'http:')
 */

// Determine the API base URL
const getApiBaseUrl = () => {
  // Priority 1: Use full API URL if provided
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Priority 2: Build URL from individual components if API host is provided
  if (import.meta.env.VITE_API_HOST) {
    const protocol = import.meta.env.VITE_API_PROTOCOL || 'http:'
    const host = import.meta.env.VITE_API_HOST
    const port = import.meta.env.VITE_API_PORT || '3001'
    return `${protocol}//${host}:${port}`
  }
  
  // Priority 3: Auto-detect from current window location (development fallback)
  // This ensures cookies work by matching the hostname user is accessing from
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  const apiPort = import.meta.env.VITE_API_PORT || '3001'
  
  return `${protocol}//${hostname}:${apiPort}`
}

export const API_BASE_URL = getApiBaseUrl()
export const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`

console.log(`[API Config] Using API base URL: ${API_BASE_URL}`)
