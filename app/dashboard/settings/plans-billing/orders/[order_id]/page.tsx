'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { supabaseBrowser } from '@/lib/database'
import { CheckCircle, Copy, ArrowLeft, Building2, CreditCard, Calendar, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrderData {
  order_id: string
  transaction_id: string
  status: string
  payment_status: string
  amount: number
  currency: string
  payment_method: string
  billing_period: string
  created_at: string
  package: {
    id: string
    name: string
    description: string
    features: string[]
    quota_limits: any
  }
  customer_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip_code: string
    country: string
  }
  payment_details: {
    va_numbers?: Array<{
      va_number: string
      bank: string
    }>
    payment_code?: string
    store?: string
    payment_method?: string
    expires_at?: string
  }
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  const order_id = params.order_id as string

  // Activity logging
  usePageViewLogger('/dashboard/settings/plans-billing/orders/success', 'Order Success', { 
    section: 'billing_success',
    order_id 
  })

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/v1/billing/orders/${order_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch order details')
        }

        const result = await response.json()
        setOrderData(result.data)
      } catch (error) {
        console.error('Error fetching order:', error)
        addToast({
          title: "Error loading order",
          description: "Could not load order details. Please try again.",
          type: "error"
        })
        router.push('/dashboard/settings/plans-billing')
      } finally {
        setLoading(false)
      }
    }

    if (order_id) {
      fetchOrderData()
    }
  }, [order_id, router, addToast])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    addToast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
      type: "success"
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D8BFF] mx-auto mb-4"></div>
          <p className="text-[#6C757D]">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6C757D]">Order not found</p>
          <Button 
            onClick={() => router.push('/dashboard/settings/plans-billing')}
            className="mt-4 bg-[#3D8BFF] hover:bg-[#2563eb] text-white"
          >
            Return to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/settings/plans-billing')}
            className="mb-4 text-[#6C757D] hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans & Billing
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card className="bg-[#1A1A1A] text-white border-[#E0E6ED]">
              <CardHeader>
                <CardTitle className="text-white">Summary</CardTitle>
                <p className="text-gray-300 text-sm">Order #{orderData.order_id}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Content */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-white bg-opacity-10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#3D8BFF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{orderData.package.name}</h3>
                    <p className="text-gray-300 text-sm mt-1">{orderData.package.description}</p>
                    <div className="mt-3 space-y-1">
                      {orderData.package.features?.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-300">
                          <span className="text-[#4BB543] mr-2">→</span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(orderData.amount, orderData.currency)}
                    </div>
                    <div className="text-sm text-gray-300 capitalize">
                      {orderData.billing_period}
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="border-t border-gray-600 pt-6">
                  <div className="flex items-center mb-4">
                    <User className="w-5 h-5 text-gray-300 mr-2" />
                    <h4 className="font-semibold text-white">Customer</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-white font-medium">
                        {orderData.customer_info.first_name} {orderData.customer_info.last_name}
                      </p>
                      <p className="text-gray-300 text-sm">{orderData.customer_info.email}</p>
                      {orderData.customer_info.phone && (
                        <p className="text-gray-300 text-sm">{orderData.customer_info.phone}</p>
                      )}
                    </div>
                    <div className="text-gray-300 text-sm">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mt-0.5 mr-1 flex-shrink-0" />
                        <div>
                          <p>{orderData.customer_info.address}</p>
                          <p>{orderData.customer_info.city}, {orderData.customer_info.state}</p>
                          <p>{orderData.customer_info.zip_code}, {orderData.customer_info.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            {(orderData.payment_details?.va_numbers || orderData.payment_details?.payment_code) && (
              <Card className="border-[#E0E6ED] bg-[#FFFFFF]">
                <CardHeader>
                  <CardTitle className="text-[#1A1A1A] flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Details
                  </CardTitle>
                  <p className="text-[#6C757D] text-sm">
                    Complete your payment using the information below
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Virtual Account Numbers */}
                  {orderData.payment_details.va_numbers?.map((va, index) => (
                    <div key={index} className="p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#1A1A1A] uppercase">
                            {va.bank} Virtual Account
                          </p>
                          <p className="text-2xl font-mono font-bold text-[#1A1A1A] mt-2 tracking-wider">
                            {va.va_number}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(va.va_number, `${va.bank.toUpperCase()} VA Number`)}
                          className="border-[#3D8BFF] text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Convenience Store Payment Code */}
                  {orderData.payment_details.payment_code && (
                    <div className="p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#1A1A1A] uppercase">
                            {orderData.payment_details.store} Payment Code
                          </p>
                          <p className="text-2xl font-mono font-bold text-[#1A1A1A] mt-2 tracking-wider">
                            {orderData.payment_details.payment_code}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(orderData.payment_details.payment_code!, 'Payment Code')}
                          className="border-[#3D8BFF] text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment Expiry */}
                  {orderData.payment_details.expires_at && (
                    <div className="flex items-center text-sm text-[#6C757D]">
                      <Calendar className="w-4 h-4 mr-2" />
                      Payment expires: {formatDate(orderData.payment_details.expires_at)}
                    </div>
                  )}

                  <div className="text-sm text-[#6C757D] bg-[#F0A202]/10 p-3 rounded-lg border border-[#F0A202]/20">
                    <p className="font-medium text-[#F0A202]">Important:</p>
                    <p>Please complete your payment before the expiry time. Payment details have also been sent to your email.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Information */}
            <Card className="border-[#E0E6ED] bg-[#FFFFFF]">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A]">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6C757D]">Order ID</p>
                    <p className="font-mono text-[#1A1A1A]">{orderData.order_id}</p>
                  </div>
                  <div>
                    <p className="text-[#6C757D]">Payment Method</p>
                    <p className="text-[#1A1A1A] capitalize">{orderData.payment_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[#6C757D]">Order Date</p>
                    <p className="text-[#1A1A1A]">{formatDate(orderData.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[#6C757D]">Status</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      orderData.payment_status === 'paid' 
                        ? 'bg-[#4BB543]/10 text-[#4BB543]' 
                        : 'bg-[#F0A202]/10 text-[#F0A202]'
                    }`}>
                      {orderData.payment_status === 'paid' ? 'Completed' : 'Pending Payment'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Success Message */}
          <div className="lg:col-span-1">
            <Card className="border-[#E0E6ED] bg-[#FFFFFF] text-center sticky top-8">
              <CardContent className="py-12">
                <div className="w-20 h-20 bg-[#4BB543] rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                  Order has been placed!
                </h2>
                
                <p className="text-[#6C757D] mb-8">
                  {orderData.payment_status === 'paid' 
                    ? 'Your payment has been confirmed and your package is now active.'
                    : 'Complete your payment to activate your package. Payment instructions have been sent to your email.'
                  }
                </p>

                <Button 
                  onClick={() => router.push('/dashboard/settings/plans-billing')}
                  className="w-full bg-[#F0A202] hover:bg-[#d4891a] text-white font-medium py-3"
                >
                  RETURN TO PLANS & BILLING
                </Button>

                <div className="mt-8 pt-6 border-t border-[#E0E6ED]">
                  <p className="text-sm text-[#6C757D] mb-3">
                    Do you have problems about your order?
                  </p>
                  <Button 
                    variant="outline"
                    className="text-[#3D8BFF] border-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white"
                    onClick={() => window.open('mailto:support@indexnow.studio', '_blank')}
                  >
                    CONTACT US
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}