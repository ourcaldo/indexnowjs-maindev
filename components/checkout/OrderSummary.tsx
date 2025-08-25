'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Shield, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OrderSummaryProps {
  selectedPackage: any
  billingPeriod: string
  userCurrency: 'USD' | 'IDR'
}

export default function OrderSummary({ selectedPackage, billingPeriod, userCurrency }: OrderSummaryProps) {
  const [idrAmount, setIdrAmount] = useState<number | null>(null)
  const [conversionRate, setConversionRate] = useState<number | null>(null)

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
      const price = currencyTier.promo_price || currencyTier.regular_price
      const originalPrice = currencyTier.regular_price
      const discount = currencyTier.promo_price 
        ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) 
        : 0
      const periodLabel = currencyTier.period_label || billingPeriod

      return { price, discount, originalPrice, periodLabel }
    }

    return { price: selectedPackage.price, discount: 0, originalPrice: selectedPackage.price, periodLabel: billingPeriod }
  }

  const { price, discount, originalPrice, periodLabel } = calculatePrice()

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