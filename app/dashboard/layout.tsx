'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SkeletonSidebar from '@/components/SkeletonSidebar'
import { useAuth } from '@/lib/contexts/AuthContext'
import { ToastContainer } from '@/components/ui/toast'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import QuotaNotification from '@/components/QuotaNotification'
import ServiceAccountQuotaNotification from '@/components/ServiceAccountQuotaNotification'
import QueryProvider from '@/components/QueryProvider'

// Cookie utilities for sidebar state persistence
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use global auth context instead of local state
  const { user, loading, authChecked, isAuthenticated } = useAuth()
  
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [cookiesLoaded, setCookiesLoaded] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!sidebarCollapsed) // Use expanded logo when sidebar is not collapsed
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header
  useFavicon() // Automatically updates favicon

  // Prevent hydration mismatch and load sidebar state from cookies
  useEffect(() => {
    setMounted(true)
    
    // Load sidebar state from cookies
    const savedCollapsedState = getCookie('sidebar-collapsed')
    if (savedCollapsedState !== null) {
      setSidebarCollapsed(savedCollapsedState === 'true')
    }
    setCookiesLoaded(true)
  }, [])
  
  // Save sidebar state to cookies when it changes
  useEffect(() => {
    if (cookiesLoaded) {
      setCookie('sidebar-collapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed, cookiesLoaded])

  // No longer need auth checking useEffect - handled by AuthProvider globally

  // Check if we're on the login page
  const isLoginPage = mounted && typeof window !== 'undefined' && window.location.pathname === '/login'
  
  // Simplified loading state - only show when no user and still loading auth check
  // Following the suggested pattern: show loader only until auth is confirmed, never on route changes
  const isAuthenticating = loading && !user

  // Wrap ALL dashboard content with QueryProvider to prevent QueryClient errors
  return (
    <QueryProvider>
      <ToastContainer>
        {/* For login page, render without authentication UI */}
        {isLoginPage && (
          <div className="min-h-screen bg-[#F7F9FC]">
            {children}
          </div>
        )}

        {/* Main dashboard layout - always maintain structure */}
        {!isLoginPage && (
          <div className="min-h-screen bg-[#F7F9FC]">
            {/* Sidebar - always present */}
            {isAuthenticated ? (
              <Sidebar 
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onCollapse={() => {
                  const newState = !sidebarCollapsed
                  setSidebarCollapsed(newState)
                  setCookie('sidebar-collapsed', newState.toString())
                }}
                user={user}
                isCollapsed={sidebarCollapsed}
              />
            ) : (
              <SkeletonSidebar isCollapsed={sidebarCollapsed} />
            )}

            {/* Main content area */}
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

              {/* Authentication Loading State - Only show during initial auth, not route changes */}
              {isAuthenticating && (
                <div className="flex items-center justify-center min-h-96">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D8BFF] mb-4"></div>
                    <p className="text-[#6C757D] font-medium">Authenticating...</p>
                    <p className="text-sm text-[#9CA3AF] mt-1">Please wait while we verify your session</p>
                  </div>
                </div>
              )}

              {/* Authenticated Content */}
              {isAuthenticated && (
                <>
                  {/* Service Account Quota Notification */}
                  <ServiceAccountQuotaNotification />
                  
                  {/* Page content */}
                  <main className="p-6">
                    {children}
                  </main>
                </>
              )}
            </div>
            
            {/* Quota Notifications */}
            {isAuthenticated && <QuotaNotification />}
          </div>
        )}
      </ToastContainer>
    </QueryProvider>
  )
}