'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Activity,
  Clock,
  User,
  Monitor,
  MapPin,
  Smartphone,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Database
} from 'lucide-react'
import Link from 'next/link'

interface ActivityLogDetail {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_role: string
  user_phone?: string
  event_type: string
  action_description: string
  target_type?: string
  target_id?: string
  ip_address?: string
  user_agent?: string
  device_info?: any
  location_data?: any
  success: boolean
  error_message?: string
  metadata?: any
  created_at: string
  related_activities: Array<{
    id: string
    event_type: string
    action_description: string
    created_at: string
    success: boolean
  }>
}

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [log, setLog] = useState<ActivityLogDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchActivityDetail()
    }
  }, [resolvedParams])

  const fetchActivityDetail = async () => {
    if (!resolvedParams?.id) return

    try {
      setLoading(true)
      const token = localStorage.getItem('supabase_access_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/admin/activity/${resolvedParams.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity detail')
      }

      const data = await response.json()
      setLog(data.log)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getEventIcon = (eventType: string, success: boolean) => {
    if (!success) return <AlertTriangle className="h-5 w-5 text-[#E63946]" />
    
    switch (eventType) {
      case 'login':
      case 'admin_login':
        return <Shield className="h-5 w-5 text-[#4BB543]" />
      case 'logout':
        return <Shield className="h-5 w-5 text-[#6C757D]" />
      case 'job_create':
      case 'job_update':
      case 'job_delete':
        return <Activity className="h-5 w-5 text-[#3D8BFF]" />
      case 'user_management':
        return <User className="h-5 w-5 text-[#F0A202]" />
      case 'api_call':
        return <Database className="h-5 w-5 text-[#6C757D]" />
      default:
        return <Info className="h-5 w-5 text-[#3D8BFF]" />
    }
  }

  const getEventTypeBadge = (eventType: string, success: boolean) => {
    const colors = {
      login: success ? 'bg-[#4BB543]/10 text-[#4BB543]' : 'bg-[#E63946]/10 text-[#E63946]',
      logout: 'bg-[#6C757D]/10 text-[#6C757D]',
      job_create: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
      job_update: 'bg-[#F0A202]/10 text-[#F0A202]',
      job_delete: 'bg-[#E63946]/10 text-[#E63946]',
      service_account_add: 'bg-[#4BB543]/10 text-[#4BB543]',
      service_account_delete: 'bg-[#E63946]/10 text-[#E63946]',
      profile_update: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
      admin_login: 'bg-[#F0A202]/10 text-[#F0A202]',
      user_management: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
      api_call: 'bg-[#6C757D]/10 text-[#6C757D]'
    }
    
    return colors[eventType as keyof typeof colors] || 'bg-[#6C757D]/10 text-[#6C757D]'
  }

  const parseUserAgent = (userAgent?: string) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }
    
    // Simple user agent parsing
    let browser = 'Unknown'
    let os = 'Unknown'
    let device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'
    
    return { browser, os, device }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/activity">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Activity Logs
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Detail</h1>
            <p className="text-[#6C757D] mt-2">Loading activity details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/activity">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Activity Logs
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Detail</h1>
            <Card className="mt-4">
              <CardContent className="p-6">
                <p className="text-[#E63946]">Error: {error || 'Activity not found'}</p>
                <Button 
                  onClick={fetchActivityDetail}
                  className="mt-4 bg-[#1C2331] hover:bg-[#0d1b2a] text-white"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const deviceInfo = parseUserAgent(log.user_agent)

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/backend/admin/activity">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Activity Logs
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Detail</h1>
          <p className="text-[#6C757D] mt-2">
            Comprehensive view of user activity and system interaction
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getEventIcon(log.event_type, log.success)}
                  Activity Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${getEventTypeBadge(log.event_type, log.success)} border-0`}>
                    {log.event_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {log.success ? (
                    <Badge className="bg-[#4BB543]/10 text-[#4BB543] border-0">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      SUCCESS
                    </Badge>
                  ) : (
                    <Badge className="bg-[#E63946]/10 text-[#E63946] border-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      FAILED
                    </Badge>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-2">Action Description</h3>
                  <p className="text-[#1A1A1A] bg-[#F7F9FC] p-3 rounded-lg">
                    {log.action_description}
                  </p>
                </div>

                {log.error_message && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-2">Error Message</h3>
                    <p className="text-[#E63946] bg-[#E63946]/5 p-3 rounded-lg border border-[#E63946]/20">
                      {log.error_message}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-2">Timestamp</h3>
                    <div className="flex items-center gap-2 text-[#6C757D]">
                      <Clock className="h-4 w-4" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-2">Activity ID</h3>
                    <p className="text-[#6C757D] font-mono text-sm">{log.id}</p>
                  </div>
                </div>

                {(log.target_type || log.target_id) && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-2">Target Resource</h3>
                    <div className="bg-[#F7F9FC] p-3 rounded-lg">
                      {log.target_type && (
                        <p className="text-sm"><span className="font-medium">Type:</span> {log.target_type}</p>
                      )}
                      {log.target_id && (
                        <p className="text-sm font-mono"><span className="font-medium">ID:</span> {log.target_id}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Additional Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#F7F9FC] p-4 rounded-lg">
                    <pre className="text-sm text-[#1A1A1A] whitespace-pre-wrap">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Activities */}
            {log.related_activities && log.related_activities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent User Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {log.related_activities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                        <div className="flex items-center gap-3">
                          {activity.success ? (
                            <CheckCircle className="h-4 w-4 text-[#4BB543]" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-[#E63946]" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-[#1A1A1A]">
                              {activity.action_description}
                            </p>
                            <p className="text-xs text-[#6C757D]">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getEventTypeBadge(activity.event_type, activity.success)} border-0 text-xs`}>
                          {activity.event_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Name</h3>
                  <Link 
                    href={`/backend/admin/users/${log.user_id}`}
                    className="text-[#3D8BFF] hover:underline"
                  >
                    {log.user_name}
                  </Link>
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Email</h3>
                  <p className="text-[#6C757D] text-sm">{log.user_email}</p>
                </div>
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Role</h3>
                  <Badge variant="secondary">{log.user_role || 'user'}</Badge>
                </div>
                {log.user_phone && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-1">Phone</h3>
                    <p className="text-[#6C757D] text-sm">{log.user_phone}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">User ID</h3>
                  <p className="text-[#6C757D] text-xs font-mono">{log.user_id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Device & Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {log.ip_address && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-1">IP Address</h3>
                    <div className="flex items-center gap-2 text-[#6C757D]">
                      <MapPin className="h-4 w-4" />
                      <span className="font-mono text-sm">{log.ip_address}</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Device Type</h3>
                  <div className="flex items-center gap-2 text-[#6C757D]">
                    {deviceInfo.device === 'Mobile' ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                    <span className="text-sm">{deviceInfo.device}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Browser</h3>
                  <p className="text-[#6C757D] text-sm">{deviceInfo.browser}</p>
                </div>

                <div>
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Operating System</h3>
                  <p className="text-[#6C757D] text-sm">{deviceInfo.os}</p>
                </div>

                {log.user_agent && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-1">User Agent</h3>
                    <p className="text-[#6C757D] text-xs font-mono break-all bg-[#F7F9FC] p-2 rounded">
                      {log.user_agent}
                    </p>
                  </div>
                )}

                {log.location_data && (
                  <div>
                    <h3 className="font-medium text-[#1A1A1A] mb-1">Location</h3>
                    <div className="bg-[#F7F9FC] p-2 rounded">
                      <pre className="text-xs text-[#6C757D]">
                        {JSON.stringify(log.location_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/backend/admin/users/${log.user_id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    View User Profile
                  </Button>
                </Link>
                <Link href={`/backend/admin/users/${log.user_id}/activity`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    View User Activity
                  </Button>
                </Link>
                {log.target_type === 'jobs' && log.target_id && (
                  <Link href={`/jobs/${log.target_id}`}>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="h-4 w-4 mr-2" />
                      View Related Job
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}