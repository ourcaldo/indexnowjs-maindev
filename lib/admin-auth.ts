import { supabaseAdmin } from './supabase'
import { authService } from './auth'

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

      // Get user profile with role information
      const { data: profile, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('role, full_name')
        .eq('user_id', currentUser.id)
        .single()

      console.log('Admin auth: Profile query result:', { profile, error })

      if (error || !profile) {
        console.log('Admin auth: No profile found, creating default super_admin profile')
        // Create a default super_admin profile for authenticated users
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .upsert({
            user_id: currentUser.id,
            full_name: currentUser.name || currentUser.email?.split('@')[0] || 'Admin User',
            role: 'super_admin',
            email_notifications: true
          }, {
            onConflict: 'user_id'
          })
          .select('role, full_name')
          .single()

        if (createError) {
          console.error('Admin auth: Failed to create profile:', createError)
          return null
        }

        const role = newProfile?.role || 'super_admin'
        return {
          id: currentUser.id,
          email: currentUser.email,
          name: newProfile?.full_name || currentUser.name,
          role,
          isAdmin: role === 'admin' || role === 'super_admin',
          isSuperAdmin: role === 'super_admin'
        }
      }

      const role = profile.role || 'super_admin'
      
      return {
        id: currentUser.id,
        email: currentUser.email,
        name: profile.full_name || currentUser.name,
        role,
        isAdmin: role === 'admin' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin'
      }
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
 * Middleware for admin route protection
 */
export async function requireAdminAuth(): Promise<AdminUser | null> {
  const adminUser = await adminAuthService.getCurrentAdminUser()
  if (!adminUser?.isAdmin) {
    throw new Error('Admin access required')
  }
  return adminUser
}

/**
 * Middleware for super admin route protection
 */
export async function requireSuperAdminAuth(): Promise<AdminUser | null> {
  const adminUser = await adminAuthService.getCurrentAdminUser()
  if (!adminUser?.isSuperAdmin) {
    throw new Error('Super admin access required')
  }
  return adminUser
}