'use client'

import { ArrowRight, Calendar } from 'lucide-react'

interface FinalCTASectionProps {
  onGetStarted: () => void
}

export default function FinalCTASection({ onGetStarted }: FinalCTASectionProps) {
  const handleBookDemo = () => {
    window.open('https://calendly.com/indexnow-demo', '_blank')
  }

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500/10 via-cyan-400/10 to-blue-500/10 rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-12 lg:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
              Start tracking what actually matters
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              See real positions by location and device—without the bloat.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button
                onClick={onGetStarted}
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span>Start free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleBookDemo}
                className="border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/5 transition-all duration-300 flex items-center space-x-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Book a 15-min demo</span>
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-sm text-gray-400">
                7-day free trial • No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}