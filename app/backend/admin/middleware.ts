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

    // Verify admin role
    const roleResponse = await fetch(`${request.nextUrl.origin}/api/admin/verify-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ userId: user.id })
    })

    if (!roleResponse.ok) {
      const loginUrl = new URL('/backend/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const roleData = await roleResponse.json()
    
    if (!roleData.success || (!roleData.isAdmin && !roleData.isSuperAdmin)) {
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