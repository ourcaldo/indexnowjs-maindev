interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-[#E0E6ED] rounded ${className}`} />
  )
}

export function ProfileSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8 items-stretch">
      {/* Profile Information Skeleton */}
      <div className="p-6 rounded-lg flex flex-col" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
        <Skeleton className="h-6 w-48 mb-6" />
        
        <div className="flex-1 space-y-6">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-3 w-64 mt-1" />
          </div>
          
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        
        <Skeleton className="h-10 w-32 mt-6" />
      </div>

      {/* Password Change Skeleton */}
      <div className="p-6 rounded-lg flex flex-col" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
        <Skeleton className="h-6 w-40 mb-6" />
        
        <div className="flex-1 space-y-6">
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        
        <Skeleton className="h-10 w-36 mt-6" />
      </div>
    </div>
  )
}

export function OrderDetailSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Skeleton className="h-8 w-8 rounded-full mx-auto mb-4" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  )
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-96">
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* User Profile Skeleton */}
      <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="w-20 h-8 rounded-full" />
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E0E6ED]">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Domain Header Skeleton */}
          <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex space-x-3">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E0E6ED]">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* Keywords Skeleton */}
          <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ApiQuotaSkeleton() {
  return (
    <div className="text-center py-8">
      <Skeleton className="h-8 w-8 rounded-full mx-auto mb-2" />
      <Skeleton className="h-4 w-20 mx-auto" />
    </div>
  )
}

export function IndexNowFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-6 w-80" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form Skeleton */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg border" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
            <div className="flex items-center gap-2 mb-6">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-6 w-48" />
            </div>

            {/* Job Name Skeleton */}
            <div className="mb-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>

            {/* Tab Skeleton */}
            <div className="mb-6">
              <div className="flex border rounded-lg p-1" style={{borderColor: '#E0E6ED', backgroundColor: '#F7F9FC'}}>
                <Skeleton className="flex-1 h-10 mx-1" />
                <Skeleton className="flex-1 h-10 mx-1" />
              </div>
            </div>

            {/* Input Area Skeleton */}
            <div className="mb-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-32 w-full" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Schedule Skeleton */}
            <div className="mb-6 pt-4 border-t" style={{borderColor: '#E0E6ED'}}>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-5 w-16" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>

            {/* Submit Button Skeleton */}
            <div className="flex gap-3">
              <Skeleton className="flex-1 h-12" />
              <Skeleton className="h-12 w-24" />
            </div>
          </div>
        </div>

        {/* API Quota Skeleton */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-lg border" style={{backgroundColor: '#FFFFFF', borderColor: '#E0E6ED'}}>
            <Skeleton className="h-6 w-32 mb-4" />
            <ApiQuotaSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#E0E6ED] p-6">
            <div className="flex items-center mb-4">
              <Skeleton className="w-8 h-8 rounded-lg mr-3" />
              <div>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}