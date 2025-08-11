'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Search, Plus, Eye, MoreHorizontal } from 'lucide-react'

export default function KeywordTrackerOverview() {
  return (
    <div className="space-y-6" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1C2331' }}>
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Keyword Tracker Overview</h1>
            <p style={{ color: '#6C757D' }}>Monitor your keyword rankings and performance</p>
          </div>
        </div>
        
        <button
          className="px-4 py-2 text-white font-medium rounded-lg hover:opacity-80 flex items-center gap-2"
          style={{ backgroundColor: '#1C2331' }}
        >
          <Plus className="h-4 w-4" />
          Add Keyword
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E0E6ED' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#6C757D' }}>Total Keywords</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#1A1A1A' }}>0</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F7F9FC' }}>
              <Search className="h-5 w-5" style={{ color: '#3D8BFF' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E0E6ED' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#6C757D' }}>Average Position</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#1A1A1A' }}>--</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F7F9FC' }}>
              <TrendingUp className="h-5 w-5" style={{ color: '#4BB543' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E0E6ED' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: '#6C757D' }}>Tracked URLs</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#1A1A1A' }}>0</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F7F9FC' }}>
              <Eye className="h-5 w-5" style={{ color: '#F0A202' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-lg border p-8 text-center" style={{ borderColor: '#E0E6ED' }}>
        <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F7F9FC' }}>
          <Search className="h-8 w-8" style={{ color: '#3D8BFF' }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>Keyword Tracking Coming Soon</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We're building an advanced keyword tracking system to help you monitor your search rankings and track performance over time.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#6C757D' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4BB543' }}></div>
            <span>Track unlimited keywords</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#6C757D' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4BB543' }}></div>
            <span>Monitor ranking changes</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#6C757D' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4BB543' }}></div>
            <span>Detailed analytics and reports</span>
          </div>
        </div>
      </div>
    </div>
  )
}