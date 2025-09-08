import React from 'react'
import { Clock, CheckCircle } from 'lucide-react'
import { Button, Card } from '@/components/dashboard/ui'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
  pricing_tiers: any
}

interface PricingCardsProps {
  packages: PaymentPackage[]
  selectedBillingPeriod: string
  setSelectedBillingPeriod: (period: string) => void
  userCurrency: 'USD' | 'IDR'
  subscribing: string | null
  trialEligible: boolean | null
  startingTrial: string | null
  showDetails: Record<string, boolean>
  showComparePlans: boolean
  getBillingPeriodPrice: (pkg: PaymentPackage, period: string) => { price: number, originalPrice?: number, discount?: number }
  formatCurrency: (amount: number, currency?: string) => string
  handleSubscribe: (packageId: string) => void
  handleStartTrial: (packageId: string) => void
  isTrialEligiblePackage: (pkg: PaymentPackage) => boolean
  togglePlanDetails: (planId: string) => void
}

export const PricingCards = ({
  packages,
  selectedBillingPeriod,
  setSelectedBillingPeriod,
  userCurrency,
  subscribing,
  trialEligible,
  startingTrial,
  showDetails,
  showComparePlans,
  getBillingPeriodPrice,
  formatCurrency,
  handleSubscribe,
  handleStartTrial,
  isTrialEligiblePackage,
  togglePlanDetails
}: PricingCardsProps) => {
  const billingPeriods = [
    { key: 'monthly', label: 'Monthly', suffix: '/month' },
    { key: 'annual', label: '12 Months', suffix: '/year' }
  ]

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-medium ${selectedBillingPeriod === 'monthly' ? 'text-[#1A1A1A]' : 'text-[#6C757D]'}`}>
            Monthly
          </span>
          <button
            onClick={() => setSelectedBillingPeriod(selectedBillingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              selectedBillingPeriod === 'annual' ? 'bg-[#1A1A1A]' : 'bg-[#E0E6ED]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                selectedBillingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${selectedBillingPeriod === 'annual' ? 'text-[#1A1A1A]' : 'text-[#6C757D]'}`}>
            Annual
          </span>
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const isCurrentPlan = pkg.is_current
          const pricing = getBillingPeriodPrice(pkg, selectedBillingPeriod)

          return (
            <div key={pkg.id} 
              className={`rounded-lg border p-4 relative flex flex-col h-full transition-colors cursor-pointer ${
                isCurrentPlan 
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                  : 'border-[#E0E6ED] bg-white hover:border-[#1A1A1A]'
              }`} 
              onClick={() => togglePlanDetails(pkg.id)}
            >
              {pkg.is_popular && !isCurrentPlan && (
                <div className="absolute -top-3 left-4 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`font-semibold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
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

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  {pricing.originalPrice && pricing.originalPrice > 0 && pricing.originalPrice > pricing.price && (
                    <span className={`text-sm line-through ${isCurrentPlan ? 'text-gray-400' : 'text-[#6C757D]'}`}>
                      {formatCurrency(pricing.originalPrice, userCurrency)}
                    </span>
                  )}
                  <span className={`text-2xl font-bold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {formatCurrency(pricing.price, userCurrency)}
                  </span>
                  <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                    per month
                  </span>
                </div>
                {pricing.discount && (
                  <span className="text-xs text-[#4BB543] font-medium">
                    Save {pricing.discount}%
                  </span>
                )}
              </div>

              {/* Features List */}
              {(showComparePlans || showDetails[pkg.id]) && (
                <div className={`mb-4 pb-4 border-b ${isCurrentPlan ? 'border-gray-600' : 'border-[#E0E6ED]'}`}>
                  <div className="space-y-3">
                    {pkg.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isCurrentPlan ? 'text-white' : 'text-[#4BB543]'
                        }`} />
                        <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto">
                {isCurrentPlan ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-medium">Active Plan</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Free Trial Button */}
                    {trialEligible && isTrialEligiblePackage(pkg) && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartTrial(pkg.id)
                        }}
                        disabled={startingTrial === pkg.id}
                        className="w-full bg-[#4BB543] hover:bg-[#4BB543]/90 text-white"
                      >
                        {startingTrial === pkg.id ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Starting Trial...
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 mr-2" />
                            Start 3-Day Free Trial
                          </>
                        )}
                      </Button>
                    )}

                    {/* Subscribe Button */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSubscribe(pkg.id)
                      }}
                      disabled={subscribing === pkg.id}
                      className="w-full"
                      variant={trialEligible && isTrialEligiblePackage(pkg) ? "outline" : "default"}
                    >
                      {subscribing === pkg.id ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Redirecting...
                        </>
                      ) : (
                        'Switch plan'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}