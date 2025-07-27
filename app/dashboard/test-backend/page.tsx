'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JobProcessorTest } from '@/components/job-processor-test'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Shield, AlertTriangle } from 'lucide-react'

export default function TestBackendPage() {
  const router = useRouter()
  const { user, loading } = useUserProfile()
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user || !user.isSuperAdmin) {
        setAccessDenied(true)
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      }
    }
  }, [user, loading, router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-[#1C2331]"></div>
      </div>
    )
  }

  // Show access denied message
  if (accessDenied || !user || !user.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-4">
            <AlertTriangle className="h-16 w-16 text-[#E63946] mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Access Denied</h1>
          <p className="text-[#6C757D] mb-4">
            You need super administrator privileges to access this page.
          </p>
          <div className="bg-[#F7F9FC] p-4 border border-[#E0E6ED] rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-[#6C757D] mr-2" />
              <span className="text-sm font-medium text-[#1A1A1A]">Required Role: Super Admin</span>
            </div>
            <p className="text-xs text-[#6C757D]">
              You will be redirected to the dashboard in a few seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show the test backend page for super admins
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Backend Processing Test</h1>
        <p className="text-[#1A1A1A] mt-1">
          Test the job processing system and Google API integration
        </p>
      </div>

      <JobProcessorTest />

      <div className="bg-[#F7F9FC] p-4 border border-[#E0E6ED] rounded-lg">
        <h3 className="font-semibold text-[#1A1A1A] mb-2">Setup Instructions:</h3>
        <div className="space-y-2 text-sm text-[#1A1A1A]">
          <p><strong>1. Database Schema:</strong> Run the SQL from <code>database-updates.sql</code> in your Supabase SQL Editor</p>
          <p><strong>2. Environment Variables:</strong> Ensure <code>ENCRYPTION_KEY</code> is set in your .env.local file</p>
          <p><strong>3. Service Accounts:</strong> Upload Google service account JSON files in Settings</p>
          <p><strong>4. Create Test Jobs:</strong> Create indexing jobs from the IndexNow page</p>
        </div>
      </div>
    </div>
  )
}