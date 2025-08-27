'use client'

import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Building2, Check, Loader2, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/database'
import { formatCurrency } from '@/lib/utils'
import { PaymentRouter } from '@/lib/payment-services/payment-router'
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service'
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor'
import BillingPeriodSelector from '@/components/checkout/BillingPeriodSelector'
import OrderSummary from '@/components/checkout/OrderSummary'
import PaymentMethodSelector from '@/components/checkout/payment-methods/PaymentMethodSelector'
import PaymentErrorBoundary from '@/components/checkout/PaymentErrorBoundary'

// Midtrans type declarations
declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
    MidtransNew3ds: {
      getCardToken: (cardData: {
        card_number: string;
        card_exp_month: string;
        card_exp_year: string;
        card_cvv: string;
      }, callback: (response: {
        status_code: string;
        status_message: string;
        token_id?: string;
        validation_messages?: string[];
      }) => void) => void;
      authenticate: (redirectUrl: string, options: {
        performAuthentication: (url: string) => void;
        onSuccess: (response: any) => void;
        onFailure: (response: any) => void;
        onPending: (response: any) => void;
      }) => void;
      callback?: (response: any) => void;
    };
    midtransSubmitCard?: () => Promise<boolean>;
  }
}

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

interface PaymentGateway {
  id: string
  name: string
  slug: string
  description: string
  is_active: boolean
  is_default: boolean
  configuration: any
}

interface CheckoutForm {
  // Personal Information
  first_name: string
  last_name: string
  email: string
  phone: string

  // Billing Address
  address: string
  city: string
  state: string
  zip_code: string
  country: string

  // Additional Info
  description: string

  // Payment
  payment_method: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [package_id] = useState(searchParams?.get('package'))
  const [billing_period, setBillingPeriod] = useState(searchParams?.get('period') || 'monthly')
  const [isTrialFlow, setIsTrialFlow] = useState(searchParams?.get('trial') === 'true')
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')
  const [showCreditCardForm, setShowCreditCardForm] = useState(false)
  const [show3DSModal, setShow3DSModal] = useState(false)
  const [threeDSUrl, setThreeDSUrl] = useState('')

  // Log page view and checkout activities
  usePageViewLogger('/dashboard/settings/plans-billing/checkout', 'Checkout', { section: 'billing_checkout' })
  const { logBillingActivity } = useActivityLogger()

