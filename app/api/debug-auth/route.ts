import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    console.log('=== AUTH DEBUG ===')
    console.log('All cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
    
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
    
    console.log('Auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      email: user?.email,
      error: userError?.message 
    })

    // Test service role using createClient directly
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Test service role access
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('user_id, role, full_name')
      .limit(3)

    return NextResponse.json({
      success: true,
      debug: {
        cookieCount: allCookies.length,
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        userError: userError?.message,
        serviceRoleWorks: !profileError,
        profileError: profileError?.message,
        profileCount: profiles?.length || 0,
        profiles: profiles?.map(p => ({ id: p.user_id.slice(0, 8) + '...', role: p.role, name: p.full_name })),
        cookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
        envCheck: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }
    })
    
  } catch (error: any) {
    console.error('Auth debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}