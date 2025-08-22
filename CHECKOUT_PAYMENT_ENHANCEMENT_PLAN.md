# IndexNow Studio - Checkout & Payment Enhancement Plan

## 🎯 Overview

This document outlines the complete refactoring plan for the checkout page and payment API architecture to solve current issues with hardcoded payment logic, inconsistent API patterns, and missing billing period selection.

## 🚨 Current Issues Analysis

### Checkout Page Issues (`app/dashboard/settings/plans-billing/checkout/page.tsx`)

1. **❌ No Billing Period Selection UI**
   - Period hardcoded from URL parameter: `useState(searchParams?.get('period') || 'monthly')`
   - Users cannot change billing period during checkout
   - UI shows static "monthly billing" text

2. **❌ Massive Hardcoded Payment Functions (600+ lines)**
   - `handleCreditCardSubmit()` - 97 lines of Midtrans logic
   - `getMidtransCardToken()` - 61 lines of SDK interaction
   - `handle3DSAuthentication()` - 87 lines of 3DS handling
   - `handleMidtransRecurringPayment()` - 51 lines of API calls
   - `handleUnifiedPayment()` - 146 lines of mixed payment logic
   - Multiple SDK loading useEffect hooks

3. **❌ Mixed Payment Routing Logic**
   - Frontend decides which API endpoint to call
   - Inconsistent patterns: some direct API calls, some through unified endpoint
   - Payment method detection scattered throughout component

### API Architecture Issues

1. **❌ 13 Inconsistent API Endpoints**
   ```
   /api/billing/payment               (tries to be unified but has embedded logic)
   /api/billing/midtrans-snap         (separate handler)
   /api/billing/midtrans-recurring    (separate handler)
   /api/billing/midtrans-3ds-callback (callback handler)
   /api/billing/checkout              (appears unused)
   ```

2. **❌ Embedded Payment Logic**
   - `/api/billing/payment` contains 300+ lines of Midtrans Snap implementation
   - No separation between routing and payment processing
   - Duplicated logic across multiple files

3. **❌ Inconsistent Flow Patterns**
   - Frontend → `/api/billing/midtrans-recurring` (direct)
   - Frontend → `/api/billing/payment` → embedded handler (mixed)
   - No standardized request/response format

---

## 📋 ENHANCEMENT PLAN

### **P0 (CRITICAL) - Payment API Architecture Refactor**

**Goal:** Clean separation with Frontend → Initial API → Specific Payment Channel APIs

#### Step 1: Create New Directory Structure
```
app/api/billing/
├── payment/
│   └── route.ts                    (pure router - no payment logic)
├── channels/
│   ├── midtrans-snap/
│   │   └── route.ts               (move logic from payment/route.ts)
│   ├── midtrans-recurring/
│   │   └── route.ts               (existing logic)
│   ├── bank-transfer/
│   │   └── route.ts               (new implementation)
│   └── shared/
│       ├── base-handler.ts        (shared utilities)
│       ├── transaction-creator.ts  (common transaction logic)
│       └── types.ts               (shared types)
└── webhook/
    └── route.ts                   (unified webhook - existing)
```

#### Step 2: Implement Base Payment Handler
**File:** `app/api/billing/channels/shared/base-handler.ts`

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export interface PaymentData {
  package_id: string
  billing_period: string
  customer_info: CustomerInfo
  user: any
}

export interface PaymentResult {
  success: boolean
  data?: any
  message?: string
  requires_redirect?: boolean
  redirect_url?: string
}

export abstract class BasePaymentHandler {
  protected packageData: any
  protected userData: any

  constructor(protected paymentData: PaymentData) {}

