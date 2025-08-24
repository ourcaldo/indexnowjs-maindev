'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/currency-utils'

interface BillingPeriodOption {
  period: string
  period_label: string
  regular_price: number
  promo_price?: number
}

interface BillingPeriodSelectorProps {
  selectedPackage: any
  userCurrency: 'USD' | 'IDR'
  selectedPeriod: string
  onPeriodChange: (period: string) => void
}

export default function BillingPeriodSelector({
  selectedPackage,
  userCurrency,
  selectedPeriod,
  onPeriodChange
}: BillingPeriodSelectorProps) {
  if (!selectedPackage || !selectedPackage.pricing_tiers) {
    return null
  }

  // Get available billing periods in the specified order: monthly → quarterly → biannual → annual
  const periodOrder = ['monthly', 'quarterly', 'biannual', 'annual']
  const availablePeriods = periodOrder.filter(period => 
    selectedPackage.pricing_tiers[period] && 
    selectedPackage.pricing_tiers[period][userCurrency]
  )

  const formatPeriodOptions = (): BillingPeriodOption[] => {
    return availablePeriods.map(period => {
      const tierData = selectedPackage.pricing_tiers[period][userCurrency]
      return {
        period,
        period_label: tierData.period_label || period,
        regular_price: tierData.regular_price,
        promo_price: tierData.promo_price
      }
    })
  }

  const periodOptions = formatPeriodOptions()

  const calculateDiscount = (regular: number, promo?: number) => {
    if (!promo || promo >= regular) return 0
    return Math.round(((regular - promo) / regular) * 100)
  }

  return (
    <Card className="border-[#E0E6ED] bg-[#FFFFFF]">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Billing Period</CardTitle>
        <p className="text-sm text-[#6C757D]">Choose your preferred billing cycle</p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedPeriod} onValueChange={onPeriodChange}>
          <div className="space-y-3">
            {periodOptions.map((option) => {
              const discount = calculateDiscount(option.regular_price, option.promo_price)
              const finalPrice = option.promo_price || option.regular_price
              const isSelected = selectedPeriod === option.period

              return (
                <div
                  key={option.period}
                  className={`relative border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-[#3D8BFF] bg-[#3D8BFF]/5' 
                      : 'border-[#E0E6ED] hover:border-[#3D8BFF] hover:bg-[#F7F9FC]'
                  }`}
                  onClick={() => onPeriodChange(option.period)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem 
                        value={option.period} 
                        id={option.period}
                        className={isSelected ? 'border-[#3D8BFF] text-[#3D8BFF]' : 'border-[#E0E6ED] text-[#6C757D]'}
                      />
                      <Label 
                        htmlFor={option.period} 
                        className="cursor-pointer flex items-center space-x-2"
                      >
                        <span className="font-medium text-[#1A1A1A]">
                          {option.period_label}
                        </span>
                        {discount > 0 && (
                          <span className="bg-[#F0A202] text-[#FFFFFF] text-xs px-2 py-0.5 rounded-full font-medium">
                            {discount}% OFF
                          </span>
                        )}
                      </Label>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {option.promo_price && (
                          <span className="text-sm text-[#6C757D] line-through">
                            {formatCurrency(option.regular_price, userCurrency)}
                          </span>
                        )}
                        <span className="text-lg font-bold text-[#1A1A1A]">
                          {formatCurrency(finalPrice, userCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}