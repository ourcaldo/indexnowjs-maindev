'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { adminAuthService, AdminUser } from '@/lib/auth'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ToastContainer } from '@/components/ui/toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if we're on the login page
  const isLoginPage = pathname === '/backend/admin/login'

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsLoading(false)
      return
    }
    checkAdminAccess()
  }, [router, isLoginPage])

  const checkAdminAccess = async () => {
    try {
      const user = await adminAuthService.getCurrentAdminUser()
      
      if (!user?.isSuperAdmin) {
        // Redirect to admin login if not authenticated or not super admin
        router.push('/backend/admin/login')
        return
      }

      setAdminUser(user)
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/backend/admin/login')
    } finally {
      setIsLoading(false)
    }
  }

  // For login page, render without sidebar
  if (isLoginPage) {
    return children
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!adminUser?.isSuperAdmin) {
    return null
  }

  return (
    <ToastContainer>
      <div className="min-h-screen bg-[#F7F9FC]">
        <AdminSidebar 
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={adminUser}
          isCollapsed={sidebarCollapsed}
        />
        
        <div className={`transition-all duration-200 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        } ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <main className="p-6">
            {children}
          </main>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </ToastContainer>
  )
}