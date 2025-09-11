'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Button } from '@/components/ui/button'
import { 
  SettingCard, 
  SettingToggle, 
  SettingInput, 
  SettingSelect 
} from '@/components/settings'
import { 
  Bell,
  Clock,
  RefreshCw,
  Save
} from 'lucide-react'

export default function GeneralSettingsPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Log page view and settings activities
  usePageViewLogger('/dashboard/settings/general', 'General Settings', { section: 'general_settings' })
  const { logDashboardActivity } = useActivityLogger()

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
      const settingsResponse = await fetch('/api/v1/auth/user/settings', {
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

      const response = await fetch('/api/v1/auth/user/settings', {
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
        await logDashboardActivity('settings_update', 'Settings updated', {
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

  const scheduleOptions = [
    { value: 'one-time', label: 'One-time' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* General Configuration */}
      <SettingCard 
        title="General Configuration" 
        description="Configure default schedule, timeouts, and retry behavior for indexing jobs"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingSelect
            id="default-schedule"
            label="Default Schedule"
            placeholder="Select schedule frequency"
            value={generalSettings.defaultSchedule}
            onChange={(value) => setGeneralSettings(prev => ({...prev, defaultSchedule: value}))}
            options={scheduleOptions}
            description="Default scheduling frequency for new indexing jobs"
          />
          
          <SettingInput
            id="request-timeout"
            label="Request Timeout"
            type="number"
            placeholder="30"
            value={String(generalSettings.requestTimeout / 1000)}
            onChange={(value) => setGeneralSettings(prev => ({...prev, requestTimeout: parseInt(value) * 1000 || 30000}))}
            description="Timeout in seconds (10-300)"
          />
        </div>
        
        <SettingInput
          id="retry-attempts"
          label="Retry Attempts"
          type="number"
          placeholder="3"
          value={String(generalSettings.retryAttempts)}
          onChange={(value) => setGeneralSettings(prev => ({...prev, retryAttempts: parseInt(value) || 3}))}
          description="Number of retry attempts for failed requests (1-10)"
          className="sm:max-w-sm"
        />
      </SettingCard>

      {/* Email Notifications */}
      <SettingCard 
        title="Email Notifications" 
        description="Control when you receive email notifications about your indexing activities"
      >
        <div className="space-y-4">
          <SettingToggle
            id="job-completion"
            label="Job completion notifications"
            description="Get notified when indexing jobs complete successfully"
            checked={notifications.jobCompletion}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, jobCompletion: checked}))}
          />
          
          <SettingToggle
            id="job-failures"
            label="Failure notifications"
            description="Get notified when indexing jobs fail or encounter errors"
            checked={notifications.failures}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, failures: checked}))}
          />
          
          <SettingToggle
            id="daily-reports"
            label="Daily quota reports"
            description="Receive daily summaries of your quota usage and activities"
            checked={notifications.dailyReports}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, dailyReports: checked}))}
          />
          
          <SettingToggle
            id="critical-alerts"
            label="Critical quota alerts"
            description="Get notified when you're approaching quota limits"
            checked={notifications.criticalAlerts}
            onCheckedChange={(checked) => setNotifications(prev => ({...prev, criticalAlerts: checked}))}
          />
        </div>
      </SettingCard>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleSaveSettings}
          disabled={savingSettings}
          size="lg"
          className="min-w-32"
        >
          {savingSettings ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}