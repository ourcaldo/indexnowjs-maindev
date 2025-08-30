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
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface ActivityLog {
  id: string
  user_id: string
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
}

interface UserInfo {
  id: string
  name: string
}

export default function UserActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
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
      fetchUserActivity()
    }
  }, [resolvedParams, currentPage])

  const fetchUserActivity = async () => {
    if (!resolvedParams?.id) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        page: currentPage.toString()
      })

      const response = await fetch(`/api/v1/admin/users/${resolvedParams.id}/activity?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user activity')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setUser(data.user || null)
      setPagination(data.pagination || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
      api_call: 'bg-[#6C757D]/10 text-[#6C757D]'
    }
    
    return colors[eventType as keyof typeof colors] || 'bg-[#6C757D]/10 text-[#6C757D]'
  }

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />
    }
    
    return <Monitor className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/users">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">User Activity History</h1>
            <p className="text-[#6C757D] mt-2">Loading user activity...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/backend/admin/users">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">User Activity History</h1>
            <Card className="mt-4">
              <CardContent className="p-6">
                <p className="text-[#E63946]">Error: {error}</p>
                <Button 
                  onClick={fetchUserActivity}
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

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/backend/admin/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>
            </Link>
            {resolvedParams?.id && (
              <Link href={`/backend/admin/users/${resolvedParams.id}`}>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  View User Profile
                </Button>
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">
            Activity History: {user?.name || 'Loading...'}
          </h1>
          <p className="text-[#6C757D] mt-2">
            Complete activity timeline for this user including logins, actions, and system interactions
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
                  <Activity className="h-5 w-5 text-[#3D8BFF]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">{logs.length}</p>
                  <p className="text-xs text-[#6C757D]">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#4BB543]/10">
                  <CheckCircle className="h-5 w-5 text-[#4BB543]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {logs.filter(l => l.success).length}
                  </p>
                  <p className="text-xs text-[#6C757D]">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#E63946]/10">
                  <AlertTriangle className="h-5 w-5 text-[#E63946]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {logs.filter(l => !l.success).length}
                  </p>
                  <p className="text-xs text-[#6C757D]">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#F0A202]/10">
                  <Activity className="h-5 w-5 text-[#F0A202]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {new Set(logs.map(l => l.event_type)).size}
                  </p>
                  <p className="text-xs text-[#6C757D]">Event Types</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline ({logs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-[#6C757D] mx-auto mb-4 opacity-50" />
                <p className="text-[#6C757D]">No activity found for this user</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-[#E0E6ED] rounded-lg p-4 hover:bg-[#FFFFFF] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Timestamp */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <Clock className="h-4 w-4 text-[#6C757D]" />
                          <span className="text-[#1A1A1A] text-sm font-medium">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        {/* Event/Action */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getEventTypeBadge(log.event_type, log.success)} border-0 text-xs`}>
                              {log.event_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {!log.success && (
                              <Badge className="bg-[#E63946]/10 text-[#E63946] border-0 text-xs">
                                FAILED
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#1A1A1A] text-sm mb-1">
                            {log.action_description}
                          </p>
                          {log.error_message && (
                            <p className="text-[#E63946] text-xs">
                              Error: {log.error_message}
                            </p>
                          )}
                        </div>

                        {/* IP and Device */}
                        <div className="flex items-center gap-4 min-w-[180px] text-[#6C757D] text-xs">
                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="font-mono">{log.ip_address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(log.user_agent)}
                          </div>
                        </div>
                      </div>

                      {/* Link to Activity Detail */}
                      <Link href={`/backend/admin/activity/${log.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-[#F7F9FC]"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-[#6C757D]">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-[#6C757D]">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}