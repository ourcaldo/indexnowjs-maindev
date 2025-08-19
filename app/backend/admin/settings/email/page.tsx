'use client'

import { useEffect, useState } from 'react'
import { 
  Mail,
  Save,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  Lock,
  Server,
  Shield,
  TestTube2
} from 'lucide-react'

interface SmtpSettings {
  id: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  smtp_from_name: string
  smtp_from_email: string
  smtp_secure: boolean
  smtp_enabled: boolean
  created_at: string
  updated_at: string
}

export default function EmailSettings() {
  const [settings, setSettings] = useState<SmtpSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchEmailSettings()
  }, [])

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/email', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/settings/email', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email settings saved successfully!' })
        fetchEmailSettings() // Refresh data
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings) return

    setTesting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setTesting(false)
    }
  }

  const updateSettings = (field: keyof SmtpSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D8BFF] mx-auto"></div>
          <p className="text-[#6C757D] mt-2">Loading email settings...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-[#F0A202] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Settings Not Found</h2>
          <p className="text-[#6C757D]">Unable to load email settings. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-[#F7F9FC] rounded-lg">
              <Mail className="h-6 w-6 text-[#3D8BFF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Email Settings</h1>
              <p className="text-[#6C757D]">Configure SMTP settings for email notifications</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-[#4BB543] text-green-800'
              : 'bg-red-50 border-[#E63946] text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white border border-[#E0E6ED] rounded-lg">
          <div className="p-6 border-b border-[#E0E6ED]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-[#3D8BFF]" />
                <h2 className="text-lg font-semibold text-[#1A1A1A]">SMTP Configuration</h2>
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smtp_enabled}
                    onChange={(e) => updateSettings('smtp_enabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.smtp_enabled ? 'bg-[#4BB543]' : 'bg-[#E0E6ED]'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.smtp_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="ml-2 text-sm text-[#6C757D]">
                    {settings.smtp_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Server Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  <Server className="h-4 w-4 inline mr-2" />
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => updateSettings('smtp_host', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="mail.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  <SettingsIcon className="h-4 w-4 inline mr-2" />
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtp_port}
                  onChange={(e) => updateSettings('smtp_port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="465"
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtp_user}
                  onChange={(e) => updateSettings('smtp_user', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="username@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  <Lock className="h-4 w-4 inline mr-2" />
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.smtp_pass}
                  onChange={(e) => updateSettings('smtp_pass', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {/* Sender Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.smtp_from_name}
                  onChange={(e) => updateSettings('smtp_from_name', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="IndexNow Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={settings.smtp_from_email}
                  onChange={(e) => updateSettings('smtp_from_email', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            {/* Security Settings */}
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smtp_secure}
                  onChange={(e) => updateSettings('smtp_secure', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.smtp_secure ? 'bg-[#4BB543]' : 'bg-[#E0E6ED]'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.smtp_secure ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
                <span className="ml-3 text-sm text-[#1A1A1A]">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Use TLS/SSL Encryption
                </span>
              </label>
              <p className="text-xs text-[#6C757D] ml-14 mt-1">
                Recommended for secure email transmission (typically required for port 465)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-[#E0E6ED] bg-[#F7F9FC]">
            <div className="flex items-center justify-between">
              <button
                onClick={handleTestEmail}
                disabled={testing || !settings.smtp_enabled}
                className="flex items-center space-x-2 px-4 py-2 border border-[#E0E6ED] rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube2 className="h-4 w-4" />
                <span>{testing ? 'Testing...' : 'Test Email'}</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 bg-[#1A1A1A] text-white px-6 py-2 rounded-lg hover:bg-[#2C2C2E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Email Configuration Notes:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Email settings will override environment variables when enabled</li>
                <li>• Test email functionality before enabling to ensure delivery</li>
                <li>• Use app-specific passwords for Gmail and other providers</li>
                <li>• Port 465 typically requires SSL/TLS encryption</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}