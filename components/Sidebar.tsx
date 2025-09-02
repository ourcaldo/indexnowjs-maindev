'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  Plus,
  FileText,
  Settings,
  X,
  LogOut,
  User,
  Menu,
  Activity,
  TrendingUp,
  Search,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useKeywordUsage } from '@/hooks/useKeywordUsage'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'

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
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(!isCollapsed) // Full logo when expanded, icon when collapsed  
  const iconUrl = useSiteLogo(false) // Always get icon for mobile header and collapsed state
  
  // Get user profile with role information
  const { user: userProfile } = useUserProfile()
  
  // Get keyword usage data
  const { keywordUsage, loading: keywordLoading } = useKeywordUsage()
  
  // Get packages data to check for active package with proper auth
  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/v1/billing/packages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch packages')
      return response.json()
    }
  })
  
  // Get detailed user profile data for package information with proper auth
  const { data: detailedUserProfile } = useQuery({
    queryKey: ['user-profile-detailed'],
    queryFn: async () => {
      const user = await authService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/v1/auth/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch user profile')
      return response.json()
    }
  })

  const handleLogout = async () => {
    try {
      await authService.signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Navigation sections structured like admin sidebar
  const navigationSections = [
    {
      title: 'DASHBOARD',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          active: pathname === '/dashboard'
        }
      ]
    },
    {
      title: 'KEYWORD TRACKER',
      items: [
        {
          label: 'Overview',
          href: '/dashboard/indexnow/overview',
          icon: Activity,
          active: pathname === '/dashboard/indexnow/overview'
        },
        {
          label: 'Rank History',
          href: '/dashboard/indexnow/rank-history',
          icon: TrendingUp,
          active: pathname === '/dashboard/indexnow/rank-history'
        }
      ]
    },
    {
      title: 'TOOLS',
      items: [
        {
          label: 'New Index',
          href: '/dashboard/tools/fastindexing',
          icon: Plus,
          active: pathname === '/dashboard/tools/fastindexing'
        },
        {
          label: 'Manage Jobs',
          href: '/dashboard/tools/fastindexing/manage-jobs',
          icon: FileText,
          active: pathname === '/dashboard/tools/fastindexing/manage-jobs'
        }
      ]
    }
  ]

  // Add Test Backend section only for super_admin users
  const allSections = userProfile?.isSuperAdmin 
    ? [
        ...navigationSections,
        {
          title: 'ADMIN',
          items: [
            {
              label: 'Test Backend',
              href: '/dashboard/test-backend',
              icon: Activity,
              active: pathname === '/dashboard/test-backend'
            }
          ]
        }
      ]
    : navigationSections

  // Filter navigation items based on search query
  const filteredSections = allSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      searchQuery === '' || item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0)

  const renderMenuItem = (item: any) => {
    return (
      <div key={item.label} className="relative group">
        <a
          href={item.href}
          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            item.active
              ? isCollapsed 
                ? 'bg-[#3D8BFF]/10 text-[#3D8BFF]' 
                : 'bg-[#3D8BFF] text-white shadow-sm'
              : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F8FAFC]'
          }`}
        >
          <item.icon className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
            item.active 
              ? isCollapsed 
                ? 'text-[#3D8BFF]' 
                : 'text-white' 
              : 'text-[#6C757D] group-hover:text-[#3D8BFF]'
          }`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </a>
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#1A1A1A] text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl" style={{ zIndex: 99999 }}>
            {item.label}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#1A1A1A]"></div>
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: any) => {
    if (isCollapsed) {
      return section.items.map((item: any) => renderMenuItem(item))
    }

    return (
      <div key={section.title} className="mb-6">
        <div className="px-3 mb-3">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
            {section.title}
          </p>
        </div>
        <div className="space-y-1">
          {section.items.map((item: any) => renderMenuItem(item))}
        </div>
      </div>
    )
  }

  // Render skeleton content until mounted to prevent hydration mismatch
  const isLoading = !mounted

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full bg-white border-r border-[#E5E7EB] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      } hidden md:block`} style={isCollapsed ? { touchAction: 'none', userSelect: 'none' } : {}}>
        <div className="flex flex-col h-full">
          {/* Header with Logo/Brand */}
          <div className={`px-4 py-5 ${
            isCollapsed ? 'flex flex-col items-center space-y-4' : 'flex items-center justify-between'
          }`}>
            <div className="flex items-center">
              {isLoading ? (
                <div className={`bg-gray-200 animate-pulse rounded ${
                  isCollapsed ? 'h-8 w-8' : 'h-12 w-24'
                }`}></div>
              ) : logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${siteName} ${isCollapsed ? 'Icon' : 'Logo'}`}
                  className={isCollapsed ? "h-8 w-8 object-contain" : "object-contain"}
                  style={!isCollapsed ? { width: '106.664px', height: '60px' } : { width: '32px', height: '32px' }}
                />
              ) : (
                <div className={`bg-gray-200 animate-pulse rounded ${
                  isCollapsed ? 'h-8 w-8' : 'h-12 w-24'
                }`}></div>
              )}
            </div>
            <button 
              onClick={onCollapse}
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6C757D] transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar */}
          {!isCollapsed && (
            <div className="px-4 mb-6">
              {isLoading ? (
                <div className="h-10 bg-gray-200 animate-pulse rounded-lg"></div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <kbd className="px-2 py-0.5 text-xs bg-[#E5E7EB] text-[#6B7280] rounded border">⌘K</kbd>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 px-4 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {isLoading ? (
              // Skeleton navigation while loading
              <div className="space-y-6">
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-20 bg-gray-200 animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                  <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
                <div className="space-y-1">
                  {!isCollapsed && <div className="px-3 mb-3"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div></div>}
                  <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                  <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
                </div>
              </div>
            ) : (
              filteredSections.map(section => renderSection(section))
            )}
          </nav>

          {/* Upgrade Section */}
          {!isCollapsed && (
            <div className="px-4 py-4">
              {isLoading ? (
                <div className="bg-gray-200 animate-pulse rounded-xl h-32"></div>
              ) : (
                <div className="bg-gradient-to-br from-[#3D8BFF] to-[#6366F1] rounded-xl p-4 text-white">
                {(() => {
                  const hasActivePackage = detailedUserProfile?.profile?.package || packagesData?.current_package_id
                  const isLoading = keywordLoading || !detailedUserProfile || !packagesData
                  
                  return (
                    <>
                      <div className="flex items-center mb-2">
                        <Zap className="h-5 w-5 mr-2" />
                        <span className="text-sm font-semibold">
                          {isLoading ? 'Loading...' : hasActivePackage ? 'Usage Limit' : 'No Active Package'}
                        </span>
                      </div>
                      <div className="mb-3">
                        {isLoading ? (
                          <div className="text-xs text-blue-100 mb-1">Loading...</div>
                        ) : !hasActivePackage ? (
                          <div className="text-xs text-blue-100 mb-1">No Active Package found</div>
                        ) : (
                          <>
                            <div className="text-xs text-blue-100 mb-1">
                              {keywordUsage?.is_unlimited 
                                ? `${keywordUsage.keywords_used?.toLocaleString() || 0} Keywords Used`
                                : `${keywordUsage?.keywords_used?.toLocaleString() || 0}/${keywordUsage?.keywords_limit?.toLocaleString() || 0} Keywords`
                              }
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                              <div 
                                className="bg-white rounded-full h-2 transition-all duration-300" 
                                style={{ 
                                  width: keywordUsage?.is_unlimited 
                                    ? '100%' 
                                    : `${Math.min(100, ((keywordUsage?.keywords_used || 0) / (keywordUsage?.keywords_limit || 1)) * 100)}%`
                                }}
                              ></div>
                            </div>
                          </>
                        )}
                      </div>
                      <a 
                        href="/dashboard/settings/plans-billing"
                        className="w-full bg-white text-[#3D8BFF] text-sm font-semibold py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors block text-center"
                      >
                        {!hasActivePackage ? 'Subscribe now →' : 'Upgrade plan →'}
                      </a>
                    </>
                  )
                })()}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="px-4 pb-2">
            {isLoading ? (
              <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
            ) : (
              <div className="relative group">
                <a
                  href="/dashboard/settings"
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    pathname === '/dashboard/settings'
                      ? isCollapsed 
                        ? 'bg-[#3D8BFF]/10 text-[#3D8BFF]' 
                        : 'bg-[#3D8BFF] text-white shadow-sm'
                      : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <Settings className={`${isCollapsed ? 'mr-0' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                    pathname === '/dashboard/settings'
                      ? isCollapsed 
                        ? 'text-[#3D8BFF]' 
                        : 'text-white' 
                      : 'text-[#6C757D] group-hover:text-[#3D8BFF]'
                  }`} />
                  {!isCollapsed && <span className="truncate">Settings</span>}
                </a>
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#1A1A1A] text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl" style={{ zIndex: 99999 }}>
                    Settings
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#1A1A1A]"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="border-t border-[#E5E7EB] p-4">
            {isLoading ? (
              <div className={`h-10 bg-gray-200 animate-pulse rounded-lg ${isCollapsed ? 'mx-auto w-10' : ''}`}></div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2.5 text-sm font-medium text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] transition-colors"
              >
                <LogOut className={`${isCollapsed ? 'mr-0' : 'mr-2'} h-4 w-4 flex-shrink-0`} />
                {!isCollapsed && <span>Sign out</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 z-50 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3D8BFF] to-[#6366F1] px-6 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {isLoading ? (
                  <div className="h-8 w-8 bg-white/20 animate-pulse rounded-lg"></div>
                ) : iconUrl ? (
                  <img 
                    src={iconUrl} 
                    alt={`${siteName} Icon`}
                    className="h-8 w-8 rounded-lg"
                  />
                ) : (
                  <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="ml-3">
                  <h1 className="text-lg font-bold">{siteName}</h1>
                </div>
              </div>
              <button 
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* User info in header */}
            {user && (
              <div className="flex items-center space-x-3 pt-2 border-t border-white/20">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mt-2">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-white">{user.email}</p>
                  <p className="text-xs text-white/70">User Dashboard</p>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 bg-gray-50">
            {isLoading ? (
              <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search navigation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-sm bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent transition-colors shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto">
            {isLoading ? (
              // Skeleton navigation while loading
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-20 bg-gray-200 animate-pulse rounded"></div></div>
                  <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                </div>
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div></div>
                  <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                  <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                </div>
                <div className="space-y-2">
                  <div className="px-3 mb-3"><div className="h-3 w-16 bg-gray-200 animate-pulse rounded"></div></div>
                  <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                  <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
                </div>
              </div>
            ) : (
              filteredSections.map(section => renderSection(section))
            )}
          </nav>

          {/* Settings */}
          <div className="px-4 pb-2">
            {isLoading ? (
              <div className="h-10 bg-gray-200 animate-pulse rounded-lg"></div>
            ) : (
              <a
                href="/dashboard/settings"
                onClick={onToggle}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === '/dashboard/settings'
                    ? 'bg-[#3D8BFF] text-white shadow-sm'
                    : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F8FAFC]'
                }`}
              >
                <Settings className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  pathname === '/dashboard/settings'
                    ? 'text-white' 
                    : 'text-[#6C757D]'
                }`} />
                <span className="truncate">Settings</span>
              </a>
            )}
          </div>

          {/* Upgrade Section */}
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="bg-gray-200 animate-pulse rounded-xl h-32"></div>
            ) : (
              <div className="bg-gradient-to-br from-[#3D8BFF] to-[#6366F1] rounded-xl p-4 text-white">
              {(() => {
                const hasActivePackage = detailedUserProfile?.profile?.package || packagesData?.current_package_id
                const isLoading = keywordLoading || !detailedUserProfile || !packagesData
                
                return (
                  <>
                    <div className="flex items-center mb-2">
                      <Zap className="h-5 w-5 mr-2" />
                      <span className="text-sm font-semibold">
                        {isLoading ? 'Loading...' : hasActivePackage ? 'Usage Limit' : 'No Active Package'}
                      </span>
                    </div>
                    <div className="mb-3">
                      {isLoading ? (
                        <div className="text-xs text-blue-100 mb-1">Loading...</div>
                      ) : !hasActivePackage ? (
                        <div className="text-xs text-blue-100 mb-1">No Active Package found</div>
                      ) : (
                        <>
                          <div className="text-xs text-blue-100 mb-1">
                            {keywordUsage?.is_unlimited 
                              ? `${keywordUsage.keywords_used?.toLocaleString() || 0} Keywords Used`
                              : `${keywordUsage?.keywords_used?.toLocaleString() || 0}/${keywordUsage?.keywords_limit?.toLocaleString() || 0} Keywords`
                            }
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div 
                              className="bg-white rounded-full h-2 transition-all duration-300" 
                              style={{ 
                                width: keywordUsage?.is_unlimited 
                                  ? '100%' 
                                  : `${Math.min(100, ((keywordUsage?.keywords_used || 0) / (keywordUsage?.keywords_limit || 1)) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </>
                      )}
                    </div>
                    <a 
                      href="/dashboard/settings/plans-billing"
                      onClick={onToggle}
                      className="w-full bg-white text-[#3D8BFF] text-sm font-semibold py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors block text-center"
                    >
                      {!hasActivePackage ? 'Subscribe now →' : 'Upgrade plan →'}
                    </a>
                  </>
                )
              })()}
              </div>
            )}
          </div>

          {/* Sign Out Section */}
          <div className="border-t border-[#E5E7EB] px-4 py-4">
            {isLoading ? (
              <div className="h-12 bg-gray-200 animate-pulse rounded-xl"></div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-[#DC2626] rounded-xl hover:bg-[#FEF2F2] transition-colors border border-red-100 shadow-sm"
              >
                <LogOut className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Header - Show when sidebar is closed */}
      <div className="md:hidden bg-white border-b border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#6C757D] mr-3 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={`${siteName} Icon`}
                className="h-6 w-6"
              />
            ) : (
              <div className="h-6 w-6 bg-[#3D8BFF] rounded flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
            )}
            <h1 className="ml-2 text-lg font-bold text-[#1A1A1A]">IndexNow</h1>
          </div>
          {user && (
            <p className="text-sm text-[#6C757D] truncate max-w-32">{user.email}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar