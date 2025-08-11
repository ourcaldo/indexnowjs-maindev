/**
 * Server-side Authentication Utilities
 * Provides authentication functions for API routes and server components
 */

import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from './supabase'

// Define types
interface AdminUser {
  id: string
  email: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

/**
 * Get server-side admin user from request
 */
async function getServerAdminUser(request?: NextRequest): Promise<AdminUser | null> {
  try {
    let accessToken: string | undefined

    if (request) {
      // Try to get token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7)
      }
      
      // Try to get token from cookies if not in header
      if (!accessToken) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = Object.fromEntries(
            cookieHeader.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=')
              return [name, decodeURIComponent(value)]
            })
          )
          accessToken = cookies['sb-access-token']
          console.log('Server auth: Cookies found:', Object.keys(cookies))
          console.log('Server auth: Access token from cookies:', accessToken ? 'EXISTS' : 'NOT_FOUND')
        }
      }
    }

    if (!accessToken) {
      console.log('Server auth: No access token found')
      return null
    }

    // Create server client for token verification
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {},
        },
      }
    )

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.log('Server auth: Token verification failed:', authError?.message)
      return null
    }

    console.log('Server auth: User found:', { id: user.id, email: user.email })

    // Check if user is super admin (hardcoded for now)
    const knownSuperAdmins = ['aldodkris@gmail.com']
    const isSuperAdmin = knownSuperAdmins.includes(user.email || '')
    
    if (isSuperAdmin) {
      console.log('Server auth: Known super_admin user detected')
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.log('Server auth: Failed to fetch user profile:', profileError.message)
      // For super admins, allow access even if profile doesn't exist
      if (!isSuperAdmin) {
        return null
      }
    }

    const role = userProfile?.role || (isSuperAdmin ? 'super_admin' : 'user')
    const isAdmin = role === 'admin' || role === 'super_admin'

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
  return await getServerAdminUser(request)
}