'use client'

import { useState, useEffect } from 'react'
import { 
  Check, 
  Crown, 
  Star, 
  ArrowRight,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface PackageFeature {
  name: string
  included: boolean
  limit?: string
}

interface PricingTier {
  period: string
  regular_price: number
  promo_price?: number
  discount_percentage?: number
}

interface PaymentPackage {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_quota_limit: number
    service_accounts_limit: number
    concurrent_jobs_limit: number
  }
  is_popular: boolean
  is_current: boolean
  pricing_tiers: Record<string, PricingTier>
}

interface PackagesData {
  packages: PaymentPackage[]
  current_package_id: string | null
  expires_at: string | null
}

export default function PlansTab() {
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/billing/packages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load packages')
      }

      const data = await response.json()
      setPackagesData(data)
    } catch (error) {
      console.error('Error loading packages:', error)
      setError(error instanceof Error ? error.message : 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    const tier = pkg.pricing_tiers?.[period]
    if (tier) {
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: tier.promo_price ? tier.regular_price : undefined,
        discount: tier.discount_percentage
      }
    }
    return { price: pkg.price }
  }

  const handleSubscribe = async (packageId: string) => {
    try {
      setSubscribing(packageId)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          package_id: packageId,
          billing_period: selectedBillingPeriod
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate subscription')
      }

      const result = await response.json()
      
      // Show success message and refresh data
      alert('Subscription request submitted successfully! You will receive payment instructions via email.')
      loadPackages()
    } catch (error) {
      console.error('Error subscribing:', error)
      alert(error instanceof Error ? error.message : 'Failed to initiate subscription')
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-[#E63946] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Error Loading Plans</h3>
        <p className="text-[#6C757D] mb-4">{error}</p>
        <button
          onClick={loadPackages}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const billingPeriods = [
    { key: 'monthly', label: 'Monthly', suffix: '/month' },
    { key: '3-month', label: '3 Months', suffix: '/3 months' },
    { key: '6-month', label: '6 Months', suffix: '/6 months' },
    { key: '12-month', label: '12 Months', suffix: '/year' }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Choose Your Plan</h2>
        <p className="text-[#6C757D]">Select the perfect plan for your URL indexing needs</p>
      </div>

      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-[#F7F9FC] p-1 rounded-lg">
          {billingPeriods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedBillingPeriod(period.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedBillingPeriod === period.key
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#6C757D] hover:text-[#1A1A1A]'
              }`}
            >
              {period.label}
              {period.key === '12-month' && (
                <span className="ml-1 text-xs bg-[#4BB543] text-white px-1.5 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packagesData?.packages.map((pkg) => {
          const pricingInfo = getBillingPeriodPrice(pkg, selectedBillingPeriod)
          const currentPeriod = billingPeriods.find(p => p.key === selectedBillingPeriod)
          
          return (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-xl border-2 p-8 transition-all hover:shadow-lg ${
                pkg.is_popular 
                  ? 'border-[#3D8BFF] shadow-md' 
                  : pkg.is_current
                  ? 'border-[#4BB543]'
                  : 'border-[#E0E6ED] hover:border-[#3D8BFF]'
              }`}
            >
              {/* Popular Badge */}
              {pkg.is_popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-[#3D8BFF] text-white px-4 py-2 rounded-full text-sm font-medium">
                    <Star className="h-4 w-4 mr-1" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {pkg.is_current && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center bg-[#4BB543] text-white px-4 py-2 rounded-full text-sm font-medium">
                    <Crown className="h-4 w-4 mr-1" />
                    Current Plan
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">{pkg.name}</h3>
                <p className="text-[#6C757D] mb-6">{pkg.description}</p>
                
                <div className="mb-6">
                  {pricingInfo.originalPrice && (
                    <div className="text-[#6C757D] line-through text-lg mb-1">
                      {formatCurrency(pricingInfo.originalPrice, pkg.currency)}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-[#1A1A1A]">
                      {formatCurrency(pricingInfo.price, pkg.currency)}
                    </span>
                    <span className="text-[#6C757D] ml-1">
                      {currentPeriod?.suffix}
                    </span>
                  </div>
                  {pricingInfo.discount && (
                    <div className="text-[#4BB543] text-sm font-medium mt-1">
                      Save {pricingInfo.discount}%
                    </div>
                  )}
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {pkg.features.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-[#4BB543] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-[#6C757D]">{feature}</span>
                  </div>
                ))}
                
                {/* Quota Limits */}
                <div className="pt-4 border-t border-[#E0E6ED]">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6C757D]">Daily Quota:</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {pkg.quota_limits.daily_quota_limit.toLocaleString()} URLs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6C757D]">Service Accounts:</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {pkg.quota_limits.service_accounts_limit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6C757D]">Concurrent Jobs:</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {pkg.quota_limits.concurrent_jobs_limit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSubscribe(pkg.id)}
                disabled={pkg.is_current || subscribing === pkg.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
                  pkg.is_current
                    ? 'bg-[#4BB543]/10 text-[#4BB543] cursor-not-allowed'
                    : pkg.is_popular
                    ? 'bg-[#3D8BFF] text-white hover:bg-[#2563eb] hover:shadow-md'
                    : 'bg-[#1C2331] text-white hover:bg-[#0d1b2a] hover:shadow-md'
                } ${subscribing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {subscribing === pkg.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : pkg.is_current ? (
                  'Current Plan'
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center py-8">
        <div className="bg-[#F7F9FC] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Need Help Choosing?</h3>
          <p className="text-[#6C757D] mb-4">
            All plans include 24/7 support, real-time indexing monitoring, and access to our premium dashboard features.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-[#6C757D]">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-[#4BB543] mr-1" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-[#4BB543] mr-1" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-[#4BB543] mr-1" />
              <span>Instant activation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}