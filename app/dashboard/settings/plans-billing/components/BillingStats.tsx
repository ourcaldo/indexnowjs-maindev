import React from 'react'
import { AlertCircle, Package, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/dashboard/enhanced'
import { Card } from '@/components/dashboard/ui'

interface BillingData {
  currentSubscription: {
    package_name: string
    package_slug: string
    subscription_status: string
    expires_at: string | null
    subscribed_at: string | null
    amount_paid: number
    billing_period: string
  } | null
  billingStats: {
    total_payments: number
    total_spent: number
    next_billing_date: string | null
    days_remaining: number | null
  }
}

interface BillingStatsProps {
  billingData: BillingData | null
  currentPackageId: string | null
  formatCurrency: (amount: number, currency?: string) => string
  userCurrency: 'USD' | 'IDR'
}

export const BillingStats = ({ 
  billingData, 
  currentPackageId, 
  formatCurrency, 
  userCurrency 
}: BillingStatsProps) => {
  const { currentSubscription, billingStats } = billingData || {}

  return (
    <div className="space-y-6">
      {/* No Active Package Alert */}
      {!currentPackageId && (
        <Card>
          <div className="p-4 border border-[#F0A202] bg-[#F0A202]/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#F0A202] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-[#1A1A1A] mb-1">No Active Package</h3>
                <p className="text-sm text-[#6C757D]">
                  You don't have an active package. Subscribe to a plan below to start tracking your keywords and accessing all features.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Subscription Stats */}
      {currentSubscription && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Current Plan"
            value={currentSubscription.package_name}
            description={`${currentSubscription.billing_period} billing`}
            icon={<Package className="w-6 h-6" />}
          />
          
          <StatCard
            title="Amount Paid"
            value={formatCurrency(currentSubscription.amount_paid, userCurrency)}
            description="Current billing cycle"
            icon={<TrendingUp className="w-6 h-6" style={{color: '#4BB543'}} />}
          />
          
          <StatCard
            title="Days Remaining"
            value={billingStats?.days_remaining?.toString() || '0'}
            description="Until next billing"
            icon={<AlertCircle className="w-6 h-6" style={{color: '#F0A202'}} />}
          />
          
          <StatCard
            title="Total Spent"
            value={formatCurrency(billingStats?.total_spent || 0, userCurrency)}
            description={`${billingStats?.total_payments || 0} transactions`}
            icon={<TrendingUp className="w-6 h-6" style={{color: '#3D8BFF'}} />}
          />
        </div>
      )}
    </div>
  )
}