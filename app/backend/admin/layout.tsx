'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminAuthService, AdminUser } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

  // Skip admin layout for login page
  if (pathname === '/backend/admin/login') {
    return <>{children}</>
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const user = await adminAuthService.getCurrentAdminUser()
      
      if (!user?.isSuperAdmin) {
        // Redirect to regular dashboard if not super admin
        router.push('/dashboard')
        return
      }

      setAdminUser(user)
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
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
  )
}