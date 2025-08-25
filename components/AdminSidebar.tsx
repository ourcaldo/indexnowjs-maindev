'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Settings, 
  Globe, 
  CreditCard, 
  Package,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Shield,
  Receipt,
  Mail
} from 'lucide-react'
import type { AdminUser } from '@/lib/auth'
import { authService } from '@/lib/auth'
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

interface AdminSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onCollapse?: () => void
  user?: AdminUser | null
  isCollapsed?: boolean
}

export const AdminSidebar = ({ isOpen, onToggle, onCollapse, user, isCollapsed = false }: AdminSidebarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsExpanded, setSettingsExpanded] = useState(true)
  const [cmsExpanded, setCmsExpanded] = useState(true)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!isCollapsed) // Full logo when expanded, icon when collapsed
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header
  useFavicon() // Automatically updates favicon

  const handleLogout = async () => {
    try {
      await authService.signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/backend/admin',
      icon: LayoutDashboard,
      active: pathname === '/backend/admin'
    },
    {
      label: 'User Management',
      href: '/backend/admin/users',
      icon: Users,
      active: pathname?.startsWith('/backend/admin/users') || false
    },
    {
      label: 'Orders',
      href: '/backend/admin/orders',
      icon: Receipt,
      active: pathname?.startsWith('/backend/admin/orders') || false
    },
    {
      label: 'Activity Logs',
      href: '/backend/admin/activity',
      icon: Activity,
      active: pathname?.startsWith('/backend/admin/activity') || false
    },
    {
      label: 'Settings',
      icon: Settings,
      expandable: true,
      expanded: settingsExpanded,
      onToggle: () => setSettingsExpanded(!settingsExpanded),
      children: [
        {
          label: 'Site Settings',
          href: '/backend/admin/settings/site',
          icon: Globe,
          active: pathname === '/backend/admin/settings/site'
        },
        {
          label: 'Payment Gateway',
          href: '/backend/admin/settings/payments',
          icon: CreditCard,
          active: pathname === '/backend/admin/settings/payments'
        },
        {
          label: 'Packages',
          href: '/backend/admin/settings/packages',
          icon: Package,
          active: pathname === '/backend/admin/settings/packages'
        }
      ]
    },
    {
      label: 'CMS',
      icon: BookOpen,
      expandable: true,
      expanded: cmsExpanded,
      onToggle: () => setCmsExpanded(!cmsExpanded),
      children: [
        {
          label: 'Posts',
          href: '/backend/admin/cms/posts',
          icon: FileText,
          active: pathname?.startsWith('/backend/admin/cms/posts') || false
        },
        {
          label: 'Pages',
          href: '/backend/admin/cms/pages',
          icon: BookOpen,
          active: pathname?.startsWith('/backend/admin/cms/pages') || false
        }
      ]
    }
  ]

  const renderMenuItem = (item: any, isChild = false) => {
    if (item.expandable) {
      return (
        <div key={item.label}>
          <button
            onClick={item.onToggle}
            className={`w-full flex items-center justify-between p-3 text-sm font-medium rounded-lg transition-colors ${
              isChild ? 'pl-6' : ''
            } text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]`}
          >
            <div className="flex items-center">
              <item.icon className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0`} />
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && (
              item.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {!isCollapsed && item.expanded && item.children && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child: any) => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <a
        key={item.label}
        href={item.href}
        className={`flex items-center p-3 text-sm font-medium rounded-lg transition-colors ${
          isChild ? 'pl-6' : ''
        } ${
          item.active
            ? 'bg-[#1C2331] text-white'
            : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]'
        }`}
      >
        <item.icon className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0`} />
        {!isCollapsed && <span>{item.label}</span>}
      </a>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full bg-white border-r border-[#E0E6ED] transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-64'
      } hidden md:block`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center p-4 border-b border-[#E0E6ED] ${
            isCollapsed ? 'justify-center flex-col space-y-2' : 'justify-between'
          }`}>
            <div className="flex items-center">
              {logoUrl && !isCollapsed ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} Admin Logo`}
                  style={{ width: '106.664px', height: '60px' }}
                />
              ) : logoUrl && isCollapsed ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} Admin Icon`}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-[#1C2331]" />
                  {!isCollapsed && (
                    <div className="ml-3">
                      <h1 className="text-lg font-bold text-[#1A1A1A]">Admin Panel</h1>
                      <p className="text-xs text-[#6C757D]">{siteName}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Always show hamburger button */}
            <button 
              onClick={onCollapse}
              className="p-1.5 rounded-md hover:bg-[#F7F9FC] text-[#6C757D] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map(item => renderMenuItem(item))}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-[#E0E6ED] p-4">
            {!isCollapsed && user && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{user.name}</p>
                <p className="text-xs text-[#6C757D] truncate">{user.email}</p>
                <p className="text-xs text-[#3D8BFF] font-medium">{user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-2 text-sm font-medium text-[#E63946] rounded-lg hover:bg-[#F7F9FC] transition-colors"
            >
              <LogOut className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-6 w-6 flex-shrink-0`} />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full w-64 bg-white border-r border-[#E0E6ED] transform transition-transform md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#E0E6ED]">
            <div className="flex items-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} Admin Logo`}
                  style={{ width: '106.664px', height: '60px' }}
                />
              ) : (
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-[#1C2331]" />
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-[#1A1A1A]">Admin Panel</h1>
                    <p className="text-xs text-[#6C757D]">{siteName}</p>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={onToggle}
              className="p-1.5 rounded-md hover:bg-[#F7F9FC] text-[#6C757D]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map(item => renderMenuItem(item))}
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-[#E0E6ED] p-4">
            {user && (
              <div className="mb-4">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{user.name}</p>
                <p className="text-xs text-[#6C757D] truncate">{user.email}</p>
                <p className="text-xs text-[#3D8BFF] font-medium">{user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-2 text-sm font-medium text-[#E63946] rounded-lg hover:bg-[#F7F9FC] transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header - Show when sidebar is closed */}
      <div className="md:hidden bg-white border-b border-[#E0E6ED] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onToggle}
              className="p-2 rounded-md hover:bg-[#F7F9FC] text-[#6C757D] mr-3"
            >
              <Menu className="h-5 w-5" />
            </button>
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={`${siteName} Admin Icon`}
                className="h-6 w-6"
              />
            ) : (
              <Shield className="h-6 w-6 text-[#1C2331]" />
            )}
            <h1 className="ml-2 text-lg font-bold text-[#1A1A1A]">Admin Panel</h1>
          </div>
          {user && (
            <p className="text-sm text-[#6C757D] truncate max-w-32">{user.email}</p>
          )}
        </div>
      </div>
    </>
  )
}