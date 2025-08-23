'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/currency-utils'

interface BillingPeriodSelectorProps {
  selectedPackage: any
  billingPeriod: string
  onPeriodChange: (period: string) => void
  userCurrency: 'USD' | 'IDR'
}

export default function BillingPeriodSelector({ 
  selectedPackage, 
  billingPeriod, 
  onPeriodChange,
  userCurrency 
}: BillingPeriodSelectorProps) {
  if (!selectedPackage?.pricing_tiers) return null

  const availablePeriods = Object.keys(selectedPackage.pricing_tiers).filter(period => 
    selectedPackage.pricing_tiers[period][userCurrency]
  )

  if (availablePeriods.length <= 1) return null

  const getPeriodDisplay = (period: string) => {
    const periodData = selectedPackage.pricing_tiers[period]?.[userCurrency]
    if (!periodData) return { label: period, price: 0, discount: 0 }

    const price = periodData.promo_price || periodData.regular_price
    const originalPrice = periodData.regular_price
    const discount = periodData.promo_price 
      ? Math.round(((originalPrice - periodData.promo_price) / originalPrice) * 100) 
      : 0

    return {
      label: periodData.period_label || period,
      price,
      originalPrice,
      discount
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Billing Period</CardTitle>
        <p className="text-sm text-[#6C757D]">Choose your preferred billing cycle</p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={billingPeriod} onValueChange={onPeriodChange}>
          {availablePeriods.map(period => {
            const display = getPeriodDisplay(period)
            
            return (
              <div key={period} className="flex items-start space-x-3 p-4 border border-[#E0E6ED] rounded-lg hover:border-[#1A1A1A] transition-colors">
                <RadioGroupItem value={period} id={period} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={period} className="flex justify-between items-start cursor-pointer">
                    <div>
                      <div className="font-medium text-[#1A1A1A] capitalize">{display.label}</div>
                      <div className="text-sm text-[#6C757D]">Billed {period}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#1A1A1A]">
                        {formatCurrency(display.price, userCurrency)}
                      </div>
                      {display.discount > 0 && (
                        <div className="text-xs text-[#4BB543]">
                          Save {display.discount}%
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              </div>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}