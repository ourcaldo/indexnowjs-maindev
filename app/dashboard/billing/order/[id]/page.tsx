'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, CheckCircle, Clock, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useToast } from '@/hooks/use-toast'

interface Transaction {
  id: string
  user_id: string
  package_id: string
  gateway_id: string
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  payment_reference: string
  payment_proof_url: string | null
  created_at: string
  metadata: any
  package: {
    id: string
    name: string
    description: string
    features: string[]
  }
  gateway: {
    id: string
    name: string
    configuration: {
      bank_name?: string
      account_name?: string
      account_number?: string
    }
  }
  customer_info: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
  }
}

export default function OrderCompletedPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)

  useEffect(() => {
    fetchTransactionDetails()
  }, [params.id])

  const fetchTransactionDetails = async () => {
    try {
      const supabase = supabaseBrowser
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/billing/transactions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details')
      }

      const data = await response.json()
      setTransaction(data.transaction)
    } catch (error) {
      console.error('Error fetching transaction:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load order details'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(file.type)) {
        addToast({
          type: 'error',
          title: 'File Type Error',
          message: 'Please upload JPG, PNG, WebP, or PDF files only'
        })
        return
      }

      if (file.size > maxSize) {
        addToast({
          type: 'error',
          title: 'File Size Error',
          message: 'File size must be less than 5MB'
        })
        return
      }

      setProofFile(file)
    }
  }

  const handleUploadProof = async () => {
    if (!proofFile || !transaction) return

    setUploading(true)
    try {
      const supabase = supabaseBrowser
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('proof_file', proofFile)
      formData.append('transaction_id', transaction.id)

      const response = await fetch('/api/billing/upload-proof', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload payment proof')
      }

      const result = await response.json()

      // Update transaction status
      setTransaction(prev => prev ? {
        ...prev,
        transaction_status: 'proof_uploaded',
        payment_proof_url: result.file_url
      } : null)

      addToast({
        type: 'success',
        title: 'Upload Successful',
        message: 'Payment proof uploaded successfully! We will verify your payment soon.'
      })

      setShowUploadForm(false)
      setProofFile(null)

    } catch (error) {
      console.error('Error uploading proof:', error)
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload payment proof. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-[#F0A202] text-white"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>
      case 'proof_uploaded':
        return <Badge className="bg-[#F0A202] text-white"><Upload className="w-3 h-3 mr-1" />Waiting for Confirmation</Badge>
      case 'completed':
        return <Badge className="bg-[#4BB543] text-white"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge className="bg-[#E63946] text-white"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge className="bg-[#6C757D] text-white">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A] mx-auto mb-4"></div>
          <p className="text-[#6C757D]">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#E63946] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Order Not Found</h2>
          <p className="text-[#6C757D] mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
          <Button 
            onClick={() => router.push('/dashboard/billing')}
            className="bg-[#1A1A1A] hover:bg-[#2C2C2E] text-white"
          >
            Back to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/billing')}
            className="mb-4 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Billing
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Order Completed</h1>
              <p className="text-[#6C757D] mt-1">Thank you for your order! Here are your order details.</p>
            </div>
            {getStatusBadge(transaction.transaction_status)}
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Order Details (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Order ID</p>
                    <p className="text-sm text-[#6C757D] font-mono">{transaction.payment_reference || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Order Date</p>
                    <p className="text-sm text-[#6C757D]">
                      {new Date(transaction.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Package</p>
                    <p className="text-sm text-[#6C757D]">{transaction.package.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Billing Period</p>
                    <p className="text-sm text-[#6C757D]">{transaction.metadata?.billing_period || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Package Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A]">{transaction.package.name}</h3>
                    <p className="text-sm text-[#6C757D] mt-1">{transaction.package.description}</p>
                  </div>

                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-2">Package Features:</p>
                    <ul className="space-y-1">
                      {transaction.package.features?.map((feature: string, index: number) => (
                        <li key={index} className="text-sm text-[#6C757D] flex items-center">
                          <CheckCircle className="w-3 h-3 text-[#4BB543] mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#1A1A1A]">Total Amount</span>
                    <span className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(transaction.amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Name</p>
                    <p className="text-sm text-[#6C757D]">
                      {transaction.customer_info.first_name} {transaction.customer_info.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Email</p>
                    <p className="text-sm text-[#6C757D]">{transaction.customer_info.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Phone</p>
                    <p className="text-sm text-[#6C757D]">{transaction.customer_info.phone_number}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Information (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-[#FFF3CD] border border-[#FFEAA7] rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-[#F0A202] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-[#1A1A1A] mb-1">Complete the bank transfer</p>
                      <p className="text-sm text-[#6C757D]">
                        Transfer the exact amount to the specified bank account and include your order number in the notification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Payment Method</p>
                    <p className="text-sm text-[#6C757D]">{transaction.gateway.name}</p>
                  </div>

                  {transaction.gateway.configuration?.bank_name && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Bank</p>
                        <p className="text-sm text-[#6C757D]">{transaction.gateway.configuration.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Account Name</p>
                        <p className="text-sm text-[#6C757D]">{transaction.gateway.configuration.account_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">Account Number</p>
                        <p className="text-sm text-[#6C757D] font-mono">{transaction.gateway.configuration.account_number}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Amount to Pay</p>
                    <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(transaction.amount)}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Reference Number</p>
                    <p className="text-sm text-[#6C757D] font-mono">{transaction.payment_reference || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Proof Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#1A1A1A]">Sudah melakukan pembayaran?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.payment_proof_url ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-[#4BB543] mx-auto mb-3" />
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Payment Proof Uploaded</h3>
                    <p className="text-sm text-[#6C757D] mb-4">
                      We have received your payment proof and will verify it soon.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(transaction.payment_proof_url!, '_blank')}
                      className="border-[#E0E6ED] text-[#6C757D] hover:bg-[#F7F9FC]"
                    >
                      View Uploaded Proof
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#6C757D] text-center">
                      Upload bukti transfermu disini untuk mempercepat verifikasi pembayaran.
                    </p>

                    <Button
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      className="w-full bg-[#4BB543] hover:bg-[#45a83a] text-white"
                    >
                      {showUploadForm ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showUploadForm ? 'Hide Upload Form' : 'Upload Bukti Transfer'}
                    </Button>

                    {showUploadForm && (
                      <div className="space-y-4 pt-4 border-t border-[#E0E6ED]">
                        <div>
                          <Label htmlFor="proof_file" className="text-sm font-medium text-[#1A1A1A]">
                            Select Payment Proof *
                          </Label>
                          <Input
                            id="proof_file"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="mt-1"
                          />
                          <p className="text-xs text-[#6C757D] mt-1">
                            Supported formats: JPG, PNG, WebP, PDF (Max 5MB)
                          </p>
                        </div>

                        {proofFile && (
                          <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-3">
                            <p className="text-sm font-medium text-[#1A1A1A]">Selected File:</p>
                            <p className="text-sm text-[#6C757D]">{proofFile.name}</p>
                            <p className="text-xs text-[#6C757D]">
                              Size: {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={handleUploadProof}
                          disabled={!proofFile || uploading}
                          className="w-full bg-[#1A1A1A] hover:bg-[#2C2C2E] text-white disabled:opacity-50"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Payment Proof
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}