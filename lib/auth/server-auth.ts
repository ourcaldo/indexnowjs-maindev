/**
 * Server-side Authentication Utilities
 * Provides authentication functions for API routes and server components
 */

import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '../database/supabase'

// Define types
interface AdminUser {
  id: string
  email: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

/**
 * Get server-side admin user from request using proper Supabase server client
 */
async function getServerAdminUser(request?: NextRequest): Promise<AdminUser | null> {
  try {
    if (!request) {
      console.log('Server auth: No request provided')
      return null
    }

    // Create proper Supabase server client that handles cookies automatically
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookieHeader = request.headers.get('cookie')
            if (!cookieHeader) return undefined
            
            const cookies = Object.fromEntries(
              cookieHeader.split(';').map(cookie => {
                const [key, value] = cookie.trim().split('=')
                return [key, decodeURIComponent(value || '')]
              })
            )

            return cookies[name]
          },
          set() {
            // No-op for server-side requests
          },
          remove() {
            // No-op for server-side requests
          },
        },
      }
    )

    // Get user from session (this will automatically handle Supabase cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return null
    }

    const role = userProfile?.role || 'user'
    const isAdmin = role === 'admin' || role === 'super_admin'
    const isSuperAdmin = role === 'super_admin'

    return {
      id: user.id,
      email: user.email || '',
      role,
      isAdmin,
      isSuperAdmin
    }

  } catch (error: any) {
    console.error('Server auth error:', error.message)
    return null
  }
}

/**
 * Require super admin authentication for API routes
 */
export async function requireServerSuperAdminAuth(request?: NextRequest): Promise<AdminUser> {
  const serverAdminUser = await getServerAdminUser(request)
  if (!serverAdminUser?.isSuperAdmin) {
    throw new Error('Super admin access required')
  }
  
  return serverAdminUser
}

/**
 * Require admin authentication for API routes
 */
export async function requireServerAdminAuth(request?: NextRequest): Promise<AdminUser> {
  const serverAdminUser = await getServerAdminUser(request)
  if (!serverAdminUser?.isAdmin) {
    throw new Error('Admin access required')
  }
  
  return serverAdminUser
}

/**
 * Get authenticated user (no role requirement)
 */
export async function getServerAuthUser(request?: NextRequest): Promise<AdminUser | null> {
  try {
    if (!request) {
      console.log('🔐 Server auth: No request provided')
      return null
    }
    
    console.log('🔐 Server auth: Processing authentication request...')
    const cookieHeader = request.headers.get('cookie')
    console.log('🔐 Cookie header:', cookieHeader ? 'Present' : 'Missing')

    // Create proper Supabase server client that handles cookies automatically
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookieHeader = request.headers.get('cookie')
            if (!cookieHeader) return undefined
            
            const cookies = Object.fromEntries(
              cookieHeader.split(';').map(cookie => {
                const [key, value] = cookie.trim().split('=')
                return [key, decodeURIComponent(value || '')]
              })
            )

            return cookies[name]
          },
          set() {
            // No-op for server-side requests
          },
          remove() {
            // No-op for server-side requests
          },
        },
      }
    )

    // Try to get user from session first
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // If cookies failed, try Authorization header as fallback
    if (!user && authError) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log('🔐 Trying Authorization header token...')
        const result = await supabase.auth.getUser(token)
        user = result.data.user
        authError = result.error
      }
    }
    
    console.log('🔐 Supabase auth getUser result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error: authError?.message 
    })
    
    if (authError || !user) {
      console.log('🔐 Authentication failed:', authError?.message || 'No user found')
      return null
    }

    // Get user profile from database (but don't require admin role)
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = userProfile?.role || 'user'
    const isAdmin = role === 'admin' || role === 'super_admin'
    const isSuperAdmin = role === 'super_admin'

    return {
      id: user.id,
      email: user.email || '',
      role,
      isAdmin,
      isSuperAdmin
    }

  } catch (error: any) {
    console.error('Server auth error:', error.message)
    return null
  }
}