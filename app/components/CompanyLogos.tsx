'use client'

import { useState, useEffect } from 'react'

export default function CompanyLogos() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Mock company logos (in a real implementation, these would be actual client logos)
  const companies = [
    { name: 'TechCorp', logo: '/api/placeholder/120/40' },
    { name: 'DigitalPro', logo: '/api/placeholder/120/40' },
    { name: 'SEO Masters', logo: '/api/placeholder/120/40' },
    { name: 'WebFlow Inc', logo: '/api/placeholder/120/40' },
    { name: 'ContentHub', logo: '/api/placeholder/120/40' },
    { name: 'RankBoost', logo: '/api/placeholder/120/40' },
    { name: 'IndexLabs', logo: '/api/placeholder/120/40' },
    { name: 'SearchPro', logo: '/api/placeholder/120/40' },
    { name: 'MetricsCorp', logo: '/api/placeholder/120/40' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % companies.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [companies.length])

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">
            Trusted by Leading Companies
          </p>
        </div>
        
        <div className="relative overflow-hidden">
          <div className="flex justify-center">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ 
                transform: `translateX(-${currentIndex * 140}px)`,
                width: `${companies.length * 140}px`
              }}
            >
              {companies.map((company, index) => (
                <div 
                  key={company.name} 
                  className={`flex-shrink-0 w-32 h-16 mx-2 flex items-center justify-center transition-all duration-700 ${
                    index === currentIndex 
                      ? 'opacity-100 scale-110' 
                      : 'opacity-40 scale-90'
                  }`}
                >
                  <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center">
                    <span className="text-white/60 text-sm font-medium">
                      {company.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
        </div>
        
        {/* Dots indicator */}
        <div className="flex justify-center mt-8 space-x-2">
          {companies.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}