'use client'

import { 
  Shield,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface SecurityData {
  ipAddresses: Array<{
    ip: string
    lastUsed: string
    usageCount: number
  }>
  locations: string[]
  loginAttempts: {
    total: number
    successful: number
    failed: number
    recent: Array<{
      success: boolean
      timestamp: string
      ip_address?: string
      device_info?: any
    }>
  }
  activity: {
    lastActivity: string | null
    firstSeen: string | null
    totalActivities: number
  }
  securityScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

interface UserSecurityCardProps {
  securityData: SecurityData | null
  securityLoading: boolean
}

export function UserSecurityCard({ securityData, securityLoading }: UserSecurityCardProps) {
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
      case 'medium':
        return 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20'
      case 'high':
        return 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
      default:
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
    }
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#4BB543]'
    if (score >= 60) return 'text-[#F0A202]'
    return 'text-[#E63946]'
  }

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#E63946]/10">
          <Shield className="h-5 w-5 text-[#E63946]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Security Overview</h3>
          <p className="text-sm text-[#6C757D]">Account security metrics and login patterns</p>
        </div>
      </div>

      {securityLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-3 bg-[#F7F9FC] rounded-lg">
                <div className="w-8 h-8 bg-[#E0E6ED] rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#E0E6ED] rounded w-2/3"></div>
                  <div className="h-3 bg-[#E0E6ED] rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : securityData ? (
        <div className="space-y-6">
          {/* Security Score & Risk Level */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F7F9FC] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Security Score</p>
                  <p className={`text-2xl font-bold ${getSecurityScoreColor(securityData.securityScore)}`}>
                    {securityData.securityScore}/100
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-[#E0E6ED] flex items-center justify-center">
                  <span className={`text-lg font-bold ${getSecurityScoreColor(securityData.securityScore)}`}>
                    {securityData.securityScore}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F7F9FC] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6C757D] uppercase tracking-wide">Risk Level</p>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(securityData.riskLevel)}`}>
                    {securityData.riskLevel.toUpperCase()}
                  </span>
                </div>
                <AlertTriangle className={`h-8 w-8 ${
                  securityData.riskLevel === 'high' ? 'text-[#E63946]' :
                  securityData.riskLevel === 'medium' ? 'text-[#F0A202]' :
                  'text-[#4BB543]'
                }`} />
              </div>
            </div>
          </div>

          {/* Login Attempts */}
          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-3">Login Attempts</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-[#F7F9FC] rounded-lg">
                <p className="text-2xl font-bold text-[#1A1A1A]">{securityData.loginAttempts.total}</p>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">Total</p>
              </div>
              <div className="text-center p-3 bg-[#4BB543]/10 rounded-lg">
                <p className="text-2xl font-bold text-[#4BB543]">{securityData.loginAttempts.successful}</p>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">Successful</p>
              </div>
              <div className="text-center p-3 bg-[#E63946]/10 rounded-lg">
                <p className="text-2xl font-bold text-[#E63946]">{securityData.loginAttempts.failed}</p>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">Failed</p>
              </div>
            </div>
          </div>

          {/* IP Addresses */}
          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-3">IP Addresses</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {securityData.ipAddresses.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-[#F7F9FC] rounded">
                  <span className="font-mono text-sm text-[#1A1A1A]">{ip.ip}</span>
                  <div className="text-xs text-[#6C757D]">
                    Used {ip.usageCount} times • Last: {new Date(ip.lastUsed).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-3">Locations</h4>
            <div className="flex flex-wrap gap-2">
              {securityData.locations.map((location, index) => (
                <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-[#3D8BFF]/10 text-[#3D8BFF] rounded-full text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>{location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Login Attempts */}
          <div>
            <h4 className="font-medium text-[#1A1A1A] mb-3">Recent Login Attempts</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {securityData.loginAttempts.recent.map((attempt, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-[#F7F9FC] rounded">
                  <div className="flex items-center space-x-2">
                    {attempt.success ? (
                      <CheckCircle className="h-4 w-4 text-[#4BB543]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[#E63946]" />
                    )}
                    <span className="text-sm text-[#1A1A1A]">
                      {attempt.success ? 'Successful login' : 'Failed login'}
                    </span>
                    {attempt.ip_address && (
                      <span className="font-mono text-xs text-[#6C757D]">
                        from {attempt.ip_address}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6C757D]">
                    {new Date(attempt.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-[#6C757D]" />
              <div>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">Last Activity</p>
                <p className="text-sm text-[#1A1A1A]">
                  {securityData.activity.lastActivity 
                    ? new Date(securityData.activity.lastActivity).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-[#6C757D]" />
              <div>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">First Seen</p>
                <p className="text-sm text-[#1A1A1A]">
                  {securityData.activity.firstSeen 
                    ? new Date(securityData.activity.firstSeen).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-[#6C757D]" />
              <div>
                <p className="text-xs text-[#6C757D] uppercase tracking-wide">Total Activities</p>
                <p className="text-sm text-[#1A1A1A]">{securityData.activity.totalActivities}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-[#6C757D] mx-auto mb-3" />
          <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No Security Data</h4>
          <p className="text-sm text-[#6C757D]">Security information is not available for this user.</p>
        </div>
      )}
    </div>
  )
}