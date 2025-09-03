'use client'

import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  Globe, 
  Search, 
  Plus,
  BarChart3,
  Target,
  Zap,
  ChevronRightIcon,
  ExternalLink,
  Check,
  Star,
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import QuotaCard from '@/components/QuotaCard'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import PricingTable from '@/components/shared/PricingTable'
import { useDashboardData } from '@/hooks/useDashboardData'

interface UserProfile {
  full_name: string | null;
  email: string;
  package?: {
    name: string;
    slug: string;
    description: string;
    price: number;
    currency: string;
    billing_period: string;
    quota_limits: {
      daily_urls: number;
      service_accounts: number;
      concurrent_jobs: number;
      keywords_limit: number;
    };
  };
  daily_quota_used?: number;
  expires_at?: string;
  service_account_count?: number;
  active_jobs_count?: number;
  keywords_used?: number;
  keywords_limit?: number;
}

interface KeywordData {
  id: string;
  keyword: string;
  current_position: number | null;
  position_1d: number | null;
  position_3d: number | null;
  position_7d: number | null;
  domain: {
    display_name: string;
    domain_name: string;
  };
  device_type: string;
  country: {
    name: string;
    iso2_code: string;
  };
}

interface RankStats {
  totalKeywords: number;
  averagePosition: number;
  topTenKeywords: number;
  improvingKeywords: number;
  decliningKeywords: number;
  newKeywords: number;
}

interface PaymentPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  features: string[];
  quota_limits: {
    daily_quota_limit: number;
    service_accounts_limit: number;
    concurrent_jobs_limit: number;
  };
  is_popular: boolean;
  is_current: boolean;
  pricing_tiers: Record<string, any>;
}

