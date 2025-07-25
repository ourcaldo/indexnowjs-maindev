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
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
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

export default function UserDetail() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<UserActions>({
    suspend: false,
    resetPassword: false,
    editData: false
  })
  const [editMode, setEditMode] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  
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
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, editData: false }))
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

      {/* Comprehensive User Information */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
            <User className="h-5 w-5 text-[#3D8BFF]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">User Information</h3>
            <p className="text-sm text-[#6C757D]">Comprehensive user details and device information</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Account Information */}
          <div>
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Account Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">User ID</span>
                <span className="text-[#1A1A1A] text-sm font-mono">{user?.user_id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Account Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(user)}
                  <span className="text-[#1A1A1A] text-sm">
                    {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Member Since</span>
                <span className="text-[#1A1A1A] text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Last Updated</span>
                <span className="text-[#1A1A1A] text-sm">
                  {user?.updated_at ? new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div>
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Total Activities</span>
                <span className="text-[#1A1A1A] text-sm font-semibold">{activityLogs.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Successful Actions</span>
                <span className="text-[#4BB543] text-sm font-semibold">
                  {activityLogs.filter(log => log.success).length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Failed Actions</span>
                <span className="text-[#E63946] text-sm font-semibold">
                  {activityLogs.filter(log => !log.success).length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E0E6ED]">
                <span className="text-[#6C757D] text-sm">Last Activity</span>
                <span className="text-[#1A1A1A] text-sm">
                  {activityLogs.length > 0 
                    ? formatActivityDate(activityLogs[0].created_at)
                    : 'No activity'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Device and IP Information */}
        {activityLogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E0E6ED]">
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Device & Access Information
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Devices */}
              <div>
                <h5 className="text-xs font-medium text-[#6C757D] mb-3 uppercase tracking-wide">Recent Devices</h5>
                <div className="space-y-2">
                  {Array.from(new Set(activityLogs.slice(0, 5).map(log => log.user_agent).filter(Boolean)))
                    .slice(0, 3)
                    .map((userAgent, index) => {
                      const deviceInfo = getDeviceInfo(userAgent)
                      const DeviceIcon = deviceInfo.icon
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 bg-[#F7F9FC] rounded-lg">
                          <DeviceIcon className="h-4 w-4 text-[#6C757D]" />
                          <div className="flex-1">
                            <div className="text-[#1A1A1A] text-sm font-medium">{deviceInfo.text}</div>
                            <div className="text-[#6C757D] text-xs truncate" title={userAgent}>
                              {userAgent?.substring(0, 50)}...
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Recent IP Addresses */}
              <div>
                <h5 className="text-xs font-medium text-[#6C757D] mb-3 uppercase tracking-wide">Recent IP Addresses</h5>
                <div className="space-y-2">
                  {Array.from(new Set(activityLogs.slice(0, 10).map(log => log.ip_address).filter(Boolean)))
                    .slice(0, 5)
                    .map((ip, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-[#F7F9FC] rounded-lg">
                        <Globe className="h-4 w-4 text-[#6C757D]" />
                        <div className="flex-1">
                          <div className="text-[#1A1A1A] text-sm font-mono">{ip}</div>
                          <div className="text-[#6C757D] text-xs">
                            Used {activityLogs.filter(log => log.ip_address === ip).length} times
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
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