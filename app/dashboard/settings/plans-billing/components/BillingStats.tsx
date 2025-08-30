import React, { useState, useEffect } from 'react'
import { AlertCircle, Package, TrendingUp, Globe, Users, Server } from 'lucide-react'
import { StatCard } from '@/components/dashboard/enhanced'
import { Card } from '@/components/dashboard/ui'
import { supabase } from '@/lib/database'
import { authService } from '@/lib/auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface BillingData {
  currentSubscription: {
    package_name: string
    package_slug: string
    subscription_status: string
    expires_at: string | null
    subscribed_at: string | null
    amount_paid: number
    billing_period: string
  } | null
  billingStats: {
    total_payments: number
    total_spent: number
    next_billing_date: string | null
    days_remaining: number | null
  }
}

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

interface BillingStatsProps {
  billingData: BillingData | null
  currentPackageId: string | null
  formatCurrency: (amount: number, currency?: string) => string
  userCurrency: 'USD' | 'IDR'
}

export const BillingStats = ({ 
  billingData, 
  currentPackageId, 
  formatCurrency, 
  userCurrency 
}: BillingStatsProps) => {
  const { currentSubscription, billingStats } = billingData || {}
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    try {
      setUsageLoading(true)
      await Promise.all([
        loadQuotaData(),
        loadKeywordUsageData()
      ])
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  const loadQuotaData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/v1/auth/user/quota', {
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

  const loadKeywordUsageData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/v1/rank-tracking/keyword-usage', {
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

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getExpirationText = () => {
    if (!currentSubscription?.expires_at) return 'No expiration'
    
    const expiryDate = new Date(currentSubscription.expires_at)
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

  return (
    <div className="space-y-6">
      {/* No Active Package Alert */}
      {!currentPackageId && (
        <Card>
          <div className="p-4 border border-[#F0A202] bg-[#F0A202]/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#F0A202] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1A1A1A] mb-1">No Active Package</h3>
                <p className="text-sm text-[#6C757D]">
                  You don't have an active package. Subscribe to a plan below to start tracking your keywords and accessing all features.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Unified Plan & Usage Section - Like Reference Design */}
      {currentSubscription && (
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          {/* Plan Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h2 className="text-sm font-medium text-[#6C757D] mb-2">Plan</h2>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">{currentSubscription.package_name}</h3>
              <p className="text-sm text-[#6C757D]">{getExpirationText()}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-[#6C757D] mb-2">Payment</h2>
              <div className="text-xl font-bold text-[#1A1A1A] mb-1">
                {formatCurrency(currentSubscription.amount_paid, userCurrency)}
              </div>
              <p className="text-sm text-[#6C757D]">per {currentSubscription.billing_period}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="text-sm text-[#6C757D] hover:text-[#1A1A1A]">Cancel subscription</button>
              <button className="text-sm text-[#3D8BFF] hover:text-[#3D8BFF]/80">Upgrade</button>
            </div>
          </div>

          {/* Usage Stats - Inline 3 Column Layout */}
          {usageLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-[#E0E6ED]">
              {/* Daily URLs */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-[#6C757D]" />
                  <span className="text-sm font-medium text-[#6C757D]">Daily URLs</span>
                </div>
                <div className="space-y-3">
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
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-[#6C757D]" />
                      <span className="font-semibold text-[#1A1A1A]">
                        {usageData?.daily_quota_used || 0} 
                        {!usageData?.is_unlimited && (
                          <span className="text-sm text-[#6C757D] ml-1">
                            ({Math.round(getUsagePercentage(
                              usageData?.daily_quota_used || 0, 
                              usageData?.daily_quota_limit || 500, 
                              usageData?.is_unlimited || false
                            ))}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[#6C757D]">
                      {usageData?.is_unlimited ? 'Unlimited' : (usageData?.daily_quota_limit || 500)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keywords tracked */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-4 w-4 text-[#6C757D]" />
                  <span className="text-sm font-medium text-[#6C757D]">Keywords tracked</span>
                </div>
                <div className="space-y-3">
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
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Server className="h-4 w-4 text-[#6C757D]" />
                      <span className="font-semibold text-[#1A1A1A]">
                        {keywordUsage?.keywords_used || 147}
                        {!keywordUsage?.is_unlimited && (
                          <span className="text-sm text-[#6C757D] ml-1">
                            ({Math.round(getUsagePercentage(
                              keywordUsage?.keywords_used || 147, 
                              keywordUsage?.keywords_limit || 250, 
                              keywordUsage?.is_unlimited || false
                            ))}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[#6C757D]">
                      {keywordUsage?.is_unlimited ? 'Unlimited' : (keywordUsage?.keywords_limit || 250)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service accounts */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4 text-[#6C757D]" />
                  <span className="text-sm font-medium text-[#6C757D]">Service accounts</span>
                </div>
                <div className="space-y-3">
                  <div className="w-full bg-[#E0E6ED] rounded-full h-2">
                    <div className="bg-[#6C757D] h-2 rounded-full w-0" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-[#6C757D]" />
                      <span className="font-semibold text-[#1A1A1A]">
                        {usageData?.service_account_count || 2}
                      </span>
                    </div>
                    <span className="text-[#6C757D]">connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}