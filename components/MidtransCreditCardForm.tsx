'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Lock } from 'lucide-react'

interface CreditCardFormData {
  card_number: string
  expiry_month: string
  expiry_year: string
  cvv: string
  cardholder_name: string
}

interface MidtransCreditCardFormProps {
  onSubmit: (cardData: CreditCardFormData) => Promise<void>
  loading?: boolean
  disabled?: boolean
}

export default function MidtransCreditCardForm({ 
  onSubmit, 
  loading = false, 
  disabled = false 
}: MidtransCreditCardFormProps) {
  const [cardData, setCardData] = useState<CreditCardFormData>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: ''
  })

  const [errors, setErrors] = useState<Partial<CreditCardFormData>>({})

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = cleaned.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return cleaned
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<CreditCardFormData> = {}

    // Card number validation (basic check for 13-19 digits)
    const cleanCardNumber = cardData.card_number.replace(/\s/g, '')
    if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      newErrors.card_number = 'Invalid card number'
    }

    // Cardholder name
    if (!cardData.cardholder_name.trim()) {
      newErrors.cardholder_name = 'Cardholder name is required'
    }

    // Expiry month
    const month = parseInt(cardData.expiry_month)
    if (!cardData.expiry_month || month < 1 || month > 12) {
      newErrors.expiry_month = 'Invalid month'
    }

    // Expiry year
    const currentYear = new Date().getFullYear()
    const year = parseInt(cardData.expiry_year)
    if (!cardData.expiry_year || year < currentYear || year > currentYear + 20) {
      newErrors.expiry_year = 'Invalid year'
    }

    // CVV
    if (!cardData.cvv || cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      newErrors.cvv = 'Invalid CVV'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    await onSubmit(cardData)
  }

  const handleInputChange = (field: keyof CreditCardFormData, value: string) => {
    let formattedValue = value

    // Format card number
    if (field === 'card_number') {
      formattedValue = formatCardNumber(value)
    }

    // Limit CVV to 4 digits
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4)
    }

    // Limit month/year to 2 digits
    if (field === 'expiry_month' || field === 'expiry_year') {
      formattedValue = value.replace(/\D/g, '').slice(0, field === 'expiry_year' ? 4 : 2)
    }

    setCardData(prev => ({
      ...prev,
      [field]: formattedValue
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  return (
    <Card className="border-[#E0E6ED]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
          <CreditCard className="h-5 w-5 text-[#3D8BFF]" />
          Credit Card Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="card_number" className="text-[#1A1A1A] font-medium">
              Card Number
            </Label>
            <Input
              id="card_number"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardData.card_number}
              onChange={(e) => handleInputChange('card_number', e.target.value)}
              className={`border-[#E0E6ED] focus:border-[#3D8BFF] ${
                errors.card_number ? 'border-[#E63946]' : ''
              }`}
              disabled={disabled}
              maxLength={19}
            />
            {errors.card_number && (
              <p className="text-sm text-[#E63946]">{errors.card_number}</p>
            )}
          </div>

          {/* Expiry Date and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_month" className="text-[#1A1A1A] font-medium">
                Month
              </Label>
              <Input
                id="expiry_month"
                type="text"
                placeholder="MM"
                value={cardData.expiry_month}
                onChange={(e) => handleInputChange('expiry_month', e.target.value)}
                className={`border-[#E0E6ED] focus:border-[#3D8BFF] ${
                  errors.expiry_month ? 'border-[#E63946]' : ''
                }`}
                disabled={disabled}
                maxLength={2}
              />
              {errors.expiry_month && (
                <p className="text-sm text-[#E63946]">{errors.expiry_month}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiry_year" className="text-[#1A1A1A] font-medium">
                Year
              </Label>
              <Input
                id="expiry_year"
                type="text"
                placeholder="YYYY"
                value={cardData.expiry_year}
                onChange={(e) => handleInputChange('expiry_year', e.target.value)}
                className={`border-[#E0E6ED] focus:border-[#3D8BFF] ${
                  errors.expiry_year ? 'border-[#E63946]' : ''
                }`}
                disabled={disabled}
                maxLength={4}
              />
              {errors.expiry_year && (
                <p className="text-sm text-[#E63946]">{errors.expiry_year}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv" className="text-[#1A1A1A] font-medium">
                CVV
              </Label>
              <Input
                id="cvv"
                type="password"
                placeholder="123"
                value={cardData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value)}
                className={`border-[#E0E6ED] focus:border-[#3D8BFF] ${
                  errors.cvv ? 'border-[#E63946]' : ''
                }`}
                disabled={disabled}
                maxLength={4}
              />
              {errors.cvv && (
                <p className="text-sm text-[#E63946]">{errors.cvv}</p>
              )}
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholder_name" className="text-[#1A1A1A] font-medium">
              Cardholder Name
            </Label>
            <Input
              id="cardholder_name"
              type="text"
              placeholder="Enter name as shown on card"
              value={cardData.cardholder_name}
              onChange={(e) => handleInputChange('cardholder_name', e.target.value)}
              className={`border-[#E0E6ED] focus:border-[#3D8BFF] ${
                errors.cardholder_name ? 'border-[#E63946]' : ''
              }`}
              disabled={disabled}
            />
            {errors.cardholder_name && (
              <p className="text-sm text-[#E63946]">{errors.cardholder_name}</p>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
            <Lock className="h-4 w-4 text-[#4BB543]" />
            <p className="text-sm text-[#6C757D]">
              Your payment information is encrypted and secure
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={disabled || loading}
            className="w-full bg-[#22333b] hover:bg-[#1C2331] text-white"
          >
            {loading ? 'Processing...' : 'Continue Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}