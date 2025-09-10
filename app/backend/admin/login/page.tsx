'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for admin login
  useFavicon() // Automatically updates favicon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Authentication failed')
      }

      // Step 2: Verify admin role using direct API call with Bearer token
      const response = await fetch('/api/v1/admin/verify-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          userId: authData.user.id
        })
      })

      const roleData = await response.json()

      if (!response.ok || !roleData.success) {
        // Sign out if not admin
        await supabase.auth.signOut()
        throw new Error(roleData.error || 'Access denied: Admin privileges required')
      }

      // Step 3: Verify user is admin or super_admin
      if (!roleData.isAdmin && !roleData.isSuperAdmin) {
        await supabase.auth.signOut()
        throw new Error('Access denied: Admin privileges required')
      }

      // Step 4: Set admin session and redirect
      await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        })
      })

      // Success - redirect to admin dashboard with a small delay to ensure session is set
      setTimeout(() => {
        window.location.href = '/backend/admin'
      }, 100)
      
    } catch (error: any) {
      console.error('Admin login error:', error)
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Admin Logo"
                className="w-12 h-12 object-contain filter brightness-0 invert"
              />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-[#1A1A1A]">
              Admin Access
            </CardTitle>
            <CardDescription className="text-[#6C757D]">
              Sign in with admin credentials to access the dashboard
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-[#E63946]/10 border border-[#E63946] rounded-md">
                <AlertCircle className="h-4 w-4 text-[#E63946]" />
                <p className="text-sm text-[#E63946]">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1A1A1A] font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="border-[#E0E6ED] focus:border-[#3D8BFF] focus:ring-[#3D8BFF]"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A1A1A] font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="border-[#E0E6ED] focus:border-[#3D8BFF] focus:ring-[#3D8BFF] pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6C757D] hover:text-[#1A1A1A]"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-medium py-2.5"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In to Admin Dashboard'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[#6C757D]">
              Only users with admin privileges can access this area
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}