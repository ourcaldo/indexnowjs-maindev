'use client'

import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Building2, Check, Loader2, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatCurrency } from '@/lib/currency-utils'
import MidtransCreditCardForm from '@/components/MidtransCreditCardForm'
import { PaymentRouter } from '@/lib/payment-services/payment-router'
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service'
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor'

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
  const [billing_period] = useState(searchParams?.get('period') || 'monthly')
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
  const paymentProcessor = usePaymentProcessor()

  // Handle credit card form submission for Midtrans
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
      throw new Error('Authentication required')
    }

    // Map form fields to expected tokenization format
    const mappedCardData = {
      card_number: cardData.card_number,
      card_exp_month: cardData.expiry_month,
      card_exp_year: cardData.expiry_year,
      card_cvv: cardData.cvv
    }

    await paymentProcessor.processCreditCardPayment(paymentRequest, mappedCardData, token)
    
    // Success handling is now managed within the payment processor hook
  }

  // Card tokenization is now handled by MidtransClientService via usePaymentProcessor

  // 3DS authentication is now handled by MidtransClientService via usePaymentProcessor

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
        const { getUserCurrency } = await import('@/lib/currency-utils')
        const detectedCurrency = getUserCurrency((user as any).country)
        setUserCurrency(detectedCurrency)
        
        console.log('🌏 Frontend currency detection:', {
          user_profile_country: (user as any).country,
          detected_currency: detectedCurrency,
          form_country_before: form.country
        })

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

        // Fetch payment gateways using PaymentRouter
        const activeGateways = await paymentRouter.getPaymentGateways()
        if (activeGateways && activeGateways.length > 0) {
          setPaymentGateways(activeGateways)

          // Set default payment method
          const defaultGateway = activeGateways.find((gw: PaymentGateway) => gw.is_default)
          if (defaultGateway) {
            setForm(prev => ({ ...prev, payment_method: defaultGateway.id }))
          }
        }

      } catch (error) {
        console.error('Error fetching checkout data:', error)
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
  }, [package_id, router, addToast])

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
        console.warn('Failed to load Midtrans SDKs:', error)
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

      // Call unified payment API that routes based on payment method
      await handleUnifiedPayment(token, selectedGateway)

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

  const handleUnifiedPayment = async (token: string, selectedGateway: any) => {
    try {
      if (!selectedPackage) return

      // Initialize PaymentRouter with auth token
      const paymentRouter = new PaymentRouter(token)

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

      // For Midtrans recurring, delegate to credit card form
      if (selectedGateway?.slug === 'midtrans' || selectedGateway?.slug === 'midtrans_recurring') {
        if (!window.midtransSubmitCard) {
          addToast({
            title: "Payment system not ready",
            description: "Please wait a moment and try again.",
            type: "error"
          })
          setSubmitting(false)
          return
        }
        await window.midtransSubmitCard()
        return
      }

      // For Snap payments, use MidtransClientService
      if (selectedGateway?.slug === 'midtrans_snap') {
        const result = await paymentRouter.processPayment(paymentRequest)
        
        if (result.success && result.data?.token) {
          const snapCallbacks = {
            onSuccess: (result: any) => {
              addToast({
                title: "Payment successful!",
                description: "Your subscription has been activated successfully.",
                type: "success"
              })
              setTimeout(() => {
                router.push('/dashboard/settings/plans-billing?payment=success')
              }, 1500)
            },
            onPending: (result: any) => {
              addToast({
                title: "Payment pending",
                description: "Your payment is being processed. You will receive a confirmation email shortly.",
                type: "info"
              })
              setTimeout(() => {
                router.push('/dashboard/settings/plans-billing?payment=pending')
              }, 1500)
            },
            onError: (result: any) => {
              addToast({
                title: "Payment failed",
                description: "There was an error processing your payment. Please try again.",
                type: "error"
              })
              setSubmitting(false)
            },
            onClose: () => {
              addToast({
                title: "Payment cancelled",
                description: "You cancelled the payment process.",
                type: "info"
              })
              setSubmitting(false)
            }
          }
          
          await MidtransClientService.showSnapPayment(result.data.token, snapCallbacks)
        } else {
          throw new Error(result.message || 'Failed to create Snap payment')
        }
      } else {
        // Handle regular payments (bank transfer, etc.) using PaymentRouter
        const result = await paymentRouter.processPayment(paymentRequest)
        
        if (result.success) {
          addToast({
            title: "Order submitted successfully!",
            description: "Redirecting to order details...",
            type: "success"
          })

          setTimeout(() => {
            if (result.data?.redirect_url) {
              window.location.href = result.data.redirect_url
            } else {
              router.push('/dashboard/settings/plans-billing')
            }
          }, 1500)
        } else {
          throw new Error(result.message || 'Payment processing failed')
        }
      }
    } catch (error) {
      throw error
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
          <Button onClick={() => router.push('/dashboard/settings/plans-billing')} className="bg-[#3D8BFF] hover:bg-[#2C6FCC]">
            Back to Billing
          </Button>
        </div>
      </div>
    )
  }

  const { price, discount, originalPrice } = calculatePrice()

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/settings/plans-billing')}
            className="mb-4 text-[#6C757D] hover:text-[#1A1A1A]"
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
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">1. Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">2. Billing Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-[#1A1A1A]">
                      Additional Notes
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      placeholder="Any additional information or special requests..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-[#1A1A1A]">3. Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={form.payment_method} onValueChange={(value) => setForm(prev => ({ ...prev, payment_method: value }))}>
                    {paymentGateways.map((gateway) => (
                      <div key={gateway.id} className="space-y-4">
                        <div className="flex items-start space-x-3 p-4 border border-[#E0E6ED] rounded-lg hover:border-[#1A1A1A] transition-colors">
                          <RadioGroupItem value={gateway.id} id={gateway.id} />
                          <div className="flex-1">
                            <Label htmlFor={gateway.id} className="flex items-center cursor-pointer">
                              {gateway.slug === 'bank_transfer' && (
                                <Building2 className="h-5 w-5 text-[#6C757D] mr-3" />
                              )}
                              <div>
                                <div className="font-medium text-[#1A1A1A]">{gateway.name}</div>
                                <div className="text-sm text-[#6C757D]">{gateway.description}</div>
                                {gateway.configuration?.bank_name && form.payment_method === gateway.id && (
                                  <div className="text-sm text-[#1A1A1A] mt-2 p-2 bg-[#F7F9FC] rounded border">
                                    <div className="font-semibold">Bank Details:</div>
                                    <div className="text-xs space-y-1 mt-1">
                                      <div><span className="font-medium">Bank:</span> {gateway.configuration.bank_name}</div>
                                      <div><span className="font-medium">Account Name:</span> {gateway.configuration.account_name}</div>
                                      <div><span className="font-medium">Account Number:</span> {gateway.configuration.account_number}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Label>
                          </div>
                          {gateway.is_default && (
                            <span className="text-xs bg-[#4BB543]/10 text-[#4BB543] px-2 py-1 rounded-full mt-1">
                              Recommended
                            </span>
                          )}
                        </div>

                        {/* Credit Card Form - Inside the payment method selection */}
                        {form.payment_method === gateway.id && (gateway.slug === 'midtrans' || gateway.slug === 'midtrans_recurring') && (
                          <div className="ml-8 mt-4">
                            <MidtransCreditCardForm
                              onSubmit={handleCreditCardSubmit}
                              loading={submitting}
                              disabled={submitting}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

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

            {/* Credit Card Form now moved inside payment method selection above */}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Package Details */}
                <div className="p-4 bg-[#F7F9FC] rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-[#1A1A1A]">{selectedPackage.name} Plan</h3>
                      <p className="text-sm text-[#6C757D] capitalize">{billing_period} billing</p>
                    </div>
                    {discount > 0 && (
                      <span className="bg-[#4BB543] text-white text-xs px-2 py-1 rounded-full">
                        Save {discount}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedPackage.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-[#4BB543] mr-2 flex-shrink-0" />
                        <span className="text-[#6C757D]">{feature}</span>
                      </div>
                    ))}
                    {selectedPackage.features.length > 3 && (
                      <div className="text-xs text-[#6C757D]">
                        +{selectedPackage.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6C757D]">Subtotal:</span>
                    <span className="font-medium text-[#1A1A1A]">
                      {formatCurrency(originalPrice, userCurrency)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#6C757D]">Discount ({discount}%):</span>
                      <span className="font-medium text-[#4BB543]">
                        -{formatCurrency(originalPrice - price, userCurrency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-[#6C757D]">Tax:</span>
                    <span className="font-medium text-[#1A1A1A]">{formatCurrency(0, userCurrency)}</span>
                  </div>

                  <hr className="border-[#E0E6ED]" />

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#1A1A1A]">Total:</span>
                    <span className="text-lg font-bold text-[#1A1A1A]">
                      {formatCurrency(price, userCurrency)}
                    </span>
                  </div>
                </div>





                {/* Security Note */}
                <div className="flex items-center justify-center text-xs text-[#6C757D] mt-4">
                  <Shield className="h-4 w-4 mr-2" />
                  Secure checkout. Your information is protected.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 3DS Authentication Modal */}
      {show3DSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#1A1A1A]">Card Authentication</h3>
              <p className="text-sm text-[#6C757D]">Please complete the authentication process to continue.</p>
            </div>
            <div className="relative">
              <iframe
                src={threeDSUrl}
                className="w-full h-[70vh]"
                frameBorder="0"
                title="3DS Authentication"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}