  // Common validation logic
  async validatePackage(): Promise<void> {
    const { data: packageData, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', this.paymentData.package_id)
      .eq('is_active', true)
      .single()

    if (error || !packageData) {
      throw new Error('Package not found or inactive')
    }

    this.packageData = packageData
  }

  // Common transaction creation BEFORE payment processing
  async createPendingTransaction(orderId: string, gatewayId: string, additionalData: any = {}): Promise<string> {
    const amount = this.calculateAmount()

    const { error: dbError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: this.paymentData.user.id,
        package_id: this.paymentData.package_id,
        gateway_id: gatewayId,
        transaction_type: 'payment',
        transaction_status: 'pending',
        amount: amount.finalAmount,
        currency: amount.currency,
        payment_method: this.getPaymentMethodSlug(),
        payment_reference: orderId,
        billing_period: this.paymentData.billing_period,
        metadata: {
          original_amount: amount.originalAmount,
          original_currency: amount.originalCurrency,
          customer_info: this.paymentData.customer_info,
          ...additionalData
        }
      })

    if (dbError) {
      throw new Error('Failed to create transaction record')
    }

    return orderId
  }

  // Common amount calculation
  calculateAmount(): { originalAmount: number; finalAmount: number; currency: string; originalCurrency: string } {
    const { getUserCurrency } = require('@/lib/currency-utils')
    const userCurrency = getUserCurrency(this.paymentData.customer_info.country)

    let amount = 0
    const { billing_period } = this.paymentData

    // New pricing structure
    if (this.packageData.pricing_tiers?.[billing_period]?.[userCurrency]) {
      const currencyTier = this.packageData.pricing_tiers[billing_period][userCurrency]
      amount = currencyTier.promo_price || currencyTier.regular_price
    } else {
      amount = this.packageData.price || 0
    }

    if (amount === 0) {
      throw new Error('Unable to calculate package amount - no pricing found')
    }

    return {
      originalAmount: amount,
      originalCurrency: userCurrency,
      finalAmount: amount,
      currency: userCurrency
    }
  }

  // Abstract methods each payment channel must implement
  abstract getPaymentMethodSlug(): string
  abstract processPayment(): Promise<PaymentResult>

