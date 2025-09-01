'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { supabaseBrowser } from '@/lib/database'
import {
  Check,
  Copy,
  User,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  midtrans_response?: {
    webhook_data?: {
      va_numbers?: Array<{
        va_number: string
        bank: string
      }>
      payment_code?: string
      store?: string
    }
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
  usePageViewLogger(
    '/dashboard/settings/plans-billing/orders/success',
    'Order Success',
    { section: 'billing_success', order_id }
  )

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const token =
          (await supabaseBrowser.auth.getSession()).data.session
            ?.access_token
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(
          `/api/v1/billing/orders/${order_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch order details')
        }

        const result = await response.json()
        setOrderData(result.data)
      } catch (error) {
        console.error('Error fetching order:', error)
        addToast({
          title: 'Error loading order',
          description:
            'Could not load order details. Please try again.',
          type: 'error'
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
      title: 'Copied!',
      description: `${label} copied to clipboard`,
      type: 'success'
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
            onClick={() =>
              router.push('/dashboard/settings/plans-billing')
            }
            className="mt-4 bg-[#3D8BFF] hover:bg-[#2563eb] text-white"
          >
            Return to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen rounded-2xl overflow-hidden shadow border border-gray-200">
          {/* Left Column - Dark Summary */}
          <div className="bg-[#1D1D1F] text-white p-8 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-xl font-semibold">Summary</h1>
                <p className="text-gray-400 text-sm">
                  Order #{orderData.order_id}
                </p>
              </div>

              {/* Package Information */}
              <div className="mb-8">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{orderData.package.name} - {orderData.billing_period}</h3>
                  <p className="text-gray-400 text-sm">{orderData.package.description}</p>
                </div>
                <div className="space-y-2">
                  {orderData.package.features?.map((feature, i) => (
                    <p
                      key={i}
                      className="flex items-center text-sm text-gray-200"
                    >
                      <span className="mr-2">→</span> {feature}
                    </p>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t border-gray-600 pt-6 mt-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-white bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-white">Customer</h4>
                </div>

                <div className="border border-gray-500 rounded-xl p-4 grid grid-cols-2 gap-4">
                  {/* Left column */}
                  <div>
                    <p className="text-white font-medium">
                      {orderData.customer_info.first_name} {orderData.customer_info.last_name}
                    </p>
                    <p className="text-gray-300 text-sm mt-1">
                      {orderData.customer_info.phone || orderData.customer_info.email}
                    </p>
                  </div>

                  {/* Right column */}
                  <div className="text-gray-300 text-sm">
                    <p>{orderData.customer_info.address}</p>
                    <p>
                      {orderData.customer_info.city}, {orderData.customer_info.state}{' '}
                      {orderData.customer_info.zip_code}
                    </p>
                    <p>{orderData.customer_info.country}</p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {(orderData.payment_details?.va_numbers ||
                orderData.payment_details?.payment_code ||
                orderData.midtrans_response?.webhook_data?.va_numbers ||
                orderData.midtrans_response?.webhook_data?.payment_code) && (
                <div className="mt-8">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Details
                  </h4>

                  {/* Display VA numbers from payment_details or midtrans_response */}
                  {(orderData.payment_details?.va_numbers || orderData.midtrans_response?.webhook_data?.va_numbers)?.map(
                    (va, index) => (
                      <div
                        key={index}
                        className="bg-black bg-opacity-30 rounded-lg p-4 mb-3"
                      >
                        <p className="text-gray-300 text-xs uppercase tracking-wide mb-1">
                          {va.bank.toUpperCase()} Virtual Account
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-white font-mono text-lg font-bold tracking-wider">
                            {va.va_number}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                va.va_number,
                                `${va.bank.toUpperCase()} VA Number`
                              )
                            }
                            className="text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white h-8 w-8 p-0"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Display payment code from payment_details or midtrans_response */}
                  {(orderData.payment_details?.payment_code || orderData.midtrans_response?.webhook_data?.payment_code) && (
                    <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-3">
                      <p className="text-gray-300 text-xs uppercase tracking-wide mb-1">
                        {(orderData.payment_details?.store || orderData.midtrans_response?.webhook_data?.store || 'Payment')} Code
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-white font-mono text-lg font-bold tracking-wider">
                          {orderData.payment_details?.payment_code || orderData.midtrans_response?.webhook_data?.payment_code}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              (orderData.payment_details?.payment_code || orderData.midtrans_response?.webhook_data?.payment_code)!,
                              'Payment Code'
                            )
                          }
                          className="text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="mt-6 border border-gray-500/70 bg-black/20 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <p className="text-gray-400">
                Do you have problems about your order?
              </p>
              <button
                onClick={() =>
                  window.open('mailto:support@indexnow.studio', '_blank')
                }
                className="text-yellow-400 font-medium flex items-center hover:underline"
              >
                CONTACT US →
              </button>
            </div>
          </div>

          {/* Right Column - Success */}
          <div className="bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#00C853] flex items-center justify-center mb-6">
              <Check className="text-white w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Order has saved!
            </h2>
            <p className="text-gray-500 mb-10 text-sm">
              {orderData.payment_status === 'paid'
                ? 'Your payment has been confirmed and ready to use.'
                : 'Click return home to go to back homepage.'}
            </p>
            <Button
              onClick={() =>
                router.push('/dashboard/settings/plans-billing')
              }
              className="bg-[#1C2331] hover:bg-[#0d1b2a] text-white font-bold rounded-lg px-6 py-2"
            >
              RETURN HOME →
            </Button>

            <div className="mt-20 pt-6 border-t border-gray-200 w-full text-xs text-gray-400 flex justify-between">
              <p>ALL RIGHTS RESERVED © 2025</p>
              <p>INDEXNOW STUDIO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
