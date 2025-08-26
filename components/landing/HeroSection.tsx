'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import RankTrackerPreview from './RankTrackerPreview'
import NeonCard from './NeonCard'

interface HeroSectionProps {
  user: any
  onGetStarted: () => void
  onScrollToDemo: () => void
}

export default function HeroSection({ user, onGetStarted, onScrollToDemo }: HeroSectionProps) {
  return (
    <section className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copywriting */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Rank tracking,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400">
                  minus the bloat
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed">
                IndexNow focuses on one job and does it right: precise keyword rankings 
                with clean reports and fair pricing. No tool fatigue. No surprise fees.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Start free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onScrollToDemo}
                className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>See interactive demo</span>
              </button>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400">
                Google URL indexing • Keyword rank tracking • Service account management
              </p>
            </div>
          </div>

          {/* Right Column - Rank Tracker Preview */}
          <div className="lg:pl-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 rounded-3xl blur-xl"></div>
              <div className="relative">
                <RankTrackerPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}