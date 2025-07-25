'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar,
  Activity,
  Clock,
  User,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Monitor,
  MapPin,
  Smartphone
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  user_email: string
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

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dayFilter, setDayFilter] = useState('7')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchActivityLogs()
  }, [dayFilter, typeFilter, currentPage])

  const fetchActivityLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('supabase_access_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const params = new URLSearchParams({
        days: dayFilter,
        limit: '50',
        page: currentPage.toString()
      })

      const response = await fetch(`/api/admin/activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'all' || log.event_type === typeFilter
    
    return matchesSearch && matchesType
  })

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
      admin_login: 'bg-[#F0A202]/10 text-[#F0A202]',
      user_management: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Logs</h1>
            <p className="text-[#6C757D] mt-2">Loading activity logs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Logs</h1>
            <Card className="mt-4">
              <CardContent className="p-6">
                <p className="text-[#E63946]">Error: {error}</p>
                <Button 
                  onClick={fetchActivityLogs}
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Activity Logs</h1>
          <p className="text-[#6C757D] mt-2">
            Track backend events, user actions (logins, changes, API calls), and system warnings or errors for audits and debugging
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
                  <Activity className="h-5 w-5 text-[#3D8BFF]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">{filteredLogs.length}</p>
                  <p className="text-xs text-[#6C757D]">Total Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#4BB543]/10">
                  <User className="h-5 w-5 text-[#4BB543]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {new Set(filteredLogs.map(l => l.user_id)).size}
                  </p>
                  <p className="text-xs text-[#6C757D]">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#4BB543]/10">
                  <Activity className="h-5 w-5 text-[#4BB543]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {filteredLogs.filter(l => l.success).length}
                  </p>
                  <p className="text-xs text-[#6C757D]">Successful Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#E63946]/10">
                  <Activity className="h-5 w-5 text-[#E63946]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {filteredLogs.filter(l => !l.success).length}
                  </p>
                  <p className="text-xs text-[#6C757D]">Failed Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D]" />
                  <Input
                    placeholder="Search by user name, email, action, or event type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={dayFilter} onValueChange={setDayFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="login">Login/Logout</SelectItem>
                    <SelectItem value="job_create">Job Management</SelectItem>
                    <SelectItem value="service_account_add">Service Accounts</SelectItem>
                    <SelectItem value="profile_update">Profile Updates</SelectItem>
                    <SelectItem value="api_call">API Calls</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity ({filteredLogs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-[#6C757D] mx-auto mb-4 opacity-50" />
                <p className="text-[#6C757D]">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="border border-[#E0E6ED] rounded-lg p-4 hover:bg-[#FFFFFF] cursor-pointer transition-colors"
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

                        {/* User Info */}
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <User className="h-4 w-4 text-[#6C757D]" />
                          <div>
                            <Link 
                              href={`/backend/admin/users/${log.user_id}`}
                              className="text-[#1A1A1A] font-medium text-sm hover:text-[#3D8BFF] transition-colors"
                            >
                              {log.user_name}
                            </Link>
                            <div className="text-[#6C757D] text-xs">
                              {log.user_email}
                            </div>
                          </div>
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
                          <p className="text-[#1A1A1A] text-sm">
                            {log.action_description}
                          </p>
                          {log.error_message && (
                            <p className="text-[#E63946] text-xs mt-1">
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

                      {/* View Details Button */}
                      <Link href={`/backend/admin/activity/${log.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-[#F7F9FC]"
                        >
                          <Eye className="h-4 w-4" />
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