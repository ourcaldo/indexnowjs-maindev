import { AlertTriangle, X, Package } from 'lucide-react'
import { useState, useEffect } from 'react'

interface QuotaNotificationProps {
  isVisible: boolean
  remainingQuota: number
  dailyLimit: number
  packageName: string
  onClose: () => void
}

export function QuotaExhaustedNotification({
  isVisible,
  remainingQuota,
  dailyLimit,
  packageName,
  onClose
}: QuotaNotificationProps) {
  const [show, setShow] = useState(isVisible)

  useEffect(() => {
    setShow(isVisible)
  }, [isVisible])

  if (!show) return null

  const isExhausted = remainingQuota <= 0
  const isWarning = remainingQuota <= dailyLimit * 0.1 && remainingQuota > 0

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`rounded-lg shadow-lg border-l-4 p-4 ${
        isExhausted 
          ? 'bg-[#E63946]/10 border-[#E63946] border-l-[#E63946]'
          : 'bg-[#F0A202]/10 border-[#F0A202] border-l-[#F0A202]'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`p-1 rounded ${
              isExhausted ? 'bg-[#E63946]/20' : 'bg-[#F0A202]/20'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                isExhausted ? 'text-[#E63946]' : 'text-[#F0A202]'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${
                isExhausted ? 'text-[#E63946]' : 'text-[#F0A202]'
              }`}>
                {isExhausted ? 'Daily Quota Exhausted' : 'Low Quota Warning'}
              </h4>
              <p className="text-[#1A1A1A] text-sm mt-1">
                {isExhausted 
                  ? `You've used all ${dailyLimit} daily URLs for your ${packageName} plan.`
                  : `Only ${remainingQuota} URLs remaining from your ${dailyLimit} daily limit.`
                }
              </p>
              {isExhausted && (
                <div className="mt-2 flex items-center space-x-2 text-xs text-[#6C757D]">
                  <Package className="h-3 w-3" />
                  <span>Upgrade your plan to submit more URLs today</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setShow(false)
              onClose()
            }}
            className="text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isExhausted && (
          <div className="mt-3 pt-3 border-t border-[#E0E6ED]">
            <button className="inline-flex items-center px-3 py-1.5 bg-[#3D8BFF] text-white text-xs rounded-lg hover:bg-[#3D8BFF]/90 transition-colors">
              <Package className="h-3 w-3 mr-1" />
              Upgrade Plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuotaExhaustedNotification