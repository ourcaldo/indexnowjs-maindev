import React from 'react'
import { Package, CheckCircle } from 'lucide-react'
import { Button } from '@/components/dashboard/ui'

interface PaymentPackage {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_quota_limit: number
    service_accounts_limit: number
    concurrent_jobs_limit: number
  }
  is_popular: boolean
  is_current: boolean
  pricing_tiers: any
}

interface PackageComparisonProps {
  packages: PaymentPackage[]
  showComparePlans: boolean
  toggleComparePlans: () => void
  selectedBillingPeriod: string
  userCurrency: 'USD' | 'IDR'
  getBillingPeriodPrice: (pkg: PaymentPackage, period: string) => { price: number, originalPrice?: number, discount?: number }
  formatCurrency: (amount: number, currency?: string) => string
  handleSubscribe: (packageId: string) => void
  subscribing: string | null
}

export const PackageComparison = ({
  packages,
  showComparePlans,
  toggleComparePlans,
  selectedBillingPeriod,
  userCurrency,
  getBillingPeriodPrice,
  formatCurrency,
  handleSubscribe,
  subscribing
}: PackageComparisonProps) => {
  if (!showComparePlans) return null

  return (
    <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Compare Plans</h2>
          <p className="text-sm text-[#6C757D]">Compare features across all available plans</p>
        </div>
        <Button variant="outline" onClick={toggleComparePlans}>
          <Package className="w-4 h-4 mr-2" />
          Hide Comparison
        </Button>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E0E6ED]">
              <th className="text-left py-4 pr-4 font-medium text-[#1A1A1A]">Features</th>
              {packages.map((pkg) => (
                <th key={pkg.id} className="text-center py-4 px-4 min-w-[200px]">
                  <div className="space-y-2">
                    <div className="flex flex-col items-center">
                      <div className="font-semibold text-[#1A1A1A]">{pkg.name}</div>
                      {pkg.is_current && (
                        <span className="bg-[#1A1A1A] text-white px-2 py-0.5 rounded text-xs">
                          Current
                        </span>
                      )}
                      {pkg.is_popular && !pkg.is_current && (
                        <span className="bg-[#3D8BFF] text-white px-2 py-0.5 rounded text-xs">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-[#1A1A1A]">
                      {formatCurrency(getBillingPeriodPrice(pkg, selectedBillingPeriod).price, userCurrency)}
                    </div>
                    <div className="text-sm text-[#6C757D]">per month</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Extract all unique features */}
            {Array.from(new Set(packages.flatMap(pkg => pkg.features))).map((feature, index) => (
              <tr key={index} className="border-b border-[#E0E6ED]">
                <td className="py-3 pr-4 text-[#6C757D]">{feature}</td>
                {packages.map((pkg) => (
                  <td key={pkg.id} className="text-center py-3 px-4">
                    {pkg.features.includes(feature) ? (
                      <CheckCircle className="w-5 h-5 text-[#4BB543] mx-auto" />
                    ) : (
                      <div className="w-5 h-5 mx-auto opacity-20">
                        <div className="w-full h-full rounded-full border border-[#E0E6ED]"></div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Action Row */}
            <tr>
              <td className="py-6 pr-4"></td>
              {packages.map((pkg) => (
                <td key={pkg.id} className="text-center py-6 px-4">
                  {pkg.is_current ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#4BB543]" />
                      <span className="text-sm font-medium text-[#4BB543]">Active Plan</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(pkg.id)}
                      disabled={subscribing === pkg.id}
                      className="w-full max-w-[150px]"
                    >
                      {subscribing === pkg.id ? 'Processing...' : 'Switch Plan'}
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}