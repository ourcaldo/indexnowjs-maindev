'use client'

import { Building2, Clock, FileText } from 'lucide-react'

interface BankTransferPaymentProps {
  gateway: any
}

export default function BankTransferPayment({ gateway }: BankTransferPaymentProps) {
  if (!gateway.configuration?.bank_name) return null

  return (
    <div className="ml-8 mt-4">
      <div className="p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
        <div className="flex items-center mb-3">
          <Building2 className="h-5 w-5 text-[#6C757D] mr-2" />
          <span className="font-medium text-[#1A1A1A]">Bank Transfer Details</span>
        </div>
        
        <div className="text-sm space-y-3">
          <div className="bg-white rounded-lg p-3 border border-[#E0E6ED]">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <span className="font-medium text-[#1A1A1A]">Bank:</span>
                <span className="ml-2 text-[#6C757D]">{gateway.configuration.bank_name}</span>
              </div>
              <div>
                <span className="font-medium text-[#1A1A1A]">Account Name:</span>
                <span className="ml-2 text-[#6C757D]">{gateway.configuration.account_name}</span>
              </div>
              <div>
                <span className="font-medium text-[#1A1A1A]">Account Number:</span>
                <span className="ml-2 font-mono text-[#1A1A1A] bg-[#F7F9FC] px-2 py-1 rounded">
                  {gateway.configuration.account_number}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-xs text-[#6C757D]">
              <Clock className="h-4 w-4 mr-2" />
              Processing time: 1-2 business days
            </div>
            <div className="flex items-center text-xs text-[#6C757D]">
              <FileText className="h-4 w-4 mr-2" />
              Payment proof upload required after transfer
            </div>
          </div>

          <div className="bg-[#F0A202]/10 rounded-lg p-3 mt-3">
            <div className="text-xs text-[#1A1A1A]">
              <span className="font-medium text-[#F0A202]">Important Instructions:</span>
              <ul className="mt-1 space-y-1 text-[#6C757D]">
                <li>• Transfer the exact amount shown in your order summary</li>
                <li>• Use the order ID as transfer reference</li>
                <li>• Upload payment proof immediately after transfer</li>
                <li>• Account activation will be processed within 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}