  // Main execution flow
  async execute(): Promise<NextResponse> {
    try {
      await this.validatePackage()
      const result = await this.processPayment()

      return NextResponse.json({
        success: result.success,
        data: result.data,
        message: result.message,
        requires_redirect: result.requires_redirect,
        redirect_url: result.redirect_url
      })

    } catch (error: any) {
      console.error(`[${this.getPaymentMethodSlug()}] Error:`, error)
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || 'Payment processing failed'
        },
        { status: 500 }
      )
    }
  }
}
```

#### Step 3: Refactor Payment Router
**File:** `app/api/billing/payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Payment Router] Starting payment processing')
    
    // Authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { payment_method, package_id, billing_period, customer_info } = body

    console.log(`📊 [Payment Router] Routing to channel: ${payment_method}`)

    // Route to specific payment channel API
    const channelRoutes = {
      'midtrans_snap': '/api/billing/channels/midtrans-snap',
      'midtrans_recurring': '/api/billing/channels/midtrans-recurring', 
      'bank_transfer': '/api/billing/channels/bank-transfer'
    }

    const channelUrl = channelRoutes[payment_method as keyof typeof channelRoutes]
    
    if (!channelUrl) {
      return NextResponse.json({
        success: false,
        message: `Unsupported payment method: ${payment_method}`
      }, { status: 400 })
    }

    // Forward to specific payment channel
    const channelRequest = new Request(`${request.nextUrl.origin}${channelUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') || '',
      },
      body: JSON.stringify({
        package_id,
        billing_period,
        customer_info,
        user_data: {
          full_name: `${customer_info.first_name} ${customer_info.last_name}`.trim(),
          email: customer_info.email,
          phone_number: customer_info.phone,
          country: customer_info.country
        }
      })
    })

    const channelResponse = await fetch(channelRequest)
    const channelResult = await channelResponse.json()

    return NextResponse.json(channelResult, { status: channelResponse.status })

  } catch (error: any) {
    console.error('💥 [Payment Router] Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment routing failed' 
    }, { status: 500 })
  }
}
```

#### Step 4: Implement Midtrans Snap Channel
**File:** `app/api/billing/channels/midtrans-snap/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/supabase'

const midtransClient = require('midtrans-client')

class MidtransSnapHandler extends BasePaymentHandler {
  private gateway: any
  private snapClient: any

  getPaymentMethodSlug(): string {
    return 'midtrans_snap'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount and convert to IDR if needed
    const amount = this.calculateAmount()
    let finalAmount = amount.finalAmount
    
    if (amount.originalCurrency === 'USD') {
      const { convertUsdToIdr } = await import('@/lib/currency-converter')
      finalAmount = await convertUsdToIdr(amount.finalAmount)
    }

    // Generate order ID
    const orderId = `SNAP-${Date.now()}-${this.paymentData.user.id.slice(0, 8)}`

    // Create transaction record BEFORE Midtrans API call
    await this.createPendingTransaction(orderId, this.gateway.id, {
      payment_gateway_type: 'midtrans_snap',
      converted_amount: finalAmount,
      converted_currency: 'IDR'
    })

    // Create Snap transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount
      },
      credit_card: {
        secure: true
      },
      item_details: [{
        id: this.packageData.id,
        price: finalAmount,
        quantity: 1,
        name: `${this.packageData.name} - ${this.paymentData.billing_period}`,
        category: "subscription"
      }],
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone || ''
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=success`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=error`
      }
    }

    const transaction = await this.snapClient.createTransaction(parameter)

    // Update transaction with Midtrans response
    await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        gateway_transaction_id: transaction.token,
        gateway_response: {
          token: transaction.token,
          redirect_url: transaction.redirect_url,
          snap_parameter: parameter
        }
      })
      .eq('payment_reference', orderId)

    return {
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        client_key: this.gateway.api_credentials.client_key,
        environment: this.gateway.configuration.environment,
        order_id: orderId
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (error || !gateway) {
      throw new Error('Midtrans Snap gateway not configured')
    }

    this.gateway = gateway
    this.snapClient = new midtransClient.Snap({
      isProduction: gateway.configuration.environment === 'production',
      serverKey: gateway.api_credentials.server_key,
      clientKey: gateway.api_credentials.client_key
    })
  }
}

export async function POST(request: NextRequest) {
  // Authentication
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ 
      success: false, 
      message: 'Authentication required' 
    }, { status: 401 })
  }

  const body = await request.json()
  const paymentData: PaymentData = {
    package_id: body.package_id,
    billing_period: body.billing_period,
    customer_info: body.customer_info,
    user
  }

  const handler = new MidtransSnapHandler(paymentData)
  return await handler.execute()
}
```

#### Step 5: Remove Deprecated Endpoints
```bash
# Delete these files:
rm app/api/billing/midtrans-snap/route.ts
rm app/api/billing/checkout/route.ts

# Keep these for now (move to channels later):
# app/api/billing/midtrans-recurring/route.ts -> app/api/billing/channels/midtrans-recurring/route.ts
# app/api/billing/midtrans-3ds-callback/route.ts (keep for 3DS handling)
```

---

### **P1 (HIGH) - Checkout Page Refactor**

**Goal:** Remove all hardcoded payment logic from UI component

#### Step 1: Create Payment Services
**File:** `lib/payment-services/payment-router.ts`

```typescript
interface PaymentRequest {
  package_id: string
  billing_period: string
  payment_method: string
  customer_info: CustomerInfo
}

interface PaymentResponse {
  success: boolean
  data?: any
  message?: string
  requires_redirect?: boolean
  redirect_url?: string
}

export class PaymentRouter {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await fetch('/api/billing/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Payment API error: ${response.status}`)
    }

    return await response.json()
  }
}
```

**File:** `lib/payment-services/midtrans-service.ts`

```typescript
export class MidtransService {
  static async loadSnapSDK(clientKey: string, environment: string): Promise<void> {
    // Remove from checkout page, load only when needed
    return new Promise((resolve, reject) => {
      if (document.querySelector('#snap-script')) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = environment === 'production' 
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('id', 'snap-script')
      
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Midtrans SDK'))
      
      document.head.appendChild(script)
    })
  }

