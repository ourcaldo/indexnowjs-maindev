'use client'

import { Card } from '@/components/ui/card'
import { CreditCard, Shield } from 'lucide-react'

interface MidtransSnapPaymentProps {
  gateway: any
}

export default function MidtransSnapPayment({ gateway }: MidtransSnapPaymentProps) {
  return (
    <div className="ml-8 mt-4">
      <div className="p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
        <div className="flex items-center mb-3">
          <CreditCard className="h-5 w-5 text-[#3D8BFF] mr-2" />
          <span className="font-medium text-[#1A1A1A]">Credit/Debit Card Payment</span>
        </div>
        
        <div className="text-sm text-[#6C757D] space-y-2">
          <p>Pay securely with your credit or debit card through Midtrans secure payment gateway.</p>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="text-xs">
              <span className="font-medium text-[#1A1A1A]">Accepted Cards:</span>
              <div className="mt-1 text-[#6C757D]">Visa, Mastercard, JCB</div>
            </div>
            <div className="text-xs">
              <span className="font-medium text-[#1A1A1A]">Processing Time:</span>
              <div className="mt-1 text-[#6C757D]">Instant</div>
            </div>
          </div>

          <div className="flex items-center text-xs text-[#6C757D] mt-3 pt-3 border-t border-[#E0E6ED]">
            <Shield className="h-4 w-4 mr-2 text-[#4BB543]" />
            Secured by Midtrans with 3D Secure authentication
          </div>
        </div>
      </div>
    </div>
  )
}