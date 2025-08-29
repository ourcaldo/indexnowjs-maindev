import React, { useState, useEffect } from 'react'
import { Globe, Users, Server } from 'lucide-react'
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

export const InlineUsageStats = () => {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [keywordUsage, setKeywordUsage] = useState<KeywordUsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadUsageData(),
        loadKeywordUsage()
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

  const getUsagePercentage = (used: number, limit: number, isUnlimited: boolean) => {
    if (isUnlimited || limit <= 0) return 0
    return Math.min(100, (used / limit) * 100)
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

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      {/* Usage Stats - 3 Column Layout like reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Daily URLs */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm font-medium text-[#6C757D]">Daily URLs</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {usageData?.daily_quota_used || 0}
            </div>
            <div className="text-sm text-[#6C757D]">
              {usageData?.is_unlimited ? 'Unlimited' : `${usageData?.daily_quota_limit || 500}`}
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
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm font-medium text-[#6C757D]">Keywords tracked</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {keywordUsage?.keywords_used || 147}
            </div>
            <div className="text-sm text-[#6C757D]">
              {keywordUsage?.is_unlimited ? 'Unlimited' : `${keywordUsage?.keywords_limit || 250}`}
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
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Server className="h-4 w-4 text-[#6C757D]" />
            <span className="text-sm font-medium text-[#6C757D]">Service accounts</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {usageData?.service_account_count || 2}
            </div>
            <div className="text-sm text-[#6C757D]">connected</div>
          </div>
        </div>
      </div>
    </div>
  )
}