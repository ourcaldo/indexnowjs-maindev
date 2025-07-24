import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './database'

export interface ServerAdminUser {
  id: string
  email: string | undefined
  name?: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

/**
 * Get authenticated user from server-side API route with admin role information
 */
export async function getServerAdminUser(): Promise<ServerAdminUser | null> {
  try {
    const cookieStore = await cookies()
    
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()
    
    if (userError || !user) {
      console.log('Server auth: No authenticated user found')
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
      console.log('Server auth: No profile found, creating default super_admin profile')
      // Create a default super_admin profile for authenticated users
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .upsert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
          role: 'super_admin',
          email_notifications: true
        }, {
          onConflict: 'user_id'
        })
        .select('role, full_name')
        .single()

      if (createError) {
        console.error('Server auth: Failed to create profile:', createError)
        return null
      }

      const role = newProfile?.role || 'super_admin'
      return {
        id: user.id,
        email: user.email,
        name: newProfile?.full_name || user.user_metadata?.full_name,
        role,
        isAdmin: role === 'admin' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin'
      }
    }

    const role = profile.role || 'super_admin'
    
    return {
      id: user.id,
      email: user.email,
      name: profile.full_name || user.user_metadata?.full_name,
      role,
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin'
    }
  } catch (error) {
    console.error('Get server admin user error:', error)
    return null
  }
}

/**
 * Middleware for super admin route protection in API routes
 */
export async function requireServerSuperAdminAuth(): Promise<ServerAdminUser> {
  const adminUser = await getServerAdminUser()
  if (!adminUser?.isSuperAdmin) {
    throw new Error('Super admin access required')
  }
  return adminUser
}