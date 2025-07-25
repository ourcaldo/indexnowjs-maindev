'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit3, 
  Ban, 
  Shield, 
  Mail,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react'

interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: string
  email_notifications: boolean
  created_at: string
  updated_at: string
  phone_number: string | null
  package_id?: string
  subscribed_at?: string
  expires_at?: string
  daily_quota_used?: number
  daily_quota_reset_date?: string
  package?: {
    id: string
    name: string
    slug: string
    quota_limits: {
      service_accounts: number
      daily_urls: number
      concurrent_jobs: number
    }
  }
  email?: string
  email_confirmed_at?: string
  last_sign_in_at?: string
}

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
      })

      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to suspend user:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
      case 'admin':
        return 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20'
      case 'user':
        return 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
      default:
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
    }
  }

  const getStatusIcon = (user: UserProfile) => {
    if (user.email_confirmed_at) {
      return <CheckCircle className="h-4 w-4 text-[#4BB543]" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-[#F0A202]" />
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
          <h1 className="text-2xl font-bold text-[#1A1A1A]">User Management</h1>
          <p className="text-[#6C757D] mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        <button
          onClick={fetchUsers}
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
              <Users className="h-5 w-5 text-[#3D8BFF]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{users.length}</p>
              <p className="text-xs text-[#6C757D]">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#4BB543]/10">
              <Shield className="h-5 w-5 text-[#4BB543]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </p>
              <p className="text-xs text-[#6C757D]">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#F0A202]/10">
              <CheckCircle className="h-5 w-5 text-[#F0A202]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {users.filter(u => u.email_confirmed_at).length}
              </p>
              <p className="text-xs text-[#6C757D]">Verified</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#E63946]/10">
              <AlertTriangle className="h-5 w-5 text-[#E63946]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">
                {users.filter(u => !u.email_confirmed_at).length}
              </p>
              <p className="text-xs text-[#6C757D]">Unverified</p>
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
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-[#6C757D]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F7F9FC] border-b border-[#E0E6ED]">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">User</th>
                <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Role</th>
                <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Package</th>
                <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Status</th>
                <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Joined</th>
                <th className="text-right py-3 px-4 font-medium text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E6ED]">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                  onClick={() => router.push(`/backend/admin/users/${user.user_id}`)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#3D8BFF]/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-[#3D8BFF]">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {user.full_name || 'No name'}
                        </p>
                        <p className="text-xs text-[#6C757D]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                        user.package?.slug === 'free' ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20' :
                        user.package?.slug === 'premium' ? 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20' :
                        user.package?.slug === 'pro' ? 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20' :
                        'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                      }`}>
                        {user.package?.name || 'No Package'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(user)}
                      <span className="text-sm text-[#6C757D]">
                        {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#6C757D]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-[#6C757D]">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/backend/admin/users/${user.user_id}`)
                        }}
                        className="p-1 text-[#6C757D] hover:text-[#3D8BFF] hover:bg-[#3D8BFF]/10 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/backend/admin/users/${user.user_id}`)
                        }}
                        className="p-1 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          // Quick actions could be implemented here
                        }}
                        className="p-1 text-[#6C757D] hover:text-[#F0A202] hover:bg-[#F0A202]/10 rounded transition-colors"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          // Quick actions could be implemented here
                        }}
                        className="p-1 text-[#6C757D] hover:text-[#E63946] hover:bg-[#E63946]/10 rounded transition-colors"
                        title="Suspend User"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <p className="text-[#6C757D]">No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}