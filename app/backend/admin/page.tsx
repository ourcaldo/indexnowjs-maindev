'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  Activity, 
  Briefcase, 
  Server, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

interface DashboardStats {
  total_users: number
  regular_users: number
  admin_users: number
  super_admin_users: number
  total_jobs: number
  active_jobs: number
  completed_jobs: number
  failed_jobs: number
  total_service_accounts: number
  active_service_accounts: number
  daily_api_requests: number
  published_posts: number
  published_pages: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error('Error fetching dashboard stats:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      subtitle: `${stats?.regular_users || 0} regular, ${stats?.admin_users || 0} admin`,
      icon: Users,
      color: 'text-[#3D8BFF]',
      bgColor: 'bg-[#3D8BFF]/10'
    },
    {
      title: 'Indexing Jobs',
      value: stats?.total_jobs || 0,
      subtitle: `${stats?.active_jobs || 0} active, ${stats?.completed_jobs || 0} completed`,
      icon: Activity,
      color: 'text-[#4BB543]',
      bgColor: 'bg-[#4BB543]/10'
    },
    {
      title: 'Service Accounts',
      value: stats?.total_service_accounts || 0,
      subtitle: `${stats?.active_service_accounts || 0} active accounts`,
      icon: Server,
      color: 'text-[#F0A202]',
      bgColor: 'bg-[#F0A202]/10'
    },
    {
      title: 'API Requests Today',
      value: stats?.daily_api_requests || 0,
      subtitle: 'Google Indexing API calls',
      icon: TrendingUp,
      color: 'text-[#1C2331]',
      bgColor: 'bg-[#1C2331]/10'
    }
  ]

  const quickStats = [
    {
      label: 'Failed Jobs',
      value: stats?.failed_jobs || 0,
      icon: XCircle,
      color: 'text-[#E63946]',
      bgColor: 'bg-[#E63946]/10'
    },
    {
      label: 'Success Rate',
      value: stats?.total_jobs ? Math.round(((stats.completed_jobs / stats.total_jobs) * 100)) : 0,
      suffix: '%',
      icon: CheckCircle,
      color: 'text-[#4BB543]',
      bgColor: 'bg-[#4BB543]/10'
    },
    {
      label: 'Published Posts',
      value: stats?.published_posts || 0,
      icon: Briefcase,
      color: 'text-[#3D8BFF]',
      bgColor: 'bg-[#3D8BFF]/10'
    },
    {
      label: 'Published Pages',
      value: stats?.published_pages || 0,
      icon: Briefcase,
      color: 'text-[#F0A202]',
      bgColor: 'bg-[#F0A202]/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Admin Dashboard</h1>
          <p className="text-[#6C757D] mt-1">Overview of IndexNow Pro system metrics</p>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg border border-[#E0E6ED] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-1">{card.value.toLocaleString()}</h3>
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">{card.title}</p>
              <p className="text-xs text-[#6C757D]">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-[#E0E6ED] p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-xs text-[#6C757D]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-[#4BB543] rounded-full"></div>
            <span className="text-sm text-[#6C757D]">Database Connection</span>
            <span className="text-sm font-medium text-[#4BB543]">Healthy</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-[#4BB543] rounded-full"></div>
            <span className="text-sm text-[#6C757D]">Google API</span>
            <span className="text-sm font-medium text-[#4BB543]">Active</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-[#4BB543] rounded-full"></div>
            <span className="text-sm text-[#6C757D]">Background Worker</span>
            <span className="text-sm font-medium text-[#4BB543]">Running</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/backend/admin/users"
            className="flex items-center p-4 rounded-lg border border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors"
          >
            <Users className="h-5 w-5 text-[#3D8BFF] mr-3" />
            <span className="text-sm font-medium text-[#1A1A1A]">Manage Users</span>
          </a>
          <a
            href="/backend/admin/activity"
            className="flex items-center p-4 rounded-lg border border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors"
          >
            <Activity className="h-5 w-5 text-[#4BB543] mr-3" />
            <span className="text-sm font-medium text-[#1A1A1A]">View Logs</span>
          </a>
          <a
            href="/backend/admin/settings/site"
            className="flex items-center p-4 rounded-lg border border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors"
          >
            <Server className="h-5 w-5 text-[#F0A202] mr-3" />
            <span className="text-sm font-medium text-[#1A1A1A]">Site Settings</span>
          </a>
          <a
            href="/backend/admin/cms/posts"
            className="flex items-center p-4 rounded-lg border border-[#E0E6ED] hover:bg-[#F7F9FC] transition-colors"
          >
            <Briefcase className="h-5 w-5 text-[#1C2331] mr-3" />
            <span className="text-sm font-medium text-[#1A1A1A]">Manage Content</span>
          </a>
        </div>
      </div>
    </div>
  )
}