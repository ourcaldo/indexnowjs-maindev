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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 min-h-screen">
          {/* Left Column - Dark Summary Section */}
          <div className="bg-[#2C2C2E] text-white p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              {/* Summary Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Summary</h1>
                <p className="text-gray-300 text-sm">Order #{orderData.order_id}</p>
              </div>

              {/* Package Content */}
              <div className="mb-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-12 h-12 bg-white bg-opacity-10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#3D8BFF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{orderData.package.name}</h3>
                    
                    {/* Package Features */}
                    <div className="mt-4 space-y-2">
                      {orderData.package.features?.slice(0, 5).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-300">
                          <span className="text-[#4BB543] mr-3">→</span>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black bg-opacity-20 rounded-lg p-3">
                    <div className="flex items-center text-[#F0A202] text-sm">
                      <span className="mr-2">✦</span>
                      Progressive Freeform
                    </div>
                  </div>
                  <div className="bg-black bg-opacity-20 rounded-lg p-3">
                    <div className="flex items-center text-[#F0A202] text-sm">
                      <span className="mr-2">✦</span>
                      Lifestyle
                    </div>
                  </div>
                </div>

                <div className="bg-black bg-opacity-20 rounded-lg p-3 mb-6">
                  <div className="text-[#4BB543] text-sm">
                    <span className="mr-2">→</span>
                    Comfort
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t border-gray-600 pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-white bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-white">Customer</h4>
                </div>
                
                <div className="space-y-2">
                  <p className="text-white font-medium">
                    {orderData.customer_info.first_name} {orderData.customer_info.last_name}
                  </p>
                  <p className="text-gray-300 text-sm">{orderData.customer_info.phone || orderData.customer_info.email}</p>
                  <div className="text-gray-300 text-sm">
                    <p>{orderData.customer_info.address}</p>
                    <p>{orderData.customer_info.city}, {orderData.customer_info.state} {orderData.customer_info.zip_code}</p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {(orderData.payment_details?.va_numbers || orderData.payment_details?.payment_code) && (
                <div className="border-t border-gray-600 pt-6 mt-6">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Details
                  </h4>
                  
                  {/* Virtual Account Numbers */}
                  {orderData.payment_details.va_numbers?.map((va, index) => (
                    <div key={index} className="bg-black bg-opacity-30 rounded-lg p-4 mb-3">
                      <p className="text-gray-300 text-xs uppercase tracking-wide mb-1">
                        {va.bank} Virtual Account
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-lg font-bold tracking-wider">
                          {va.va_number}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(va.va_number, `${va.bank.toUpperCase()} VA Number`)}
                          className="text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Convenience Store Payment Code */}
                  {orderData.payment_details.payment_code && (
                    <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-3">
                      <p className="text-gray-300 text-xs uppercase tracking-wide mb-1">
                        {orderData.payment_details.store} Payment Code
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-lg font-bold tracking-wider">
                          {orderData.payment_details.payment_code}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(orderData.payment_details.payment_code!, 'Payment Code')}
                          className="text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Support */}
              <div className="border-t border-gray-600 pt-6 mt-8">
                <p className="text-gray-300 text-sm mb-4">
                  Do you have problems about your order?
                </p>
                <Button 
                  variant="outline"
                  className="text-[#F0A202] border-[#F0A202] hover:bg-[#F0A202] hover:text-black bg-transparent"
                  onClick={() => window.open('mailto:support@indexnow.studio', '_blank')}
                >
                  CONTACT US →
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Success Message */}
          <div className="bg-white flex items-center justify-center p-8 lg:p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-[#4BB543] rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">
                Order has saved!
              </h2>
              
              <p className="text-[#6C757D] mb-12 leading-relaxed">
                {orderData.payment_status === 'paid' 
                  ? 'Your payment has been confirmed and ready to use.'
                  : 'Click return home to go to back homepage.'
                }
              </p>

              <Button 
                onClick={() => router.push('/dashboard/settings/plans-billing')}
                className="bg-[#F0A202] hover:bg-[#d4891a] text-black font-bold py-4 px-8 rounded-lg text-lg"
              >
                RETURN HOME →
              </Button>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <p>ALL RIGHTS RESERVED © 2023</p>
                  <p>SMARTVISION</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}