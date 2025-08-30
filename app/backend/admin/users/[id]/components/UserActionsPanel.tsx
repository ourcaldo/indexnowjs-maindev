'use client'

import { 
  Ban, 
  Key, 
  Zap,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'

interface UserActions {
  suspend: boolean
  resetPassword: boolean
  editData: boolean
  resetQuota: boolean
  changePackage: boolean
  extendSubscription: boolean
}

interface UserActionsPanel {
  actionLoading: UserActions
  newPassword: string | null
  showPassword: boolean
  onTogglePasswordVisibility: () => void
  onSuspendUser: () => void
  onResetPassword: () => void
  onResetQuota: () => void
  onChangePackage: () => void
  onExtendSubscription: () => void
}

export function UserActionsPanel({
  actionLoading,
  newPassword,
  showPassword,
  onTogglePasswordVisibility,
  onSuspendUser,
  onResetPassword,
  onResetQuota,
  onChangePackage,
  onExtendSubscription
}: UserActionsPanel) {
  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#F0A202]/10">
          <Zap className="h-5 w-5 text-[#F0A202]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Admin Actions</h3>
          <p className="text-sm text-[#6C757D]">Manage user account settings and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suspend/Unsuspend User */}
        <button
          onClick={onSuspendUser}
          disabled={actionLoading.suspend}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#E63946]/10 text-[#E63946] rounded-lg hover:bg-[#E63946]/20 transition-colors disabled:opacity-50 border border-[#E63946]/20"
        >
          <Ban className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.suspend ? 'Processing...' : 'Suspend User'}
          </span>
        </button>

        {/* Reset Password */}
        <button
          onClick={onResetPassword}
          disabled={actionLoading.resetPassword}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#F0A202]/10 text-[#F0A202] rounded-lg hover:bg-[#F0A202]/20 transition-colors disabled:opacity-50 border border-[#F0A202]/20"
        >
          <Key className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.resetPassword ? 'Resetting...' : 'Reset Password'}
          </span>
        </button>

        {/* Reset Daily Quota */}
        <button
          onClick={onResetQuota}
          disabled={actionLoading.resetQuota}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#3D8BFF]/10 text-[#3D8BFF] rounded-lg hover:bg-[#3D8BFF]/20 transition-colors disabled:opacity-50 border border-[#3D8BFF]/20"
        >
          <Zap className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.resetQuota ? 'Resetting...' : 'Reset Daily Quota'}
          </span>
        </button>

        {/* Change Package */}
        <button
          onClick={onChangePackage}
          disabled={actionLoading.changePackage}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#4BB543]/10 text-[#4BB543] rounded-lg hover:bg-[#4BB543]/20 transition-colors disabled:opacity-50 border border-[#4BB543]/20"
        >
          <Zap className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.changePackage ? 'Changing...' : 'Change Package'}
          </span>
        </button>

        {/* Extend Subscription */}
        <button
          onClick={onExtendSubscription}
          disabled={actionLoading.extendSubscription}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-[#6C757D]/10 text-[#6C757D] rounded-lg hover:bg-[#6C757D]/20 transition-colors disabled:opacity-50 border border-[#6C757D]/20"
        >
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {actionLoading.extendSubscription ? 'Extending...' : 'Extend Subscription (+30 days)'}
          </span>
        </button>
      </div>

      {/* New Password Display */}
      {newPassword && (
        <div className="mt-6 p-4 bg-[#4BB543]/10 border border-[#4BB543]/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[#4BB543] mb-1">New Password Generated</h4>
              <p className="text-sm text-[#6C757D] mb-2">Please share this password securely with the user.</p>
              <div className="flex items-center space-x-2">
                <code className="px-2 py-1 bg-white rounded border text-sm font-mono">
                  {showPassword ? newPassword : '••••••••••••'}
                </code>
                <button
                  onClick={onTogglePasswordVisibility}
                  className="p-1 text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}