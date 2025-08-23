'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Building2, CreditCard } from 'lucide-react'

interface PaymentMethodSelectorProps {
  paymentGateways: any[]
  selectedMethod: string
  onMethodChange: (method: string) => void
}

export default function PaymentMethodSelector({ 
  paymentGateways, 
  selectedMethod, 
  onMethodChange 
}: PaymentMethodSelectorProps) {
  
  const getPaymentIcon = (slug: string) => {
    switch (slug) {
      case 'bank_transfer':
        return <Building2 className="h-5 w-5 text-[#6C757D]" />
      case 'midtrans_snap':
      case 'midtrans_recurring':
      case 'midtrans':
        return <CreditCard className="h-5 w-5 text-[#6C757D]" />
      default:
        return <CreditCard className="h-5 w-5 text-[#6C757D]" />
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Payment Method</CardTitle>
        <p className="text-sm text-[#6C757D]">Choose how you'd like to pay</p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
          {paymentGateways.map((gateway) => (
            <div key={gateway.id} className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border border-[#E0E6ED] rounded-lg hover:border-[#1A1A1A] transition-colors">
                <RadioGroupItem value={gateway.id} id={gateway.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={gateway.id} className="flex items-center cursor-pointer">
                    <div className="mr-3">
                      {getPaymentIcon(gateway.slug)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{gateway.name}</div>
                          <div className="text-sm text-[#6C757D]">{gateway.description}</div>
                        </div>
                        {gateway.is_default && (
                          <span className="text-xs bg-[#4BB543]/10 text-[#4BB543] px-2 py-1 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              </div>

              {/* Bank Transfer Details */}
              {selectedMethod === gateway.id && gateway.slug === 'bank_transfer' && gateway.configuration?.bank_name && (
                <div className="ml-8 p-4 bg-[#F7F9FC] rounded border border-[#E0E6ED]">
                  <div className="text-sm text-[#1A1A1A] font-semibold mb-2">Bank Transfer Details:</div>
                  <div className="text-xs space-y-1 text-[#6C757D]">
                    <div><span className="font-medium">Bank:</span> {gateway.configuration.bank_name}</div>
                    <div><span className="font-medium">Account Name:</span> {gateway.configuration.account_name}</div>
                    <div><span className="font-medium">Account Number:</span> {gateway.configuration.account_number}</div>
                  </div>
                  <div className="text-xs text-[#6C757D] mt-2">
                    Please transfer the exact amount and upload your payment proof after checkout.
                  </div>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}