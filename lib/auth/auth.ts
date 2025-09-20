import { supabase } from '../database/supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | undefined
  name?: string
  emailVerification?: boolean
}

export class AuthService {
  private isInitialized = false
  private userCache: { user: AuthUser | null; timestamp: number } | null = null
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  private isUserCacheValid(): boolean {
    if (!this.userCache) return false
    return Date.now() - this.userCache.timestamp < this.CACHE_DURATION
  }

  private setCacheUser(user: AuthUser | null): void {
    this.userCache = {
      user,
      timestamp: Date.now()
    }
  }

  private clearUserCache(): void {
    this.userCache = null
  }

  private async initializeAuth() {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }
    
    try {
      // Try to restore session from cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      
      let accessToken = cookies['sb-access-token']
      let refreshToken = cookies['sb-refresh-token']
      
      // If no custom cookies, try to get from Supabase's localStorage token
      if (!accessToken) {
        const supabaseToken = localStorage.getItem('sb-base-auth-token')
        if (supabaseToken) {
          try {
            const authData = JSON.parse(supabaseToken)
            accessToken = authData?.access_token
            refreshToken = authData?.refresh_token

            
            // Set the cookies so server can access them
            document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
            document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
          } catch (e) {
            console.log('Failed to parse Supabase auth token from localStorage')
          }
        }
      }
      
      if (accessToken && refreshToken) {
        // Set the session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        if (error) {
          console.log('Failed to restore session from cookies:', error.message)
        }
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('Auth initialization error:', error)
      this.isInitialized = true
    }
  }

  async getCurrentUser(useCache: boolean = true): Promise<AuthUser | null> {
    try {
      // Use cached user if valid and caching is enabled
      if (useCache && this.isUserCacheValid() && this.userCache) {
        return this.userCache.user
      }

      await this.initializeAuth()
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      let authUser: AuthUser | null = null
      
      if (!error && user) {
        authUser = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name,
          emailVerification: user.email_confirmed_at ? true : false,
        }
      }
      
      // Update cache with the result
      this.setCacheUser(authUser)
      
      return authUser
    } catch (error) {
      console.error('Get current user error:', error)
      this.clearUserCache()
      return null
    }
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    // Transfer session to server-side cookies and set client cookies
    if (data.session) {
      // Set client-side cookies for server-side auth (without Secure flag for Replit)
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
      
      // Also transfer to server-side session
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }),
        credentials: 'include'
      })
      
      // Force cache refresh after successful login
      this.clearUserCache()
    }

    return data
  }

  async signUp(email: string, password: string, fullName: string, phoneNumber?: string, country?: string) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fullName,
        email,
        password,
        confirmPassword: password,
        phoneNumber: phoneNumber || '',
        country: country || ''
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed')
    }

    return result.data
  }

  async signOut() {
    // Clear user cache
    this.clearUserCache()
    
    // Clear client-side cookies
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-access-token=; path=/; max-age=0'
      document.cookie = 'sb-refresh-token=; path=/; max-age=0'
    }
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
    
    // Clear session from server
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/session`, {
        method: 'DELETE',
        credentials: 'include'
      })
    } catch (e) {
      // Ignore fetch errors during signout
    }
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      throw error
    }
  }

  async createMagicLink(email: string, redirectTo: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      throw error
    }
  }

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      // Clear cache on any auth state change
      this.clearUserCache()
      
      if (session?.user) {
        callback(session.user)
      } else {
        callback(null)
      }
    })
  }

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }

    return session
  }
}

export const authService = new AuthService()