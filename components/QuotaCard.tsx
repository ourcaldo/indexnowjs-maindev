'use client'

import { useEffect } from 'react'
import { TrendingUp, AlertTriangle, Package, Search } from 'lucide-react'
import { useGlobalQuotaManager } from '@/hooks/useGlobalQuotaManager'
import { useQuotaUpdates } from '@/hooks/useGlobalWebSocket'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface QuotaInfo {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  daily_limit_reached: boolean
  package_name: string
  remaining_quota: number
}

interface UserProfile {
  package?: {
    quota_limits: {
      daily_urls: number
      service_accounts: number
      concurrent_jobs: number
      keywords_limit: number
    }
  }
  daily_quota_used?: number
  service_account_count?: number
  active_jobs_count?: number
  keywords_used?: number
  keywords_limit?: number
}

interface QuotaCardProps {
  userProfile: UserProfile
}

export default function QuotaCard({ userProfile }: QuotaCardProps) {
  const { quotaInfo, loading, refreshQuota } = useGlobalQuotaManager()

  // Fetch quota data on component mount only
  useEffect(() => {
    if (!quotaInfo) {
      refreshQuota()
    }
  }, [quotaInfo, refreshQuota])

  // Subscribe to real-time quota updates via WebSocket
  useQuotaUpdates((quotaUpdate) => {
    // Quota will be automatically updated through the global manager
    console.log('📊 Received quota update via WebSocket:', quotaUpdate)
  })

  // Fetch keyword usage data
  const { data: keywordUsageData, isLoading: keywordUsageLoading } = useQuery({
    queryKey: ['/api/user/keyword-usage'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/user/keyword-usage', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch keyword usage')
      return response.json()
    }
  })



  // Use real-time data if available, fallback to userProfile
  const displayQuotaUsed = quotaInfo?.daily_quota_used ?? userProfile.daily_quota_used ?? 0
  const displayQuotaLimit = quotaInfo?.daily_quota_limit ?? userProfile.package?.quota_limits.daily_urls ?? 0
  const isUnlimited = quotaInfo?.is_unlimited ?? (displayQuotaLimit === -1)
  const progressPercentage = isUnlimited ? 0 : Math.min(100, (displayQuotaUsed / displayQuotaLimit) * 100)
  const remainingQuota = isUnlimited ? -1 : Math.max(0, displayQuotaLimit - displayQuotaUsed)

  // Color logic based on usage
  const getProgressColor = () => {
    if (isUnlimited) return '#3D8BFF'
    if (progressPercentage >= 100) return '#E63946' // Red when exhausted
    if (progressPercentage >= 90) return '#F0A202' // Amber when close
    return '#3D8BFF' // Blue when normal
  }

  // Show quota exhausted card if over limit
  const showQuotaExhausted = !isUnlimited && !loading && displayQuotaUsed >= displayQuotaLimit

  if (showQuotaExhausted) {
    return (
      <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
        {/* Daily Limit Warning with project color scheme */}
        <div className="bg-[#E63946] text-white rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Daily Limit Reached</h3>
                <p className="text-xs mt-1 opacity-90">
                  You've reached your daily limit of {displayQuotaLimit.toLocaleString()} URLs. All active jobs have been stopped and will resume tomorrow automatically.
                </p>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Daily Usage</span>
                    <span>{displayQuotaUsed.toLocaleString()}/{displayQuotaLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Upgrade CTA */}
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="flex items-center space-x-2 text-xs">
                    <Package className="h-4 w-4" />
                    <span>Upgrade for higher daily limits and continuous processing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Always show quota details even when limit reached */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily URLs */}
          <div className="bg-[#F7F9FC] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6C757D]">Daily URLs</p>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {loading ? '...' : (
                    <>
                      {displayQuotaUsed.toLocaleString()} / {isUnlimited ? '∞' : displayQuotaLimit.toLocaleString()}
                    </>
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#E63946]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#E63946]" />
              </div>
            </div>
            {!isUnlimited && !loading && (
              <div className="mt-2">
                <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-[#E63946]"
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="text-xs text-[#6C757D] mt-1">
                  Limit reached - resets tomorrow
                </p>
              </div>
            )}
          </div>

          {/* Service Accounts */}
          <div className="bg-[#F7F9FC] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6C757D]">Service Accounts</p>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {userProfile.service_account_count || 0} / {
                    userProfile.package?.quota_limits.service_accounts === -1 ? '∞' : 
                    userProfile.package?.quota_limits.service_accounts || 0
                  }
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#4BB543]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#4BB543]" />
              </div>
            </div>
          </div>

          {/* Concurrent Jobs */}
          <div className="bg-[#F7F9FC] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6C757D]">Concurrent Jobs</p>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {userProfile.active_jobs_count || 0} / {
                    userProfile.package?.quota_limits.concurrent_jobs === -1 ? '∞' :
                    userProfile.package?.quota_limits.concurrent_jobs || 0
                  }
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#3D8BFF]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#3D8BFF]" />
              </div>
            </div>
          </div>

          {/* Keywords Tracking */}
          <div className="bg-[#F7F9FC] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6C757D]">Keywords Tracking</p>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {keywordUsageLoading ? '...' : (
                    <>
                      {keywordUsageData?.keywords_used || 0} / {keywordUsageData?.is_unlimited ? '∞' : (keywordUsageData?.keywords_limit || 0)}
                    </>
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-[#F0A202]/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-[#F0A202]" />
              </div>
            </div>
            {!keywordUsageData?.is_unlimited && !keywordUsageLoading && keywordUsageData && (
              <div className="mt-2">
                <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (keywordUsageData.keywords_used / keywordUsageData.keywords_limit) * 100)}%`,
                      backgroundColor: '#F0A202'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-[#6C757D] mt-1">
                  {keywordUsageData.remaining_quota} remaining in package
                </p>
              </div>
            )}
            {keywordUsageLoading && (
              <div className="mt-2">
                <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                  <div className="bg-[#E0E6ED] animate-pulse h-2 rounded-full w-1/3"></div>
                </div>
                <p className="text-xs text-[#6C757D] mt-1">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#E0E6ED]">
      <div className="bg-[#F7F9FC] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#6C757D]">Daily URLs</p>
            <p className="text-lg font-bold text-[#1A1A1A]">
              {loading ? '...' : (
                <>
                  {displayQuotaUsed.toLocaleString()} / {isUnlimited ? '∞' : displayQuotaLimit.toLocaleString()}
                </>
              )}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#3D8BFF]/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#3D8BFF]" />
          </div>
        </div>
        {!isUnlimited && !loading && (
          <div className="mt-2">
            <div className="w-full bg-[#E0E6ED] rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${progressPercentage}%`,
                  backgroundColor: getProgressColor()
                }}
              ></div>
            </div>
            <p className="text-xs text-[#6C757D] mt-1">
              {remainingQuota.toLocaleString()} remaining today
            </p>
          </div>
        )}
        {loading && (
          <div className="mt-2">
            <div className="w-full bg-[#E0E6ED] rounded-full h-2">
              <div className="bg-[#E0E6ED] animate-pulse h-2 rounded-full w-1/3"></div>
            </div>
            <p className="text-xs text-[#6C757D] mt-1">Loading...</p>
          </div>
        )}
      </div>

      {/* Service Accounts */}
      <div className="bg-[#F7F9FC] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#6C757D]">Service Accounts</p>
            <p className="text-lg font-bold text-[#1A1A1A]">
              {userProfile.service_account_count || 0} / {
                userProfile.package?.quota_limits.service_accounts === -1 ? '∞' : 
                userProfile.package?.quota_limits.service_accounts || 0
              }
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#4BB543]/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#4BB543]" />
          </div>
        </div>
      </div>

      {/* Concurrent Jobs */}
      <div className="bg-[#F7F9FC] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#6C757D]">Concurrent Jobs</p>
            <p className="text-lg font-bold text-[#1A1A1A]">
              {userProfile.active_jobs_count || 0} / {
                userProfile.package?.quota_limits.concurrent_jobs === -1 ? '∞' :
                userProfile.package?.quota_limits.concurrent_jobs || 0
              }
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#F0A202]/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#F0A202]" />
          </div>
        </div>
      </div>

      {/* Keywords Tracking */}
      <div className="bg-[#F7F9FC] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#6C757D]">Keywords Tracking</p>
            <p className="text-lg font-bold text-[#1A1A1A]">
              {keywordUsageLoading ? '...' : (
                <>
                  {keywordUsageData?.keywords_used || 0} / {keywordUsageData?.is_unlimited ? '∞' : (keywordUsageData?.keywords_limit || 0)}
                </>
              )}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#F0A202]/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-[#F0A202]" />
          </div>
        </div>
        {!keywordUsageData?.is_unlimited && !keywordUsageLoading && keywordUsageData && (
          <div className="mt-2">
            <div className="w-full bg-[#E0E6ED] rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (keywordUsageData.keywords_used / keywordUsageData.keywords_limit) * 100)}%`,
                  backgroundColor: '#F0A202'
                }}
              ></div>
            </div>
            <p className="text-xs text-[#6C757D] mt-1">
              {keywordUsageData.remaining_quota} remaining in package
            </p>
          </div>
        )}
        {keywordUsageLoading && (
          <div className="mt-2">
            <div className="w-full bg-[#E0E6ED] rounded-full h-2">
              <div className="bg-[#E0E6ED] animate-pulse h-2 rounded-full w-1/3"></div>
            </div>
            <p className="text-xs text-[#6C757D] mt-1">Loading...</p>
          </div>
        )}
      </div>
    </div>
  )
}