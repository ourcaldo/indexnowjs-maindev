'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, AlertTriangle, Package } from 'lucide-react'
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
    }
  }
  daily_quota_used?: number
  service_account_count?: number
  active_jobs_count?: number
}

interface QuotaCardProps {
  userProfile: UserProfile
}

export default function QuotaCard({ userProfile }: QuotaCardProps) {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotaInfo()
    
    // Update quota every 3 seconds for real-time display
    const interval = setInterval(fetchQuotaInfo, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchQuotaInfo = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/user/quota', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuotaInfo(data.quota)
      }
    } catch (error) {
      console.error('Failed to fetch quota info:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="bg-[#F0A202] text-white rounded-lg p-4">
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
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#E0E6ED]">
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
    </div>
  )
}