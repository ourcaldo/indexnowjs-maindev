'use client'

import { ArrowRight } from 'lucide-react'
import { usePricingData } from '@/hooks/business/usePricingData'
import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

interface PricingTeaserSectionProps {
  onGetStarted: () => void
  onScrollToPricing: () => void
}

export default function PricingTeaserSection({ onGetStarted, onScrollToPricing }: PricingTeaserSectionProps) {
  const {
    packages,
    selectedPeriod,
    currency,
    isLoading,
    setSelectedPeriod,
    formatPrice,
    getPricing,
    getFeaturesList,
    getSavingsPercentage
  } = usePricingData({ maxPackages: 3 })

  const periodOptions = [
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'quarterly' as const, label: 'Quarterly' },
    { key: 'biannual' as const, label: 'Biannual' },
    { key: 'annual' as const, label: 'Annual' }
  ]

  if (isLoading || packages.length === 0) {
    return (
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-white/5 rounded w-96 mx-auto"></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            We've got a <span className="italic">plan</span><br />
            that's <span className="italic">perfect</span> for you
          </h2>
        </div>

        {/* Period Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 inline-flex items-center">
            {periodOptions.map((option) => {
              const savings = getSavingsPercentage(option.key)
              return (
                <button
                  key={option.key}
                  onClick={() => setSelectedPeriod(option.key)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    selectedPeriod === option.key
                      ? 'bg-white text-black shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{option.label}</span>
                  {selectedPeriod === option.key && savings && (
                    <span className="ml-2 text-xs text-green-600 font-semibold">
                      Save {savings}%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
        <NeonContainer className="contents">
          {(mousePosition, isTracking) => 
            packages.map((pkg, index) => {
              const pricing = getPricing(pkg)
              const isPopular = pkg.is_popular
              const features = getFeaturesList(pkg)
              
              return (
                <AdvancedNeonCard 
                  key={pkg.id} 
                  intensity={isPopular ? "high" : "medium"} 
                  className="p-8 flex flex-col h-full min-h-[500px]"
                  mousePosition={mousePosition}
                  isTracking={isTracking}
                >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                
                {/* Plan Name */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {pkg.name} plan
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {pkg.description}
                  </p>
                </div>
                
                {/* Price */}
                <div className="mb-8">
                  {/* Original Price - Above */}
                  {pricing.originalPrice && (
                    <div className="mb-2">
                      <span className="text-lg text-gray-500 line-through">
                        {formatPrice(pricing.originalPrice)}
                      </span>
                    </div>
                  )}
                  {/* Current Price */}
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(pricing.price)}
                    </span>
                  </div>
                  {/* Period Label */}
                  <div>
                    <span className="text-gray-400 text-sm">
                      per {selectedPeriod === 'monthly' ? 'month' : 
                           selectedPeriod === 'quarterly' ? '3 months' :
                           selectedPeriod === 'biannual' ? '6 months' : 'year'}
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mb-8">
                  <p className="text-gray-300 text-sm">
                    {pkg.name === 'Free' ? 'Basic indexing features for personal use' : 
                     pkg.name === 'Premium' ? 'Enhanced features for professionals' :
                     'Full features for agencies and enterprises'}
                  </p>
                </div>
                
                {/* Features */}
                <div className="flex-grow">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                      FEATURES
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Everything in {pkg.name} plan plus...
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="ml-3 text-gray-300 text-sm">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* CTA Button */}
                <div className="mt-auto">
                  <button
                    onClick={onGetStarted}
                    className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
                  >
                    Get started
                  </button>
                </div>
                </AdvancedNeonCard>
              )
            })
          }
        </NeonContainer>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <button
            onClick={onScrollToPricing}
            className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            See detailed comparison →
          </button>
        </div>
      </div>
    </section>
  )
}