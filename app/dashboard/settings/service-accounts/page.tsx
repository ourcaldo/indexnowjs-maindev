'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { 
  Key,
  Trash2, 
  Plus,
  Database,
  RefreshCw
} from 'lucide-react'

export default function ServiceAccountsSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  
  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/service-accounts', 'Service Accounts Settings', { section: 'service_accounts' })
  const { logServiceAccountActivity } = useActivityLogger()
  const [savingServiceAccount, setSavingServiceAccount] = useState(false)
  const [deletingServiceAccount, setDeletingServiceAccount] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [validateAccount, setValidateAccount] = useState(true)

  // Real data states
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) return

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
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddServiceAccount = async () => {
    if (!serviceAccountJson.trim()) {
      addToast({
        title: 'Validation Error',
        description: 'Please provide the service account JSON',
        type: 'error'
      })
      return
    }

    try {
      // Parse and validate the JSON
      let credentials
      try {
        credentials = JSON.parse(serviceAccountJson)
      } catch (error) {
        addToast({
          title: 'Invalid JSON',
          description: 'Please provide valid JSON format for the service account',
          type: 'error'
        })
        return
      }

      // Extract required fields from the credentials
      const name = displayName.trim() || credentials.client_email?.split('@')[0] || 'Service Account'
      const email = credentials.client_email

      if (!email) {
        addToast({
          title: 'Invalid Service Account',
          description: 'Service account JSON must contain client_email field',
          type: 'error'
        })
        return
      }

      setSavingServiceAccount(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/service-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name,
          email: email,
          credentials: credentials
        })
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Service account added successfully',
          type: 'success'
        })
        await logServiceAccountActivity('service_account_add', 'Service account added', {
          display_name: displayName
        })
        setShowAddModal(false)
        setServiceAccountJson('')
        setDisplayName('')
        loadData() // Refresh service accounts
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

  const handleDeleteServiceAccount = async (accountId: string) => {
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
          <span className="ml-2">Loading service accounts...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Desktop: 2-column layout, Mobile: stack with quota first */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Service Accounts (lg:col-span-2 on desktop, order-2 on mobile) */}
        <div className="lg:col-span-2 order-2 lg:order-1">
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