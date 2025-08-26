// Temporary debug file to check API response structure
// This will be deleted after fixing the issue

// Test the MFA verification API to see exact response structure
async function debugMFAVerification() {
  const response = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@example.com',
      otpCode: '123456'
    }),
  })

  const result = await response.json()
  
  if (result) {
    // Check what the actual response structure is
    return {
      status: response.status,
      ok: response.ok,
      result: result,
      hasData: !!result.data,
      hasSuccess: !!result.success,
      keys: Object.keys(result)
    }
  }
  
  return null
}

// This helps identify the exact response structure
module.exports = { debugMFAVerification }