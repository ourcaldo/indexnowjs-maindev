'use client'

import { useState } from 'react'
import { authService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  Plus,
  FileText,
  Settings,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Menu,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

// Simple Button component using new color palette
const Button = ({ children, className = '', variant = 'ghost', size = 'sm', onClick, ...props }: any) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants: { [key: string]: string } = {
    ghost: 'hover:opacity-80',
    default: 'text-white hover:opacity-80'
  }
  const sizes: { [key: string]: string } = {
    sm: 'h-9 px-3',
    default: 'h-10 py-2 px-4'
  }
  
  const variantStyles = variant === 'ghost' 
    ? { backgroundColor: 'transparent', color: '#6C757D' }
    : { backgroundColor: '#1C2331', color: '#FFFFFF' }
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant] || variants.ghost} ${sizes[size] || sizes.sm} ${className}`}
      style={variantStyles}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

// Simple cn function
const cn = (...classes: string[]) => classes.filter(Boolean).join(' ')

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onCollapse?: () => void
  user?: any
  isCollapsed?: boolean
}

const Sidebar = ({ isOpen, onToggle, onCollapse, user, isCollapsed = false }: SidebarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [indexNowExpanded, setIndexNowExpanded] = useState(true)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!isCollapsed) // Full logo when expanded, icon when collapsed

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
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    {
      label: 'IndexNow',
      icon: Zap,
      expandable: true,
      expanded: indexNowExpanded,
      onToggle: () => setIndexNowExpanded(!indexNowExpanded),
      children: [
        {
          label: 'New Index',
          href: '/dashboard/indexnow',
          icon: Plus,
          active: pathname === '/dashboard/indexnow'
        },
        {
          label: 'Manage Jobs',
          href: '/dashboard/manage-jobs',
          icon: FileText,
          active: pathname === '/dashboard/manage-jobs'
        }
      ]
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname === '/dashboard/settings'
    },
    {
      label: 'Test Backend',
      href: '/dashboard/test-backend',
      icon: Activity,
      active: pathname === '/dashboard/test-backend'
    }
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile off-canvas sidebar */}
      <div 
        className={cn(
          "fixed left-0 top-0 h-full z-50 transform transition-all duration-300 ease-in-out flex flex-col lg:hidden",
          "w-64", // Always full width on mobile
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E6ED'}}
      >
        {/* Mobile Header with Close Button */}
        <div className="p-4 flex items-center justify-between" style={{borderBottom: '1px solid #E0E6ED'}}>
          <div className="flex items-center">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${siteName} Logo`}
                className="h-8 w-auto max-w-[120px]"
              />
            ) : (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg ml-2" style={{color: '#1A1A1A'}}>{siteName}</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.expandable ? (
                  <div>
                    <Button
                      variant="ghost"
                      className="w-full h-10 justify-start px-4 font-medium transition-all duration-200"
                      onClick={item.onToggle}
                      style={{color: '#6C757D'}}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                        ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                        ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                      }}
                    >
                      <div className="flex items-center w-full">
                        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span className="text-left flex-1">{item.label}</span>
                        {item.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                    
                    {item.expanded && item.children && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link key={child.label} href={child.href} onClick={onToggle}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full h-9 justify-start text-left text-sm px-4",
                                child.active ? "font-medium" : ""
                              )}
                              style={{
                                color: child.active ? '#1A1A1A' : '#6C757D',
                                backgroundColor: child.active ? '#F7F9FC' : 'transparent'
                              }}
                              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                if (!child.active) {
                                  (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                                  ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                                }
                              }}
                              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                if (!child.active) {
                                  (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                                  ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                                }
                              }}
                            >
                              <div className="flex items-center w-full">
                                <child.icon className="h-3 w-3 mr-3 flex-shrink-0" />
                                <span className="text-left">{child.label}</span>
                              </div>
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href!} onClick={onToggle}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-10 justify-start px-4 transition-all duration-200",
                        item.active ? "font-medium" : ""
                      )}
                      style={{
                        color: item.active ? '#1A1A1A' : '#6C757D',
                        backgroundColor: item.active ? '#F7F9FC' : 'transparent'
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!item.active) {
                          (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                          ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                        }
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!item.active) {
                          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                          ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                        }
                      }}
                    >
                      <div className="flex items-center w-full">
                        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span className="text-left">{item.label}</span>
                      </div>
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Mobile User Profile at Bottom */}
        <div className="border-t border-gray-200 p-4 mt-auto flex-shrink-0">
          <div className="px-4 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar - only visible on desktop */}
      <div 
        className={cn(
          "fixed left-0 top-0 h-full z-50 transform transition-all duration-200 ease-in-out flex-col",
          // Mobile: COMPLETELY HIDDEN
          "hidden",
          // Desktop: always visible, can collapse
          "lg:flex lg:translate-x-0", 
          // Width: Desktop can collapse to 16
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
        style={{backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E6ED'}}
      >
        {/* Desktop Header */}
        <div className="p-4" style={{borderBottom: '1px solid #E0E6ED'}}>
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} Icon`}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                className="hidden lg:flex p-1"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} Logo`}
                  className="h-8 w-auto max-w-[180px]"
                />
              ) : (
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-lg ml-2" style={{color: '#1A1A1A'}}>{siteName}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                className="ml-auto hidden lg:flex p-1"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className={cn("space-y-1", isCollapsed ? "px-2" : "px-3")}>
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.expandable ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-10 font-medium transition-all duration-200",
                        isCollapsed 
                          ? "justify-center px-3" 
                          : "justify-start px-4"
                      )}
                      onClick={item.onToggle}
                      style={{color: '#6C757D'}}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                        ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                        ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                      }}
                    >
                      {isCollapsed ? (
                        <item.icon className="h-4 w-4" />
                      ) : (
                        <div className="flex items-center w-full">
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="text-left flex-1">{item.label}</span>
                          {item.expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </Button>
                    
                    {item.expanded && item.children && !isCollapsed && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link key={child.label} href={child.href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full h-9 justify-start text-left text-sm px-4",
                                child.active
                                  ? "font-medium"
                                  : ""
                              )}
                              style={{
                                color: child.active ? '#1A1A1A' : '#6C757D',
                                backgroundColor: child.active ? '#F7F9FC' : 'transparent'
                              }}
                              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                if (!child.active) {
                                  (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                                  ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                                }
                              }}
                              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                if (!child.active) {
                                  (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                                  ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                                }
                              }}
                            >
                              <div className="flex items-center w-full">
                                <child.icon className="h-3 w-3 mr-3 flex-shrink-0" />
                                <span className="text-left">{child.label}</span>
                              </div>
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href!}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-10 transition-all duration-200",
                        isCollapsed 
                          ? "justify-center px-3" 
                          : "justify-start px-4",
                        item.active
                          ? "font-medium"
                          : ""
                      )}
                      style={{
                        color: item.active ? '#1A1A1A' : '#6C757D',
                        backgroundColor: item.active ? '#F7F9FC' : 'transparent'
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!item.active) {
                          (e.target as HTMLButtonElement).style.backgroundColor = '#F7F9FC'
                          ;(e.target as HTMLButtonElement).style.color = '#1A1A1A'
                        }
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!item.active) {
                          (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                          ;(e.target as HTMLButtonElement).style.color = '#6C757D'
                        }
                      }}
                    >
                      {isCollapsed ? (
                        <item.icon className="h-4 w-4" />
                      ) : (
                        <div className="flex items-center w-full">
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="text-left">{item.label}</span>
                        </div>
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Desktop User Profile at Bottom */}
        <div className="border-t border-gray-200 p-4 mt-auto flex-shrink-0">
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-700" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="px-4 py-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar

