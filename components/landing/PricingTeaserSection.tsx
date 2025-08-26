'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, MessageCircle } from 'lucide-react'
import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

interface PricingTier {
  period: string
  period_label: string
  regular_price: number
  promo_price: number
}

interface Package {
  id: string
  name: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_quota_limit?: number
    service_accounts_limit?: number
    concurrent_jobs_limit?: number
  }
  is_popular: boolean
  pricing_tiers?: PricingTier[]
}

interface PricingTeaserSectionProps {
  onGetStarted: () => void
  onScrollToPricing: () => void
}

export default function PricingTeaserSection({ onGetStarted, onScrollToPricing }: PricingTeaserSectionProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [globalBillingPeriod, setGlobalBillingPeriod] = useState('monthly')

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const response = await fetch('/api/public/packages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.packages) {
          setPackages(data.packages)
        }
      }
    } catch (error) {
      console.error('Failed to load packages:', error)
    }
  }

  const formatPrice = (price: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price)
  }

  const getCurrentPrice = (pkg: Package) => {
    if (!pkg.pricing_tiers || !Array.isArray(pkg.pricing_tiers) || pkg.pricing_tiers.length === 0) {
      return { price: pkg.price, period: pkg.billing_period }
    }
    
    const tier = pkg.pricing_tiers.find(t => t.period === globalBillingPeriod)
    
    if (tier) {
      return { 
        price: tier.promo_price || tier.regular_price, 
        period: tier.period_label,
        originalPrice: tier.regular_price !== tier.promo_price ? tier.regular_price : null
      }
    }
    
    return { price: pkg.price, period: pkg.billing_period }
  }

  const getKeywordLimit = (pkg: Package) => {
    const dailyLimit = pkg.quota_limits?.daily_quota_limit || 0
    if (dailyLimit >= 10000) return '10K+'
    if (dailyLimit >= 5000) return '5K+'
    if (dailyLimit >= 2000) return '2K+'
    if (dailyLimit >= 1000) return '1K+'
    if (dailyLimit >= 500) return '500'
    if (dailyLimit >= 100) return '100'
    return dailyLimit.toString()
  }

  const getFeatureDescription = (pkg: Package) => {
    const keywordLimit = getKeywordLimit(pkg)
    const serviceAccounts = pkg.quota_limits?.service_accounts_limit || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs_limit || 1
    
    if (pkg.name.toLowerCase().includes('starter') || pkg.name.toLowerCase().includes('basic')) {
      return `Up to ${keywordLimit} keywords • ${serviceAccounts} user • weekly checks`
    } else if (pkg.name.toLowerCase().includes('pro') || pkg.name.toLowerCase().includes('professional')) {
      return `Up to ${keywordLimit} keywords • ${serviceAccounts} users • daily checks • reporting`
    } else if (pkg.name.toLowerCase().includes('agency') || pkg.name.toLowerCase().includes('enterprise')) {
      return `Up to ${keywordLimit} keywords • team roles • white-label • priority checks`
    } else {
      return `${keywordLimit} keywords • ${serviceAccounts} service accounts • ${concurrentJobs} concurrent jobs`
    }
  }

  if (packages.length === 0) {
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

  // Take up to 3 packages for display
  const displayPackages = packages.slice(0, 3)

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Built to be fair
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Pay for tracking, not bloat. Start small, scale when you're ready.
          </p>
        </div>

        <NeonContainer className="grid md:grid-cols-3 gap-8 mb-12">
          {(mousePosition, isTracking) => 
            displayPackages.map((pkg, index) => {
              const pricing = getCurrentPrice(pkg)
              const isPopular = pkg.is_popular
              
              return (
                <AdvancedNeonCard 
                  key={pkg.id} 
                  intensity={isPopular ? "high" : "medium"} 
                  className="p-8 flex flex-col min-h-[500px]"
                  mousePosition={mousePosition}
                  isTracking={isTracking}
                >
                    {isPopular && (
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-full text-center mb-4">
                        MOST POPULAR
                      </div>
                    )}
                    
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {pkg.name}
                    </h3>
                    
                    <div className="mb-4">
                      <div className="flex items-baseline space-x-2">
                        {pricing.originalPrice && (
                          <span className="text-lg text-gray-500 line-through">
                            {formatPrice(pricing.originalPrice, pkg.currency)}
                          </span>
                        )}
                        <span className="text-3xl font-bold text-white">
                          {formatPrice(pricing.price, pkg.currency)}
                        </span>
                        <span className="text-gray-400">/{pricing.period}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-8 leading-relaxed flex-grow">
                      {getFeatureDescription(pkg)}
                    </p>
                    
                    <button
                      onClick={index === displayPackages.length - 1 && pkg.name.toLowerCase().includes('agency') 
                        ? () => window.open('mailto:hello@indexnow.studio', '_blank')
                        : onGetStarted}
                      className={`w-full py-4 rounded-full font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                        index === displayPackages.length - 1 && pkg.name.toLowerCase().includes('agency')
                          ? "border border-white/20 text-white hover:bg-white/5"
                          : "bg-white text-black hover:bg-gray-100"
                      }`}
                    >
                      {index === displayPackages.length - 1 && pkg.name.toLowerCase().includes('agency') && <MessageCircle className="w-5 h-5" />}
                      <span>
                        {index === displayPackages.length - 1 && pkg.name.toLowerCase().includes('agency') 
                          ? 'Talk to us' 
                          : pkg.name.toLowerCase().includes('free') || pkg.name.toLowerCase().includes('starter') || pkg.name.toLowerCase().includes('basic')
                            ? 'Start free trial'
                            : pkg.name.toLowerCase().includes('premium') 
                              ? 'Go Premium' 
                              : pkg.name.toLowerCase().includes('pro')
                                ? 'Get Pro'
                                : 'Get started'
                        }
                      </span>
                      {!(index === displayPackages.length - 1 && pkg.name.toLowerCase().includes('agency')) && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </AdvancedNeonCard>
              )
            })
          }
        </NeonContainer>

        {/* Link to full pricing */}
        <div className="text-center">
          <button
            onClick={onScrollToPricing}
            className="text-blue-400 hover:text-blue-300 transition-colors underline"
          >
            See full pricing
          </button>
        </div>
      </div>
    </section>
  )
}