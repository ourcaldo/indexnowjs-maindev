'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit3,
  Save,
  X,
  XCircle
} from 'lucide-react'

// Import extracted components
import { UserProfileCard } from './components/UserProfileCard'
import { UserActionsPanel } from './components/UserActionsPanel'
import { PackageSubscriptionCard } from './components/PackageSubscriptionCard'
import { UserActivityCard } from './components/UserActivityCard'
import { UserSecurityCard } from './components/UserSecurityCard'
import { PackageChangeModal } from './components/PackageChangeModal'

// Types
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
  subscription_ends_at?: string
  daily_quota_used?: number
  daily_quota_limit?: number
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
  event_description: string
  ip_address?: string
  user_agent?: string
  metadata?: any
  created_at: string
}

interface SecurityData {
  ipAddresses: Array<{
    ip: string
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

  // Main state
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  
  // Action states
  const [actionLoading, setActionLoading] = useState<UserActions>({
    suspend: false,
    resetPassword: false,
    editData: false,
    resetQuota: false,
    changePackage: false,
    extendSubscription: false
  })
  
  // Password reset state
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Package change modal state
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [availablePackages, setAvailablePackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  
  // Activity and security state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [securityData, setSecurityData] = useState<SecurityData | null>(null)
  const [securityLoading, setSecurityLoading] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
    email_notifications: false,
    phone_number: ''
  })

  // Initialize data on mount
  useEffect(() => {
    if (userId) {
      fetchUser()
      fetchUserActivity()
      fetchUserSecurity()
    }
  }, [userId])

  // Data fetching functions
  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
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

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true)
      const response = await fetch(`/api/v1/admin/users/${userId}/activity?limit=10`, {
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
      const response = await fetch(`/api/v1/admin/users/${userId}/security`, {
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

  // Action handlers
  const handleSuspendUser = async () => {
    if (!user) return
    
    setActionLoading(prev => ({ ...prev, suspend: true }))
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchUser()
        await fetchUserActivity()
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
      const response = await fetch(`/api/v1/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNewPassword(data.newPassword)
        await fetchUserActivity()
      }
    } catch (error) {
      console.error('Failed to reset password:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, resetPassword: false }))
    }
  }

  const handleResetQuota = async () => {
    if (!confirm('Are you sure you want to reset this user\'s daily quota? This will reset their usage to 0.')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, resetQuota: true }))
      
      const response = await fetch(`/api/v1/admin/users/${userId}/reset-quota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        await fetchUser()
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
    try {
      const response = await fetch('/api/v1/billing/packages', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setAvailablePackages(data.packages || [])
        setSelectedPackageId(user?.package_id || '')
        setShowPackageModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error)
      alert('Failed to load packages. Please try again.')
    }
  }

  const handlePackageChangeSubmit = async () => {
    if (!selectedPackageId) {
      alert('Please select a package.')
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, changePackage: true }))
      
      const response = await fetch(`/api/v1/admin/users/${userId}/change-package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ packageId: selectedPackageId }),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchUser()
        setShowPackageModal(false)
        alert(data.message || 'Package changed successfully!')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to change package. Please try again.')
      }
    } catch (error) {
      console.error('Failed to change package:', error)
      alert('An error occurred while changing package.')
    } finally {
      setActionLoading(prev => ({ ...prev, changePackage: false }))
    }
  }

  const handleExtendSubscription = async () => {
    if (!confirm('Are you sure you want to extend this user\'s subscription by 30 days?')) {
      return
    }

    try {
      setActionLoading(prev => ({ ...prev, extendSubscription: true }))
      
      const response = await fetch(`/api/v1/admin/users/${userId}/extend-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ days: 30 }),
      })

      if (response.ok) {
        await fetchUser()
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

  const handleSaveEdit = async () => {
    if (!user) return
    
    setActionLoading(prev => ({ ...prev, editData: true }))
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        await fetchUser()
        await fetchUserActivity()
        await fetchUserSecurity()
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, editData: false }))
    }
  }

  // Helper functions
  const handleEditFormChange = (updates: Partial<typeof editForm>) => {
    setEditForm(prev => ({ ...prev, ...updates }))
  }

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  // User not found state
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
      <UserProfileCard
        user={user}
        editMode={editMode}
        editForm={editForm}
        onEditFormChange={handleEditFormChange}
      />

      {/* Package Subscription Card */}
      <PackageSubscriptionCard user={user} />

      {/* Admin Actions Panel */}
      <UserActionsPanel
        actionLoading={actionLoading}
        newPassword={newPassword}
        showPassword={showPassword}
        onTogglePasswordVisibility={handleTogglePasswordVisibility}
        onSuspendUser={handleSuspendUser}
        onResetPassword={handleResetPassword}
        onResetQuota={handleResetQuota}
        onChangePackage={handleChangePackage}
        onExtendSubscription={handleExtendSubscription}
      />

      {/* Recent Activity Card */}
      <UserActivityCard
        activityLogs={activityLogs}
        activityLoading={activityLoading}
      />

      {/* Security Overview Card */}
      <UserSecurityCard
        securityData={securityData}
        securityLoading={securityLoading}
      />

      {/* Package Change Modal */}
      <PackageChangeModal
        isOpen={showPackageModal}
        availablePackages={availablePackages}
        selectedPackageId={selectedPackageId}
        changePackageLoading={actionLoading.changePackage}
        onClose={() => setShowPackageModal(false)}
        onPackageSelect={setSelectedPackageId}
        onSubmit={handlePackageChangeSubmit}
      />
    </div>
  )
}