'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'

interface QuotaNotification {
  id: string
  type: string
  title: string
  message: string
  metadata: {
    service_account_name: string
    service_account_email: string
    quota_reset_time: string
  }
  created_at: string
}

export default function ServiceAccountQuotaNotification() {
  const [notifications, setNotifications] = useState<QuotaNotification[]>([])

  useEffect(() => {
    fetchNotifications()
    
    // Check for new notifications every 5 seconds
    const interval = setInterval(fetchNotifications, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      const response = await fetch('/api/notifications/service-account-quota', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to fetch quota notifications:', error)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return

      await fetch(`/api/notifications/${notificationId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#E63946] text-white shadow-lg">
      {notifications.map((notification) => (
        <div key={notification.id} className="w-full">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                    <div className="flex-1">
                      <span className="font-semibold text-sm">
                        {notification.title}
                      </span>
                      <span className="hidden sm:inline text-sm opacity-90 ml-2">
                        - Service account "{notification.metadata.service_account_name}" has exhausted its daily quota.
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs opacity-90 mt-1 sm:mt-0">
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        Resets: {notification.metadata.quota_reset_time}
                      </span>
                      <span>Jobs will auto-resume</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 ml-4 p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}