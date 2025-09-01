import React from 'react'
import { Check, Clock } from 'lucide-react'
import { usePricingData, type PackageData, type BillingPeriod } from '@/hooks/business/usePricingData'

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
  const {
    packages,
    selectedPeriod,
    isLoading: loading,
    error,
    setSelectedPeriod,
    formatPrice: formatCurrency,
    getPricing,
    getAvailablePeriods,
    getPeriodLabel
  } = usePricingData()

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
          const periodLabel = getPeriodLabel(period)
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
              {pkg.is_popular && !isCurrentPlan && (
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