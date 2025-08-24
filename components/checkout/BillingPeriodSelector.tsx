'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
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

  const calculateMonthlySavings = (option: BillingPeriodOption) => {
    if (option.period === 'monthly') return null
    
    const monthlyOption = periodOptions.find(p => p.period === 'monthly')
    if (!monthlyOption) return null

    const currentPrice = option.promo_price || option.regular_price
    const monthlyPrice = monthlyOption.promo_price || monthlyOption.regular_price
    
    const periodMultipliers = {
      'quarterly': 3,
      'biannual': 6,
      'annual': 12
    }
    
    const multiplier = periodMultipliers[option.period as keyof typeof periodMultipliers] || 1
    const monthlyEquivalent = currentPrice / multiplier
    const savings = monthlyPrice - monthlyEquivalent
    
    return savings > 0 ? savings : null
  }

  return (
    <Card className="border-[#E0E6ED]">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-[#1A1A1A]">Billing Period</CardTitle>
        <p className="text-[#6C757D] text-base">Choose your preferred billing cycle</p>
      </CardHeader>
      <CardContent className="pt-0">
        <RadioGroup value={selectedPeriod} onValueChange={onPeriodChange}>
          <div className="space-y-3">
            {periodOptions.map((option) => {
              const discount = calculateDiscount(option.regular_price, option.promo_price)
              const finalPrice = option.promo_price || option.regular_price
              const monthlySavings = calculateMonthlySavings(option)
              const isSelected = selectedPeriod === option.period

              return (
                <div
                  key={option.period}
                  className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-[#3D8BFF] bg-[#3D8BFF]/3 shadow-sm' 
                      : 'border-[#E0E6ED] hover:border-[#3D8BFF]/50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem 
                        value={option.period} 
                        id={option.period}
                        className={`w-5 h-5 ${isSelected ? 'border-[#3D8BFF] text-[#3D8BFF]' : 'border-[#6C757D]'}`}
                      />
                      <Label 
                        htmlFor={option.period} 
                        className="cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-semibold text-[#1A1A1A]">
                            {option.period_label}
                          </span>
                          {discount > 0 && (
                            <span className="bg-[#4BB543] text-white text-xs font-medium px-3 py-1 rounded-full">
                              Save {discount}%
                            </span>
                          )}
                          {option.period === 'annual' && (
                            <span className="bg-[#3D8BFF] text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              Most Popular
                            </span>
                          )}
                        </div>
                        {monthlySavings && (
                          <div className="text-sm text-[#4BB543] font-medium mt-1">
                            Save {formatCurrency(monthlySavings, userCurrency)}/month vs monthly billing
                          </div>
                        )}
                      </Label>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {option.promo_price && (
                          <span className="text-lg text-[#6C757D] line-through font-medium">
                            {formatCurrency(option.regular_price, userCurrency)}
                          </span>
                        )}
                        <span className="text-2xl font-bold text-[#1A1A1A]">
                          {formatCurrency(finalPrice, userCurrency)}
                        </span>
                      </div>
                      <div className="text-sm text-[#6C757D] font-medium mt-1">
                        {option.period === 'monthly' 
                          ? 'per month' 
                          : `for ${option.period_label.toLowerCase()}`
                        }
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