'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { authService, AuthUser } from '@/lib/auth'
import { ToastContainer } from '@/components/ui/toast'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import QuotaNotification from '@/components/QuotaNotification'
import ServiceAccountQuotaNotification from '@/components/ServiceAccountQuotaNotification'
import QueryProvider from '@/components/QueryProvider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!sidebarCollapsed) // Use expanded logo when sidebar is not collapsed
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header
  useFavicon() // Automatically updates favicon

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      // Skip auth check for login page
      if (window.location.pathname === '/dashboard/login') {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        
        if (!isMounted) return

        if (!currentUser) {
          router.push('/dashboard/login')
          return
        }

        setUser(currentUser)
      } catch (error) {
        console.error('Auth check error:', error)
        if (isMounted) {
          router.push('/')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Set up auth state change listener
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (!isMounted) return
      
      // Skip auth redirect for login page
      if (window.location.pathname === '/dashboard/login') {
        return
      }
      
      if (!user) {
        router.push('/dashboard/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [router])

  // For login page, render without authentication checks
  if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/login') {
    return children
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A]"></div>
          <p className="mt-4 text-[#6C757D]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <QueryProvider>
      <ToastContainer>
        <div className="min-h-screen bg-[#F7F9FC]">


          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            user={user}
            isCollapsed={sidebarCollapsed}
          />

          {/* Main content */}
          <div className={`transition-all duration-300 ml-0 ${
            sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}>
            {/* Mobile header - always show on mobile */}
            <div className="lg:hidden bg-white border-b border-[#E0E6ED] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {iconUrl ? (
                  <img 
                    src={iconUrl} 
                    alt={`${siteName} Icon`}
                    className="w-6 h-6 rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#1C2331'}}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <h1 className="text-lg font-semibold text-[#1A1A1A] truncate">{siteName}</h1>
                {user && (
                  <span className="hidden lg:block text-sm text-[#6C757D] truncate ml-auto pr-2" style={{maxWidth: '140px'}}>
                    {user.email}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* Notification icon - moved from dashboard page for mobile */}
                <button className="lg:hidden p-2 rounded-lg transition-colors" style={{backgroundColor: '#F7F9FC', color: '#6C757D'}} onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#E0E6ED'} onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                {/* Hamburger menu */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-[#6C757D] hover:bg-[#F7F9FC] flex-shrink-0"
                  aria-label="Mobile Menu"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                </button>
              </div>
            </div>

            {/* Service Account Quota Notification */}
            <ServiceAccountQuotaNotification />
            
            {/* Page content */}
            <main className="p-6">
              {children}
            </main>
          </div>
          
          {/* Quota Notifications */}
          <QuotaNotification />
        </div>
      </ToastContainer>
    </QueryProvider>
  )
}