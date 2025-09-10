import { supabaseAdmin, supabase } from '../database/supabase'
import { authService } from './auth'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export interface AdminUser {
  id: string
  email: string | undefined
  name?: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

export class AdminAuthService {
  /**
   * Get current user with admin role information
   */
  async getCurrentAdminUser(): Promise<AdminUser | null> {
    try {
      const currentUser = await authService.getCurrentUser()
      if (!currentUser) {
        console.log('Admin auth: No current user found')
        return null
      }

      console.log('Admin auth: Current user:', { id: currentUser.id, email: currentUser.email })


      // Try to get user profile with role information using direct API call
      try {
        // Use Supabase client instead of direct REST API call
        const { data: profiles, error } = await supabase
          .from('indb_auth_user_profiles')
          .select('role, full_name')
          .eq('user_id', currentUser.id)
          .limit(1)

        if (!error && profiles && profiles.length > 0) {
          const profile = profiles[0]
          console.log('Admin auth: Found profile via Supabase client:', profile)
          const role = profile.role || 'user'
          return {
            id: currentUser.id,
            email: currentUser.email,
            name: profile.full_name || currentUser.name,
            role,
            isAdmin: role === 'admin' || role === 'super_admin',
            isSuperAdmin: role === 'super_admin'
          }
        }
      } catch (apiError) {
        console.error('Supabase query failed:', apiError)
      }

      // No profile found and no fallback - return null for security
      console.log('Admin auth: No profile found, access denied')
      return null

    } catch (error) {
      console.error('Get admin user error:', error)
      return null
    }
  }

  /**
   * Check if current user has admin access
   */
  async hasAdminAccess(): Promise<boolean> {
    const adminUser = await this.getCurrentAdminUser()
    return adminUser?.isAdmin || false
  }

  /**
   * Check if current user has super admin access
   */
  async hasSuperAdminAccess(): Promise<boolean> {
    const adminUser = await this.getCurrentAdminUser()
    return adminUser?.isSuperAdmin || false
  }

  /**
   * Log admin activity
   */
  async logAdminActivity(
    actionType: string,
    actionDescription: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const adminUser = await this.getCurrentAdminUser()
      if (!adminUser?.isAdmin) {
        return
      }

      await supabaseAdmin
        .from('indb_admin_activity_logs')
        .insert({
          admin_id: adminUser.id,
          action_type: actionType,
          action_description: actionDescription,
          target_type: targetType,
          target_id: targetId,
          metadata: metadata || {}
        })
    } catch (error) {
      console.error('Failed to log admin activity:', error)
    }
  }
}

export const adminAuthService = new AdminAuthService()

/**
 * Get authenticated user from server-side API route with admin role information
 */
async function getServerAdminUser(request?: NextRequest): Promise<AdminUser | null> {
  try {
    if (!request) {
      console.log('Server auth: No request object provided')
      return null
    }

    // Try to get JWT token from Authorization header first
    const authHeader = request.headers.get('authorization')
    let user = null
    let userError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      
      // Verify JWT token using Supabase admin
      const { data: userData, error: tokenError } = await supabaseAdmin.auth.getUser(token)
      user = userData.user
      userError = tokenError
      
      if (user) {
        console.log('Server auth: Authenticated via Bearer token:', { id: user.id, email: user.email })
      }
    }

    // Fallback to cookies if no valid Bearer token
    if (!user) {
      // Create Supabase client using request cookies
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // Cannot set cookies in API routes
            },
          },
        }
      )

      const { data: { user: cookieUser }, error: cookieError } = await supabaseServer.auth.getUser()
      user = cookieUser
      userError = cookieError
      
      if (user) {
        console.log('Server auth: Authenticated via cookies:', { id: user.id, email: user.email })
      }
    }
    
    if (userError || !user) {
      console.log('Server auth: No authenticated user found', userError?.message)
      return null
    }

    console.log('Server auth: User found:', { id: user.id, email: user.email })


    // Get user profile with role information using admin client
    const { data: profile, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .single()

    console.log('Server auth: Profile query result:', { profile, error })

    if (error || !profile) {
      console.log('Server auth: Failed to get user profile', error?.message)
      return null
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
    const isSuperAdmin = profile.role === 'super_admin'

    return {
      id: user.id,
      email: user.email,
      name: profile.full_name,
      role: profile.role,
      isAdmin,
      isSuperAdmin
    }

  } catch (error: any) {
    console.error('Server auth error:', error)
    return null
  }
}

/**
 * Middleware for admin route protection (server-side)
 */
export async function requireAdminAuth(request?: NextRequest): Promise<AdminUser | null> {
  const serverAdminUser = await getServerAdminUser(request)
  if (!serverAdminUser?.isAdmin) {
    throw new Error('Admin access required')
  }
  
  return serverAdminUser
}

/**
 * Middleware for super admin route protection (server-side)
 */
export async function requireSuperAdminAuth(request?: NextRequest): Promise<AdminUser | null> {
  const serverAdminUser = await getServerAdminUser(request)
  if (!serverAdminUser?.isSuperAdmin) {
    throw new Error('Super admin access required')
  }
  
  return serverAdminUser
}