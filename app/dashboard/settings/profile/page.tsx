'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { 
  User, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

export default function ProfileSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  
  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/profile', 'Profile Settings', { section: 'profile_settings' })
  const { logDashboardActivity } = useActivityLogger()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Real data states
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    email_notifications: false
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) return

      setCurrentUser(user as any)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load user profile
      const profileResponse = await fetch('/api/v1/auth/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setUserProfile(profileData.profile)
        setProfileForm({
          full_name: profileData.profile.full_name || '',
          phone_number: profileData.profile.phone_number || '',
          email_notifications: profileData.profile.email_notifications || false
        })
      } else if (profileResponse.status === 404) {
        // Profile doesn't exist, create default values
        setProfileForm({
          full_name: user.email?.split('@')[0] || '',
          phone_number: '',
          email_notifications: false
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/v1/auth/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Profile updated successfully',
          type: 'success'
        })
        await logDashboardActivity('profile_update', 'Profile information updated')
        loadData() // Refresh data
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update profile',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update profile',
        type: 'error'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      addToast({
        title: 'Validation Error',
        description: 'Please fill in all password fields',
        type: 'error'
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        type: 'error'
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      addToast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters long',
        type: 'error'
      })
      return
    }

    try {
      setSavingPassword(true)
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordForm.currentPassword
      })

      if (signInError) {
        addToast({
          title: 'Authentication Error',
          description: 'Current password is incorrect',
          type: 'error'
        })
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (updateError) {
        addToast({
          title: 'Update Error',
          description: updateError.message || 'Failed to update password',
          type: 'error'
        })
        return
      }

      addToast({
        title: 'Success',
        description: 'Password updated successfully',
        type: 'success'
      })

      await logProfileActivity('password_change', 'Password updated successfully')
      
      // Clear password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error changing password:', error)
      addToast({
        title: 'Error',
        description: 'Failed to change password',
        type: 'error'
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-stretch">
      {/* Profile Information */}
      <div className="p-6 rounded-lg flex flex-col" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
        <h3 className="font-semibold mb-6" style={{color: '#1A1A1A'}}>Profile Information</h3>
        
        <div className="flex-1 space-y-6">
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Full Name</label>
          <input 
            type="text"
            className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E0E6ED',
              color: '#1A1A1A'
            }}
            placeholder="Enter your full name"
            value={profileForm.full_name}
            onChange={(e) => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Email Address</label>
          <input 
            type="email"
            className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#F7F9FC',
              borderColor: '#E0E6ED',
              color: '#6C757D'
            }}
            value={currentUser?.email || ''}
            readOnly
          />
          <p className="text-xs mt-1" style={{color: '#6C757D'}}>Email cannot be changed directly. Contact support if needed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Phone Number</label>
          <input 
            type="tel"
            className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E0E6ED',
              color: '#1A1A1A'
            }}
            placeholder="Enter your phone number"
            value={profileForm.phone_number}
            onChange={(e) => setProfileForm(prev => ({...prev, phone_number: e.target.value}))}
          />
          </div>
        </div>

        <button 
          type="button"
          className="w-full py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 mt-auto"
          style={{backgroundColor: '#1C2331'}}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSaveProfile();
          }}
          disabled={savingProfile}
        >
          {savingProfile ? 'Updating...' : 'Update Profile'}
        </button>
      </div>

      {/* Change Password */}
      <div className="p-6 rounded-lg flex flex-col" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
        <h3 className="font-semibold mb-6" style={{color: '#1A1A1A'}}>Change Password</h3>
        
        <div className="flex-1 space-y-6">
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Current Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              className="w-full p-3 pr-10 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E0E6ED',
                color: '#1A1A1A'
              }}
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
              style={{color: '#6C757D'}}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>New Password</label>
          <input 
            type="password"
            className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E0E6ED',
              color: '#1A1A1A'
            }}
            placeholder="Enter new password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Confirm New Password</label>
          <input 
            type="password"
            className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E0E6ED',
              color: '#1A1A1A'
            }}
            placeholder="Confirm new password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
          />
          </div>
        </div>

        <button 
          className="w-full py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 mt-auto"
          style={{backgroundColor: '#1C2331'}}
          onClick={handleChangePassword}
          disabled={savingPassword}
        >
          {savingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  )
}