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
import { ArrowLeft, Building2, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { formatCurrency } from '@/lib/currency-utils'
import MidtransCreditCardForm from '@/components/MidtransCreditCardForm'

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

  // Handle credit card form submission for Midtrans
  const handleCreditCardSubmit = async (cardData: any) => {
    setSubmitting(true)
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('Authentication required')
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const token = session?.access_token
      if (!token) {
        throw new Error('Failed to get authentication token')
      }

      // Wait for Midtrans SDK to be ready with timeout
      let retryCount = 0
      const maxRetries = 20

      while (!window.MidtransNew3ds || typeof window.MidtransNew3ds.getCardToken !== 'function') {
        if (retryCount >= maxRetries) {
          throw new Error('Midtrans payment system is not available. Please refresh the page and try again.')
        }
        await new Promise(resolve => setTimeout(resolve, 300))
        retryCount++
      }

      // Get token from Midtrans with timeout
      const cardToken = await getMidtransCardToken(cardData)

      if (!cardToken) {
        throw new Error('Failed to process card information')
      }

      // Immediately call our backend API with the token
      const response = await fetch('/api/billing/midtrans-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: selectedPackage!.id,
          billing_period,
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
          },
          token_id: cardToken
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Check if 3DS authentication is required
        if (result.requires_3ds && result.redirect_url) {
          handle3DSAuthentication(result.redirect_url, result.transaction_id, result.order_id)
          return // Don't reset submitting state yet - 3DS is in progress
        }

        // Log activity for successful non-3DS payments
        logBillingActivity('payment_processing', `Setup recurring payment for ${selectedPackage!.name} plan (${billing_period}, Order: ${result.order_id || 'unknown'})`)

        addToast({
          title: "Payment successful!",
          description: "Your subscription has been activated successfully.",
          type: "success"
        })

        // Redirect to success page
        setTimeout(() => {
          router.push('/dashboard/settings/plans-billing?success=true')
        }, 1500)
      } else {
        throw new Error(result.message || 'Payment processing failed. Please try again.')
      }

    } catch (error) {
      console.error('💥 FRONTEND: Payment error:', error)
      addToast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        type: "error"
      })
    } finally {
      // Always reset submitting state regardless of success or failure

      setSubmitting(false)
    }
  }

  // Get card token from Midtrans SDK using JSONP callback mechanism
  const getMidtransCardToken = (cardData: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      let isResolved = false

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          reject(new Error('Card tokenization timeout. Please try again.'))
        }
      }, 15000)

      if (!window.MidtransNew3ds) {
        clearTimeout(timeout)
        reject(new Error('Payment system not ready. Please refresh the page.'))
        return
      }

      // Store original callback and override it temporarily
      const originalCallback = (window as any).MidtransNew3ds.callback

      ;(window as any).MidtransNew3ds.callback = function(response: any) {
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)

          // Restore original callback
          ;(window as any).MidtransNew3ds.callback = originalCallback

          if (response && response.status_code === '200' && response.token_id) {
            resolve(response.token_id)
          } else {
            reject(new Error(response?.status_message || 'Card tokenization failed'))
          }
        }
      }

      try {
        if (typeof window.MidtransNew3ds.getCardToken === 'function') {
          window.MidtransNew3ds.getCardToken({
            card_number: cardData.card_number.replace(/\s/g, ''),
            card_exp_month: cardData.expiry_month.padStart(2, '0'),
            card_exp_year: cardData.expiry_year,
            card_cvv: cardData.cvv,
          }, function() {
            // This callback is required by the API but the actual response comes via global callback
          })
        } else {
          throw new Error('getCardToken function not available')
        }

      } catch (error) {
        clearTimeout(timeout)
        if (!isResolved) {
          isResolved = true
          // Restore original callback on error
          ;(window as any).MidtransNew3ds.callback = originalCallback
          reject(new Error('Payment processing failed. Please try again.'))
        }
      }
    })
  }

  // Handle 3DS authentication
  const handle3DSAuthentication = (redirectUrl: string, transactionId: string, orderId: string) => {
    console.log('🔐 Starting 3DS authentication process')

    if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.authenticate !== 'function') {
      throw new Error('3DS authentication not available. Please refresh the page and try again.')
    }

    const options = {
      performAuthentication: (url: string) => {
        // Open 3DS page in modal/iframe
        console.log('🔐 Opening 3DS authentication page')
        setThreeDSUrl(url)
        setShow3DSModal(true)
      },
      onSuccess: async (response: any) => {
        console.log('✅ 3DS Authentication successful:', response)
        setShow3DSModal(false)

        // Call our callback API to complete the payment process
        try {
          const user = await authService.getCurrentUser()
          const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token

          const callbackResponse = await fetch('/api/billing/midtrans-3ds-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              transaction_id: transactionId,
              order_id: orderId
            }),
          })

          const callbackResult = await callbackResponse.json()

          if (callbackResult.success) {
            addToast({
              title: "Payment successful!",
              description: "Your subscription has been activated successfully.",
              type: "success"
            })

            await logBillingActivity('subscription_created', `Subscription created for ${selectedPackage?.name} (${billing_period}) via 3DS authentication - Transaction: ${transactionId}`)

            router.push('/dashboard/settings/plans-billing?success=true')
          } else {
            throw new Error(callbackResult.message || '3DS authentication callback failed')
          }
        } catch (error) {
          console.error('3DS callback error:', error)
          addToast({
            title: "Payment processing failed",
            description: error instanceof Error ? error.message : "Please contact support.",
            type: "error"
          })
        } finally {
          setSubmitting(false)
        }
      },
      onFailure: (response: any) => {
        console.log('❌ 3DS Authentication failed:', response)
        setShow3DSModal(false)
        setSubmitting(false)

        addToast({
          title: "Payment authentication failed",
          description: "Please verify your card details and try again.",
          type: "error"
        })
      },
      onPending: (response: any) => {
        console.log('⏳ 3DS Authentication pending:', response)
        setShow3DSModal(false)
        setSubmitting(false)

        addToast({
          title: "Payment pending",
          description: "Your payment is being processed. You will receive a confirmation email shortly.",
          type: "info"
        })
      }
    }

    // Trigger 3DS authentication
    window.MidtransNew3ds.authenticate(redirectUrl, options)
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
          phone: (user as any).phone_number || ''
        }))

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

        // Fetch package details with authentication
        const packageRes = await fetch('/api/billing/packages', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const packageData = await packageRes.json()
        const selected = packageData.packages?.find((pkg: PaymentPackage) => pkg.id === package_id)

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

        // Set user currency from API response
        if (packageData.user_currency) {
          setUserCurrency(packageData.user_currency)
        }

        // Fetch payment gateways
        const gatewayRes = await fetch('/api/billing/payment-gateways')
        const gatewayData = await gatewayRes.json()

        if (gatewayData.success) {
          const activeGateways = gatewayData.gateways.filter((gw: PaymentGateway) => gw.is_active)
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

  // Load Midtrans SDK with improved error handling and retry mechanism
  useEffect(() => {
    const loadMidtransSDK = async () => {
      // Check if script already exists
      if (document.querySelector('script[src*="midtrans"]')) {
        console.log('✅ Midtrans SDK already loaded')
        return
      }

      try {
        // Get authentication token
        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) {
          console.log('⚠️ No auth token, skipping Midtrans SDK load')
          return
        }

        // Fetch Midtrans configuration from backend
        const response = await fetch('/api/billing/midtrans-config', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          return
        }

        const configData = await response.json()
        if (!configData.success) {
          return
        }

        const { client_key, environment } = configData.data

        // Create script element with improved loading
        const script = document.createElement('script')
        script.src = 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
        script.async = true
        script.setAttribute('data-environment', environment || 'sandbox')
        script.setAttribute('data-client-key', client_key)
        script.setAttribute('id', 'midtrans-script')

        script.onload = () => {
          // Midtrans SDK loaded successfully
        }

        script.onerror = (error) => {
          // Failed to load Midtrans SDK - handled silently
        }

        document.head.appendChild(script)
      } catch (error) {
        // Error loading Midtrans SDK - handled silently
      }
    }

    loadMidtransSDK()
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

      if (selectedGateway?.slug === 'midtrans') {
        // Midtrans requires credit card form, handled separately - don't proceed with regular form submission
        addToast({
          title: "Credit card information required",
          description: "Please fill in your credit card details below to setup recurring payment.",
          type: "info"
        })
        setSubmitting(false)
        return
      } else {
        // Handle other payment methods (bank transfer, etc.)
        await handleRegularCheckout(token)
      }

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

  const handleMidtransRecurringPayment = async (cardToken: string, token: string) => {
    const response = await fetch('/api/billing/midtrans-recurring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        package_id: selectedPackage!.id,
        billing_period,
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
        },
        token_id: cardToken
      }),
    })

    const result = await response.json()

    if (result.success) {
      // Log activity
      logBillingActivity('payment_processing', `Setup recurring payment for ${selectedPackage!.name} plan (${billing_period}, Order: ${result.data?.order_id || 'unknown'})`)

      addToast({
        title: "Payment successful!",
        description: result.data?.redirect_url ? "Redirecting to payment page..." : "Your payment has been processed successfully.",
        type: "success"
      })

      // Redirect to payment page or success page
      setTimeout(() => {
        if (result.data?.redirect_url) {
          window.location.href = result.data.redirect_url
        } else {
          router.push('/dashboard/settings/plans-billing')
        }
      }, 1500)
    } else {
      throw new Error(result.message || 'Payment processing failed. Please try again.')
    }

    setSubmitting(false)
  }

  const handleRegularCheckout = async (token: string) => {
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        package_id: selectedPackage!.id,
        billing_period,
        payment_gateway_id: form.payment_method,
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
      }),
    })

    const result = await response.json()

    if (result.success) {
      addToast({
        title: "Order submitted successfully!",
        description: "Redirecting to order details...",
        type: "success"
      })

      // Redirect to order completed page
      setTimeout(() => {
        router.push(result.data.redirect_url)
      }, 1500)
    } else {
      throw new Error(result.message || 'Checkout failed')
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
                        {form.payment_method === gateway.id && gateway.slug === 'midtrans' && (
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

              {/* Submit Button - Only show for non-Midtrans payments */}
              {form.payment_method && paymentGateways.find(gw => gw.id === form.payment_method)?.slug !== 'midtrans' && (
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



                {/* Submit Button for Midtrans */}
                {form.payment_method && paymentGateways.find(gw => gw.id === form.payment_method)?.slug === 'midtrans' && (
                  <Button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true)
                      try {
                        // Check if window.midtransSubmitCard exists
                        if (!window.midtransSubmitCard) {
                          addToast({
                            title: "Payment system not ready",
                            description: "Please wait a moment and try again.",
                            type: "error"
                          })
                          setSubmitting(false)
                          return
                        }

                        // @ts-ignore - We expose this globally from the credit card form
                        const success = await window.midtransSubmitCard?.()

                        if (!success) {
                          setSubmitting(false)
                        }
                        // Note: If success is true, handleCreditCardSubmit will handle the submitting state
                      } catch (error) {
                        addToast({
                          title: "Payment failed",
                          description: error instanceof Error ? error.message : "Please try again later.",
                          type: "error"
                        })
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting || !form.payment_method}
                    className="w-full bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-medium py-3 h-12 mt-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        Complete Payment
                      </>
                    )}
                  </Button>
                )}

                {/* Submit Button for Bank Transfer (Non-Midtrans Payment Gateways) */}
                {form.payment_method && paymentGateways.find(gw => gw.id === form.payment_method)?.slug !== 'midtrans' && (
                  <Button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true)
                      try {
                        console.log('🏦 FRONTEND: Starting bank transfer payment process...')

                        const user = await authService.getCurrentUser()
                        if (!user) {
                          throw new Error('Authentication required')
                        }

                        const { data: { session } } = await supabaseBrowser.auth.getSession()
                        const token = session?.access_token
                        if (!token) {
                          throw new Error('Failed to get authentication token')
                        }

                        // Call regular checkout API for bank transfer
                        const response = await fetch('/api/billing/checkout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            package_id: selectedPackage!.id,
                            billing_period,
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
                            },
                            payment_gateway_id: form.payment_method
                          }),
                        })

                        const result = await response.json()

                        if (result.success) {
                          // Log activity
                          logBillingActivity('payment_processing', `Setup bank transfer payment for ${selectedPackage!.name} plan (${billing_period}, Order: ${result.data?.order_id || 'unknown'})`)

                          addToast({
                            title: "Payment order created!",
                            description: result.data?.redirect_url ? "Redirecting to payment instructions..." : "Your payment order has been created successfully.",
                            type: "success"
                          })

                          // Redirect to payment instructions or order page
                          setTimeout(() => {
                            if (result.data?.redirect_url) {
                              window.location.href = result.data.redirect_url
                            } else {
                              router.push('/dashboard/settings/plans-billing')
                            }
                          }, 1500)
                        } else {
                          throw new Error(result.message || 'Payment processing failed. Please try again.')
                        }

                      } catch (error) {
                        console.error('💥 FRONTEND: Bank transfer payment error:', error)
                        addToast({
                          title: "Payment failed",
                          description: error instanceof Error ? error.message : "Please try again later.",
                          type: "error"
                        })
                      } finally {
                        // Always reset submitting state regardless of success or failure
                        console.log('🔄 FRONTEND: Resetting submitting state (bank transfer)')
                        setSubmitting(false)
                      }
                    }}
                    disabled={submitting || !form.payment_method}
                    className="w-full bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-medium py-3 h-12 mt-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        Complete Order
                      </>
                    )}
                  </Button>
                )}

                {/* Security Note */}
                <div className="text-center">
                  <p className="text-xs text-[#6C757D]">
                    🔒 Secure checkout. Your information is protected.
                  </p>
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