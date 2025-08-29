import React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const CheckoutLoading = () => {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#3D8BFF]" />
        <span className="text-[#6C757D]">Loading checkout...</span>
      </div>
    </div>
  )
}

export const PackageNotFound = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Package not found</h2>
        <p className="text-[#6C757D] mb-4">The selected package could not be found.</p>
        <Button 
          onClick={() => router.push('/dashboard/settings/plans-billing')} 
          className="bg-[#1C2331] hover:bg-[#0d1b2a] text-white"
        >
          Back to Billing
        </Button>
      </div>
    </div>
  )
}