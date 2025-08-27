'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/database/supabase-browser'
import { getUserCurrency } from '@/lib/utils/currency-utils'
import NeonContainer from './NeonContainer'
import AdvancedNeonCard from './AdvancedNeonCard'

interface PricingTierData {
  IDR: {
    promo_price: number
    period_label: string
    regular_price: number
  }
  USD: {
    promo_price: number
    period_label: string
    regular_price: number
  }
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
    daily_urls?: number
    keywords_limit?: number
    concurrent_jobs?: number
    service_accounts?: number
  }
  is_popular: boolean
  pricing_tiers: {
    annual: PricingTierData
    monthly: PricingTierData
    biannual: PricingTierData
    quarterly: PricingTierData
  }
}

interface PricingTeaserSectionProps {
  onGetStarted: () => void
  onScrollToPricing: () => void
}

export default function PricingTeaserSection({ onGetStarted, onScrollToPricing }: PricingTeaserSectionProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [globalBillingPeriod, setGlobalBillingPeriod] = useState<'monthly' | 'quarterly' | 'biannual' | 'annual'>('monthly')
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    detectCurrencyAndLoadPackages()
  }, [])

  const detectCurrencyAndLoadPackages = async () => {
    try {
      setIsLoading(true)
      
      // Step 1: Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let detectedCurrency: 'USD' | 'IDR' = 'USD'
      
      if (user) {
        // User is logged in - get country from profile
        const { data: profile } = await supabase
          .from('indb_auth_user_profiles')
          .select('country')
          .eq('user_id', user.id)
          .single()
        
        if (profile?.country) {
          detectedCurrency = getUserCurrency(profile.country)
        }
      } else {
        // User not logged in - use IP detection
        try {
          const locationResponse = await fetch('/api/detect-location')
          if (locationResponse.ok) {
            const locationData = await locationResponse.json()
            if (locationData.country) {
              detectedCurrency = getUserCurrency(locationData.country)
            }
          }
        } catch (error) {
          console.log('IP detection failed, using default USD')
        }
      }
      
      setCurrency(detectedCurrency)
      
      // Step 2: Load packages
      await loadPackages()
      
    } catch (error) {
      console.error('Failed to detect currency:', error)
      setCurrency('USD')
      await loadPackages()
    } finally {
      setIsLoading(false)
    }
  }

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

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(price)
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(price)
    }
  }

  const getCurrentPrice = (pkg: Package) => {
    if (!pkg.pricing_tiers || typeof pkg.pricing_tiers !== 'object') {
      return { price: pkg.price, period: pkg.billing_period }
    }
    
    const periodData = pkg.pricing_tiers[globalBillingPeriod]
    if (!periodData || !periodData[currency]) {
      return { price: pkg.price, period: pkg.billing_period }
    }
    
    const tierData = periodData[currency]
    return { 
      price: tierData.promo_price || tierData.regular_price, 
      period: tierData.period_label,
      originalPrice: tierData.regular_price !== tierData.promo_price ? tierData.regular_price : null
    }
  }

  const getKeywordLimit = (pkg: Package) => {
    const keywordLimit = pkg.quota_limits?.keywords_limit || 0
    if (keywordLimit >= 10000) return '10K+'
    if (keywordLimit >= 5000) return '5K+'
    if (keywordLimit >= 2000) return '2K+'
    if (keywordLimit >= 1000) return '1K+'
    if (keywordLimit >= 500) return '500'
    if (keywordLimit >= 100) return '100'
    return keywordLimit.toString()
  }

  const getFeatureDescription = (pkg: Package) => {
    const keywordLimit = getKeywordLimit(pkg)
    const serviceAccounts = pkg.quota_limits?.service_accounts || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs || 1
    const dailyUrls = pkg.quota_limits?.daily_urls || 0
    
    if (pkg.name.toLowerCase().includes('starter') || pkg.name.toLowerCase().includes('basic')) {
      return `${keywordLimit} keywords • ${serviceAccounts} service account • daily checks`
    } else if (pkg.name.toLowerCase().includes('pro') || pkg.name.toLowerCase().includes('professional') || pkg.name.toLowerCase().includes('premium')) {
      return `${keywordLimit} keywords • ${serviceAccounts} service accounts • ${concurrentJobs} concurrent jobs • ${dailyUrls} daily indexing`
    } else if (pkg.name.toLowerCase().includes('agency') || pkg.name.toLowerCase().includes('enterprise')) {
      return `${keywordLimit} keywords • team roles • white-label • priority checks`
    } else {
      return `${keywordLimit} keywords • ${serviceAccounts} service accounts • ${concurrentJobs} concurrent jobs`
    }
  }

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

        {/* Period Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2 inline-flex">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setGlobalBillingPeriod(option.key)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  globalBillingPeriod === option.key
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12" style={{ display: 'grid', gridAutoRows: '1fr' }}>
        <NeonContainer className="contents">
          {(mousePosition, isTracking) => 
            displayPackages.map((pkg, index) => {
              const pricing = getCurrentPrice(pkg)
              const isPopular = pkg.is_popular
              
              return (
                <AdvancedNeonCard 
                  key={pkg.id} 
                  intensity={isPopular ? "high" : "medium"} 
                  className="p-8 flex flex-col h-full"
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
                            {formatPrice(pricing.originalPrice, currency)}
                          </span>
                        )}
                        <span className="text-3xl font-bold text-white">
                          {formatPrice(pricing.price, currency)}
                        </span>
                        <span className="text-gray-400">/{pricing.period}</span>
                      </div>
                    </div>
                    
                    <div className="text-gray-300 mb-8 leading-relaxed flex-grow flex items-start">
                      <p>
                        {getFeatureDescription(pkg)}
                      </p>
                    </div>
                    
                    <div className="mt-auto">
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
                    </div>
                  </AdvancedNeonCard>
              )
            })
          }
        </NeonContainer>
        </div>

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