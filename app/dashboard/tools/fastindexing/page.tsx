'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { useQuotaValidation } from '@/hooks/useQuotaValidation'

import { 
  Zap, 
  Download, 
  Calendar, 
  Clock,
  Database,
  AlertTriangle
} from 'lucide-react'

export default function IndexNowPage() {
  const { addToast } = useToast()
  const { validateJobCreation, isQuotaNearExhaustion, quotaInfo } = useQuotaValidation()
  const [loading, setLoading] = useState(false)
  const [loadingServiceAccounts, setLoadingServiceAccounts] = useState(true)
  const [parsingSitemap, setParsingSitemap] = useState(false)
  
  // Form states
  const [activeTab, setActiveTab] = useState<'manual' | 'sitemap'>('manual')
  const [jobName, setJobName] = useState('')
  const [nextJobNumber, setNextJobNumber] = useState(1)
  const [urls, setUrls] = useState('')
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [scheduleType, setScheduleType] = useState('one-time')
  const [startTime, setStartTime] = useState('')
  const [parsedUrls, setParsedUrls] = useState<string[]>([])
  
  // Service accounts data
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Quota notification state
  const [showQuotaNotification, setShowQuotaNotification] = useState(false)
  const [quotaNotificationData, setQuotaNotificationData] = useState({
    remainingQuota: 0,
    dailyLimit: 0,
    packageName: ''
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setJobName(`#Job-${nextJobNumber}`)
  }, [nextJobNumber])

  const loadData = async () => {
    try {
      setLoadingServiceAccounts(true)
      const user = await authService.getCurrentUser()
      if (!user) return

      setCurrentUser(user)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      // Load service accounts
      const serviceAccountsResponse = await fetch('/api/service-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (serviceAccountsResponse.ok) {
        const serviceAccountsData = await serviceAccountsResponse.json()
        setServiceAccounts(serviceAccountsData.service_accounts || [])
      }

      // Get next job number
      const jobsResponse = await fetch('/api/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setNextJobNumber((jobsData.jobs || []).length + 1)
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoadingServiceAccounts(false)
    }
  }

  const parseSitemap = async () => {
    if (!sitemapUrl.trim()) {
      addToast({
        title: "Error",
        description: "Please enter a sitemap URL",
        variant: "destructive"
      })
      return
    }

    setParsingSitemap(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch('/api/sitemap/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sitemapUrl })
      })

      const data = await response.json()
      if (response.ok) {
        setParsedUrls(data.urls)
        addToast({
          title: "Success",
          description: `Found ${data.urls.length} URLs in sitemap`,
          variant: "default"
        })
      } else {
        addToast({
          title: "Error",
          description: data.error || "Failed to parse sitemap",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error parsing sitemap:', error)
      addToast({
        title: "Error",
        description: "Failed to parse sitemap",
        variant: "destructive"
      })
    } finally {
      setParsingSitemap(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    // Validate quota before proceeding
    const validation = await validateJobCreation()
    if (!validation.canCreate) {
      addToast({
        title: "Quota Limit Reached",
        description: validation.message,
        variant: "destructive"
      })
      return
    }

    // Get URLs based on active tab
    let urlsToSubmit: string[] = []
    if (activeTab === 'manual') {
      urlsToSubmit = urls.split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)
      
      if (urlsToSubmit.length === 0) {
        addToast({
          title: "Error",
          description: "Please enter at least one URL",
          variant: "destructive"
        })
        return
      }
    } else {
      if (parsedUrls.length === 0) {
        addToast({
          title: "Error",
          description: "Please parse a sitemap first",
          variant: "destructive"
        })
        return
      }
      urlsToSubmit = parsedUrls
    }

    if (serviceAccounts.length === 0) {
      addToast({
        title: "Error",
        description: "No service accounts available. Please add a service account first.",
        variant: "destructive"
      })
      return
    }

    if (!jobName.trim()) {
      addToast({
        title: "Error", 
        description: "Please enter a job name",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: jobName.trim(),
          type: activeTab,
          urls: urlsToSubmit,
          schedule_type: scheduleType,
          start_time: startTime || undefined,
          sitemap_url: activeTab === 'sitemap' ? sitemapUrl : undefined
        })
      })

      const data = await response.json()
      if (response.ok) {
        addToast({
          title: "Success",
          description: `Job "${jobName}" created successfully with ${urlsToSubmit.length} URLs`,
          variant: "default"
        })
        
        // Reset form
        setUrls('')
        setSitemapUrl('')
        setParsedUrls([])
        setStartTime('')
        setScheduleType('one-time')
        setNextJobNumber(prev => prev + 1)
        
        // Show quota notification if needed
        if (validation.showNotification) {
          setQuotaNotificationData({
            remainingQuota: validation.remainingQuota || 0,
            dailyLimit: validation.dailyLimit || 0,
            packageName: validation.packageName || ''
          })
          setShowQuotaNotification(true)
        }
        
      } else {
        addToast({
          title: "Error",
          description: data.error || "Failed to create job",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating job:', error)
      addToast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1C2331' }}>
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>FastIndexing</h1>
          <p style={{ color: '#6C757D' }}>Submit URLs to Google for fast indexing</p>
        </div>
      </div>

      {/* Quota Warning */}
      {isQuotaNearExhaustion && quotaInfo && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FFF8E1', borderColor: '#F0A202' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" style={{ color: '#F0A202' }} />
            <div className="flex-1">
              <h3 className="font-medium" style={{ color: '#F0A202' }}>Quota Nearly Exhausted</h3>
              <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                You have used {quotaInfo.used} of {quotaInfo.limit} daily requests ({quotaInfo.percentage}% used).
                {quotaInfo.remaining <= 10 && (
                  <span className="font-medium"> Only {quotaInfo.remaining} requests remaining.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Accounts Warning */}
      {!loadingServiceAccounts && serviceAccounts.length === 0 && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FFF5F5', borderColor: '#E63946' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" style={{ color: '#E63946' }} />
            <div className="flex-1">
              <h3 className="font-medium" style={{ color: '#E63946' }}>No Service Accounts</h3>
              <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                You need to add at least one Google service account to create indexing jobs.
                Please go to Settings → Service Accounts to add one.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E0E6ED' }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
              Job Name
            </label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                borderColor: '#E0E6ED',
                focusRingColor: '#3D8BFF'
              }}
              placeholder="Enter job name"
              required
            />
          </div>

          {/* URL Input Method Tabs */}
          <div>
            <div className="flex space-x-1 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'manual'
                    ? 'text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: activeTab === 'manual' ? '#1C2331' : 'transparent',
                  borderColor: '#E0E6ED'
                }}
              >
                Manual URLs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sitemap')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'sitemap'
                    ? 'text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={{
                  backgroundColor: activeTab === 'sitemap' ? '#1C2331' : 'transparent',
                  borderColor: '#E0E6ED'
                }}
              >
                From Sitemap
              </button>
            </div>

            {activeTab === 'manual' ? (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                  URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    borderColor: '#E0E6ED',
                    focusRingColor: '#3D8BFF'
                  }}
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                  required
                />
                <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
                  Enter one URL per line. All URLs will be validated before submission.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                    Sitemap URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sitemapUrl}
                      onChange={(e) => setSitemapUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        borderColor: '#E0E6ED',
                        focusRingColor: '#3D8BFF'
                      }}
                      placeholder="https://example.com/sitemap.xml"
                      required
                    />
                    <button
                      type="button"
                      onClick={parseSitemap}
                      disabled={parsingSitemap || !sitemapUrl.trim()}
                      className="px-4 py-2 text-white font-medium rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: '#1C2331' }}
                    >
                      {parsingSitemap ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Parse
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {parsedUrls.length > 0 && (
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#F7F9FC', borderColor: '#E0E6ED' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" style={{ color: '#4BB543' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>
                        Found {parsedUrls.length} URLs
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {parsedUrls.slice(0, 10).map((url, index) => (
                        <div key={index} className="text-sm py-1" style={{ color: '#6C757D' }}>
                          {url}
                        </div>
                      ))}
                      {parsedUrls.length > 10 && (
                        <div className="text-sm py-1 font-medium" style={{ color: '#6C757D' }}>
                          ... and {parsedUrls.length - 10} more URLs
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                Schedule Type
              </label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  borderColor: '#E0E6ED',
                  focusRingColor: '#3D8BFF'
                }}
              >
                <option value="one-time">One-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {scheduleType !== 'one-time' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    borderColor: '#E0E6ED',
                    focusRingColor: '#3D8BFF'
                  }}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || loadingServiceAccounts || serviceAccounts.length === 0}
              className="px-6 py-3 text-white font-medium rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: '#1C2331' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Job...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Create Indexing Job
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-sm" style={{ color: '#6C757D' }}>
              <Clock className="h-4 w-4" />
              {scheduleType === 'one-time' ? 'Will start immediately' : `Will start ${startTime ? 'at specified time' : 'immediately'}`}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}