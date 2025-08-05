'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PlansBillingSettingsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Simply redirect to the existing billing page
    router.push('/dashboard/billing')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-sm" style={{color: '#6C757D'}}>Redirecting to billing page...</p>
      </div>
    </div>
  )
}