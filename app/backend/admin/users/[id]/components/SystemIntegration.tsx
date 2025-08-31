'use client'

import { useEffect, useState } from 'react'
import { 
  Server,
  Key,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
  Zap
} from 'lucide-react'

interface ServiceAccount {
  id: string
  name: string
  email: string
  is_active: boolean
  daily_quota_limit: number
  minute_quota_limit: number
  created_at: string
  updated_at: string
}

interface QuotaUsage {
  id: string
  service_account_id: string
  date: string
  requests_made: number
  requests_successful: number
  requests_failed: number
  last_request_at: string | null
}

interface ApiCallStat {
  total_calls: number
  successful_calls: number
  failed_calls: number
  success_rate: number
  last_7_days: number
  today: number
}

interface SystemIntegrationProps {
  userId: string
  systemLoading: boolean
}

export function SystemIntegration({ userId, systemLoading }: SystemIntegrationProps) {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage[]>([])
  const [apiStats, setApiStats] = useState<ApiCallStat | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId && !systemLoading) {
      fetchSystemIntegrationData()
    }
  }, [userId, systemLoading])

  const fetchSystemIntegrationData = async () => {
    try {
      setLoading(true)
      
      // Fetch service accounts
      const accountsResponse = await fetch(`/api/v1/admin/users/${userId}/service-accounts`, {
        credentials: 'include'
      })
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        setServiceAccounts(accountsData.serviceAccounts || [])
      }

      // Fetch quota usage
      const quotaResponse = await fetch(`/api/v1/admin/users/${userId}/quota-usage`, {
        credentials: 'include'
      })
      
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json()
        setQuotaUsage(quotaData.usage || [])
      }

      // Fetch API call statistics
      const statsResponse = await fetch(`/api/v1/admin/users/${userId}/api-stats`, {
        credentials: 'include'
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setApiStats(statsData.stats || null)
      }

    } catch (error) {
      console.error('Failed to fetch system integration data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceAccountStatus = (account: ServiceAccount) => {
    if (!account.is_active) {
      return { text: 'Inactive', color: 'bg-[#E63946]/10 text-[#E63946]', icon: AlertTriangle }
    }
    
    // Check if quota is being used today
    const todayUsage = quotaUsage.find(usage => 
      usage.service_account_id === account.id && 
      usage.date === new Date().toISOString().split('T')[0]
    )
    
    if (todayUsage && todayUsage.requests_made > 0) {
      return { text: 'Active', color: 'bg-[#4BB543]/10 text-[#4BB543]', icon: CheckCircle }
    }
    
    return { text: 'Idle', color: 'bg-[#F0A202]/10 text-[#F0A202]', icon: Clock }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
            <Server className="h-5 w-5 text-[#3D8BFF]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">System Integration</h3>
            <p className="text-sm text-[#6C757D]">Loading integration details...</p>
          </div>
        </div>
        
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#F7F9FC] rounded w-3/4"></div>
          <div className="h-4 bg-[#F7F9FC] rounded w-1/2"></div>
          <div className="h-20 bg-[#F7F9FC] rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
          <Server className="h-5 w-5 text-[#3D8BFF]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">System Integration</h3>
          <p className="text-sm text-[#6C757D]">Google API integration and service account details</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* API Statistics Overview */}
        {apiStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#F7F9FC] rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-[#3D8BFF]/10">
                <BarChart3 className="h-4 w-4 text-[#3D8BFF]" />
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{apiStats.total_calls.toLocaleString()}</p>
              <p className="text-xs text-[#6C757D] uppercase tracking-wide">Total API Calls</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-[#4BB543]/10">
                <CheckCircle className="h-4 w-4 text-[#4BB543]" />
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{apiStats.success_rate.toFixed(1)}%</p>
              <p className="text-xs text-[#6C757D] uppercase tracking-wide">Success Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-[#F0A202]/10">
                <Activity className="h-4 w-4 text-[#F0A202]" />
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{apiStats.last_7_days.toLocaleString()}</p>
              <p className="text-xs text-[#6C757D] uppercase tracking-wide">Last 7 Days</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-[#E63946]/10">
                <Zap className="h-4 w-4 text-[#E63946]" />
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{apiStats.today.toLocaleString()}</p>
              <p className="text-xs text-[#6C757D] uppercase tracking-wide">Today</p>
            </div>
          </div>
        )}

        {/* Service Accounts */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-[#6C757D]" />
            <h4 className="font-medium text-[#1A1A1A]">Service Accounts</h4>
            <span className="text-sm text-[#6C757D]">({serviceAccounts.length} total)</span>
          </div>
          
          {serviceAccounts.length > 0 ? (
            <div className="space-y-3">
              {serviceAccounts.map((account) => {
                const status = getServiceAccountStatus(account)
                const StatusIcon = status.icon
                const todayUsage = quotaUsage.find(usage => 
                  usage.service_account_id === account.id && 
                  usage.date === new Date().toISOString().split('T')[0]
                )
                
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-white border border-[#E0E6ED]">
                        <Shield className="h-4 w-4 text-[#6C757D]" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">
                            {account.name}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.text}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-[#6C757D] font-mono truncate">
                            {account.email}
                          </span>
                          
                          <span className="text-xs text-[#6C757D]">
                            Quota: {account.daily_quota_limit}/day
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-[#1A1A1A]">
                        {todayUsage ? todayUsage.requests_made : 0} / {account.daily_quota_limit}
                      </div>
                      <div className="text-xs text-[#6C757D]">
                        Today's Usage
                      </div>
                      {todayUsage && (
                        <div className="w-20 bg-[#E0E6ED] rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-[#3D8BFF] h-1.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((todayUsage.requests_made / account.daily_quota_limit) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[#6C757D]">
              <Shield className="h-8 w-8 mx-auto mb-2 text-[#E0E6ED]" />
              <p className="text-sm">No service accounts configured</p>
            </div>
          )}
        </div>

        {/* Integration Health */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#6C757D]" />
            <h4 className="font-medium text-[#1A1A1A]">Integration Health</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#E0E6ED] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-[#1A1A1A]">Google Indexing API</h5>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  serviceAccounts.some(acc => acc.is_active) 
                    ? 'bg-[#4BB543]/10 text-[#4BB543]' 
                    : 'bg-[#E63946]/10 text-[#E63946]'
                }`}>
                  {serviceAccounts.some(acc => acc.is_active) ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-[#6C757D]">
                {serviceAccounts.filter(acc => acc.is_active).length} active accounts
              </p>
            </div>
            
            <div className="p-4 border border-[#E0E6ED] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-[#1A1A1A]">Quota Status</h5>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  serviceAccounts.some(acc => acc.is_active) 
                    ? 'bg-[#4BB543]/10 text-[#4BB543]' 
                    : 'bg-[#F0A202]/10 text-[#F0A202]'
                }`}>
                  {serviceAccounts.some(acc => acc.is_active) ? 'Available' : 'Limited'}
                </span>
              </div>
              <p className="text-xs text-[#6C757D]">
                {quotaUsage.reduce((sum, usage) => sum + (usage.requests_made || 0), 0)} requests used today
              </p>
            </div>
          </div>
        </div>

        {/* Recent Integration Activity */}
        {quotaUsage.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#6C757D]" />
              <h4 className="font-medium text-[#1A1A1A]">Recent Integration Activity</h4>
            </div>
            
            <div className="space-y-2">
              {quotaUsage.slice(0, 5).map((usage) => {
                const account = serviceAccounts.find(acc => acc.id === usage.service_account_id)
                
                return (
                  <div key={usage.id} className="flex items-center justify-between text-sm p-2 hover:bg-[#F7F9FC] rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-[#3D8BFF]" />
                      <span className="text-[#1A1A1A]">
                        {account ? account.name : 'Unknown Account'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-[#6C757D]">
                      <span>{usage.requests_made} requests</span>
                      <span>{formatDate(usage.date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}