  const [form, setForm] = useState<CheckoutForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Indonesia',
    description: '',
    payment_method: ''
  })

  // Initialize payment processor hook
  const paymentProcessor = usePaymentProcessor({
    packageData: selectedPackage,
    // No onSuccess needed - 3DS authentication and other payment methods handle their own success
    onError: (error) => {
      // Handle payment error
      logBillingActivity('payment_error', `Payment failed for ${selectedPackage?.name} plan: ${error.message}`)
    }
  })

  // Handle credit card form submission for Midtrans - simplified to use payment processor directly
  const handleCreditCardSubmit = async (cardData: any) => {
    if (!selectedPackage) {
      addToast({
        title: "Missing package",
        description: "Please select a package to continue.",
        type: "error"
      })
      return
    }

    const paymentRequest = {
      package_id: selectedPackage.id,
      billing_period,
      payment_method: 'midtrans_recurring',
      is_trial: isTrialFlow,
      customer_info: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country,
        description: form.description
      }
    }

    // Get auth token for the payment processor
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const token = session?.access_token
    if (!token) {
      addToast({
        title: "Authentication required",
        description: "Please log in again to continue.",
        type: "error"
      })
      return
    }

    // Map form fields to expected tokenization format
    const mappedCardData = {
      card_number: cardData.card_number,
      card_exp_month: cardData.expiry_month,
      card_exp_year: cardData.expiry_year,
      card_cvv: cardData.cvv
    }

    try {
      await paymentProcessor.processCreditCardPayment(paymentRequest, mappedCardData, token)
    } catch (error) {
      // Handle 3DS authentication requirements
      if (error && typeof error === 'object' && 'requires_3ds' in error) {
        const threeDSError = error as any
        if (threeDSError.requires_3ds && threeDSError.redirect_url) {
          // Handle 3DS authentication with UI state management
          try {
            await paymentProcessor.handle3DSAuthentication(
              threeDSError.redirect_url,
              threeDSError.transaction_id,
              threeDSError.order_id,
              (url: string) => {
                setThreeDSUrl(url)
                setShow3DSModal(true)
              },
              () => {
                setShow3DSModal(false)
                setThreeDSUrl('')
              }
            )
          } catch (authError) {
            addToast({
              title: "Authentication failed",
              description: "Unable to initialize payment authentication. Please try again.",
              type: "error"
            })
          }
          return // Don't show error toast for 3DS requirement
        }
      }

      // Other errors are handled by the payment processor hook
    }
  }


  // Fetch package and payment gateway data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get authentication token and user profile
        const user = await authService.getCurrentUser()
        if (!user) {
          addToast({
            title: "Authentication required",
            description: "Please log in to continue.",
            type: "error"
          })
          router.push('/login')
          return
        }

        // Auto-populate user information from logged-in user
        const userName = (user as any).full_name || user.email?.split('@')[0] || ''
        const nameParts = userName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        setForm(prev => ({
          ...prev,
          first_name: firstName,
          last_name: lastName,
          email: user.email || '',
          phone: (user as any).phone_number || '',
          country: (user as any).country || '' // Auto-populate country from user profile
        }))

        // Update frontend currency based on user's profile country
        const { getUserCurrency } = await import('@/lib/utils/currency-utils')
        const detectedCurrency = getUserCurrency((user as any).country)
        setUserCurrency(detectedCurrency)
        
        // Frontend currency detection completed

        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) {
          addToast({
            title: "Authentication error",
            description: "Please log in again to continue.",
            type: "error"
          })
          router.push('/login')
          return
        }

        // Initialize PaymentRouter with authentication token
        const paymentRouter = new PaymentRouter(token)

        // Fetch package details using PaymentRouter
        const selected = await paymentRouter.getPackage(package_id!)
        if (!selected) {
          addToast({
            title: "Package not found",
            description: "The selected package could not be found.",
            type: "error"
          })
          router.push('/dashboard/settings/plans-billing')
          return
        }

        setSelectedPackage(selected)

        // Check trial eligibility if this is a trial flow
        if (isTrialFlow) {
          try {
            const eligibilityResponse = await fetch('/api/user/trial-eligibility', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            const eligibilityData = await eligibilityResponse.json()
            
            if (!eligibilityData.eligible) {
              addToast({
                title: "Trial not available",
                description: eligibilityData.message,
                type: "error"
              })
              router.push('/dashboard/settings/plans-billing')
              return
            }
            setTrialEligible(true)
          } catch (error) {
            addToast({
              title: "Error",
              description: "Unable to verify trial eligibility.",
              type: "error"
            })
            router.push('/dashboard/settings/plans-billing')
            return
          }
        }

        // Fetch payment gateways using PaymentRouter
        const activeGateways = await paymentRouter.getPaymentGateways()
        let filteredGateways = activeGateways || []

        // Filter payment methods for trial flow - only allow Midtrans Card Recurring
        if (isTrialFlow) {
          filteredGateways = activeGateways.filter((gw: PaymentGateway) => 
            gw.slug === 'midtrans' && gw.configuration?.supports_recurring === true
          )
        }

        if (filteredGateways && filteredGateways.length > 0) {
          setPaymentGateways(filteredGateways)

          // Set default payment method
          const defaultGateway = filteredGateways.find((gw: PaymentGateway) => gw.is_default) || filteredGateways[0]
          if (defaultGateway) {
            setForm(prev => ({ ...prev, payment_method: defaultGateway.id }))
          }
        }

      } catch (error) {
        // Error fetching checkout data handled
        addToast({
          title: "Error",
          description: "Failed to load checkout information.",
          type: "error"
        })
      } finally {
        setLoading(false)
      }
    }

    if (package_id) {
      fetchData()
    } else {
      router.push('/dashboard/settings/plans-billing')
    }
  }, [package_id, router, addToast, isTrialFlow])

  // Load Midtrans SDKs using MidtransClientService
  useEffect(() => {
    const loadMidtransSDKs = async () => {
      try {
        // Get Midtrans config first
        // Get auth token for Midtrans config
        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) return
        
        const config = await MidtransClientService.getMidtransConfig(token)
        
        if (config) {
          // Load both 3DS and Snap SDKs using the service
          await Promise.all([
            MidtransClientService.load3DSSDK(config.client_key, config.environment),
            MidtransClientService.loadSnapSDK(config.client_key, config.environment)
          ])
        }
      } catch (error) {
        // SDK loading failures are handled silently
        // Failed to load Midtrans SDKs - handled silently
      }
    }

    loadMidtransSDKs()
  }, [])

  // Calculate pricing based on selected billing period
  const calculatePrice = () => {
    if (!selectedPackage) return { price: 0, discount: 0, originalPrice: 0 }

    // Check if package has new multicurrency structure
    if (selectedPackage.pricing_tiers && typeof selectedPackage.pricing_tiers === 'object' && selectedPackage.pricing_tiers[billing_period]) {
      const periodTier = selectedPackage.pricing_tiers[billing_period]

      // New multicurrency format
      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        const price = currencyTier.promo_price || currencyTier.regular_price
        const originalPrice = currencyTier.regular_price
        const discount = currencyTier.promo_price ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) : 0

        return { price, discount, originalPrice }
      }

      // Legacy array format - check if it's an array
      if (Array.isArray(selectedPackage.pricing_tiers)) {
        const tier = selectedPackage.pricing_tiers.find((t: any) => t.period === billing_period)
        if (tier) {
          const price = tier.promo_price || tier.regular_price
          const originalPrice = tier.regular_price
          const discount = tier.promo_price ? Math.round(((originalPrice - tier.promo_price) / originalPrice) * 100) : 0

          return { price, discount, originalPrice }
        }
      }
    }

    return { price: selectedPackage.price, discount: 0, originalPrice: selectedPackage.price }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPackage || !form.payment_method) {
      addToast({
        title: "Missing information",
        description: "Please fill in all required fields and select a payment method.",
        type: "error"
      })
      return
    }

    setSubmitting(true)

    try {
      // Get authentication token
      const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
      if (!token) {
        addToast({
          title: "Authentication error", 
          description: "Please log in again to continue.",
          type: "error"
        })
        router.push('/login')
        return
      }

      // Check if selected payment method is Midtrans
      const selectedGateway = paymentGateways.find(gw => gw.id === form.payment_method)

      // Process payment using unified payment processor
      if (!selectedPackage) {
        addToast({
          title: "Package not found",
          description: "Please select a package to continue.",
          type: "error"
        })
        return
      }

      const paymentRequest = {
        package_id: selectedPackage.id,
        billing_period,
        payment_method: selectedGateway?.slug || 'bank_transfer',
        customer_info: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          country: form.country,
          description: form.description
        }
      }

      // For Midtrans recurring (credit card), delegate to credit card form
      if (selectedGateway?.slug === 'midtrans' || selectedGateway?.slug === 'midtrans_recurring') {
        if (!window.midtransSubmitCard) {
          addToast({
            title: "Payment system not ready",
            description: "Please wait a moment and try again.",
            type: "error"
          })
          return
        }
        await window.midtransSubmitCard()
        return
      }

      // For all other payment methods (Snap, Bank Transfer, etc.), use payment processor
      await paymentProcessor.processPayment(paymentRequest, token)

    } catch (error) {
      addToast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        type: "error"
      })
    } finally {
      setSubmitting(false)
    }
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#3D8BFF]" />
          <span className="text-[#6C757D]">Loading checkout...</span>
        </div>
      </div>
    )
  }

  if (!selectedPackage) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Package not found</h2>
          <p className="text-[#6C757D] mb-4">The selected package could not be found.</p>
          <Button onClick={() => router.push('/dashboard/settings/plans-billing')} className="bg-[#1C2331] hover:bg-[#0d1b2a] text-white">
            Back to Billing
          </Button>
        </div>
      </div>
    )
  }

  const { price, discount, originalPrice } = calculatePrice()

  return (
    <PaymentErrorBoundary>
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
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
          <p className="text-[#6C757D] mt-1">Fill in your details to upgrade to {selectedPackage.name}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Billing Period Selection */}
              <BillingPeriodSelector
                selectedPackage={selectedPackage}
                userCurrency={userCurrency}
                selectedPeriod={billing_period}
                onPeriodChange={setBillingPeriod}
              />

              {/* Personal Information & Billing Address */}
              <Card className="border-[#E0E6ED] bg-[#FFFFFF]">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Personal & Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-base font-medium text-[#1A1A1A] border-b border-[#E0E6ED] pb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-sm font-medium text-[#1A1A1A]">
                          First Name *
                        </Label>
                        <Input
                          id="first_name"
                          type="text"
                          required
                          value={form.first_name}
                          onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-sm font-medium text-[#1A1A1A]">
                          Last Name
                        </Label>
                        <Input
                          id="last_name"
                          type="text"
                          value={form.last_name}
                          onChange={(e) => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-[#1A1A1A]">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium text-[#1A1A1A]">
                          Phone Number *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h3 className="text-base font-medium text-[#1A1A1A] border-b border-[#E0E6ED] pb-2">Billing Address</h3>
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-[#1A1A1A]">
                      Street Address
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                      className="mt-1"
                      placeholder="Enter your street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium text-[#1A1A1A]">
                        City
                      </Label>
                      <Input
                        id="city"
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                        className="mt-1"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm font-medium text-[#1A1A1A]">
                        State/Province
                      </Label>
                      <Input
                        id="state"
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                        className="mt-1"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip_code" className="text-sm font-medium text-[#1A1A1A]">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip_code"
                        type="text"
                        value={form.zip_code}
                        onChange={(e) => setForm(prev => ({ ...prev, zip_code: e.target.value }))}
                        className="mt-1"
                        placeholder="ZIP"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-sm font-medium text-[#1A1A1A]">
                      Country
                    </Label>
                    <Select value={form.country} onValueChange={(value) => setForm(prev => ({ ...prev, country: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Indonesia">Indonesia</SelectItem>
                        <SelectItem value="Malaysia">Malaysia</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="Thailand">Thailand</SelectItem>
                        <SelectItem value="Philippines">Philippines</SelectItem>
                        <SelectItem value="Vietnam">Vietnam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <PaymentMethodSelector
                paymentGateways={paymentGateways}
                selectedMethod={form.payment_method}
                onMethodChange={(value) => setForm(prev => ({ ...prev, payment_method: value }))}
                onCreditCardSubmit={handleCreditCardSubmit}
                loading={submitting}
              />

              {/* Unified Submit Button - Works for all payment methods */}
              {form.payment_method && (
                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={submitting || !form.payment_method}
                    className="w-full bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-medium py-3 h-12"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        Complete Order
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              selectedPackage={selectedPackage}
              billingPeriod={billing_period}
              userCurrency={userCurrency}
            />
          </div>
        </div>
      </div>

      {/* 3DS Authentication Modal - Uses Midtrans JavaScript Library */}
      {show3DSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Card Authentication</h3>
                <p className="text-sm text-[#6C757D]">Please complete the 3D Secure authentication to continue with your payment.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShow3DSModal(false)
                  setThreeDSUrl('')
                }}
                className="ml-4"
              >
                Cancel
              </Button>
            </div>
            <div className="relative p-4">
              {threeDSUrl ? (
                <div id="3ds-authentication-container" className="w-full h-[70vh] border border-gray-200 rounded">
                  <iframe
                    src={threeDSUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    title="3DS Authentication"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[70vh]">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#3D8BFF]" />
                    <p className="text-[#6C757D]">Initializing authentication...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center text-xs text-[#6C757D]">
                <Shield className="h-4 w-4 mr-2" />
                This authentication is provided by your bank to ensure secure payment processing.
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </PaymentErrorBoundary>
  )
}