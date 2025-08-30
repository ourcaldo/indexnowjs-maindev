'use client'

import { 
  Zap,
  Calendar,
  CheckCircle,
  BarChart3,
  DollarSign
} from 'lucide-react'

interface PricingTier {
  currency: string
  billing_period: string
  regular_price: number
  promo_price?: number
}

interface Package {
  id: string
  name: string
  slug: string
  description: string
  pricing_tiers: PricingTier[]
  currency: string
  billing_period: string
  features: string[]
}

interface UserProfile {
  package?: Package
  subscribed_at?: string
  subscription_ends_at?: string
  daily_quota_limit?: number
  daily_quota_used?: number
  daily_quota_reset_date?: string
}

interface PackageSubscriptionCardProps {
  user: UserProfile
}

export function PackageSubscriptionCard({ user }: PackageSubscriptionCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-[#3D8BFF]/10">
          <Zap className="h-5 w-5 text-[#3D8BFF]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Package Subscription</h3>
          <p className="text-sm text-[#6C757D]">Current subscription plan and quota details</p>
        </div>
      </div>

      {user.package ? (
        <div className="space-y-6">
          {/* Current Package Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-[#1A1A1A]">Current Plan</h4>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${
                  user.package.slug === 'free' ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20' :
                  user.package.slug === 'premium' ? 'bg-[#3D8BFF]/10 text-[#3D8BFF] border-[#3D8BFF]/20' :
                  user.package.slug === 'pro' ? 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20' :
                  'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                }`}>
                  {user.package.name}
                </span>
              </div>
              
              <div className="bg-[#F7F9FC] rounded-lg p-4">
                <p className="text-sm text-[#6C757D] mb-2">{user.package.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#1A1A1A]">
                    {(() => {
                      // Handle different possible structures for pricing_tiers
                      let pricingTiers = user.package.pricing_tiers
                      
                      // If pricing_tiers is a string, try to parse it as JSON
                      if (typeof pricingTiers === 'string') {
                        try {
                          pricingTiers = JSON.parse(pricingTiers)
                        } catch (e) {
                          console.log('Failed to parse pricing_tiers as JSON:', pricingTiers)
                          return 'Free'
                        }
                      }
                      
                      // If it's not an array, fallback to free
                      if (!Array.isArray(pricingTiers) || pricingTiers.length === 0) {
                        return 'Free'
                      }
                      
                      // Find the pricing tier for the current currency and billing period
                      const currentTier = pricingTiers.find(
                        tier => tier.currency === user.package.currency && tier.billing_period === user.package.billing_period
                      )
                      
                      if (!currentTier) {
                        // If no matching tier, use the first available tier
                        const firstTier = pricingTiers[0]
                        if (firstTier) {
                          const price = firstTier.promo_price || firstTier.regular_price
                          return price === 0 ? 'Free' : `${firstTier.currency} ${price.toLocaleString()}`
                        }
                        return 'Free'
                      }
                      
                      const price = currentTier.promo_price || currentTier.regular_price
                      return price === 0 ? 'Free' : `${currentTier.currency} ${price.toLocaleString()}`
                    })()}
                  </span>
                  <span className="text-sm text-[#6C757D]">
                    per {user.package.billing_period}
                  </span>
                </div>
              </div>

              {/* Package Features */}
              <div>
                <h5 className="font-medium text-[#1A1A1A] mb-2">Features</h5>
                <ul className="space-y-1">
                  {user.package.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-[#6C757D]">
                      <CheckCircle className="h-4 w-4 text-[#4BB543]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-[#1A1A1A]">Subscription Details</h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Subscribed</p>
                    <p className="text-sm text-[#1A1A1A]">
                      {user.subscribed_at ? new Date(user.subscribed_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Expires</p>
                    <p className="text-sm text-[#1A1A1A]">
                      {user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Daily Quota</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-[#1A1A1A]">
                        {user.daily_quota_used || 0} / {user.daily_quota_limit || 0}
                      </p>
                      <span className="text-xs text-[#6C757D]">URLs</span>
                    </div>
                    
                    {/* Quota Progress Bar */}
                    <div className="mt-1 w-full bg-[#E0E6ED] rounded-full h-2">
                      <div
                        className="bg-[#3D8BFF] h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(((user.daily_quota_used || 0) / (user.daily_quota_limit || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-[#6C757D]" />
                  <div>
                    <p className="text-xs text-[#6C757D] uppercase tracking-wide">Quota Reset</p>
                    <p className="text-sm text-[#1A1A1A]">
                      {user.daily_quota_reset_date ? new Date(user.daily_quota_reset_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-[#6C757D] mx-auto mb-3" />
          <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">No Active Subscription</h4>
          <p className="text-sm text-[#6C757D]">This user doesn't have an active subscription package.</p>
        </div>
      )}
    </div>
  )
}