'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, Package } from 'lucide-react'
import { authService } from '@/lib/auth'

interface QuotaInfo {
  daily_quota_used: number
  daily_quota_limit: number
  is_unlimited: boolean
  quota_exhausted: boolean
  package_name: string
}

export default function QuotaNotification() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchQuotaInfo()
    
    // Check quota every 5 minutes
    const interval = setInterval(fetchQuotaInfo, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchQuotaInfo = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const response = await fetch('/api/user/quota', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setQuotaInfo(data.quota)
        
        // Show notification if quota is exhausted and not dismissed
        if (data.quota.quota_exhausted && !dismissed) {
          setShowNotification(true)
        } else if (!data.quota.quota_exhausted) {
          setShowNotification(false)
          setDismissed(false) // Reset dismissal if quota is available again
        }
      }
    } catch (error) {
      console.error('Failed to fetch quota info:', error)
    }
  }

  const handleDismiss = () => {
    setShowNotification(false)
    setDismissed(true)
  }

  if (!quotaInfo || !showNotification || quotaInfo.is_unlimited) {
    return null
  }

  const progressPercentage = Math.min((quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) * 100, 100)

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-[#E63946] text-white rounded-lg border border-[#E63946]/20 shadow-lg">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Daily Quota Exhausted</h3>
                <p className="text-xs mt-1 opacity-90">
                  You've reached your daily limit of {quotaInfo.daily_quota_limit} URLs for the {quotaInfo.package_name} plan.
                  New indexing jobs will be paused until tomorrow.
                </p>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Daily Usage</span>
                    <span>{quotaInfo.daily_quota_used}/{quotaInfo.daily_quota_limit}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Upgrade CTA */}
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="flex items-center space-x-2 text-xs">
                    <Package className="h-4 w-4" />
                    <span>Upgrade to Premium or Pro for higher limits</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}