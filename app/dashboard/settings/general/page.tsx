'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { 
  Settings as SettingsIcon, 
  Bell,
  Clock,
  RefreshCw
} from 'lucide-react'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/general', 'General Settings', { section: 'general_settings' })
  const { logSettingsActivity } = useActivityLogger()

  // Form states
  const [notifications, setNotifications] = useState({
    jobCompletion: true,
    failures: true,
    dailyReports: true,
    criticalAlerts: true
  })

  const [generalSettings, setGeneralSettings] = useState({
    defaultSchedule: 'one-time',
    requestTimeout: 30000,
    retryAttempts: 3
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load user settings
      const settingsResponse = await fetch('/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        const settings = settingsData.settings
        setGeneralSettings({
          defaultSchedule: settings.default_schedule || 'one-time',
          requestTimeout: settings.timeout_duration || 30000,
          retryAttempts: settings.retry_attempts || 3
        })
        setNotifications({
          jobCompletion: settings.email_job_completion || false,
          failures: settings.email_job_failure || false,
          dailyReports: settings.email_daily_report || false,
          criticalAlerts: settings.email_quota_alerts || false
        })
      } else if (settingsResponse.status === 404) {
        // Settings don't exist, keep defaults
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          default_schedule: generalSettings.defaultSchedule,
          timeout_duration: generalSettings.requestTimeout,
          retry_attempts: generalSettings.retryAttempts,
          email_job_completion: notifications.jobCompletion,
          email_job_failure: notifications.failures,
          email_daily_report: notifications.dailyReports,
          email_quota_alerts: notifications.criticalAlerts
        })
      })

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Settings updated successfully',
          type: 'success'
        })
        await logSettingsActivity('settings_update', 'Settings updated', {
          section: 'general',
          changes: { generalSettings, notifications }
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Failed to update settings',
          description: error.error || 'Something went wrong',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update settings',
        type: 'error'
      })
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* General Settings Column */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Default Schedule</label>
            <select 
              className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E0E6ED',
                color: '#1A1A1A'
              }}
              value={generalSettings.defaultSchedule}
              onChange={(e) => setGeneralSettings(prev => ({...prev, defaultSchedule: e.target.value}))}
            >
              <option value="one-time">One-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Request Timeout (seconds)</label>
            <input 
              type="number"
              min="10"
              max="300"
              className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E0E6ED',
                color: '#1A1A1A'
              }}
              placeholder="30"
              value={generalSettings.requestTimeout / 1000}
              onChange={(e) => setGeneralSettings(prev => ({...prev, requestTimeout: parseInt(e.target.value) * 1000 || 30000}))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{color: '#1A1A1A'}}>Retry Attempts</label>
            <input 
              type="number"
              min="1"
              max="10"
              className="w-full p-3 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E0E6ED',
                color: '#1A1A1A'
              }}
              placeholder="3"
              value={generalSettings.retryAttempts}
              onChange={(e) => setGeneralSettings(prev => ({...prev, retryAttempts: parseInt(e.target.value) || 3}))}
            />
          </div>
        </div>

        {/* Notification Settings Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{backgroundColor: '#1C2331'}}>
              <Bell className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Notification Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Email notifications for job completion</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications.jobCompletion}
                  onChange={(e) => setNotifications(prev => ({...prev, jobCompletion: e.target.checked}))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Email notifications for failures</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications.failures}
                  onChange={(e) => setNotifications(prev => ({...prev, failures: e.target.checked}))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Daily quota reports</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications.dailyReports}
                  onChange={(e) => setNotifications(prev => ({...prev, dailyReports: e.target.checked}))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>Critical quota alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications.criticalAlerts}
                  onChange={(e) => setNotifications(prev => ({...prev, criticalAlerts: e.target.checked}))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
          style={{backgroundColor: '#1C2331'}}
          onClick={handleSaveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}