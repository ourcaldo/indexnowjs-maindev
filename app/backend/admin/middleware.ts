import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function adminMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow access to admin login page
  if (pathname === '/backend/admin/login') {
    return NextResponse.next()
  }

  // For all other admin routes, check authentication
  try {
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Cannot set cookies in middleware
          },
        },
      }
    )

    const { data: { user }, error } = await supabaseServer.auth.getUser()
    
    if (error || !user) {
      // Redirect to admin login
      const loginUrl = new URL('/backend/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Direct database check for admin role (avoiding fetch in middleware)
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        const loginUrl = new URL('/backend/admin/login', request.url)
        return NextResponse.redirect(loginUrl)
      }
    } catch (dbError) {
      console.error('Database check error:', dbError)
      const loginUrl = new URL('/backend/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()

  } catch (error) {
    console.error('Admin middleware error:', error)
    const loginUrl = new URL('/backend/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}