'use client'

import { useState } from 'react'
import { Monitor, MapPin, Bell, FileText, Map } from 'lucide-react'
import NeonCard from './NeonCard'

export default function ProductTourSection() {
  const [activeTab, setActiveTab] = useState(0)

  const features = [
    {
      icon: Monitor,
      title: "Keyword Table",
      description: "See position, delta, SERP features, and device at a glance.",
      preview: (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <span className="text-sm">seo tools</span>
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">#3</span>
              <span className="text-green-400 text-xs">+2</span>
            </div>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <span className="text-sm">rank tracker</span>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">#1</span>
              <span className="text-gray-400 text-xs">—</span>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: MapPin,
      title: "Location & Device Views",
      description: "Track desktop/mobile by country, city, ZIP; add competitors.",
      preview: (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Desktop • New York</span>
            </div>
            <span className="text-green-400 font-medium">#3</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 text-gray-400">📱</span>
              <span className="text-sm">Mobile • London</span>
            </div>
            <span className="text-yellow-400 font-medium">#7</span>
          </div>
        </div>
      )
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Instant alerts when positions jump or drop beyond your threshold.",
      preview: (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-xs font-medium">RANK UP</span>
            </div>
            <div className="text-sm text-white mt-1">"seo tools" #5 → #3</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-red-400 text-xs font-medium">RANK DOWN</span>
            </div>
            <div className="text-sm text-white mt-1">"keyword tool" #8 → #12</div>
          </div>
        </div>
      )
    },
    {
      icon: FileText,
      title: "Client Reports",
      description: "Schedule branded PDFs or live links—weekly/monthly—ready for clients.",
      preview: (
        <div className="space-y-3">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Weekly Report</span>
              <span className="text-xs text-green-400">Ready</span>
            </div>
            <div className="text-xs text-gray-400">47 keywords • 12 improved • 3 declined</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Client Dashboard</span>
              <span className="text-xs text-blue-400">Live Link</span>
            </div>
            <div className="text-xs text-gray-400">Auto-updates • White-labeled</div>
          </div>
        </div>
      )
    },
    {
      icon: Map,
      title: "Local Grid View",
      description: "Visualize coverage across neighborhoods for true local SEO.",
      preview: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten I.', 'Nassau'].map((area, idx) => (
              <div key={idx} className="bg-white/5 p-2 rounded text-center border border-white/10">
                <div className="text-xs text-gray-400">{area}</div>
                <div className={`text-sm font-medium ${
                  idx % 3 === 0 ? 'text-green-400' : 
                  idx % 3 === 1 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  #{3 + idx}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            See IndexNow in action
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Every feature designed to save you time and deliver clear insights.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Feature Tabs */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                  activeTab === index 
                    ? 'bg-white/10 border border-white/20' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/8'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    activeTab === index ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-400'
                  }`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Feature Preview */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-300">
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {features[activeTab].title}
                  </h3>
                  <p className="text-gray-400">
                    {features[activeTab].description}
                  </p>
                </div>
                
                <div className="min-h-[200px]">
                  {features[activeTab].preview}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}