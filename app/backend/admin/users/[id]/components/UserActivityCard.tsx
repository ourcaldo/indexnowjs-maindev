'use client'

import { 
  Activity,
  Monitor,
  Smartphone,
  Tablet,
  LogIn,
  LogOut,
  User,
  Zap,
  Settings,
  XCircle,
  CheckCircle,
  Shield,
  Server
} from 'lucide-react'

interface ActivityLog {
  id: string
  event_type: string
  event_description: string
  ip_address?: string
  user_agent?: string
  metadata?: any
  created_at: string
}

interface UserActivityCardProps {
  activityLogs: ActivityLog[]
  activityLoading: boolean
}

export function UserActivityCard({ activityLogs, activityLoading }: UserActivityCardProps) {
  // Helper functions for activity display
  const getEventIcon = (eventType: string) => {
    const icons = {
      login: LogIn,
      logout: LogOut,
      register: User,
      job_create: Zap,
      job_update: Settings,
      job_delete: XCircle,
      job_start: CheckCircle,
      service_account_add: Shield,
      service_account_delete: XCircle,
      profile_update: User,
      admin_login: Shield,
      user_management: Settings,
      api_call: Server,
      settings_change: Settings
    }
    
    return icons[eventType as keyof typeof icons] || Activity
  }

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return { icon: Monitor, text: 'Desktop' }
    
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('iphone')) {
      return { icon: Smartphone, text: 'Mobile' }
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return { icon: Tablet, text: 'Tablet' }
    }
    
    return { icon: Monitor, text: 'Desktop' }
  }

  const formatActivityDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#4BB543]/10">
          <Activity className="h-5 w-5 text-[#4BB543]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Recent Activity</h3>
          <p className="text-sm text-[#6C757D]">User actions and system events</p>
        </div>
      </div>

      {activityLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 bg-[#F7F9FC] rounded-lg">
                <div className="w-8 h-8 bg-[#E0E6ED] rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#E0E6ED] rounded w-3/4"></div>
                  <div className="h-3 bg-[#E0E6ED] rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-[#E0E6ED] rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activityLogs.length > 0 ? (
        <div className="space-y-3">
          {activityLogs.map((log) => {
            const EventIcon = getEventIcon(log.event_type)
            const deviceInfo = getDeviceInfo(log.user_agent)
            const DeviceIcon = deviceInfo.icon

            return (
              <div key={log.id} className="flex items-center space-x-3 p-3 bg-[#F7F9FC] rounded-lg hover:bg-[#F7F9FC]/80 transition-colors">
                <div className="p-2 rounded-lg bg-white border border-[#E0E6ED]">
                  <EventIcon className="h-4 w-4 text-[#6C757D]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {log.event_description}
                    </p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-[#3D8BFF]/10 text-[#3D8BFF] rounded-full">
                      {log.event_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1">
                    {log.ip_address && (
                      <span className="text-xs text-[#6C757D] font-mono">
                        {log.ip_address}
                      </span>
                    )}
                    
                    {log.user_agent && (
                      <div className="flex items-center space-x-1">
                        <DeviceIcon className="h-3 w-3 text-[#6C757D]" />
                        <span className="text-xs text-[#6C757D]">
                          {deviceInfo.text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#6C757D] whitespace-nowrap">
                  {formatActivityDate(log.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-[#6C757D] mx-auto mb-3" />
          <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No Recent Activity</h4>
          <p className="text-sm text-[#6C757D]">This user hasn't performed any tracked actions yet.</p>
        </div>
      )}
    </div>
  )
}