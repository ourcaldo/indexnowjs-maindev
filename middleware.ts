import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { adminMiddleware } from './app/backend/admin/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle admin routes with dedicated middleware, except login page
  if (pathname.startsWith('/backend/admin') && pathname !== '/backend/admin/login') {
    return adminMiddleware(request)
  }
  
  // Allow login page to bypass admin middleware completely
  if (pathname === '/backend/admin/login') {
    return NextResponse.next()
  }

  // Allow public routes (landing page, register, etc.)
  const publicRoutes = ['/', '/register', '/forgot-password']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Handle regular routes
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This will refresh session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}