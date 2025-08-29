import React, { useState, useEffect } from 'react'
import { Package2, Globe, Server, Users, Calendar, Crown } from 'lucide-react'
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
        <div className="flex items-center justify-center min-h-48">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }
  const getSubscriptionStatus = () => {
    if (!billingData?.currentSubscription) return null
    
    const subscription = billingData.currentSubscription
    const now = new Date()
    const expiryDate = subscription.expires_at ? new Date(subscription.expires_at) : null
    
    if (!expiryDate) {
      return { status: 'active', text: 'Active', color: '#4BB543' }
    }
    
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry <= 0) {
      return { status: 'expired', text: 'Expired', color: '#E63946' }
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', text: `Expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`, color: '#F0A202' }
    } else {
      return { status: 'active', text: 'Active', color: '#4BB543' }
    }
  }

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited) return 0
    if (limit === 0) return 100
    return Math.min(100, (used / limit) * 100)
  }

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return 'No expiration'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const subscriptionStatus = getSubscriptionStatus()
  const currentPackage = billingData?.currentSubscription

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
            <Package2 className="h-5 w-5 text-[#3D8BFF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Plan & Usage</h2>
            <p className="text-sm text-[#6C757D]">Current subscription and usage limits</p>
          </div>
        </div>
        
        {subscriptionStatus && (
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: subscriptionStatus.color }}
            ></div>
            <span className="text-sm font-medium" style={{ color: subscriptionStatus.color }}>
              {subscriptionStatus.text}
            </span>
          </div>
        )}
      </div>

      {/* Plan Section */}
      <div className="border-b border-[#E0E6ED] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-[#1A1A1A] mb-1">
              {currentPackage?.package_name || usageData?.package_name || 'Free Plan'}
            </h3>
            <p className="text-sm text-[#6C757D]">
              {currentPackage?.billing_period ? `Billed ${currentPackage.billing_period}` : 'No active subscription'}
            </p>
          </div>
          <div className="text-right">
            {currentPackage?.expires_at && (
              <p className="text-sm text-[#6C757D]">Expires</p>
            )}
            <p className="text-sm font-medium text-[#1A1A1A]">
              {formatExpiryDate(currentPackage?.expires_at || null)}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Usage & Limits</h4>
        
        {/* Daily URLs Used */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm text-[#6C757D]">Daily URLs</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-[#1A1A1A]">
                {usageData?.daily_quota_used || 0}
              </p>
              <p className="text-xs text-[#6C757D]">
                {usageData?.is_unlimited ? 'Unlimited' : `of ${usageData?.daily_quota_limit || 0}`}
              </p>
            </div>
            {!usageData?.is_unlimited && (
              <div className="w-16 bg-[#E0E6ED] rounded-full h-2">
                <div 
                  className="bg-[#3D8BFF] h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${getUsagePercentage(
                      usageData?.daily_quota_used || 0, 
                      usageData?.daily_quota_limit || 0, 
                      usageData?.is_unlimited || false
                    )}%` 
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Keywords Used */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm text-[#6C757D]">Keywords tracked</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-[#1A1A1A]">
                {keywordUsage?.keywords_used || 0}
              </p>
              <p className="text-xs text-[#6C757D]">
                {keywordUsage?.is_unlimited ? 'Unlimited' : `of ${keywordUsage?.keywords_limit || 0}`}
              </p>
            </div>
            {!keywordUsage?.is_unlimited && (
              <div className="w-16 bg-[#E0E6ED] rounded-full h-2">
                <div 
                  className="bg-[#F0A202] h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${getUsagePercentage(
                      keywordUsage?.keywords_used || 0, 
                      keywordUsage?.keywords_limit || 0, 
                      keywordUsage?.is_unlimited || false
                    )}%` 
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Service Accounts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm text-[#6C757D]">Service accounts</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#1A1A1A]">
              {usageData?.service_account_count || 0}
            </p>
            <p className="text-xs text-[#6C757D]">connected</p>
          </div>
        </div>
      </div>
    </div>
  )
}