import React, { useState, useEffect } from 'react'
import { Check, Clock } from 'lucide-react'
import { getUserCurrency, formatCurrency as formatCurrencyUtil } from '@/lib/utils/currency-utils'
import { createClient } from '@/lib/database/supabase-browser'

interface PricingTier {
  promo_price: number
  regular_price: number
  period_label: string
}

interface PricingTiers {
  [period: string]: {
    USD: PricingTier
    IDR: PricingTier
  }
}

interface PackageData {
  id: string
  name: string
  slug: string
  description: string
  features: string[]
  quota_limits: {
    daily_urls: number
    keywords_limit: number
    concurrent_jobs: number
    service_accounts: number
  }
  pricing_tiers: PricingTiers
  is_active: boolean
  sort_order: number
}

interface PricingTableProps {
  showTrialButton?: boolean
  trialEligible?: boolean
  currentPackageId?: string | null
  subscribing?: string | null
  startingTrial?: string | null
  onSubscribe?: (packageId: string, period: string) => void
  onStartTrial?: (packageId: string) => void
  isTrialEligiblePackage?: (pkg: PackageData) => boolean
  className?: string
}

const PricingTable: React.FC<PricingTableProps> = ({
  showTrialButton = false,
  trialEligible = false,
  currentPackageId = null,
  subscribing = null,
  startingTrial = null,
  onSubscribe = () => {},
  onStartTrial = () => {},
  isTrialEligiblePackage = () => false,
  className = ''
}) => {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')

  // Load packages data and detect user currency
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load packages
        const packagesResponse = await fetch('/api/v1/public/packages')
        if (!packagesResponse.ok) throw new Error('Failed to load packages')
        
        const packagesData = await packagesResponse.json()
        setPackages(packagesData.packages || [])

        // Detect user currency from profile
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // User is logged in - get country from profile
          const { data: profile } = await supabase
            .from('indb_auth_user_profiles')
            .select('country')
            .eq('user_id', user.id)
            .single()
          
          if (profile?.country) {
            setUserCurrency(getUserCurrency(profile.country))
          }
        }
        // If user not logged in, default to USD (already set in state)
        
      } catch (err) {
        setError('Failed to load pricing data')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Extract available periods from the first package (they should all have the same periods)
  const getAvailablePeriods = () => {
    if (packages.length === 0) return []
    
    const firstPackage = packages[0]
    const periods = Object.keys(firstPackage.pricing_tiers)
    
    // Define the order: monthly → quarterly → biannual → annual
    const periodOrder = ['monthly', 'quarterly', 'biannual', 'annual']
    
    return periodOrder.filter(period => periods.includes(period))
  }

  // Get pricing for a package and period
  const getPricing = (pkg: PackageData, period: string) => {
    const periodData = pkg.pricing_tiers[period]
    if (!periodData || !periodData[userCurrency]) {
      return { price: 0, originalPrice: 0, discount: 0, periodLabel: 'Monthly' }
    }

    const currencyData = periodData[userCurrency]
    const price = currencyData.promo_price || currencyData.regular_price
    const originalPrice = currencyData.regular_price
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

    return {
      price,
      originalPrice: discount > 0 ? originalPrice : undefined,
      discount: discount > 0 ? discount : undefined,
      periodLabel: currencyData.period_label
    }
  }

  // Format currency using the utility function
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, userCurrency)
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-[#E63946]">{error}</p>
      </div>
    )
  }

  const availablePeriods = getAvailablePeriods()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availablePeriods.map((period) => {
          const periodLabel = packages[0]?.pricing_tiers[period]?.[userCurrency]?.period_label || period
          return (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F7F9FC] text-[#6C757D] border border-[#E0E6ED] hover:bg-[#E0E6ED]'
              }`}
            >
              {periodLabel}
            </button>
          )
        })}
      </div>

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const isCurrentPlan = pkg.id === currentPackageId
          const pricing = getPricing(pkg, selectedPeriod)

          return (
            <div
              key={pkg.id}
              className={`rounded-lg border p-6 relative flex flex-col h-full transition-colors ${
                isCurrentPlan 
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                  : 'border-[#E0E6ED] bg-white hover:border-[#1A1A1A]'
              }`}
            >
              {/* Popular Badge */}
              {pkg.slug === 'premium' && !isCurrentPlan && (
                <div className="absolute -top-3 left-4 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              )}

              {/* Package Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-lg font-semibold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {pkg.name}
                  </h3>
                  {isCurrentPlan && (
                    <span className="bg-white text-[#1A1A1A] px-2 py-0.5 rounded text-xs font-medium">
                      Current plan
                    </span>
                  )}
                </div>
                <p className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                  {pkg.description}
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  {pricing.originalPrice && (
                    <span className={`text-sm line-through ${isCurrentPlan ? 'text-gray-400' : 'text-[#6C757D]'}`}>
                      {formatCurrency(pricing.originalPrice)}
                    </span>
                  )}
                  <span className={`text-2xl font-bold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {formatCurrency(pricing.price)}
                  </span>
                  <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                    per {selectedPeriod === 'monthly' ? 'month' : selectedPeriod === 'annual' ? 'year' : 'period'}
                  </span>
                </div>
                {pricing.discount && (
                  <span className="text-xs text-[#4BB543] font-medium">
                    Save {pricing.discount}%
                  </span>
                )}
              </div>

              {/* Features */}
              <div className={`mb-6 pb-4 border-b ${isCurrentPlan ? 'border-gray-600' : 'border-[#E0E6ED]'} flex-grow`}>
                <div className="space-y-3">
                  {pkg.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isCurrentPlan ? 'text-white' : 'text-[#4BB543]'
                      }`} />
                      <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto space-y-2">
                {!isCurrentPlan && (
                  <>
                    <button 
                      onClick={() => onSubscribe(pkg.id, selectedPeriod)}
                      disabled={subscribing === pkg.id}
                      className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors h-12 bg-[#1A1A1A] text-white hover:bg-[#0d1b2a] ${
                        subscribing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {subscribing === pkg.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : 'Switch plan'}
                    </button>

                    {/* Trial Button */}
                    {showTrialButton && trialEligible && isTrialEligiblePackage(pkg) && (
                      <button
                        onClick={() => onStartTrial(pkg.id)}
                        disabled={startingTrial === pkg.id}
                        className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors h-12 border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white ${
                          startingTrial === pkg.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {startingTrial === pkg.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"></div>
                            Starting...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            Start 3-Day Free Trial
                          </div>
                        )}
                      </button>
                    )}
                  </>
                )}
                {isCurrentPlan && (
                  <button 
                    disabled
                    className="w-full py-3 px-4 rounded-lg text-sm font-medium h-12 bg-white text-[#1A1A1A] cursor-default"
                  >
                    Current plan
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PricingTable