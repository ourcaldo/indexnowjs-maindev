import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | undefined
  name?: string
  emailVerification?: boolean
}

export class AuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name,
        emailVerification: user.email_confirmed_at ? true : false,
      }
    } catch (error) {
      console.error('Get current user error:', error)
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

    // Transfer session to server-side cookies
    if (data.session) {
      await fetch('/api/auth/session', {
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
    }

    return data
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      throw error
    }

    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
          emailVerification: session.user.email_confirmed_at ? true : false,
        }
        callback(authUser)
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