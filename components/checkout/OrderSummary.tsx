'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Shield, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OrderSummaryProps {
  selectedPackage: any
  billingPeriod: string
  userCurrency: 'USD' | 'IDR'
  isTrialFlow?: boolean
}

export default function OrderSummary({ selectedPackage, billingPeriod, userCurrency, isTrialFlow = false }: OrderSummaryProps) {
  const [idrAmount, setIdrAmount] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)

  // Calculate future billing date for trials (trial period + first billing cycle)
  const calculateFutureBillingDate = () => {
    const now = new Date()
    // Trial period is typically 7 days, then the billing cycle starts
    const trialEndDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
    
    // Add billing period to trial end date
    if (billingPeriod === 'monthly') {
      trialEndDate.setMonth(trialEndDate.getMonth() + 1)
    } else if (billingPeriod === 'yearly' || billingPeriod === 'annual') {
      trialEndDate.setFullYear(trialEndDate.getFullYear() + 1)
    }
    
    return trialEndDate
  }

  useEffect(() => {
    const fetchConversionRate = async () => {
      if (userCurrency === 'USD') {
        try {
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
          if (response.ok) {
            const data = await response.json()
            const rate = data.rates?.IDR
            if (rate && typeof rate === 'number') {
              setConversionRate(rate)
              const usdPrice = calculatePrice().price
              setIdrAmount(Math.round(usdPrice * rate))
            }
          }
        } catch (error) {
          // Use fallback rate
          const fallbackRate = 15800
          setConversionRate(fallbackRate)
          const usdPrice = calculatePrice().price
          setIdrAmount(Math.round(usdPrice * fallbackRate))
        }
      }
    }

    fetchConversionRate()
  }, [selectedPackage, billingPeriod, userCurrency])

  if (!selectedPackage) return null

  const calculatePrice = () => {
    if (selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]) {
      const currencyTier = selectedPackage.pricing_tiers[billingPeriod][userCurrency]
      const regularPrice = currencyTier.regular_price
      const promoPrice = currencyTier.promo_price
      const originalPrice = regularPrice
      
      // For trial flow, show $1 for now but keep track of the real price
      const price = isTrialFlow ? 1 : (promoPrice || regularPrice)
      const discount = promoPrice && !isTrialFlow
        ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100) 
        : 0
      const periodLabel = currencyTier.period_label || billingPeriod

      return { price, discount, originalPrice, periodLabel, regularPrice, promoPrice }
    }

    return { price: 0, discount: 0, originalPrice: 0, periodLabel: billingPeriod, regularPrice: 0, promoPrice: 0 }
  }

  const { price, discount, originalPrice, periodLabel, regularPrice, promoPrice } = calculatePrice()
  const futureBillingDate = isTrialFlow ? calculateFutureBillingDate() : null
  const actualFuturePrice = promoPrice || regularPrice

  return (
    <Card className="sticky top-8 border-[#E0E6ED] bg-[#FFFFFF]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package Details */}
        <div className="p-4 bg-[#F7F9FC] rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">{selectedPackage.name} Plan</h3>
              <p className="text-sm text-[#6C757D] capitalize">
                {periodLabel} billing
              </p>
            </div>
            {discount > 0 && (
              <span className="bg-[#F0A202] text-[#FFFFFF] text-xs px-2 py-1 rounded-full font-medium">
                Save {discount}%
              </span>
            )}
          </div>
          <div className="space-y-2">
            {selectedPackage.features?.slice(0, 3).map((feature: string, index: number) => (
              <div key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-[#4BB543] mr-2 flex-shrink-0" />
                <span className="text-[#6C757D]">{feature}</span>
              </div>
            ))}
            {selectedPackage.features?.length > 3 && (
              <div className="text-xs text-[#6C757D]">
                +{selectedPackage.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          {isTrialFlow ? (
            // Trial Pricing Display
            <>
              <div className="flex justify-between items-center">
                <span className="text-[#6C757D]">Trial Charge:</span>
                <span className="font-medium text-[#1A1A1A]">
                  {formatCurrency(1, 'USD')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6C757D]">Tax:</span>
                <span className="font-medium text-[#1A1A1A]">{formatCurrency(0, userCurrency)}</span>
              </div>

              <hr className="border-[#E0E6ED]" />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-[#1A1A1A]">Total:</span>
                <span className="text-lg font-bold text-[#1A1A1A]">
                  {formatCurrency(1, 'USD')}
                </span>
              </div>

              {/* Future Billing Information */}
              {futureBillingDate && (
                <div className="mt-4 p-3 bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-[#3D8BFF] mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium text-[#1A1A1A] mb-1">
                        Future Billing Information
                      </div>
                      <div className="text-[#6C757D] space-y-1">
                        <div>
                          On <strong>{futureBillingDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</strong> you'll be charged:
                        </div>
                        <div className="font-medium text-[#1A1A1A]">
                          {formatCurrency(actualFuturePrice, userCurrency)} for your {periodLabel} subscription
                        </div>
                        {promoPrice && (
                          <div className="text-xs text-[#4BB543]">
                            ✓ Promotional pricing included
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Regular Pricing Display
            <>
              <div className="flex justify-between items-center">
                <span className="text-[#6C757D]">Subtotal:</span>
                <span className="font-medium text-[#1A1A1A]">
                  {formatCurrency(originalPrice, userCurrency)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6C757D]">Discount ({discount}%):</span>
                  <span className="font-medium text-[#F0A202]">
                    -{formatCurrency(originalPrice - price, userCurrency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-[#6C757D]">Tax:</span>
                <span className="font-medium text-[#1A1A1A]">{formatCurrency(0, userCurrency)}</span>
              </div>

              <hr className="border-[#E0E6ED]" />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-[#1A1A1A]">Total:</span>
                <span className="text-lg font-bold text-[#1A1A1A]">
                  {formatCurrency(price, userCurrency)}
                </span>
              </div>
            </>
          )}

          {/* Currency Conversion Display for USD users */}
          {userCurrency === 'USD' && idrAmount && conversionRate && (
            <div className="mt-4 p-3 bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-[#3D8BFF] mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-[#1A1A1A] mb-1">Payment will be processed in IDR</div>
                  <div className="text-[#6C757D] space-y-1">
                    <div>Conversion rate: 1 USD = {conversionRate.toLocaleString()} IDR</div>
                    <div className="font-medium text-[#1A1A1A]">
                      You will pay: {formatCurrency(idrAmount, 'IDR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center text-xs text-[#6C757D] mt-4">
          <Shield className="h-4 w-4 mr-2 text-[#6C757D]" />
          Secure checkout. Your information is protected.
        </div>
      </CardContent>
    </Card>
  )
}