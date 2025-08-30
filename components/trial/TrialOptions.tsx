'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CreditCard, CheckCircle, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabaseBrowser } from '@/lib/database'

interface TrialEligibility {
  eligible: boolean;
  reason?: string;
  message: string;
  available_packages?: any[];
}

interface TrialOptionsProps {
  userCurrency: 'USD' | 'IDR';
}

export default function TrialOptions({ userCurrency }: TrialOptionsProps) {
  const [eligibility, setEligibility] = useState<TrialEligibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingTrial, setStartingTrial] = useState<string | null>(null)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkTrialEligibility()
  }, [])

  const checkTrialEligibility = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/v1/auth/user/trial-eligibility', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setEligibility(result)
      }
    } catch (error) {
      console.error('Failed to check trial eligibility:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTrial = async (packageId: string, packageSlug: string) => {
    setStartingTrial(packageId)
    
    try {
      // Redirect to checkout with trial parameter
      router.push(`/dashboard/settings/plans-billing/checkout?package=${packageId}&period=monthly&trial=true`)
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to start trial. Please try again.",
        type: "error"
      })
    } finally {
      setStartingTrial(null)
    }
  }

  const calculatePrice = (pkg: any, period: string = 'monthly') => {
    if (!pkg.pricing_tiers) return { price: 0, originalPrice: 0 }

    // Check new multicurrency structure
    if (pkg.pricing_tiers[period]?.[userCurrency]) {
      const tier = pkg.pricing_tiers[period][userCurrency]
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: tier.regular_price
      }
    }

    // Fallback to base price
    return { price: pkg.price || 0, originalPrice: pkg.price || 0 }
  }

  const formatCurrency = (amount: number) => {
    if (userCurrency === 'IDR') {
      return `IDR ${amount.toLocaleString('id-ID')}`
    }
    return `$${amount}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!eligibility?.eligible) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Free Trial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-2">{eligibility?.message}</p>
              {eligibility?.reason === 'already_used' && (
                <p className="text-sm text-gray-500">
                  Each user can only use the free trial once per lifetime.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Star className="h-6 w-6 text-blue-600 mr-2" />
          <CardTitle className="text-xl font-bold text-blue-900">
            3-Day Free Trial
          </CardTitle>
        </div>
        <p className="text-blue-700">
          Try our Premium or Pro plans risk-free for 3 days
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">What's included:</p>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• Full access to all plan features</li>
                <li>• No charges for 3 days</li>
                <li>• Cancel anytime during trial</li>
                <li>• Automatic billing after trial (if not cancelled)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {eligibility.available_packages?.map((pkg: any) => {
            const pricing = calculatePrice(pkg, 'monthly')
            return (
              <div 
                key={pkg.id} 
                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                      {pkg.is_popular && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    
                    <div className="flex items-baseline space-x-2 mb-3">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(pricing.price)}
                      </span>
                      <span className="text-sm text-gray-500">/month</span>
                      {pricing.originalPrice > pricing.price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatCurrency(pricing.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-green-700 mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="font-medium">Free for 3 days, then {formatCurrency(pricing.price)}/month</span>
                    </div>

                    <div className="flex items-center text-sm text-amber-700 mb-4">
                      <CreditCard className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Credit card required - auto-billing after trial</span>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    <Button
                      onClick={() => startTrial(pkg.id, pkg.slug)}
                      disabled={startingTrial === pkg.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      {startingTrial === pkg.id ? (
                        <>Starting...</>
                      ) : (
                        <>Start 3-Day Trial</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Important: Credit Card Required
              </p>
              <p className="text-sm text-amber-800">
                A valid credit card is required to start your free trial. You'll be charged automatically 
                when the trial ends unless you cancel before then. Other payment methods (bank transfer) 
                are not available for trial subscriptions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}