'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Globe, Target } from 'lucide-react'

export default function AddKeywordPage() {
  const [keyword, setKeyword] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [location, setLocation] = useState('global')

  return (
    <div className="space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1C2331' }}>
          <Plus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Add New Keyword</h1>
          <p style={{ color: '#6C757D' }}>Track a new keyword for ranking monitoring</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-lg border p-8" style={{ borderColor: '#E0E6ED' }}>
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F7F9FC' }}>
            <Search className="h-8 w-8" style={{ color: '#3D8BFF' }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Keyword Tracking Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            We're working on building the keyword tracking functionality. This will allow you to monitor your search rankings across different search engines and locations.
          </p>
        </div>
        
        {/* Preview Form (Disabled) */}
        <div className="max-w-lg mx-auto space-y-6 opacity-50 pointer-events-none">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
              Keyword
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#6C757D' }} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  borderColor: '#E0E6ED',
                  backgroundColor: '#F7F9FC'
                }}
                placeholder="Enter keyword to track"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
              Target URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#6C757D' }} />
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  borderColor: '#E0E6ED',
                  backgroundColor: '#F7F9FC'
                }}
                placeholder="https://example.com/target-page"
                disabled
              />
            </div>
            <p className="text-xs mt-1" style={{ color: '#6C757D' }}>
              The specific URL you want to track for this keyword
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                borderColor: '#E0E6ED',
                backgroundColor: '#F7F9FC'
              }}
              disabled
            >
              <option value="global">Global</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
            </select>
          </div>

          <button
            disabled
            className="w-full px-6 py-3 text-white font-medium rounded-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1C2331' }}
          >
            <Target className="h-4 w-4" />
            Start Tracking Keyword
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: '#6C757D' }}>
            Get notified when this feature becomes available!
          </p>
        </div>
      </div>
    </div>
  )
}