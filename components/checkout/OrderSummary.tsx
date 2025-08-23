'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/currency-utils'

interface OrderSummaryProps {
  selectedPackage: any
  billingPeriod: string
  userCurrency: 'USD' | 'IDR'
}

export default function OrderSummary({ selectedPackage, billingPeriod, userCurrency }: OrderSummaryProps) {
  if (!selectedPackage) return null

  const calculatePrice = () => {
    if (selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]) {
      const currencyTier = selectedPackage.pricing_tiers[billingPeriod][userCurrency]
      const price = currencyTier.promo_price || currencyTier.regular_price
      const originalPrice = currencyTier.regular_price
      const discount = currencyTier.promo_price ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) : 0

      return { price, discount, originalPrice }
    }

    return { price: selectedPackage.price, discount: 0, originalPrice: selectedPackage.price }
  }

  const { price, discount, originalPrice } = calculatePrice()

  return (
    <Card className="sticky top-8">
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
                {selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]?.period_label || billingPeriod} billing
              </p>
            </div>
            {discount > 0 && (
              <span className="bg-[#4BB543] text-white text-xs px-2 py-1 rounded-full">
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
              <span className="font-medium text-[#4BB543]">
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
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center text-xs text-[#6C757D] mt-4">
          <Shield className="h-4 w-4 mr-2" />
          Secure checkout. Your information is protected.
        </div>
      </CardContent>
    </Card>
  )
}