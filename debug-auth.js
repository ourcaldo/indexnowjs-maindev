// Debug authentication flow
console.log('=== AUTHENTICATION DEBUG ===')

// Check local storage for Supabase session
const supabaseSession = localStorage.getItem('sb-localhost-auth-token')
console.log('Local Storage Session:', supabaseSession ? 'EXISTS' : 'NOT FOUND')

// Check cookies
console.log('Document Cookies:', document.cookie)

// Check if specific auth cookies exist
const hasAccessToken = document.cookie.includes('sb-access-token')
const hasRefreshToken = document.cookie.includes('sb-refresh-token')
console.log('Has access token cookie:', hasAccessToken)
console.log('Has refresh token cookie:', hasRefreshToken)

// Test API call with current authentication
fetch('/api/keyword-tracker/domains', {
  method: 'GET',
  credentials: 'include'
}).then(response => {
  console.log('API Response Status:', response.status)
  return response.json()
}).then(data => {
  console.log('API Response:', data)
}).catch(error => {
  console.error('API Error:', error)
})