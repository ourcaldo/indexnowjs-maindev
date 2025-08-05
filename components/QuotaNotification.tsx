'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useGlobalQuotaManager } from '@/hooks/useGlobalQuotaManager'
import { useQuotaUpdates } from '@/hooks/useGlobalWebSocket'

export default function QuotaNotification() {
  const { quotaInfo, refreshQuota } = useGlobalQuotaManager()
  const [showNotification, setShowNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<'quota_exhausted' | 'daily_limit'>('quota_exhausted')
  const [dismissed, setDismissed] = useState(false)

  // Fetch quota data on component mount only
  useEffect(() => {
    if (!quotaInfo) {
      refreshQuota()
    }
  }, [quotaInfo, refreshQuota])

  // Subscribe to real-time quota updates via WebSocket
  useQuotaUpdates((quotaUpdate) => {
    console.log('📊 Quota notification received WebSocket update:', quotaUpdate)
  })

  // Check quota status and show appropriate notification
  useEffect(() => {
    if (!quotaInfo || dismissed) return

    const { quota_exhausted, daily_limit_reached } = quotaInfo

    if (quota_exhausted) {
      setNotificationType('quota_exhausted')
      setShowNotification(true)
    } else if (daily_limit_reached) {
      setNotificationType('daily_limit')
      setShowNotification(true)
    } else {
      setShowNotification(false)
    }
  }, [quotaInfo, dismissed])

  const dismissNotification = () => {
    setDismissed(true)
    setShowNotification(false)
  }

  if (!showNotification || !quotaInfo) return null

  const isQuotaExhausted = notificationType === 'quota_exhausted'
  const isDailyLimit = notificationType === 'daily_limit'

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white border border-[#E0E6ED] rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <AlertTriangle className="h-5 w-5 text-[#E63946]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">
                {isQuotaExhausted ? 'Quota Exhausted' : 'Daily Limit Reached'}
              </h3>
              <p className="text-xs text-[#6C757D] mt-1">
                {isQuotaExhausted 
                  ? `You've used ${quotaInfo.daily_quota_used} of your ${quotaInfo.daily_quota_limit} daily quota.`
                  : `Daily limit of ${quotaInfo.daily_quota_limit} URLs has been reached. Jobs will resume tomorrow.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={dismissNotification}
            className="text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}