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

  const getFeaturesList = (pkg: Package): string[] => {
    const features: string[] = []
    
    // Extract quota limits
    const keywordLimit = pkg.quota_limits?.keywords_limit || 0
    const serviceAccounts = pkg.quota_limits?.service_accounts || 1
    const concurrentJobs = pkg.quota_limits?.concurrent_jobs || 1
    const dailyUrls = pkg.quota_limits?.daily_urls || 0
    
    // Add keyword limit
    if (keywordLimit === -1) {
      features.push('Unlimited Keywords')
    } else if (keywordLimit >= 1000) {
      features.push(`${Math.floor(keywordLimit / 1000)}K+ Keywords`)
    } else {
      features.push(`${keywordLimit} Keywords`)
    }
    
    // Add service accounts
    if (serviceAccounts === -1) {
      features.push('Unlimited Service Accounts')
    } else if (serviceAccounts === 1) {
      features.push('1 Service Account')
    } else {
      features.push(`${serviceAccounts} Service Accounts`)
    }
    
    // Add daily URLs for indexing
    if (dailyUrls === -1) {
      features.push('Unlimited Daily Indexing')
    } else if (dailyUrls > 0) {
      features.push(`${dailyUrls} Daily URL Quota`)
    }
    
    // Add concurrent jobs
    if (concurrentJobs > 1) {
      features.push(`${concurrentJobs} Concurrent Jobs`)
    }
    
    // Add package-specific features from database features array
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => {
        if (feature && !features.some(f => f.toLowerCase().includes(feature.toLowerCase().substring(0, 10)))) {
          features.push(feature)
        }
      })
    }
    
    return features
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
                <span>{option.label}</span>
                {globalBillingPeriod === option.key && option.key !== 'monthly' && (
                  <span className="ml-2 text-xs text-green-600 font-semibold">
                    Save {option.key === 'annual' ? '16%' : option.key === 'biannual' ? '12%' : '8%'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {displayPackages.map((pkg, index) => {
            const pricing = getCurrentPrice(pkg)
            const isPopular = pkg.is_popular
            const features = getFeaturesList(pkg)
            
            return (
              <div
                key={pkg.id}
                className={`relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-8 hover:bg-gray-900/70 transition-all duration-300 ${
                  isPopular ? 'border-blue-500/50 border-2' : 'border-white/10'
                }`}
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
                        {formatPrice(pricing.originalPrice, currency)}
                      </span>
                    </div>
                  )}
                  {/* Current Price */}
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(pricing.price, currency)}
                    </span>
                  </div>
                  {/* Period Label */}
                  <div>
                    <span className="text-gray-400 text-sm">
                      per {globalBillingPeriod === 'monthly' ? 'month' : 
                           globalBillingPeriod === 'quarterly' ? '3 Months' :
                           globalBillingPeriod === 'biannual' ? '6 Months' : 'year'}
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
                
                {/* CTA Button */}
                <div className="mb-8">
                  <button
                    onClick={onGetStarted}
                    className="w-full bg-white text-black py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
                  >
                    Get started
                  </button>
                </div>
                
                {/* Features */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                      FEATURES
                    </h4>
                    <p className="text-gray-400 text-sm mt-1">
                      Everything in {pkg.name} plan plus...
                    </p>
                  </div>
                  <ul className="space-y-3">
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
              </div>
            )
          })}
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