import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentPackage {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  billing_period: string
  pricing_tiers: any
  features: string[]
  description: string
}

interface CheckoutHeaderProps {
  selectedPackage: PaymentPackage | null
}

export const CheckoutHeader = ({ selectedPackage }: CheckoutHeaderProps) => {
  const router = useRouter()

  return (
    <div className="mb-8">
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/settings/plans-billing')}
        className="mb-4 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] border-0"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Plans
      </Button>
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Complete Your Order</h1>
      <p className="text-[#6C757D] mt-1">
        Fill in your details to upgrade to {selectedPackage?.name || 'selected plan'}
      </p>
    </div>
  )
}