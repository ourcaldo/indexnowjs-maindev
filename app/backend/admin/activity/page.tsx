'use client'

import { useEffect, useState } from 'react'
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar,
  User,
  Server,
  Shield,
  Eye,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react'

interface ActivityLog {
  id: string
  admin_id: string
  action_type: string
  action_description: string
  target_type: string | null
  target_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any>
  created_at: string
  admin_name?: string
  admin_email?: string
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('7days')

  useEffect(() => {
    fetchActivityLogs()
  }, [dateFilter])

  const fetchActivityLogs = async () => {
    try {
      const params = new URLSearchParams({
        days: dateFilter === '7days' ? '7' : dateFilter === '30days' ? '30' : '1'
      })
      
      const response = await fetch(`/api/admin/activity?${params}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter

    return matchesSearch && matchesAction
  })

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'user_management':
        return <User className="h-4 w-4 text-[#3D8BFF]" />
      case 'system_settings':
        return <Server className="h-4 w-4 text-[#F0A202]" />
      case 'content_management':
        return <Activity className="h-4 w-4 text-[#4BB543]" />
      case 'security':
        return <Shield className="h-4 w-4 text-[#E63946]" />
      default:
        return <Info className="h-4 w-4 text-[#6C757D]" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'user_management':
        return 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20'
      case 'system_settings':
        return 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20'
      case 'content_management':
        return 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
      case 'security':
        return 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
      default:
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Activity Logs</h1>
          <p className="text-[#6C757D] mt-1">Track admin actions and system events</p>
        </div>
        <button
          onClick={fetchActivityLogs}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
              <Activity className="h-5 w-5 text-[#3D8BFF]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{logs.length}</p>
              <p className="text-xs text-[#6C757D]">Total Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#4BB543]/10">
              <User className="h-5 w-5 text-[#4BB543]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {logs.filter(l => l.action_type === 'user_management').length}
              </p>
              <p className="text-xs text-[#6C757D]">User Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#F0A202]/10">
              <Server className="h-5 w-5 text-[#F0A202]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {logs.filter(l => l.action_type === 'system_settings').length}
              </p>
              <p className="text-xs text-[#6C757D]">System Changes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#E63946]/10">
              <Shield className="h-5 w-5 text-[#E63946]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {logs.filter(l => l.action_type === 'security').length}
              </p>
              <p className="text-xs text-[#6C757D]">Security Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D]" />
            <input
              type="text"
              placeholder="Search activity logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-[#6C757D]" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="user_management">User Management</option>
              <option value="system_settings">System Settings</option>
              <option value="content_management">Content Management</option>
              <option value="security">Security</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-[#6C757D]" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            >
              <option value="1day">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white rounded-lg border border-[#E0E6ED]">
        <div className="divide-y divide-[#E0E6ED]">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-[#F7F9FC]">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(log.action_type)}`}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                      {log.target_type && (
                        <span className="text-xs text-[#6C757D] bg-[#F7F9FC] px-2 py-1 rounded">
                          {log.target_type}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#6C757D]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#1A1A1A] mb-2">{log.action_description}</p>
                  <div className="flex items-center space-x-4 text-xs text-[#6C757D]">
                    <span>Admin: {log.admin_name || 'Unknown'}</span>
                    {log.ip_address && <span>IP: {log.ip_address}</span>}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <span>Metadata: {Object.keys(log.metadata).length} items</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <p className="text-[#6C757D]">No activity logs found</p>
          </div>
        )}
      </div>
    </div>
  )
}