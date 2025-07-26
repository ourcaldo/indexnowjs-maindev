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
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      {notifications.map((notification) => (
        <div key={notification.id} className="mb-3">
          <div className="bg-[#E63946] text-white rounded-lg shadow-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">
                    {notification.title}
                  </h3>
                  <p className="text-xs mt-1 opacity-90">
                    {notification.message}
                  </p>
                  
                  {/* Service Account Details */}
                  <div className="mt-3 p-3 bg-white/10 rounded border border-white/20">
                    <div className="flex items-center space-x-2 text-xs">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">Service Account:</span>
                      <span>{notification.metadata.service_account_name}</span>
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      Email: {notification.metadata.service_account_email}
                    </div>
                    <div className="text-xs mt-1 opacity-80">
                      Quota resets: {notification.metadata.quota_reset_time}
                    </div>
                  </div>
                  
                  {/* Auto-resume info */}
                  <div className="mt-2 text-xs opacity-80">
                    ✅ Jobs will automatically resume when quota resets
                  </div>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="ml-3 p-1 rounded hover:bg-white/10 transition-colors"
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