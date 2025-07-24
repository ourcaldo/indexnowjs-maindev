'use client'

import { useEffect, useState } from 'react'
import { 
  Globe,
  Save,
  Upload,
  Image,
  Mail,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface SiteSettings {
  id: string
  site_name: string
  site_description: string
  site_logo_url: string | null
  site_icon_url: string | null
  site_favicon_url: string | null
  contact_email: string | null
  support_email: string | null
  maintenance_mode: boolean
  registration_enabled: boolean
  created_at: string
  updated_at: string
}

export default function SiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSiteSettings()
  }, [])

  const fetchSiteSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/site')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch site settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/settings/site', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Site settings saved successfully!' })
        fetchSiteSettings() // Refresh data
      } else {
        setMessage({ type: 'error', text: 'Failed to save site settings' })
      }
    } catch (error) {
      console.error('Failed to save site settings:', error)
      setMessage({ type: 'error', text: 'Failed to save site settings' })
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (field: keyof SiteSettings, value: any) => {
    if (!settings) return
    setSettings({
      ...settings,
      [field]: value
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-[#E63946] mx-auto mb-4" />
        <p className="text-[#6C757D]">Failed to load site settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Site Settings</h1>
          <p className="text-[#6C757D] mt-1">Configure your site's basic information and appearance</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20' 
            : 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Globe className="h-5 w-5 text-[#3D8BFF]" />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Basic Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => updateSettings('site_name', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="IndexNow Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => updateSettings('contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="contact@indexnowpro.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Site Description
            </label>
            <textarea
              value={settings.site_description}
              onChange={(e) => updateSettings('site_description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="Professional URL indexing automation platform"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Support Email
            </label>
            <input
              type="email"
              value={settings.support_email || ''}
              onChange={(e) => updateSettings('support_email', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="support@indexnowpro.com"
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Image className="h-5 w-5 text-[#F0A202]" />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Branding & Assets</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Site Logo URL
            </label>
            <input
              type="url"
              value={settings.site_logo_url || ''}
              onChange={(e) => updateSettings('site_logo_url', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-[#6C757D] mt-1">Main logo for header and branding</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Site Icon URL
            </label>
            <input
              type="url"
              value={settings.site_icon_url || ''}
              onChange={(e) => updateSettings('site_icon_url', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="https://example.com/icon.png"
            />
            <p className="text-xs text-[#6C757D] mt-1">Square icon for mobile and apps</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              Favicon URL
            </label>
            <input
              type="url"
              value={settings.site_favicon_url || ''}
              onChange={(e) => updateSettings('site_favicon_url', e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              placeholder="https://example.com/favicon.ico"
            />
            <p className="text-xs text-[#6C757D] mt-1">Browser tab icon (16x16 or 32x32)</p>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center space-x-2 mb-6">
          <SettingsIcon className="h-5 w-5 text-[#1C2331]" />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">System Settings</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]">Maintenance Mode</h3>
              <p className="text-xs text-[#6C757D]">Temporarily disable public access to the site</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => updateSettings('maintenance_mode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3D8BFF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3D8BFF]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-[#1A1A1A]">User Registration</h3>
              <p className="text-xs text-[#6C757D]">Allow new users to register accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.registration_enabled}
                onChange={(e) => updateSettings('registration_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#3D8BFF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3D8BFF]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}