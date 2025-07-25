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
  EyeOff
} from 'lucide-react'

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
    }
  }, [userId])

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
    </div>
  )
}