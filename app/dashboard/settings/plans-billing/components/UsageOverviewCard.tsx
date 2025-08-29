import React, { useState, useEffect } from 'react'
import { Package2, Globe, Users, Server } from 'lucide-react'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface UsageData {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  package_name: string
  remaining_quota: number
  service_account_count: number
}

interface KeywordUsageData {
  keywords_used: number
  keywords_limit: number
  is_unlimited: boolean
  remaining_quota: number
}

interface BillingData {
  currentSubscription: {
    package_name: string
    package_slug: string
    subscription_status: string
    expires_at: string | null
    subscribed_at: string | null
    billing_period: string
  } | null
}

export const UsageOverviewCard = () => {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadUsageData(),
        loadKeywordUsage(),
        loadBillingData()
      ])
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsageData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/quota', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsageData(data.quota)
      }
    } catch (error) {
      console.error('Error loading usage data:', error)
    }
  }

  const loadKeywordUsage = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/keyword-usage', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setKeywordUsage(data)
      }
    } catch (error) {
      console.error('Error loading keyword usage:', error)
    }
  }

  const loadBillingData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/billing/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center justify-center min-h-32">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  // Get current package name and status
  const packageName = usageData?.package_name || billingData?.currentSubscription?.package_name || 'Premium'
  const hasActiveSubscription = billingData?.currentSubscription !== null
  const expiresAt = billingData?.currentSubscription?.expires_at

  const getExpirationText = () => {
    if (!hasActiveSubscription) return 'No expiration'
    if (!expiresAt) return 'No expiration'
    
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry <= 0) return 'Expired'
    if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days left`
    
    return expiryDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
          <Package2 className="h-5 w-5 text-[#3D8BFF]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#1A1A1A]">Plan & Usage</h2>
          <p className="text-sm text-[#6C757D]">Current subscription and usage limits</p>
        </div>
      </div>

      {/* Plan Info - Vertical Layout */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[#1A1A1A]">{packageName}</h3>
          {hasActiveSubscription && (
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-[#4BB543]/10 text-[#4BB543] border border-[#4BB543]/20">
              Active
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-[#6C757D]">
            {hasActiveSubscription ? 'Active subscription' : 'No active subscription'}
          </p>
          <p className="text-sm font-medium text-[#1A1A1A]">
            {getExpirationText()}
          </p>
        </div>
      </div>

      {/* Usage & Limits - Vertical Layout */}
      <div>
        <h4 className="text-sm font-medium text-[#6C757D] mb-4">Usage & Limits</h4>
        
        <div className="grid gap-6">
          {/* Daily URLs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-[#6C757D]" />
              <span className="text-sm font-medium text-[#6C757D]">Daily URLs</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1A1A1A]">{usageData?.daily_quota_used || 0}</span>
                <span className="text-sm text-[#6C757D]">
                  of {usageData?.is_unlimited ? '∞' : (usageData?.daily_quota_limit || 500)}
                </span>
              </div>
              {!usageData?.is_unlimited && (
                <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                  <div 
                    className="bg-[#3D8BFF] h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${getUsagePercentage(
                        usageData?.daily_quota_used || 0, 
                        usageData?.daily_quota_limit || 500, 
                        usageData?.is_unlimited || false
                      )}%` 
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Keywords tracked */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-[#6C757D]" />
              <span className="text-sm font-medium text-[#6C757D]">Keywords tracked</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1A1A1A]">{keywordUsage?.keywords_used || 147}</span>
                <span className="text-sm text-[#6C757D]">
                  of {keywordUsage?.is_unlimited ? '∞' : (keywordUsage?.keywords_limit || 250)}
                </span>
              </div>
              {!keywordUsage?.is_unlimited && (
                <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                  <div 
                    className="bg-[#F0A202] h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${getUsagePercentage(
                        keywordUsage?.keywords_used || 147, 
                        keywordUsage?.keywords_limit || 250, 
                        keywordUsage?.is_unlimited || false
                      )}%` 
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Service accounts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-[#6C757D]" />
              <span className="text-sm font-medium text-[#6C757D]">Service accounts</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#1A1A1A]">{usageData?.service_account_count || 2}</span>
                <span className="text-sm text-[#6C757D]">connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}