'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, Package, StopCircle } from 'lucide-react'
import { authService } from '@/lib/auth'
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

export default function QuotaNotification() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<'quota_exhausted' | 'daily_limit'>('quota_exhausted')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchQuotaInfo()
    
    // Check quota every 3 seconds for real-time updates
    const interval = setInterval(fetchQuotaInfo, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchQuotaInfo = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      const response = await fetch('/api/user/quota', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuotaInfo(data.quota)
        
        // Determine notification type and show logic
        if (data.quota.daily_limit_reached && !dismissed) {
          setNotificationType('daily_limit')
          setShowNotification(true)
          // Stop all jobs when daily limit is reached
          stopAllJobs()
        } else if (data.quota.quota_exhausted && !dismissed) {
          setNotificationType('quota_exhausted') 
          setShowNotification(true)
        } else if (!data.quota.quota_exhausted && !data.quota.daily_limit_reached) {
          setShowNotification(false)
          setDismissed(false) // Reset dismissal if quota is available again
        }
      }
    } catch (error) {
      console.error('Failed to fetch quota info:', error)
    }
  }

  const stopAllJobs = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      await fetch('/api/jobs/stop-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Failed to stop jobs:', error)
    }
  }

  const handleDismiss = () => {
    setShowNotification(false)
    setDismissed(true)
  }

  // Don't show floating notification - integrated into QuotaCard instead
  return null

  const progressPercentage = Math.min((quotaInfo.daily_quota_used / quotaInfo.daily_quota_limit) * 100, 100)

  // Different content based on notification type
  const isDailyLimit = notificationType === 'daily_limit'
  const bgColor = isDailyLimit ? 'bg-[#F0A202]' : 'bg-[#E63946]'
  const borderColor = isDailyLimit ? 'border-[#F0A202]/20' : 'border-[#E63946]/20'
  const icon = isDailyLimit ? StopCircle : AlertTriangle
  const title = isDailyLimit ? 'Daily Limit Reached' : 'Quota Exhausted'
  const message = isDailyLimit 
    ? `You've reached your daily limit of ${quotaInfo.daily_quota_limit} URLs. All active jobs have been stopped and will resume tomorrow automatically.`
    : `You're running low on quota! ${quotaInfo.remaining_quota} URLs remaining for the ${quotaInfo.package_name} plan.`

  const IconComponent = icon

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`rounded-lg shadow-lg border-l-4 p-4 ${
        isDailyLimit 
          ? 'bg-[#E63946]/10 border-[#E63946] border-l-[#E63946]'
          : 'bg-[#F0A202]/10 border-[#F0A202] border-l-[#F0A202]'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-1 rounded ${
              isDailyLimit ? 'bg-[#E63946]/20' : 'bg-[#F0A202]/20'
            }`}>
              <IconComponent className={`h-5 w-5 ${
                isDailyLimit ? 'text-[#E63946]' : 'text-[#F0A202]'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${
                isDailyLimit ? 'text-[#E63946]' : 'text-[#F0A202]'
              }`}>
                {title}
              </h4>
              <p className="text-[#1A1A1A] text-sm mt-1">
                {isDailyLimit 
                  ? `You've used ${quotaInfo.daily_quota_used} URLs from your ${quotaInfo.daily_quota_limit} daily limit for the ${quotaInfo.package_name} plan.`
                  : `You've used ${quotaInfo.daily_quota_used} of ${quotaInfo.daily_quota_limit} URLs in your ${quotaInfo.package_name} plan.`
                }
              </p>
              <div className="mt-2 flex items-center space-x-2 text-xs text-[#6C757D]">
                <Package className="h-3 w-3" />
                <span>
                  {isDailyLimit 
                    ? 'Upgrade your plan to submit more URLs today'
                    : 'Upgrade to Premium or Pro for higher limits'
                  }
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-[#6C757D]" />
          </button>
        </div>
      </div>
    </div>
  )
}