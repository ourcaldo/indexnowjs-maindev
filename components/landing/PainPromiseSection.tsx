'use client'

import { X, CheckCircle, ArrowRight } from 'lucide-react'
import NeonCard from './NeonCard'

interface PainPromiseSectionProps {
  onGetStarted: () => void
}

export default function PainPromiseSection({ onGetStarted }: PainPromiseSectionProps) {
  const painPoints = [
    "Data changes by location/device but tools don't show the real picture.",
    "Tool suites are bloated—and overpriced—for simple tracking needs.",
    "Surprise overage fees and confusing 'credits' kill budgets.",
    "Clients can't read messy reports; I need clean, shareable proof."
  ]

  const solutions = [
    "True-to-location & device checks (down to city/ZIP when needed).",
    "Just rank tracking—fast, focused, no bloat.",
    "Fair, predictable pricing that scales with you.",
    "Client-ready reports and live share links that make sense."
  ]

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            What most rank trackers get wrong
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Pain Points */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-red-400 mb-6">Common Problems</h3>
            {painPoints.map((pain, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center mt-1">
                  <X className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-gray-300 leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-green-400 mb-6">IndexNow Solutions</h3>
            {solutions.map((solution, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-gray-300 leading-relaxed">{solution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <span>Track your first keywords</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}