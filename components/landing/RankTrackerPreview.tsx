'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, MapPin, Phone, Monitor, Globe } from 'lucide-react'

const keywordData = [
  { keyword: 'seo tools', position: 3, change: 2, volume: '12K', difficulty: 'High', device: 'desktop', location: 'US' },
  { keyword: 'rank tracker', position: 1, change: 0, volume: '8.5K', difficulty: 'Medium', device: 'mobile', location: 'UK' },
  { keyword: 'keyword research', position: 7, change: -1, volume: '15K', difficulty: 'High', device: 'desktop', location: 'CA' },
  { keyword: 'serp analysis', position: 12, change: 5, volume: '3.2K', difficulty: 'Low', device: 'mobile', location: 'AU' },
  { keyword: 'local seo', position: 4, change: 1, volume: '9.8K', difficulty: 'Medium', device: 'desktop', location: 'US' }
]

export default function RankTrackerPreview() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const slides = [
    {
      title: "Real-time Rank Tracking",
      description: "Monitor keyword positions across devices and locations",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <div className="text-2xl font-bold text-green-400">247</div>
              <div className="text-xs text-gray-400">Keywords Tracked</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <div className="text-2xl font-bold text-blue-400">15</div>
              <div className="text-xs text-gray-400">Top 10 Rankings</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <div className="text-2xl font-bold text-yellow-400">+12</div>
              <div className="text-xs text-gray-400">Position Changes</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {keywordData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {item.device === 'mobile' ? 
                      <Phone className="w-3 h-3 text-gray-400" /> : 
                      <Monitor className="w-3 h-3 text-gray-400" />
                    }
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{item.location}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-white">{item.keyword}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      item.position <= 3 ? 'text-green-400' : 
                      item.position <= 10 ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      #{item.position}
                    </span>
                    {item.change > 0 && (
                      <div className="flex items-center space-x-1 text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        <span className="text-xs">+{item.change}</span>
                      </div>
                    )}
                    {item.change < 0 && (
                      <div className="flex items-center space-x-1 text-red-400">
                        <TrendingDown className="w-3 h-3" />
                        <span className="text-xs">{item.change}</span>
                      </div>
                    )}
                    {item.change === 0 && (
                      <Minus className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Multi-Location Tracking",
      description: "Track rankings by country, city, and device type",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Global Tracking</span>
              </div>
              <div className="text-xl font-bold text-white">12 Countries</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">City Level</span>
              </div>
              <div className="text-xl font-bold text-white">24 Cities</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300 mb-3">Location Performance</div>
            {[
              { location: 'New York, US', rank: 3, traffic: '+15%', color: 'green' },
              { location: 'London, UK', rank: 7, traffic: '+8%', color: 'yellow' },
              { location: 'Toronto, CA', rank: 12, traffic: '-3%', color: 'red' },
              { location: 'Sydney, AU', rank: 5, traffic: '+22%', color: 'green' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-white">{item.location}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">Rank #{item.rank}</span>
                  <span className={`text-sm font-medium ${
                    item.color === 'green' ? 'text-green-400' : 
                    item.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {item.traffic}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Position History & Analytics",
      description: "View keyword ranking trends and manage domains with organized tracking",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-400/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm font-medium text-blue-400">DOMAIN STATS</span>
            </div>
            <div className="text-white font-medium">
              example.com: 47 keywords tracked
            </div>
            <div className="text-xs text-gray-400 mt-1">Last updated today</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-300 mb-3">Recent Position Changes</div>
            {[
              { keyword: 'seo tools', position: 3, change: '+2', device: 'Desktop' },
              { keyword: 'rank tracker', position: 1, change: '-', device: 'Mobile' },
              { keyword: 'keyword research', position: 7, change: '-1', device: 'Desktop' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-white">{item.keyword}</span>
                  <span className="text-xs text-gray-400">{item.device}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">#{item.position}</span>
                  <span className={`text-xs ${
                    item.change.includes('+') ? 'text-green-400' : 
                    item.change === '-' ? 'text-gray-400' : 'text-red-400'
                  }`}>
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
            <div className="text-sm text-gray-400 mb-1">Position History Available</div>
            <button className="text-blue-400 text-sm font-medium hover:underline">
              View Historical Data
            </button>
          </div>
        </div>
      )
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveSlide((prev) => (prev + 1) % slides.length)
        setIsAnimating(false)
      }, 150)
    }, 4000)

    return () => clearInterval(interval)
  }, [slides.length])

  return (
    <div className="bg-black/90 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
      <div className="p-6">
        <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              {slides[activeSlide].title}
            </h3>
            <p className="text-sm text-gray-400">
              {slides[activeSlide].description}
            </p>
          </div>
          
          <div className="h-[400px] overflow-hidden">
            {slides[activeSlide].content}
          </div>
        </div>
        
        <div className="flex space-x-2 mt-6 justify-center">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === activeSlide ? 'bg-blue-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}