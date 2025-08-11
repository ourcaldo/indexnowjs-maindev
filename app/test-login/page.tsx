'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestLogin() {
  const [email, setEmail] = useState('aldodkris@gmail.com') // Known super admin from server-auth.ts
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Test authentication with Supabase
      const response = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Login successful! Redirecting to keyword tracker...')
        setTimeout(() => {
          router.push('/dashboard/keyword-tracker/overview')
        }, 1000)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const testSessionStatus = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const result = await response.json()
      alert(`Session Status: ${JSON.stringify(result, null, 2)}`)
    } catch (err) {
      alert('Error checking session')
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8" style={{ border: '1px solid #E0E6ED' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Test Login</h1>
          <p className="text-[#6C757D] mt-2">Test authentication for keyword tracker</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              style={{ borderColor: '#E0E6ED' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              style={{ borderColor: '#E0E6ED' }}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-md text-sm" style={{ backgroundColor: '#FFF5F5', color: '#E63946', border: '1px solid #FED7D7' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md text-sm" style={{ backgroundColor: '#F0FDF4', color: '#4BB543', border: '1px solid #BBF7D0' }}>
              {success}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-md text-white font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1C2331' }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={testSessionStatus}
              className="w-full px-4 py-2 rounded-md font-medium transition-colors"
              style={{ backgroundColor: '#F7F9FC', color: '#1A1A1A', border: '1px solid #E0E6ED' }}
            >
              Check Session Status
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: '#E0E6ED' }}>
          <p className="text-xs text-[#6C757D] text-center">
            This is a test page to establish authentication for the keyword tracker functionality.
            <br />
            Default email is set to the known super admin from the system.
          </p>
        </div>
      </div>
    </div>
  )
}