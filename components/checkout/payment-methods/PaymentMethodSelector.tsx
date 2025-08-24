'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import PaymentErrorBoundary from '@/components/checkout/PaymentErrorBoundary'
import MidtransSnapPayment from '@/components/checkout/payment-methods/MidtransSnapPayment'
import MidtransRecurringPayment from '@/components/checkout/payment-methods/MidtransRecurringPayment'
import BankTransferPayment from '@/components/checkout/payment-methods/BankTransferPayment'

interface PaymentMethodSelectorProps {
  paymentGateways: any[]
  selectedMethod: string
  onMethodChange: (method: string) => void
  onCreditCardSubmit?: (cardData: any) => Promise<void>
  loading?: boolean
}

export default function PaymentMethodSelector({ 
  paymentGateways, 
  selectedMethod, 
  onMethodChange,
  onCreditCardSubmit,
  loading = false
}: PaymentMethodSelectorProps) {
  
  return (
    <PaymentErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
        <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
          {paymentGateways.map((gateway) => (
            <div key={gateway.id} className="space-y-4">
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedMethod === gateway.id 
                  ? 'border-[#3D8BFF] bg-[#3D8BFF]/5 shadow-sm' 
                  : 'border-[#E0E6ED] hover:border-[#1A1A1A]'
              }`}>
                <RadioGroupItem 
                  value={gateway.id} 
                  id={gateway.id}
                  className={selectedMethod === gateway.id ? 'border-[#3D8BFF] text-[#3D8BFF]' : ''}
                />
                <div className="flex-1">
                  <Label htmlFor={gateway.id} className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center">
                      {gateway.slug === 'bank_transfer' && (
                        <Building2 className="h-5 w-5 text-[#6C757D] mr-3" />
                      )}
                      <div className="font-medium text-[#1A1A1A]">{gateway.name}</div>
                    </div>
                    {gateway.is_default && (
                      <span className="text-xs bg-[#4BB543]/10 text-[#4BB543] px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </Label>
                </div>
              </div>

            </div>
          ))}
        </RadioGroup>
        </CardContent>
      </Card>
    </PaymentErrorBoundary>
  )
}