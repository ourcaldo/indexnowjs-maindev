import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { adminMiddleware } from './app/backend/admin/middleware'

// Route protection configuration
interface RouteProtection {
  patterns: string[]
  authLevel: 'user' | 'admin' | 'super_admin'
  redirect?: string
}

const PROTECTED_ROUTES: RouteProtection[] = [
  // User authentication required (removed /verify from here as it needs special handling)
  {
    patterns: ['/dashboard'],
    authLevel: 'user',
    redirect: '/login'
  },
  // Admin authentication required
  {
    patterns: ['/api/system/', '/api/revalidate', '/api/debug/'],
    authLevel: 'admin',
    redirect: '/backend/admin/login'
  },
  // User-specific API routes requiring authentication
  {
    patterns: ['/api/v1/auth/user/', '/api/v1/billing/'],
    authLevel: 'user',
    redirect: '/auth/login'
  }
]

// Public routes that should never be protected
const PUBLIC_ROUTES = [
  '/auth/',
  '/backend/admin/login',
  '/api/health',
  '/api/midtrans/webhook',
  '/api/v1/payments/midtrans/webhook',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/detect-location',
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
]

async function checkUserAuthentication(request: NextRequest): Promise<{ user: any; role: string } | null> {
  try {
    const supabase = createServerClient(
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

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // For admin routes, check admin role using centralized service client
    if (request.nextUrl.pathname.startsWith('/api/system/') || 
        request.nextUrl.pathname.startsWith('/api/debug/') ||
        request.nextUrl.pathname === '/api/revalidate') {
      
      // Use centralized service role client instead of ad-hoc creation
      const { supabaseAdmin } = await import('./lib/database/supabase')
      
      // Security validation: Only query profile for the authenticated user
      if (!user?.id) {
        return null
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        return null
      }

      // Log service role operation for audit trail
      console.log(`AUDIT: Service role admin check for user ${user.id} on route ${request.nextUrl.pathname}`)

      // Insert audit log for service role admin check (non-blocking)
      try {
        await supabaseAdmin
          .from('indb_security_audit_logs')
          .insert({
            user_id: user.id,
            event_type: 'service_role_admin_check',
            description: `Service role checked admin permissions for protected route: ${request.nextUrl.pathname}`,
            success: true,
            metadata: {
              operation: 'admin_role_verification',
              route: request.nextUrl.pathname,
              user_role: profile?.role
            }
          })
      } catch (auditError) {
        console.error('Failed to log service role audit entry:', auditError)
      }

      return { user, role: profile.role }
    }

    return { user, role: 'user' }
    
  } catch (error) {
    return null
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function getRequiredAuthLevel(pathname: string): { authLevel: string; redirect: string } | null {
  for (const protection of PROTECTED_ROUTES) {
    if (protection.patterns.some(pattern => pathname.startsWith(pattern))) {
      return { authLevel: protection.authLevel, redirect: protection.redirect || '/auth/login' }
    }
  }
  return null
}

function hasRequiredAccess(userRole: string, requiredLevel: string): boolean {
  const roleHierarchy = {
    'user': 1,
    'admin': 2,
    'super_admin': 3
  }
  
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevelValue = roleHierarchy[requiredLevel as keyof typeof roleHierarchy] || 0
  
  return userLevel >= requiredLevelValue
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // BLOCK Sentry monitoring HEAD requests to /api endpoint
  if (request.method === 'HEAD' && pathname === '/api') {
    const userAgent = request.headers.get('user-agent')
    const hasSentryHeaders = request.headers.get('sentry-trace') || 
                             request.headers.get('baggage')?.includes('sentry-')
    
    // Block Sentry monitoring requests to prevent 404 spam
    if (userAgent === 'node' && hasSentryHeaders) {
      return new NextResponse(null, { status: 204 }) // No Content - stops the noise
    }
  }


  // Handle admin routes with dedicated middleware, except login page
  if (pathname.startsWith('/backend/admin') && pathname !== '/backend/admin/login') {
    return adminMiddleware(request)
  }
  
  // Allow login page to bypass admin middleware completely
  if (pathname === '/backend/admin/login') {
    return NextResponse.next()
  }

  // Allow all public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check if route requires protection
  const protection = getRequiredAuthLevel(pathname)
  if (!protection) {
    return NextResponse.next()
  }

  // Verify authentication for protected routes
  const authResult = await checkUserAuthentication(request)
  
  if (!authResult) {
    // No authentication - redirect to appropriate login
    const redirectUrl = new URL(protection.redirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user has required access level
  if (!hasRequiredAccess(authResult.role, protection.authLevel)) {
    // Insufficient privileges - redirect to appropriate login
    const redirectUrl = new URL(protection.redirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // User is authenticated and has required access level
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // For dashboard routes, refresh session if needed
  if (pathname.startsWith('/dashboard')) {
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
  }

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