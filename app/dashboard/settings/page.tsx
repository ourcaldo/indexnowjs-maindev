'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { 
  Settings as SettingsIcon, 
  Mail, 
  User, 
  Key, 
  Trash2, 
  Plus,
  Bell,
  Database,
  Clock,
  RefreshCw,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  
  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings', 'Settings', { section: 'user_settings' })
  const { logProfileActivity, logServiceAccountActivity } = useActivityLogger()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingServiceAccount, setSavingServiceAccount] = useState(false)
  const [deletingServiceAccount, setDeletingServiceAccount] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [validateAccount, setValidateAccount] = useState(true)

  // Real data states
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userSettings, setUserSettings] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    email_notifications: false
  })

  const [notifications, setNotifications] = useState({
    jobCompletion: true,
    failures: true,
    dailyReports: true,
    criticalAlerts: true
  })

  const [generalSettings, setGeneralSettings] = useState({
    defaultSchedule: 'one-time',
    requestTimeout: 30000,
    retryAttempts: 3
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

      // Load service accounts
      const serviceAccountsResponse = await fetch('/api/service-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (serviceAccountsResponse.ok) {
        const serviceAccountsData = await serviceAccountsResponse.json()
        setServiceAccounts(serviceAccountsData.service_accounts || [])
      }

      // Load user profile
      const profileResponse = await fetch('/api/user/profile', {
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
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          phone_number: '',
          email_notifications: false
        })
      }

      // Load user settings
      const settingsResponse = await fetch('/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setUserSettings(settingsData.settings)
        setGeneralSettings({
          defaultSchedule: settingsData.settings.default_schedule || 'one-time',
          requestTimeout: (settingsData.settings.timeout_duration || 30000) / 1000, // Convert to seconds
          retryAttempts: settingsData.settings.retry_attempts || 3
        })
        setNotifications({
          jobCompletion: settingsData.settings.email_job_completion ?? true,
          failures: settingsData.settings.email_job_failure ?? true,
          dailyReports: settingsData.settings.email_daily_report ?? true,
          criticalAlerts: settingsData.settings.email_quota_alerts ?? true
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleAddServiceAccount = async () => {
    try {
      setSavingServiceAccount(true)
      let credentials
      try {
        credentials = JSON.parse(serviceAccountJson)
      } catch (error) {
        addToast({
          title: 'Invalid JSON',
          description: 'Please check your service account JSON format',
          type: 'error'
        })
        return
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/service-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: displayName || credentials.client_email?.split('@')[0] || 'Service Account',
          email: credentials.client_email,
          credentials
        })
      })

      if (response.ok) {
        setShowAddModal(false)
        setServiceAccountJson('')
        setDisplayName('')
        loadData() // Refresh service accounts
        addToast({
          title: 'Success',
          description: 'Service account added successfully',
          type: 'success'
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to add service account',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error adding service account:', error)
      addToast({
        title: 'Error',
        description: 'Failed to add service account',
        type: 'error'
      })
    } finally {
      setSavingServiceAccount(false)
    }
  }

  const handleSaveProfile = async () => {
    if (savingProfile) return
    try {
      setSavingProfile(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          phone_number: profileForm.phone_number,
          email_notifications: profileForm.email_notifications
        })
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Profile updated successfully',
          type: 'success'
        })
        loadData()
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update profile',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update profile',
        type: 'error'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveSettings = async () => {
    if (savingSettings) return
    try {
      setSavingSettings(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          default_schedule: generalSettings.defaultSchedule,
          timeout_duration: generalSettings.requestTimeout * 1000, // Convert to milliseconds
          retry_attempts: generalSettings.retryAttempts,
          email_job_completion: notifications.jobCompletion,
          email_job_failure: notifications.failures,
          email_quota_alerts: notifications.criticalAlerts,
          email_daily_report: notifications.dailyReports
        })
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Settings updated successfully',
          type: 'success'
        })
        loadData()
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update settings',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update settings',
        type: 'error'
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        addToast({
          title: 'Password Mismatch',
          description: 'New passwords do not match',
          type: 'error'
        })
        return
      }

      setSavingPassword(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(passwordForm)
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Password changed successfully',
          type: 'success'
        })
        setShowChangePasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to change password',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
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

  const handleDeleteServiceAccount = async (accountId: string) => {
    // Add proper confirmation dialog with toast
    const confirmed = window.confirm('Are you sure you want to delete this service account? This action cannot be undone.')
    if (!confirmed) {
      return
    }

    try {
      setDeletingServiceAccount(accountId)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch(`/api/service-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Service account deleted successfully',
          type: 'success'
        })
        loadData() // Refresh service accounts
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to delete service account',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting service account:', error)
      addToast({
        title: 'Error',
        description: 'Failed to delete service account',
        type: 'error'
      })
    } finally {
      setDeletingServiceAccount(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{color: '#1A1A1A'}}>Settings</h1>
        <p className="text-sm" style={{color: '#6C757D'}}>Configure your service accounts and preferences</p>
      </div>

      {/* Service Accounts & Quota Overview Section */}
      <div className="mb-8">
        {/* Desktop: 2-column layout, Mobile: stack with quota first */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Service Accounts (lg:col-span-2 on desktop, order-2 on mobile) */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                <Key className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Service Accounts</h2>
                <p className="text-sm" style={{color: '#6C757D'}}>Manage your Google service accounts for indexing requests</p>
              </div>
            </div>

            <div className="space-y-4">
              {serviceAccounts.length === 0 ? (
            <div className="text-center py-12" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED', borderRadius: '8px' }}>
              <Key className="w-12 h-12 mx-auto mb-4" style={{ color: '#6C757D' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#1A1A1A' }}>No service accounts configured</h3>
              <p className="text-sm mb-6" style={{ color: '#6C757D' }}>Add a service account to start indexing</p>
              <div className="mx-4 sm:mx-8 mb-6">
                <div className="p-6 rounded-lg border-2 border-dashed text-center" style={{ borderColor: '#E0E6ED' }}>
                  <Plus className="w-8 h-8 mx-auto mb-4" style={{ color: '#6C757D' }} />
                  <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Add a new service account</p>
                  <button 
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white transition-all duration-200 hover:opacity-90 mx-auto"
                    style={{backgroundColor: '#1C2331'}}
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Service Account
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
            {/* Add Service Account Button - Always show when accounts exist */}
            <div className="p-6 rounded-lg border-2 border-dashed text-center" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
              <Plus className="w-8 h-8 mx-auto mb-4" style={{color: '#6C757D'}} />
              <p className="text-sm mb-4" style={{color: '#6C757D'}}>Add a new service account</p>
              <button 
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white transition-all duration-200 hover:opacity-90 mx-auto"
                style={{backgroundColor: '#1C2331'}}
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4" />
                Add Service Account
              </button>
            </div>
            
            {/* Service Accounts List */}
            {serviceAccounts.map((account: any) => (
            <div key={account.id} className="p-4 sm:p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="font-medium text-sm sm:text-base truncate" style={{color: '#1A1A1A'}}>{account.email}</h3>
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium self-start"
                      style={{backgroundColor: '#4BB543', color: '#FFFFFF'}}
                    >
                      Active
                    </span>
                  </div>
                  <p className="text-sm mb-1" style={{color: '#6C757D'}}>{account.name}</p>
                  <p className="text-sm mb-2" style={{color: '#6C757D'}}>Daily Limit: {account.daily_quota_limit} requests</p>
                  <p className="text-sm" style={{color: '#6C757D'}}>Added {new Date(account.created_at).toLocaleDateString()}</p>
                </div>
                <button 
                  className="p-2 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-50 self-start sm:self-auto"
                  style={{color: '#E63946'}} 
                  title="Delete Account"
                  onClick={() => handleDeleteServiceAccount(account.id)}
                  disabled={deletingServiceAccount === account.id}
                >
                  {deletingServiceAccount === account.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {/* Usage Progress */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Daily Requests</span>
                  <span className="text-sm font-medium" style={{color: account.quota_usage?.requests_made > (account.daily_quota_limit * 0.9) ? '#E63946' : '#4BB543'}}>
                    {account.quota_usage?.requests_made > (account.daily_quota_limit * 0.9) ? 'Critical' : 'Normal'}
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{backgroundColor: '#E0E6ED'}}>
                  <div 
                    className="h-2 rounded-full" 
                    style={{width: `${((account.quota_usage?.requests_made || 0) / account.daily_quota_limit) * 100}%`, backgroundColor: (account.quota_usage?.requests_made || 0) > (account.daily_quota_limit * 0.9) ? '#E63946' : '#4BB543'}}
                  ></div>
                </div>
                <p className="text-sm mt-1" style={{color: '#6C757D'}}>{account.quota_usage?.requests_made || 0}/{account.daily_quota_limit}</p>
              </div>
            </div>
            ))}
            </>
          )}
            </div>
          </div>
          
          {/* Column 2: Total Daily Quota (lg:col-span-1 on desktop, order-1 on mobile) */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Total Daily Quota</h2>
                <p className="text-sm" style={{color: '#6C757D'}}>Combined quota from all service accounts</p>
              </div>
            </div>

            <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{color: '#1A1A1A'}}>
                  {serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0).toLocaleString()}
                </div>
                <p className="text-sm mb-4" style={{color: '#6C757D'}}>Total requests per day</p>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#F7F9FC'}}>
                    <div className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
                      {serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0)}
                    </div>
                    <p className="text-xs" style={{color: '#6C757D'}}>Used Today</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#F7F9FC'}}>
                    <div className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
                      {serviceAccounts.length}
                    </div>
                    <p className="text-xs" style={{color: '#6C757D'}}>Active Accounts</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Usage Today</span>
                    <span className="text-sm font-medium" style={{color: '#6C757D'}}>
                      {serviceAccounts.length > 0 ? Math.round((serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0) / serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-3" style={{backgroundColor: '#E0E6ED'}}>
                    <div 
                      className="h-3 rounded-full transition-all duration-300" 
                      style={{
                        width: `${serviceAccounts.length > 0 ? Math.round((serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0) / serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)) * 100) : 0}%`, 
                        backgroundColor: serviceAccounts.length > 0 && (serviceAccounts.reduce((total, account) => total + (account.quota_usage?.requests_made || 0), 0) / serviceAccounts.reduce((total, account) => total + (account.daily_quota_limit || 200), 0)) > 0.9 ? '#E63946' : '#4BB543'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combined General Settings */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#0d1b2a'}}>
            <SettingsIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>General Settings</h2>
          </div>
        </div>

        <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* General Settings Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Default Schedule</label>
                <select 
                  className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E6ED',
                    color: '#1A1A1A'
                  }}
                  value={generalSettings.defaultSchedule}
                  onChange={(e) => setGeneralSettings(prev => ({...prev, defaultSchedule: e.target.value}))}
                >
                  <option value="one-time">One-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Request Timeout (seconds)</label>
                <input 
                  type="number"
                  className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E6ED',
                    color: '#1A1A1A'
                  }}
                  value={generalSettings.requestTimeout}
                  onChange={(e) => setGeneralSettings(prev => ({...prev, requestTimeout: parseInt(e.target.value)}))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Retry Attempts</label>
                <input 
                  type="number"
                  className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E6ED',
                    color: '#1A1A1A'
                  }}
                  value={generalSettings.retryAttempts}
                  onChange={(e) => setGeneralSettings(prev => ({...prev, retryAttempts: parseInt(e.target.value)}))}
                />
              </div>
            </div>

            {/* Notification Settings Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{backgroundColor: '#22333b'}}>
                  <Mail className="w-3 h-3 text-white" />
                </div>
                <h3 className="font-semibold" style={{color: '#1A1A1A'}}>Notification Settings</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium" style={{color: '#1A1A1A'}}>Email notifications for job completion</h4>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.jobCompletion ? 'bg-opacity-100' : 'bg-opacity-20'
                  }`}
                  style={{backgroundColor: notifications.jobCompletion ? '#1C2331' : '#6C757D'}}
                  onClick={() => handleNotificationToggle('jobCompletion')}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      notifications.jobCompletion ? 'translate-x-6' : 'translate-x-1'
                    } mt-1`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium" style={{color: '#1A1A1A'}}>Email notifications for failures</h4>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.failures ? 'bg-opacity-100' : 'bg-opacity-20'
                  }`}
                  style={{backgroundColor: notifications.failures ? '#1C2331' : '#6C757D'}}
                  onClick={() => handleNotificationToggle('failures')}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      notifications.failures ? 'translate-x-6' : 'translate-x-1'
                    } mt-1`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium" style={{color: '#1A1A1A'}}>Daily quota reports</h4>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.dailyReports ? 'bg-opacity-100' : 'bg-opacity-20'
                  }`}
                  style={{backgroundColor: notifications.dailyReports ? '#1C2331' : '#6C757D'}}
                  onClick={() => handleNotificationToggle('dailyReports')}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      notifications.dailyReports ? 'translate-x-6' : 'translate-x-1'
                    } mt-1`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium" style={{color: '#1A1A1A'}}>Critical quota alerts</h4>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifications.criticalAlerts ? 'bg-opacity-100' : 'bg-opacity-20'
                  }`}
                  style={{backgroundColor: notifications.criticalAlerts ? '#1C2331' : '#6C757D'}}
                  onClick={() => handleNotificationToggle('criticalAlerts')}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      notifications.criticalAlerts ? 'translate-x-6' : 'translate-x-1'
                    } mt-1`}
                  />
                  </button>
              </div>
            </div>
          </div>
          
          {/* Save Button inside the box */}
          <div className="mt-8 flex justify-end">
            <button 
              type="button"
              className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{backgroundColor: '#1C2331'}}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveSettings();
              }}
              disabled={savingSettings}
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#1E1E1E'}}>
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>User Profile</h2>
            <p className="text-sm" style={{color: '#6C757D'}}>Update your profile information and password</p>
          </div>
        </div>

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
      </div>

      {/* Add Service Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full" style={{backgroundColor: '#FFFFFF'}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Add Service Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                style={{color: '#6C757D'}}
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <p className="text-sm mb-6" style={{color: '#6C757D'}}>
              Add a Google service account to enable indexing requests. The service account must be added as an owner in Google Search Console.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>
                  Service Account JSON
                </label>
                <textarea
                  className="w-full p-3 rounded-lg text-sm border resize-none"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E6ED',
                    color: '#1A1A1A',
                    minHeight: '200px'
                  }}
                  placeholder={`Paste your Google service account JSON here...

Example format:
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service@project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}`}
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                />
                <p className="text-xs mt-1" style={{color: '#6C757D'}}>
                  Download this JSON file from Google Cloud Console → IAM & Admin → Service Accounts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  className="w-full p-3 rounded-lg text-sm border"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E0E6ED',
                    color: '#1A1A1A'
                  }}
                  placeholder="e.g., Production Account"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="validate"
                  checked={validateAccount}
                  onChange={(e) => setValidateAccount(e.target.checked)}
                  className="w-4 h-4 rounded border"
                  style={{accentColor: '#1C2331'}}
                />
                <label htmlFor="validate" className="text-sm" style={{color: '#1A1A1A'}}>
                  Validate account before saving
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                className="flex-1 py-3 rounded-lg font-medium border transition-all duration-200 hover:bg-gray-50"
                style={{
                  borderColor: '#E0E6ED',
                  color: '#6C757D'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAddModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                style={{backgroundColor: '#1C2331'}}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddServiceAccount();
                }}
                disabled={savingServiceAccount}
              >
                {savingServiceAccount ? 'Adding...' : 'Add Service Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
