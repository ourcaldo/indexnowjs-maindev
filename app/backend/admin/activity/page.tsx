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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Activity,
  Clock,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Monitor,
  MapPin,
  Smartphone,
  Tablet,
  Globe,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Settings,
  FileText,
  Server,
  Shield,
  Zap
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
      const params = new URLSearchParams({
        days: dayFilter,
        limit: '50',
        page: currentPage.toString()
      })

      const response = await fetch(`/api/admin/activity?${params}`, {
        credentials: 'include'
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
    const eventConfig = {
      login: { 
        color: success ? 'bg-[#4BB543]/10 text-[#4BB543]' : 'bg-[#E63946]/10 text-[#E63946]',
        icon: LogIn,
        label: 'Sign In'
      },
      logout: { 
        color: 'bg-[#6C757D]/10 text-[#6C757D]',
        icon: LogOut,
        label: 'Sign Out'
      },
      register: { 
        color: success ? 'bg-[#4BB543]/10 text-[#4BB543]' : 'bg-[#E63946]/10 text-[#E63946]',
        icon: User,
        label: 'Registration'
      },
      job_create: { 
        color: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
        icon: Zap,
        label: 'Job Created'
      },
      job_update: { 
        color: 'bg-[#F0A202]/10 text-[#F0A202]',
        icon: Settings,
        label: 'Job Updated'
      },
      job_delete: { 
        color: 'bg-[#E63946]/10 text-[#E63946]',
        icon: XCircle,
        label: 'Job Deleted'
      },
      job_start: { 
        color: 'bg-[#4BB543]/10 text-[#4BB543]',
        icon: CheckCircle,
        label: 'Job Started'
      },
      service_account_add: { 
        color: 'bg-[#4BB543]/10 text-[#4BB543]',
        icon: Shield,
        label: 'Service Added'
      },
      service_account_delete: { 
        color: 'bg-[#E63946]/10 text-[#E63946]',
        icon: XCircle,
        label: 'Service Removed'
      },
      profile_update: { 
        color: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
        icon: User,
        label: 'Profile Updated'
      },
      admin_login: { 
        color: 'bg-[#F0A202]/10 text-[#F0A202]',
        icon: Shield,
        label: 'Admin Access'
      },
      user_management: { 
        color: 'bg-[#3D8BFF]/10 text-[#3D8BFF]',
        icon: Settings,
        label: 'User Management'
      },
      api_call: { 
        color: 'bg-[#6C757D]/10 text-[#6C757D]',
        icon: Server,
        label: 'API Call'
      },
      settings_change: { 
        color: 'bg-[#F0A202]/10 text-[#F0A202]',
        icon: Settings,
        label: 'Settings Changed'
      }
    }
    
    return eventConfig[eventType as keyof typeof eventConfig] || {
      color: 'bg-[#6C757D]/10 text-[#6C757D]',
      icon: Activity,
      label: eventType.replace('_', ' ').toUpperCase()
    }
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
    if (ua.includes('android')) {
      return ua.includes('mobile') ? { icon: Smartphone, text: 'Mobile' } : { icon: Tablet, text: 'Tablet' }
    }
    
    return { icon: Monitor, text: 'Desktop' }
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
              User Activity Logs
            </CardTitle>
            <p className="text-[#6C757D] text-sm mt-2">
              Showing {filteredLogs.length} activities from all users (latest first)
            </p>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-[#6C757D] mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No activity logs found</h3>
                <p className="text-[#6C757D]">No user activities match your current filters</p>
              </div>
            ) : (
              <div className="border border-[#E0E6ED] rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F7F9FC] hover:bg-[#F7F9FC]">
                      <TableHead className="w-16 text-center text-[#1A1A1A] font-semibold">#</TableHead>
                      <TableHead className="text-center text-[#1A1A1A] font-semibold">Timestamp</TableHead>
                      <TableHead className="text-center text-[#1A1A1A] font-semibold">User</TableHead>
                      <TableHead className="text-center text-[#1A1A1A] font-semibold">Action/Event</TableHead>
                      <TableHead className="text-center text-[#1A1A1A] font-semibold">Device & IP</TableHead>
                      <TableHead className="text-center text-[#1A1A1A] font-semibold">Status</TableHead>
                      <TableHead className="w-16 text-center text-[#1A1A1A] font-semibold">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, index) => {
                      const eventConfig = getEventTypeBadge(log.event_type, log.success)
                      const deviceInfo = getDeviceInfo(log.user_agent)
                      const IconComponent = eventConfig.icon
                      const DeviceIcon = deviceInfo.icon
                      
                      return (
                        <TableRow 
                          key={log.id}
                          className="hover:bg-[#F7F9FC] border-b border-[#E0E6ED]"
                        >
                          {/* Row Number */}
                          <TableCell className="text-center text-[#6C757D] font-mono text-sm">
                            {(currentPage - 1) * 50 + index + 1}
                          </TableCell>
                          
                          {/* Timestamp */}
                          <TableCell className="text-center">
                            <div className="text-[#1A1A1A] text-sm font-medium">
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          
                          {/* User Info */}
                          <TableCell className="text-center">
                            <Link 
                              href={`/backend/admin/users/${log.user_id}`}
                              className="hover:text-[#3D8BFF] transition-colors"
                            >
                              <div className="text-[#1A1A1A] font-medium text-sm">
                                {log.user_name}
                              </div>
                              <div className="text-[#6C757D] text-xs">
                                {log.user_email}
                              </div>
                            </Link>
                          </TableCell>
                          
                          {/* Event/Action */}
                          <TableCell className="text-center">
                            <Badge className={`${eventConfig.color} border-0 text-xs mb-1`}>
                              {eventConfig.label}
                            </Badge>
                            <div className="text-[#1A1A1A] text-sm">
                              {log.action_description}
                            </div>
                            {log.error_message && (
                              <div className="text-[#E63946] text-xs mt-1 bg-[#E63946]/5 px-2 py-1 rounded">
                                <strong>Error:</strong> {log.error_message}
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Device & IP */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-[#6C757D] text-sm mb-1">
                              <DeviceIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium">{deviceInfo.text}</span>
                            </div>
                            {log.ip_address && (
                              <div className="text-[#6C757D] text-xs">
                                <span className="font-mono bg-[#F7F9FC] px-1.5 py-0.5 rounded">
                                  {log.ip_address}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          
                          {/* Status */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {log.success ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-[#4BB543]" />
                                  <span className="text-[#4BB543] text-sm font-medium">Success</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-[#E63946]" />
                                  <span className="text-[#E63946] text-sm font-medium">Failed</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* View Details */}
                          <TableCell className="text-center">
                            <Link href={`/backend/admin/activity/${log.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-[#3D8BFF]/10 hover:text-[#3D8BFF]"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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