  static async showSnapPayment(token: string, callbacks: SnapCallbacks): Promise<void> {
    if (!window.snap || typeof window.snap.pay !== 'function') {
      throw new Error('Midtrans SDK not loaded')
    }

    window.snap.pay(token, callbacks)
  }
}

interface SnapCallbacks {
  onSuccess?: (result: any) => void
  onPending?: (result: any) => void
  onError?: (result: any) => void
  onClose?: () => void
}
```

#### Step 2: Create Payment Hook
**File:** `hooks/usePaymentProcessor.ts`

```typescript
import { useState } from 'react'
import { PaymentRouter } from '@/lib/payment-services/payment-router'
import { MidtransService } from '@/lib/payment-services/midtrans-service'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface UsePaymentProcessorProps {
  packageData: any
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function usePaymentProcessor({ packageData, onSuccess, onError }: UsePaymentProcessorProps) {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  const processPayment = async (paymentData: any, token: string) => {
    setLoading(true)
    
    try {
      const paymentRouter = new PaymentRouter(token)
      const result = await paymentRouter.processPayment(paymentData)

      if (result.success) {
        await handlePaymentSuccess(result, paymentData.payment_method)
        onSuccess?.()
      } else {
        throw new Error(result.message || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      onError?.(error as Error)
      addToast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (result: any, paymentMethod: string) => {
    if (paymentMethod === 'midtrans_snap') {
      // Handle Snap popup
      const { token, client_key, environment } = result.data
      
      await MidtransService.loadSnapSDK(client_key, environment)
      
      await MidtransService.showSnapPayment(token, {
        onSuccess: (snapResult) => {
          addToast({
            title: "Payment successful!",
            description: "Your subscription has been activated.",
            type: "success"
          })
          router.push('/dashboard/settings/plans-billing?payment=success')
        },
        onPending: () => {
          addToast({
            title: "Payment pending",
            description: "Your payment is being processed.",
            type: "info"
          })
          router.push('/dashboard/settings/plans-billing?payment=pending')
        },
        onError: () => {
          addToast({
            title: "Payment failed",
            description: "There was an error processing your payment.",
            type: "error"
          })
        },
        onClose: () => {
          addToast({
            title: "Payment cancelled",
            description: "You cancelled the payment process.",
            type: "info"
          })
        }
      })
    } else {
      // Handle redirect payments
      if (result.redirect_url) {
        window.location.href = result.redirect_url
      } else {
        router.push('/dashboard/settings/plans-billing')
      }
    }
  }

  return { processPayment, loading }
}
```

#### Step 3: Refactor Checkout Page
**File:** `app/dashboard/settings/plans-billing/checkout/page.tsx` (Simplified)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// ... other imports
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor'
import BillingPeriodSelector from '@/components/checkout/BillingPeriodSelector'
import PaymentMethodSelector from '@/components/checkout/PaymentMethodSelector'
import { authService } from '@/lib/auth'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [packageId] = useState(searchParams?.get('package'))
  const [billingPeriod, setBillingPeriod] = useState(searchParams?.get('period') || 'monthly')
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')

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

  const { processPayment, loading: paymentLoading } = usePaymentProcessor({
    packageData: selectedPackage,
    onSuccess: () => {
      // Handle success in hook
    },
    onError: (error) => {
      // Handle error in hook
    }
  })

  // Load data (simplified)
  useEffect(() => {
    const fetchData = async () => {
      // Existing data loading logic (simplified)
      // Remove all Midtrans SDK loading logic
    }
    
    if (packageId) {
      fetchData()
    }
  }, [packageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPackage || !form.payment_method) {
      // Show validation error
      return
    }

    const token = (await authService.getSession())?.access_token
    if (!token) {
      router.push('/login')
      return
    }

    const selectedGateway = paymentGateways.find(gw => gw.id === form.payment_method)
    
    await processPayment({
      package_id: selectedPackage.id,
      billing_period: billingPeriod,
      payment_method: selectedGateway?.slug,
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
    }, token)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Personal Information */}
              <PersonalInfoCard form={form} setForm={setForm} />
              
              {/* Billing Address */}
              <BillingAddressCard form={form} setForm={setForm} />
              
              {/* NEW: Billing Period Selection */}
              <BillingPeriodSelector 
                selectedPackage={selectedPackage}
                billingPeriod={billingPeriod}
                setBillingPeriod={setBillingPeriod}
                userCurrency={userCurrency}
              />
              
              {/* Payment Methods */}
              <PaymentMethodSelector
                paymentGateways={paymentGateways}
                selectedMethod={form.payment_method}
                onMethodChange={(method) => setForm(prev => ({ ...prev, payment_method: method }))}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={paymentLoading || !form.payment_method}
                className="w-full bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-medium py-3 h-12"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Complete Order</>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <OrderSummary 
            selectedPackage={selectedPackage}
            billingPeriod={billingPeriod}
            userCurrency={userCurrency}
          />
        </div>
      </div>
    </div>
  )
}

// Remove all hardcoded payment functions:
// - handleCreditCardSubmit
// - getMidtransCardToken  
// - handle3DSAuthentication
// - handleMidtransRecurringPayment
// - handleUnifiedPayment
// - All SDK loading useEffects
```

---

### **P2 (HIGH) - Billing Period Selection UI**

#### Step 1: Create Billing Period Selector Component
**File:** `components/checkout/BillingPeriodSelector.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/currency-utils'

interface BillingPeriodSelectorProps {
  selectedPackage: any
  billingPeriod: string
  setBillingPeriod: (period: string) => void
  userCurrency: 'USD' | 'IDR'
}

export default function BillingPeriodSelector({ 
  selectedPackage, 
  billingPeriod, 
  setBillingPeriod,
  userCurrency 
}: BillingPeriodSelectorProps) {
  
  if (!selectedPackage?.pricing_tiers) {
    return null
  }

  const availablePeriods = Object.keys(selectedPackage.pricing_tiers)
  
  const getPeriodPrice = (period: string) => {
    const periodTier = selectedPackage.pricing_tiers[period]
    if (periodTier?.[userCurrency]) {
      const currencyTier = periodTier[userCurrency]
      return {
        price: currencyTier.promo_price || currencyTier.regular_price,
        originalPrice: currencyTier.regular_price,
        hasDiscount: !!currencyTier.promo_price,
        label: currencyTier.period_label || period
      }
    }
    return null
  }

  const calculateSavings = (period: string, currentPrice: number) => {
    if (period === 'monthly') return null
    
    const monthlyPrice = getPeriodPrice('monthly')?.price || 0
    const monthsInPeriod = {
      'quarterly': 3,
      'biannual': 6,
      'annual': 12
    }[period] || 1

    const monthlyTotal = monthlyPrice * monthsInPeriod
    const savings = monthlyTotal - currentPrice
    const percentage = Math.round((savings / monthlyTotal) * 100)

    return { savings, percentage }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Billing Period</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={billingPeriod} onValueChange={setBillingPeriod}>
          <div className="space-y-3">
            {availablePeriods.map((period) => {
              const priceData = getPeriodPrice(period)
              if (!priceData) return null

              const savings = calculateSavings(period, priceData.price)

              return (
                <div 
                  key={period} 
                  className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors cursor-pointer ${
                    billingPeriod === period 
                      ? 'border-[#3D8BFF] bg-[#3D8BFF]/5' 
                      : 'border-[#E0E6ED] hover:border-[#1A1A1A]'
                  }`}
                >
                  <RadioGroupItem value={period} id={period} />
                  <div className="flex-1">
                    <Label htmlFor={period} className="cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-[#1A1A1A] capitalize">
                            {priceData.label}
                          </div>
                          {savings && (
                            <div className="text-sm text-[#4BB543] font-medium">
                              Save {savings.percentage}% (${formatCurrency(savings.savings, userCurrency)})
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#1A1A1A]">
                            {formatCurrency(priceData.price, userCurrency)}
                          </div>
                          {priceData.hasDiscount && (
                            <div className="text-sm text-[#6C757D] line-through">
                              {formatCurrency(priceData.originalPrice, userCurrency)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                  {savings && savings.percentage > 0 && (
                    <span className="bg-[#4BB543] text-white text-xs px-2 py-1 rounded-full">
                      Save {savings.percentage}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
```

#### Step 2: Update Order Summary Component
**File:** `components/checkout/OrderSummary.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/currency-utils'

interface OrderSummaryProps {
  selectedPackage: any
  billingPeriod: string
  userCurrency: 'USD' | 'IDR'
}

export default function OrderSummary({ selectedPackage, billingPeriod, userCurrency }: OrderSummaryProps) {
  if (!selectedPackage) return null

  const calculatePrice = () => {
    if (selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]) {
      const currencyTier = selectedPackage.pricing_tiers[billingPeriod][userCurrency]
      const price = currencyTier.promo_price || currencyTier.regular_price
      const originalPrice = currencyTier.regular_price
      const discount = currencyTier.promo_price ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) : 0

      return { price, discount, originalPrice }
    }

    return { price: selectedPackage.price, discount: 0, originalPrice: selectedPackage.price }
  }

  const { price, discount, originalPrice } = calculatePrice()

  return (
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
              <p className="text-sm text-[#6C757D] capitalize">
                {selectedPackage.pricing_tiers?.[billingPeriod]?.[userCurrency]?.period_label || billingPeriod} billing
              </p>
            </div>
            {discount > 0 && (
              <span className="bg-[#4BB543] text-white text-xs px-2 py-1 rounded-full">
                Save {discount}%
              </span>
            )}
          </div>
          <div className="space-y-2">
            {selectedPackage.features?.slice(0, 3).map((feature: string, index: number) => (
              <div key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-[#4BB543] mr-2 flex-shrink-0" />
                <span className="text-[#6C757D]">{feature}</span>
              </div>
            ))}
            {selectedPackage.features?.length > 3 && (
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
  )
}
```

---

### **P3 (MEDIUM) - Payment Method Component Separation**

#### Create Payment Method Components
**File:** `components/checkout/payment-methods/PaymentMethodSelector.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import MidtransRecurringPayment from './MidtransRecurringPayment'
import BankTransferPayment from './BankTransferPayment'

interface PaymentMethodSelectorProps {
  paymentGateways: any[]
  selectedMethod: string
  onMethodChange: (method: string) => void
}

export default function PaymentMethodSelector({ 
  paymentGateways, 
  selectedMethod, 
  onMethodChange 
}: PaymentMethodSelectorProps) {
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#1A1A1A]">3. Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedMethod} onValueChange={onMethodChange}>
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
                    </div>
                  </Label>
                </div>
                {gateway.is_default && (
                  <span className="text-xs bg-[#4BB543]/10 text-[#4BB543] px-2 py-1 rounded-full mt-1">
                    Recommended
                  </span>
                )}
              </div>

              {/* Payment Method Specific Components */}
              {selectedMethod === gateway.id && (
                <>
                  {gateway.slug === 'midtrans' && (
                    <MidtransRecurringPayment />
                  )}
                  {gateway.slug === 'bank_transfer' && (
                    <BankTransferPayment gateway={gateway} />
                  )}
                </>
              )}
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
```

**File:** `components/checkout/payment-methods/BankTransferPayment.tsx`

```typescript
'use client'

interface BankTransferPaymentProps {
  gateway: any
}

export default function BankTransferPayment({ gateway }: BankTransferPaymentProps) {
  if (!gateway.configuration?.bank_name) return null

  return (
    <div className="ml-8 mt-4">
      <div className="text-sm text-[#1A1A1A] mt-2 p-4 bg-[#F7F9FC] rounded border">
        <div className="font-semibold mb-2">Bank Transfer Details:</div>
        <div className="text-xs space-y-1">
          <div><span className="font-medium">Bank:</span> {gateway.configuration.bank_name}</div>
          <div><span className="font-medium">Account Name:</span> {gateway.configuration.account_name}</div>
          <div><span className="font-medium">Account Number:</span> {gateway.configuration.account_number}</div>
        </div>
        <div className="text-xs text-[#6C757D] mt-2">
          Please transfer the exact amount and upload your payment proof after checkout.
        </div>
      </div>
    </div>
  )
}
```

---

### **P4 (LOW) - Enhanced Security & Error Handling**

#### Step 1: Enhanced Validation Middleware
**File:** `app/api/billing/channels/shared/validation.ts`

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'

const paymentSchema = z.object({
  package_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'quarterly', 'biannual', 'annual']),
  customer_info: z.object({
    first_name: z.string().min(1).max(50),
    last_name: z.string().min(1).max(50),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip_code: z.string().min(1),
    country: z.string().min(1),
    description: z.string().optional()
  })
})

export async function validatePaymentRequest(request: NextRequest) {
  const body = await request.json()
  return paymentSchema.parse(body)
}

// Rate limiting per payment method
const rateLimits = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(userKey: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const userLimit = rateLimits.get(userKey)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userKey, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= maxAttempts) {
    return false
  }

  userLimit.count++
  return true
}
```

#### Step 2: Payment Error Boundary
**File:** `components/checkout/PaymentErrorBoundary.tsx`

```typescript
'use client'

import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Payment Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="border-[#E63946]">
          <CardHeader>
            <CardTitle className="text-[#E63946] flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Payment System Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#6C757D] mb-4">
              We encountered an error while processing your payment. Please try again or contact support.
            </p>
            <Button 
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
              className="mr-2"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-[#1C2331] hover:bg-[#0d1b2a]"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
```

---

## 🚀 IMPLEMENTATION TIMELINE

### Phase 1 (P0) - Week 1-2
1. Create base payment handler class
2. Refactor payment router API
3. Implement Midtrans Snap channel
4. Test unified payment flow

### Phase 2 (P1) - Week 2-3
1. Create payment services
2. Implement payment hook
3. Refactor checkout page (remove hardcoded logic)
4. Test simplified checkout flow

### Phase 3 (P2) - Week 3
1. Create billing period selector component
2. Update order summary with dynamic pricing
3. Test period selection functionality

### Phase 4 (P3) - Week 4
1. Create payment method components
2. Implement conditional rendering
3. Test isolated payment methods

### Phase 5 (P4) - Week 4-5
1. Implement enhanced validation
2. Add error boundaries
3. Enhanced logging and monitoring
4. Final testing and optimization

---

## ✅ SUCCESS CRITERIA

### Technical Goals
- [ ] Clean API architecture: Frontend → Router → Channel APIs
- [ ] No hardcoded payment logic in UI components
- [ ] Consistent request/response patterns
- [ ] Isolated payment method components
- [ ] Enhanced error handling and validation

### User Experience Goals
- [ ] Billing period selection during checkout
- [ ] Faster page load times
- [ ] Consistent UI patterns across payment methods
- [ ] Better error messages and recovery

### Maintainability Goals
- [ ] Easy to add new payment channels
- [ ] Clear separation of concerns
- [ ] Reusable payment services
- [ ] Comprehensive test coverage

This plan provides a complete roadmap for transforming the current mixed architecture into a clean, scalable payment system with proper separation of concerns.