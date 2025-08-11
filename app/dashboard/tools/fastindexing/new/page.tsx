'use client'

import { useState } from 'react'
import { Zap, Download, AlertTriangleIcon, InfoIcon } from 'lucide-react'

export default function NewIndexPage() {
  const [activeTab, setActiveTab] = useState('manual')
  const [jobName, setJobName] = useState('#Job-1753026377069-420')
  const [urls, setUrls] = useState('https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{color: '#1A1A1A'}}>IndexNow</h1>
        <p className="mt-1" style={{color: '#6C757D'}}>Submit URLs for indexing and manage schedules</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg border" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5" style={{color: '#6C757D'}} />
              <h2 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Submit URLs for Indexing</h2>
            </div>

            {/* Job Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{color: '#6C757D'}}>
                Job Name
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{borderColor: '#E0E6ED', '--tw-ring-color': '#3D8BFF'} as any}
              />
            </div>

            {/* Input Method Tabs */}
            <div className="mb-6">
              <div className="flex border rounded-lg p-1" style={{borderColor: '#E0E6ED', backgroundColor: '#F7F9FC'}}>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: activeTab === 'manual' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'manual' ? '#1A1A1A' : '#6C757D',
                    boxShadow: activeTab === 'manual' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'manual') (e.target as HTMLButtonElement).style.color = '#1A1A1A'
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'manual') (e.target as HTMLButtonElement).style.color = '#6C757D'
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>✋</span>
                    Manual Input
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('sitemap')}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: activeTab === 'sitemap' ? '#FFFFFF' : 'transparent',
                    color: activeTab === 'sitemap' ? '#1A1A1A' : '#6C757D',
                    boxShadow: activeTab === 'sitemap' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'sitemap') (e.target as HTMLButtonElement).style.color = '#1A1A1A'
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'sitemap') (e.target as HTMLButtonElement).style.color = '#6C757D'
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    From Sitemap
                  </div>
                </button>
              </div>
            </div>

            {/* URL Input */}
            {activeTab === 'manual' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter one URL per line. Maximum 1000 URLs per job.
                </p>
              </div>
            )}

            {activeTab === 'sitemap' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sitemap URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="https://example.com/sitemap.xml"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter your sitemap URL to automatically import all URLs for indexing.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium">
              Submit URLs for Indexing
            </button>
          </div>
        </div>

        {/* Sidebar - API Quota Status */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API Quota Status</h3>
            
            {/* Service Account */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">indexnow@nexpocker.com</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Critical</span>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-600 mb-1">Daily Requests</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{width: '97.5%'}}></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">195/200</div>
              </div>
            </div>

            {/* Combined Quota */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-blue-600 mb-1">Combined Quota</div>
                <div className="text-2xl font-bold text-blue-600">195/200</div>
                <div className="text-xs text-blue-600">Daily requests available</div>
              </div>
            </div>

            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-800">
                  API quota is running low. Consider adding more service accounts to avoid interruptions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}