export default function Dashboard() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [packagesData, setPackagesData] = useState<{ packages: PaymentPackage[], current_package_id: string | null } | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [startingTrial, setStartingTrial] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);

  // Log page view and dashboard activities
  usePageViewLogger('/dashboard', 'Dashboard', { section: 'main_dashboard' })
  const { logDashboardActivity } = useActivityLogger()

  // Use merged dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    error: dashboardError 
  } = useDashboardData()

  // Individual API loading functions replaced by merged dashboard endpoint

  // Use domains from merged dashboard data
  const domainsData = dashboardData?.rankTracking?.domains
  const domainsLoading = dashboardLoading

  // Fetch top keywords for current domain
  const { data: keywordsData, isLoading: keywordsLoading } = useQuery({
    queryKey: ['/api/v1/rank-tracking/keywords', selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return { data: [] }
      
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.append('domain_id', selectedDomainId)
      params.append('limit', '6') // Show top 6 keywords
      
      const response = await fetch(`/api/v1/rank-tracking/keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch keywords')
      return response.json()
    },
    enabled: !!selectedDomainId
  })

  // Fetch all keywords for statistics
  const { data: allKeywordsData, isLoading: allKeywordsLoading } = useQuery({
    queryKey: ['/api/v1/rank-tracking/keywords-all', selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return { data: [] }
      
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.append('domain_id', selectedDomainId)
      params.append('limit', '1000')
      
      const response = await fetch(`/api/v1/rank-tracking/keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch all keywords')
      return response.json()
    },
    enabled: !!selectedDomainId
  })

  const domains = domainsData || []
  const topKeywords = keywordsData?.data || []
  const allKeywords = allKeywordsData?.data || []

  // Set default domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Packages data now loaded from merged dashboard endpoint

  // Handle subscription
  const handleSubscribe = async (packageId: string, period: string) => {
    try {
      setSubscribing(packageId)
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=${period}`
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Error starting subscription:', error)
    } finally {
      setSubscribing(null)
    }
  }

  // Trial eligibility now loaded from merged dashboard endpoint

  // Check if package is eligible for trial (Premium or Pro plans only)
  const isTrialEligiblePackage = (pkg: any) => {
    const packageName = pkg.name.toLowerCase()
    return packageName.includes('premium') || packageName.includes('pro')
  }

  // Handle trial subscription
  const handleStartTrial = async (packageId: string) => {
    try {
      setStartingTrial(packageId)
      
      // Redirect to checkout page with trial parameter
      const checkoutUrl = `/dashboard/settings/plans-billing/checkout?package=${packageId}&period=monthly&trial=true`
      window.location.href = checkoutUrl
      
    } catch (error) {
      console.error('Error starting trial:', error)
    } finally {
      setStartingTrial(null)
    }
  }

  // Process dashboard data when it loads
  useEffect(() => {
    if (dashboardData && !dashboardLoading) {
      // Set user profile from merged data
      if (dashboardData.user?.profile) {
        setUserProfile(dashboardData.user.profile)
      }
      
      // Set packages data from merged data  
      if (dashboardData.billing) {
        setPackagesData(dashboardData.billing)
      }
      
      // Set trial eligibility from merged data
      if (dashboardData.user?.trial !== undefined) {
        setTrialEligible(dashboardData.user.trial)
      }
      
      // Set loading to false when dashboard data is ready
      setLoading(false)
      
      logDashboardActivity('dashboard_data_loaded_from_merged_api', 'Dashboard data loaded from merged endpoint', {
        timestamp: new Date().toISOString(),
        has_user_data: !!dashboardData.user,
        has_billing_data: !!dashboardData.billing,
        has_indexing_data: !!dashboardData.indexing,
        has_rank_tracking_data: !!dashboardData.rankTracking
      })
    }
  }, [dashboardData, dashboardLoading])
  
  // Handle dashboard loading errors
  useEffect(() => {
    if (dashboardError) {
      logDashboardActivity('dashboard_data_error', 'Dashboard merged API error', {
        error: dashboardError.message,
        timestamp: new Date().toISOString()
      })
      setLoading(false)
    }
  }, [dashboardError])

  // Calculate rank statistics
  const calculateRankStats = (): RankStats => {
    const totalKeywords = allKeywords.length
    const keywordsWithPosition = allKeywords.filter((k: KeywordData) => k.current_position !== null)
    const averagePosition = keywordsWithPosition.length > 0 
      ? Math.round(keywordsWithPosition.reduce((sum: number, k: KeywordData) => sum + (k.current_position || 100), 0) / keywordsWithPosition.length)
      : 0
    
    const topTenKeywords = allKeywords.filter((k: KeywordData) => k.current_position && k.current_position <= 10).length
    const improvingKeywords = allKeywords.filter((k: KeywordData) => k.position_1d && k.position_1d > 0).length
    const decliningKeywords = allKeywords.filter((k: KeywordData) => k.position_1d && k.position_1d < 0).length
    const newKeywords = allKeywords.filter((k: KeywordData) => !k.position_7d && k.current_position).length

    return {
      totalKeywords,
      averagePosition,
      topTenKeywords,
      improvingKeywords,
      decliningKeywords,
      newKeywords
    }
  }

  const rankStats = calculateRankStats()
  const selectedDomain = domains.find((d: any) => d.id === selectedDomainId)
  const hasActivePackage = userProfile?.package || packagesData?.current_package_id
  
  // Overall loading state - show skeleton when any critical data is still loading
  const isDataLoading = loading || domainsLoading


  // Position change indicator
  const PositionChange = ({ change }: { change: number | null }) => {
    if (!change) return <span className="text-xs text-slate-400">No change</span>
    
    if (change > 0) {
      return (
        <div className="flex items-center text-xs" style={{ color: '#4BB543' }}>
          <TrendingUpIcon className="w-3 h-3 mr-1" />
          +{change}
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-xs" style={{ color: '#E63946' }}>
          <TrendingDownIcon className="w-3 h-3 mr-1" />
          {change}
        </div>
      )
    }
  }

  // Skeleton loading for user profile card
  const UserProfileSkeleton = () => (
    <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#E0E6ED] rounded-full animate-pulse"></div>
          <div>
            <div className="h-5 bg-[#E0E6ED] rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-[#E0E6ED] rounded w-64 animate-pulse"></div>
          </div>
        </div>
        <div className="w-20 h-8 bg-[#E0E6ED] rounded-full animate-pulse"></div>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E0E6ED]">
            <div className="h-3 bg-[#E0E6ED] rounded w-20 mb-2 animate-pulse"></div>
            <div className="h-6 bg-[#E0E6ED] rounded w-12 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* User Profile Card */}
      {isDataLoading ? (
        <UserProfileSkeleton />
      ) : userProfile && hasActivePackage ? (
        <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#3D8BFF] to-[#1C2331] rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {userProfile.full_name?.charAt(0) || userProfile.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">
                  Welcome back, {userProfile.full_name || 'User'}!
                </h2>
                <p className="text-[#6C757D]">
                  Track your keyword rankings and monitor your SEO performance
                </p>
              </div>
            </div>
            
            {userProfile.package && (
              <div className="text-right">
                <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                  userProfile.package.slug === 'free' ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20' :
                  userProfile.package.slug === 'premium' ? 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20' :
                  userProfile.package.slug === 'pro' ? 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20' :
                  'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                }`}>
                  {userProfile.package.name}
                </div>
                <p className="text-xs text-[#6C757D] mt-1">
                  {userProfile.package.slug === 'free' ? 'Free Plan' : 
                   `Subscribed • ${userProfile.package.billing_period}`}
                </p>
              </div>
            )}
          </div>

          {hasActivePackage && <QuotaCard userProfile={userProfile} />}
        </div>
      ) : null}

      {/* No Active Package State */}
      {isDataLoading ? (
        <div className="bg-white rounded-xl border border-[#E0E6ED] p-8">
          <div className="text-center mb-8">
            <div className="h-8 bg-[#E0E6ED] rounded w-96 mx-auto mb-3 animate-pulse"></div>
            <div className="h-6 bg-[#E0E6ED] rounded w-80 mx-auto mb-6 animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-[#E0E6ED] rounded-lg p-6">
                <div className="h-6 bg-[#E0E6ED] rounded w-24 mb-4 animate-pulse"></div>
                <div className="h-8 bg-[#E0E6ED] rounded w-16 mb-4 animate-pulse"></div>
                <div className="space-y-2 mb-6">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 bg-[#E0E6ED] rounded w-full animate-pulse"></div>
                  ))}
                </div>
                <div className="h-10 bg-[#E0E6ED] rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      ) : !hasActivePackage && packagesData ? (
        <div className="bg-white rounded-xl border border-[#E0E6ED] p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              Unlock the Power of Professional Rank Tracking
            </h2>
            <p className="text-[#6C757D] text-lg mb-6">
              Subscribe to start tracking your keyword rankings, monitor your SEO performance, and grow your online presence with professional insights.
            </p>
          </div>

          <PricingTable
            showTrialButton={true}
            trialEligible={trialEligible || false}
            currentPackageId={packagesData.current_package_id}
            subscribing={subscribing}
            startingTrial={startingTrial}
            onSubscribe={handleSubscribe}
            onStartTrial={handleStartTrial}
            isTrialEligiblePackage={isTrialEligiblePackage}
            className="mb-8"
          />
        </div>
      ) : null}

      {/* Domain Selection & Rank Stats */}
      {hasActivePackage && domains.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E0E6ED] p-12 text-center">
          <Globe className="w-16 h-16 mx-auto mb-4 text-[#6C757D]" />
          <h3 className="text-xl font-semibold mb-2 text-[#1A1A1A]">
            Start Tracking Your Rankings
          </h3>
          <p className="text-[#6C757D] mb-6 max-w-md mx-auto">
            Add your first domain and keywords to start monitoring your search engine rankings and track your SEO progress.
          </p>
          <button 
            onClick={() => router.push('/dashboard/indexnow/add')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#3D8BFF] to-[#1C2331] text-white font-medium rounded-lg hover:opacity-90 transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Domain
          </button>
        </div>
      ) : null}

      {/* Domain Selection & Rank Stats */}
      {isDataLoading ? (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Domain Header Skeleton */}
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#E0E6ED] rounded-lg animate-pulse"></div>
                  <div>
                    <div className="h-5 bg-[#E0E6ED] rounded w-32 mb-1 animate-pulse"></div>
                    <div className="h-4 bg-[#E0E6ED] rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <div className="h-8 bg-[#E0E6ED] rounded w-24 animate-pulse"></div>
                  <div className="h-8 bg-[#E0E6ED] rounded w-20 animate-pulse"></div>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-[#F7F9FC] rounded-lg p-4 border border-[#E0E6ED]">
                    <div className="h-3 bg-[#E0E6ED] rounded w-20 mb-2 animate-pulse"></div>
                    <div className="h-6 bg-[#E0E6ED] rounded w-12 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keywords Skeleton */}
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-[#E0E6ED] rounded w-48 animate-pulse"></div>
                <div className="h-4 bg-[#E0E6ED] rounded w-24 animate-pulse"></div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
                    <div className="flex-1">
                      <div className="h-4 bg-[#E0E6ED] rounded w-1/3 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-[#E0E6ED] rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="h-6 bg-[#E0E6ED] rounded w-12 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <div className="h-5 bg-[#E0E6ED] rounded w-24 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-[#E0E6ED] rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : hasActivePackage ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Rank Tracking Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Domain Header */}
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#3D8BFF] to-[#1C2331] rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A]">
                      {selectedDomain?.display_name || selectedDomain?.domain_name || 'Select Domain'}
                    </h3>
                    <p className="text-sm text-[#6C757D]">{rankStats.totalKeywords} keywords tracked</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => router.push('/dashboard/indexnow/add')}
                    className="inline-flex items-center px-3 py-2 text-sm bg-[#F7F9FC] text-[#1A1A1A] rounded-lg border border-[#E0E6ED] hover:bg-[#E0E6ED] transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Keywords
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/indexnow/overview')}
                    className="inline-flex items-center px-3 py-2 text-sm bg-[#3D8BFF] text-white rounded-lg hover:bg-[#3D8BFF]/90 transition-colors"
                  >
                    View All
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>

              {/* Rank Statistics Grid */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#4BB543]/10 to-[#4BB543]/5 rounded-lg p-4 border border-[#4BB543]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#4BB543]">TOP 10 POSITIONS</p>
                      <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{rankStats.topTenKeywords}</p>
                    </div>
                    <Target className="w-5 h-5 text-[#4BB543]" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#3D8BFF]/10 to-[#3D8BFF]/5 rounded-lg p-4 border border-[#3D8BFF]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#3D8BFF]">AVERAGE POSITION</p>
                      <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{rankStats.averagePosition}</p>
                    </div>
                    <BarChart3 className="w-5 h-5 text-[#3D8BFF]" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#F0A202]/10 to-[#F0A202]/5 rounded-lg p-4 border border-[#F0A202]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#F0A202]">IMPROVING</p>
                      <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{rankStats.improvingKeywords}</p>
                    </div>
                    <TrendingUpIcon className="w-5 h-5 text-[#F0A202]" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 rounded-lg p-4 border border-[#8B5CF6]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[#8B5CF6]">TOTAL KEYWORDS</p>
                      <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{rankStats.totalKeywords}</p>
                    </div>
                    <Search className="w-5 h-5 text-[#8B5CF6]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Keywords Performance */}
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Top Keywords Performance</h3>
                <button 
                  onClick={() => router.push('/dashboard/indexnow/rank-history')}
                  className="text-sm text-[#3D8BFF] hover:text-[#3D8BFF]/80 transition-colors flex items-center"
                >
                  View History
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>

              {keywordsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg">
                        <div className="flex-1">
                          <div className="h-4 bg-[#E0E6ED] rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-[#E0E6ED] rounded w-1/2"></div>
                        </div>
                        <div className="w-16 h-8 bg-[#E0E6ED] rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : topKeywords.length === 0 ? (
                <div className="text-center py-8 text-[#6C757D]">
                  No keywords found. Add keywords to start tracking.
                </div>
              ) : (
                <div className="space-y-3">
                  {topKeywords.map((keyword: KeywordData) => (
                    <div key={keyword.id} className="flex items-center justify-between p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED] hover:bg-[#E0E6ED]/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-[#1A1A1A]">{keyword.keyword}</h4>
                          <span className="text-xs px-2 py-0.5 bg-[#E0E6ED] text-[#6C757D] rounded-full">
                            {keyword.device_type}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-[#1C2331] text-white rounded-full">
                            {keyword.country.iso2_code.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-[#6C757D]">
                            Current: <strong>#{keyword.current_position || 'Not ranked'}</strong>
                          </span>
                          <PositionChange change={keyword.position_1d} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#1A1A1A]">
                          {keyword.current_position ? `#${keyword.current_position}` : 'NR'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Primary Actions */}
            <div className="bg-white rounded-xl border border-[#E0E6ED] p-6">
              <h3 className="font-semibold text-[#1A1A1A] mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/dashboard/indexnow/add')}
                  className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-[#3D8BFF] to-[#1C2331] text-white rounded-lg hover:opacity-90 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add New Keywords</span>
                </button>
                
                <button 
                  onClick={() => router.push('/dashboard/indexnow/overview')}
                  className="w-full flex items-center space-x-3 p-4 bg-[#F7F9FC] border border-[#E0E6ED] text-[#1A1A1A] rounded-lg hover:bg-[#E0E6ED] transition-colors"
                >
                  <Search className="w-5 h-5" />
                  <span className="font-medium">View All Keywords</span>
                </button>

                <button 
                  onClick={() => router.push('/dashboard/indexnow/rank-history')}
                  className="w-full flex items-center space-x-3 p-4 bg-[#F7F9FC] border border-[#E0E6ED] text-[#1A1A1A] rounded-lg hover:bg-[#E0E6ED] transition-colors"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Rank History</span>
                </button>
              </div>
            </div>

            {/* Secondary Tool - FastIndexing */}
            <div className="bg-gradient-to-br from-[#F7F9FC] to-[#E0E6ED]/30 rounded-xl border border-[#E0E6ED] p-6">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="w-5 h-5 text-[#6C757D]" />
                <h3 className="font-medium text-[#1A1A1A]">FastIndexing Tool</h3>
              </div>
              <p className="text-sm text-[#6C757D] mb-4">
                Quickly index your URLs with Google for faster discovery.
              </p>
              <button 
                onClick={() => router.push('/dashboard/tools/fastindexing')}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-white border border-[#E0E6ED] text-[#1A1A1A] rounded-lg hover:bg-[#F7F9FC] transition-colors"
              >
                <span className="text-sm font-medium">Open FastIndexing</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}