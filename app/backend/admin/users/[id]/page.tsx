'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Key, 
  Ban, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  Activity,
  Clock,
  LogIn,
  LogOut,
  Settings,
  Zap,
  Server,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  package_id?: string
  subscribed_at?: string
  expires_at?: string
  daily_quota_used?: number
  daily_quota_reset_date?: string
  package?: {
    id: string
    name: string
    slug: string
    description: string
    price: number
    currency: string
    billing_period: string
    features: string[]
    quota_limits: {
      service_accounts: number
      daily_urls: number
      concurrent_jobs: number
    }
    is_active: boolean
  }
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
  resetQuota: boolean
  changePackage: boolean
  extendSubscription: boolean
}

interface ActivityLog {
  id: string
  event_type: string
  action_description: string
  success: boolean
  created_at: string
  ip_address?: string
  user_agent?: string
  error_message?: string
}

interface SecurityData {
  ipAddresses: string[]
  devices: Array<{
    type: string
    browser: string
    os: string
    firstSeen: string
    lastUsed: string
    usageCount: number
  }>
  locations: string[]
  loginAttempts: {
    total: number
    successful: number
    failed: number
    recent: Array<{
      success: boolean
      timestamp: string
      ip_address?: string
      device_info?: any
    }>
  }
  activity: {
    lastActivity: string | null
    firstSeen: string | null
    totalActivities: number
  }
  securityScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

export default function UserDetail() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<UserActions>({
    suspend: false,
    resetPassword: false,
    editData: false,
    resetQuota: false,
    changePackage: false,
    extendSubscription: false
  })
  const [editMode, setEditMode] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  
  // Security data state
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [securityLoading, setSecurityLoading] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
    email_notifications: false,
    phone_number: ''
  })

  useEffect(() => {
    if (userId) {
      fetchUser()
      fetchUserActivity()
      fetchUserSecurity()
    }
  }, [userId])

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/activity?limit=10`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setActivityLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch user activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const fetchUserSecurity = async () => {
    try {
      setSecurityLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/security`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSecurityData(data.security)
      }
    } catch (error) {
      console.error('Failed to fetch user security data:', error)
    } finally {
      setSecurityLoading(false)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setEditForm({
          full_name: data.user.full_name || '',
          role: data.user.role,
          email_notifications: data.user.email_notifications,
          phone_number: data.user.phone_number || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendUser = async () => {
    if (!user) return
    
    setActionLoading(prev => ({ ...prev, suspend: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchUser() // Refresh user data
        await fetchUserActivity() // Refresh activity logs
      }
    } catch (error) {
      console.error('Failed to suspend user:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, suspend: false }))
    }
  }

  const handleResetPassword = async () => {
    if (!user) return
    
    setActionLoading(prev => ({ ...prev, resetPassword: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNewPassword(data.newPassword)
        await fetchUserActivity() // Refresh activity logs
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, resetPassword: false }))
    }
  }

  const handleSaveEdit = async () => {
    if (!user) return
    
    setActionLoading(prev => ({ ...prev, editData: true }))
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        await fetchUser() // Refresh user data
        await fetchUserActivity() // Refresh activity logs
        await fetchUserSecurity() // Refresh security data
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, editData: false }))
    }
  }

  const handleResetQuota = async () => {
    if (!confirm('Are you sure you want to reset this user\'s daily quota? This will reset their usage to 0.')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, resetQuota: true }))
      
      const response = await fetch(`/api/admin/users/${userId}/reset-quota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        await fetchUser() // Refresh user data
        alert('User quota has been successfully reset.')
      } else {
        alert('Failed to reset quota. Please try again.')
      }
    } catch (error) {
      console.error('Failed to reset quota:', error)
      alert('An error occurred while resetting quota.')
    } finally {
      setActionLoading(prev => ({ ...prev, resetQuota: false }))
    }
  }

  const handleChangePackage = async () => {
    // For now, show a coming soon message
    alert('Package change functionality coming soon!')
  }

  const handleExtendSubscription = async () => {
    if (!confirm('Are you sure you want to extend this user\'s subscription by 30 days?')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, extendSubscription: true }))
      
      const response = await fetch(`/api/admin/users/${userId}/extend-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days: 30 }),
      })

      if (response.ok) {
        await fetchUser() // Refresh user data
        alert('Subscription has been extended by 30 days.')
      } else {
        alert('Failed to extend subscription. Please try again.')
      }
    } catch (error) {
      console.error('Failed to extend subscription:', error)
      alert('An error occurred while extending subscription.')
    } finally {
      setActionLoading(prev => ({ ...prev, extendSubscription: false }))
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
      case 'admin':
        return 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20'
      case 'user':
        return 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
      default:
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
    }
  }

  const getStatusIcon = (user: UserProfile) => {
    if (user.email_confirmed_at) {
      return <CheckCircle className="h-5 w-5 text-[#4BB543]" />
    } else {
      return <AlertTriangle className="h-5 w-5 text-[#F0A202]" />
    }
  }

  // Helper functions for activity display
  const getEventIcon = (eventType: string) => {
    const icons = {
      login: LogIn,
      logout: LogOut,
      register: User,
      job_create: Zap,
      job_update: Settings,
      job_delete: XCircle,
      job_start: CheckCircle,
      service_account_add: Shield,
      service_account_delete: XCircle,
      profile_update: User,
      admin_login: Shield,
      user_management: Settings,
      api_call: Server,
      settings_change: Settings
    }
    
    return icons[eventType as keyof typeof icons] || Activity
  }

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return { icon: Monitor, text: 'Desktop' }
    
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('iphone')) {
      return { icon: Smartphone, text: 'Mobile' }
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return { icon: Tablet, text: 'Tablet' }
    }
    
    return { icon: Monitor, text: 'Desktop' }
  }

  const formatActivityDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <XCircle className="h-12 w-12 text-[#E63946] mb-4" />
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">User Not Found</h2>
        <p className="text-[#6C757D] mb-4">The user you're looking for doesn't exist.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">User Details</h1>
            <p className="text-[#6C757D] mt-1">Manage user account and permissions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors flex items-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit User</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-[#E0E6ED] text-[#6C757D] rounded-lg hover:bg-[#F7F9FC] transition-colors flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading.editData}
                className="px-4 py-2 bg-[#4BB543] text-white rounded-lg hover:bg-[#4BB543]/90 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{actionLoading.editData ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="w-16 h-16 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-[#3D8BFF]">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </span>
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                {!editMode ? (
                  <>
                    <h2 className="text-xl font-bold text-[#1A1A1A]">
                      {user.full_name || 'No name set'}
                    </h2>
                    <p className="text-[#6C757D]">{user.email}</p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Full name"
                      className="text-xl font-bold text-[#1A1A1A] border border-[#E0E6ED] rounded-lg px-3 py-1 focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                    />
                    <p className="text-[#6C757D]">{user.email}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {!editMode ? (
                  <>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(user)}
                      <span className="text-sm text-[#6C757D]">
                        {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </>
                ) : (
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="px-3 py-1 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                )}
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E0E6ED]">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">User ID</p>
                  <p className="text-sm font-mono text-[#1A1A1A]">{user.user_id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Phone</p>
                  {!editMode ? (
                    <p className="text-sm text-[#1A1A1A]">{user.phone_number || 'Not provided'}</p>
                  ) : (
                    <input
                      type="text"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="Phone number"
                      className="text-sm text-[#1A1A1A] border border-[#E0E6ED] rounded px-2 py-1 focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Joined</p>
                  <p className="text-sm text-[#1A1A1A]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Last Active</p>
                  <p className="text-sm text-[#1A1A1A]">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Email Notifications</p>
                  {!editMode ? (
                    <p className="text-sm text-[#1A1A1A]">
                      {user.email_notifications ? 'Enabled' : 'Disabled'}
                    </p>
                  ) : (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.email_notifications}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email_notifications: e.target.checked }))}
                        className="w-4 h-4 text-[#3D8BFF] border-[#E0E6ED] rounded focus:ring-[#3D8BFF]"
                      />
                      <span className="text-sm text-[#1A1A1A]">Enable notifications</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package Subscription Information */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
            <Zap className="h-5 w-5 text-[#3D8BFF]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Package Subscription</h3>
            <p className="text-sm text-[#6C757D]">Current subscription plan and quota details</p>
          </div>
        </div>

        {user.package ? (
          <div className="space-y-6">
            {/* Current Package Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-[#1A1A1A]">Current Plan</h4>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                    user.package.slug === 'free' ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20' :
                    user.package.slug === 'premium' ? 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20' :
                    user.package.slug === 'pro' ? 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20' :
                    'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                  }`}>
                    {user.package.name}
                  </span>
                </div>
                
                <div className="bg-[#F7F9FC] rounded-lg p-4">
                  <p className="text-sm text-[#6C757D] mb-2">{user.package.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[#1A1A1A]">
                      {user.package.price === 0 ? 'Free' : `${user.package.currency} ${user.package.price.toLocaleString()}`}
                    </span>
                    <span className="text-sm text-[#6C757D]">
                      per {user.package.billing_period}
                    </span>
                  </div>
                </div>

                {/* Package Features */}
                <div>
                  <h5 className="font-medium text-[#1A1A1A] mb-2">Features</h5>
                  <ul className="space-y-1">
                    {user.package.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center space-x-2 text-sm text-[#6C757D]">
                        <CheckCircle className="h-4 w-4 text-[#4BB543]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-[#1A1A1A]">Subscription Details</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-[#6C757D]" />
                    <div>
                      <p className="text-xs text-[#6C757D] uppercase tracking-wide">Subscribed</p>
                      <p className="text-sm text-[#1A1A1A]">
                        {user.subscribed_at ? new Date(user.subscribed_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-[#6C757D]" />
                    <div>
                      <p className="text-xs text-[#6C757D] uppercase tracking-wide">Expires</p>
                      <p className="text-sm text-[#1A1A1A]">
                        {user.expires_at ? (
                          user.package.slug === 'free' ? 'Never' : new Date(user.expires_at).toLocaleDateString()
                        ) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Zap className="h-4 w-4 text-[#6C757D]" />
                    <div>
                      <p className="text-xs text-[#6C757D] uppercase tracking-wide">Status</p>
                      <p className="text-sm text-[#1A1A1A]">
                        {user.expires_at && new Date(user.expires_at) > new Date() ? (
                          <span className="text-[#4BB543]">Active</span>
                        ) : user.package.slug === 'free' ? (
                          <span className="text-[#4BB543]">Active</span>
                        ) : (
                          <span className="text-[#E63946]">Expired</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quota Information */}
            <div className="border-t border-[#E0E6ED] pt-6">
              <h4 className="font-medium text-[#1A1A1A] mb-4">Quota Limits & Usage</h4>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#F7F9FC] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6C757D]">Daily URLs</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1A1A1A]">
                        {user.daily_quota_used || 0}
                      </p>
                      <p className="text-xs text-[#6C757D]">
                        / {user.package.quota_limits.daily_urls === -1 ? '∞' : user.package.quota_limits.daily_urls}
                      </p>
                    </div>
                  </div>
                  {user.package.quota_limits.daily_urls !== -1 && (
                    <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                      <div 
                        className="bg-[#3D8BFF] h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((user.daily_quota_used || 0) / user.package.quota_limits.daily_urls) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className="bg-[#F7F9FC] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6C757D]">Service Accounts</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1A1A1A]">-</p>
                      <p className="text-xs text-[#6C757D]">
                        / {user.package.quota_limits.service_accounts === -1 ? '∞' : user.package.quota_limits.service_accounts}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F7F9FC] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6C757D]">Concurrent Jobs</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1A1A1A]">-</p>
                      <p className="text-xs text-[#6C757D]">
                        / {user.package.quota_limits.concurrent_jobs === -1 ? '∞' : user.package.quota_limits.concurrent_jobs}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-3">
                <Clock className="h-4 w-4 text-[#6C757D]" />
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Quota Reset</p>
                  <p className="text-sm text-[#1A1A1A]">
                    {user.daily_quota_reset_date ? new Date(user.daily_quota_reset_date).toLocaleDateString() : 'Daily'}
                  </p>
                </div>
              </div>
            </div>

            {/* Package Management Actions */}
            {!editMode && (
              <div className="flex items-center space-x-3 pt-4 border-t border-[#E0E6ED]">
                <button 
                  onClick={handleChangePackage}
                  disabled={actionLoading.changePackage}
                  className="px-4 py-2 border border-[#E0E6ED] text-[#6C757D] rounded-lg hover:bg-[#F7F9FC] transition-colors text-sm disabled:opacity-50"
                >
                  {actionLoading.changePackage ? 'Processing...' : 'Change Package'}
                </button>
                <button 
                  onClick={handleResetQuota}
                  disabled={actionLoading.resetQuota}
                  className="px-4 py-2 border border-[#E0E6ED] text-[#6C757D] rounded-lg hover:bg-[#F7F9FC] transition-colors text-sm disabled:opacity-50"
                >
                  {actionLoading.resetQuota ? 'Resetting...' : 'Reset Quota'}
                </button>
                <button 
                  onClick={handleExtendSubscription}
                  disabled={actionLoading.extendSubscription}
                  className="px-4 py-2 border border-[#E0E6ED] text-[#6C757D] rounded-lg hover:bg-[#F7F9FC] transition-colors text-sm disabled:opacity-50"
                >
                  {actionLoading.extendSubscription ? 'Extending...' : 'Extend Subscription'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#6C757D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-[#6C757D]" />
            </div>
            <h4 className="font-medium text-[#1A1A1A] mb-2">No Package Assigned</h4>
            <p className="text-sm text-[#6C757D] mb-4">This user doesn't have a subscription package assigned.</p>
            <button className="px-4 py-2 bg-[#3D8BFF] text-white rounded-lg hover:bg-[#3D8BFF]/90 transition-colors text-sm">
              Assign Package
            </button>
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {!editMode && (
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Admin Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reset Password */}
            <div className="border border-[#E0E6ED] rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-[#F0A202]/10">
                  <Key className="h-5 w-5 text-[#F0A202]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A]">Reset Password</h4>
                  <p className="text-xs text-[#6C757D]">Generate new password</p>
                </div>
              </div>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading.resetPassword}
                className="w-full px-4 py-2 bg-[#F0A202] text-white rounded-lg hover:bg-[#F0A202]/90 transition-colors disabled:opacity-50"
              >
                {actionLoading.resetPassword ? 'Generating...' : 'Reset Password'}
              </button>
            </div>

            {/* Suspend User */}
            <div className="border border-[#E0E6ED] rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-[#E63946]/10">
                  <Ban className="h-5 w-5 text-[#E63946]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A]">Suspend User</h4>
                  <p className="text-xs text-[#6C757D]">Temporarily disable account</p>
                </div>
              </div>
              <button
                onClick={handleSuspendUser}
                disabled={actionLoading.suspend}
                className="w-full px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#E63946]/90 transition-colors disabled:opacity-50"
              >
                {actionLoading.suspend ? 'Processing...' : 'Suspend User'}
              </button>
            </div>

            {/* User Settings */}
            <div className="border border-[#E0E6ED] rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
                  <Shield className="h-5 w-5 text-[#3D8BFF]" />
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A]">User Permissions</h4>
                  <p className="text-xs text-[#6C757D]">Advanced settings</p>
                </div>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="w-full px-4 py-2 border border-[#3D8BFF] text-[#3D8BFF] rounded-lg hover:bg-[#3D8BFF]/10 transition-colors"
              >
                Manage Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Password Display */}
      {newPassword && (
        <div className="bg-[#F0A202]/10 border border-[#F0A202]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Key className="h-5 w-5 text-[#F0A202]" />
              <div>
                <h4 className="font-medium text-[#1A1A1A]">New Password Generated</h4>
                <p className="text-sm text-[#6C757D]">Share this password with the user securely</p>
              </div>
            </div>
            <button
              onClick={() => setNewPassword(null)}
              className="p-1 text-[#6C757D] hover:text-[#1A1A1A] rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 bg-white border border-[#E0E6ED] rounded-lg px-3 py-2 font-mono text-sm">
              {showPassword ? newPassword : '••••••••••••'}
            </div>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 border border-[#E0E6ED] rounded-lg hover:bg-[#F7F9FC] transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(newPassword)}
              className="px-3 py-2 bg-[#F0A202] text-white rounded-lg hover:bg-[#F0A202]/90 transition-colors text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Security Information */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#E63946]/10">
            <Shield className="h-5 w-5 text-[#E63946]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Security Information</h3>
            <p className="text-sm text-[#6C757D]">IP addresses, devices, and login security analysis</p>
          </div>
        </div>

        {securityLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#3D8BFF]"></div>
          </div>
        ) : securityData ? (
          <div className="space-y-6">
            {/* Security Overview */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#F7F9FC] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    securityData.riskLevel === 'low' ? 'bg-[#4BB543]/10' : 
                    securityData.riskLevel === 'medium' ? 'bg-[#F0A202]/10' : 'bg-[#E63946]/10'
                  }`}>
                    <Shield className={`h-4 w-4 ${
                      securityData.riskLevel === 'low' ? 'text-[#4BB543]' : 
                      securityData.riskLevel === 'medium' ? 'text-[#F0A202]' : 'text-[#E63946]'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Security Score</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{securityData.securityScore}/100</p>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full w-fit ${
                  securityData.riskLevel === 'low' ? 'bg-[#4BB543]/10 text-[#4BB543]' : 
                  securityData.riskLevel === 'medium' ? 'bg-[#F0A202]/10 text-[#F0A202]' : 'bg-[#E63946]/10 text-[#E63946]'
                }`}>
                  {securityData.riskLevel.toUpperCase()} RISK
                </div>
              </div>

              <div className="bg-[#F7F9FC] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Globe className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Unique IP Addresses</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{securityData.ipAddresses.length}</p>
                  </div>
                </div>
                <p className="text-xs text-[#6C757D]">Different locations</p>
              </div>

              <div className="bg-[#F7F9FC] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Unique Devices</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{securityData.devices.length}</p>
                  </div>
                </div>
                <p className="text-xs text-[#6C757D]">Different browsers/devices</p>
              </div>
            </div>

            {/* Login Attempts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login Attempts
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">Total Attempts</span>
                    <span className="text-[#1A1A1A] text-sm font-semibold">{securityData.loginAttempts.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">Successful</span>
                    <span className="text-[#4BB543] text-sm font-semibold">{securityData.loginAttempts.successful}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">Failed</span>
                    <span className="text-[#E63946] text-sm font-semibold">{securityData.loginAttempts.failed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#6C757D] text-sm">Success Rate</span>
                    <span className="text-[#1A1A1A] text-sm font-semibold">
                      {securityData.loginAttempts.total > 0 
                        ? Math.round((securityData.loginAttempts.successful / securityData.loginAttempts.total) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Overview
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">Total Activities</span>
                    <span className="text-[#1A1A1A] text-sm font-semibold">{securityData.activity.totalActivities}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">Last Activity</span>
                    <span className="text-[#1A1A1A] text-sm">
                      {securityData.activity.lastActivity 
                        ? formatActivityDate(securityData.activity.lastActivity)
                        : 'No activity'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                    <span className="text-[#6C757D] text-sm">First Seen</span>
                    <span className="text-[#1A1A1A] text-sm">
                      {securityData.activity.firstSeen 
                        ? formatActivityDate(securityData.activity.firstSeen)
                        : 'Unknown'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[#6C757D] text-sm">Locations</span>
                    <span className="text-[#1A1A1A] text-sm font-semibold">{securityData.locations.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* IP Addresses and Devices */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* IP Addresses */}
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  IP Addresses ({securityData.ipAddresses.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {securityData.ipAddresses.map((ip, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-[#F7F9FC] rounded-lg">
                      <Globe className="h-4 w-4 text-[#6C757D]" />
                      <div className="flex-1">
                        <div className="text-[#1A1A1A] text-sm font-mono">{ip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Devices ({securityData.devices.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {securityData.devices.map((device, index) => {
                    const DeviceIcon = device.type === 'mobile' ? Smartphone : 
                                      device.type === 'tablet' ? Tablet : Monitor
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 bg-[#F7F9FC] rounded-lg">
                        <DeviceIcon className="h-4 w-4 text-[#6C757D]" />
                        <div className="flex-1">
                          <div className="text-[#1A1A1A] text-sm font-medium">
                            {device.browser} on {device.os}
                          </div>
                          <div className="text-[#6C757D] text-xs">
                            Used {device.usageCount} times • Last: {formatActivityDate(device.lastUsed)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-[#6C757D] mx-auto mb-4 opacity-50" />
            <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No Security Data</h4>
            <p className="text-[#6C757D]">No security information available for this user</p>
          </div>
        )}
      </div>

      {/* User Activity History */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
              <Activity className="h-5 w-5 text-[#3D8BFF]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Recent Activity</h3>
              <p className="text-sm text-[#6C757D]">Latest user activities and events</p>
            </div>
          </div>
          {activityLogs.length > 0 && (
            <Link 
              href={`/backend/admin/activity?user=${userId}`}
              className="flex items-center gap-2 text-[#3D8BFF] hover:text-[#1A1A1A] transition-colors text-sm font-medium"
            >
              View All Activity
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#3D8BFF]"></div>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-[#6C757D] mx-auto mb-4 opacity-50" />
            <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No Recent Activity</h4>
            <p className="text-[#6C757D]">This user hasn't performed any tracked activities yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activityLogs.map((log, index) => {
              const EventIcon = getEventIcon(log.event_type)
              const deviceInfo = getDeviceInfo(log.user_agent)
              const DeviceIcon = deviceInfo.icon
              
              return (
                <div 
                  key={log.id}
                  className="border border-[#E0E6ED] rounded-lg p-4 hover:bg-[#F7F9FC] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-lg ${log.success ? 'bg-[#4BB543]/10' : 'bg-[#E63946]/10'}`}>
                        <EventIcon className={`h-4 w-4 ${log.success ? 'text-[#4BB543]' : 'text-[#E63946]'}`} />
                      </div>
                      {index < activityLogs.length - 1 && (
                        <div className="w-px h-8 bg-[#E0E6ED] mt-2"></div>
                      )}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-[#1A1A1A] text-sm font-medium">
                            {log.action_description}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-[#6C757D] text-xs">
                              <Clock className="h-3 w-3" />
                              <span>{formatActivityDate(log.created_at)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-[#6C757D] text-xs">
                              <DeviceIcon className="h-3 w-3" />
                              <span>{deviceInfo.text}</span>
                            </div>
                            
                            {log.ip_address && (
                              <div className="flex items-center gap-1 text-[#6C757D] text-xs">
                                <Globe className="h-3 w-3" />
                                <span className="font-mono">{log.ip_address}</span>
                              </div>
                            )}
                          </div>

                          {log.error_message && (
                            <div className="mt-2 text-xs text-[#E63946] bg-[#E63946]/5 px-2 py-1 rounded">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            log.success 
                              ? 'bg-[#4BB543]/10 text-[#4BB543]' 
                              : 'bg-[#E63946]/10 text-[#E63946]'
                          }`}>
                            {log.success ? 'Success' : 'Failed'}
                          </div>
                          
                          <Link href={`/backend/admin/activity/${log.id}`}>
                            <button className="p-1 text-[#6C757D] hover:text-[#3D8BFF] rounded transition-colors">
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}