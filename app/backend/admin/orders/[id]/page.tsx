'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  User,
  Package,
  CreditCard,
  FileText,
  Download,
  Eye,
  Mail,
  Phone,
  ExternalLink,
  CalendarDays,
  Activity,
  ImageIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabaseBrowser } from '@/lib/database'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'

interface OrderTransaction {
  id: string
  user_id: string
  package_id: string
  gateway_id: string
  transaction_type: string
  transaction_status: 'pending' | 'proof_uploaded' | 'completed' | 'failed'
  amount: number
  currency: string
  payment_method: string
  payment_reference: string
  payment_proof_url?: string
  gateway_transaction_id: string
  verified_by?: string
  verified_at?: string
  processed_at?: string
  notes?: string
  metadata: {
    customer_info: {
      first_name: string
      last_name: string
      email: string
      phone_number: string
    }
    billing_period: string
    billing_address?: any
  }
  created_at: string
  updated_at: string
  package: {
    id: string
    name: string
    slug: string
    description: string
    price: number
    currency: string
    billing_period: string
    features: any[]
    quota_limits: any
  }
  user: {
    user_id: string
    full_name: string
    email: string
    role: string
    phone_number?: string
    created_at: string
    package_id?: string
    subscribed_at?: string
    expires_at?: string
  }
  gateway: {
    id: string
    name: string
    slug: string
    description: string
    configuration: any
  }
  verifier?: {
    user_id: string
    full_name: string
    role: string
  }
}

interface ActivityLog {
  id: string
  event_type: string
  action_description: string
  created_at: string
  user_id: string
  metadata: any
  user: {
    full_name: string
    role: string
  }
}

interface TransactionHistory {
  id: string
  transaction_id: string
  old_status: string | null
  new_status: string
  action_type: string
  action_description: string
  changed_by: string | null
  changed_by_type: string
  notes: string | null
  created_at: string
  user?: {
    full_name: string
    role: string
  }
}

interface OrderDetailData {
  order: OrderTransaction
  activity_history: ActivityLog[]
  transaction_history: TransactionHistory[]
}

export default function AdminOrderDetailPage() {
  const [orderData, setOrderData] = useState<OrderDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusAction, setStatusAction] = useState<'completed' | 'failed' | null>(null)
  const [statusNotes, setStatusNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const orderId = params.id as string

  useEffect(() => {
    if (orderId) {
      loadOrderDetail()
    }
  }, [orderId])

  const loadOrderDetail = async () => {
    try {
      setLoading(true)
      setError(null)

      const session = await supabaseBrowser.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found')
        }
        throw new Error('Failed to fetch order details')
      }

      const data = await response.json()
      if (data.success) {
        setOrderData(data)
      } else {
        throw new Error(data.error || 'Failed to fetch order details')
      }

    } catch (error: any) {
      console.error('Error loading order detail:', error)
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to load order details'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!statusAction || !orderData) return

    try {
      setUpdating(true)

      const session = await supabaseBrowser.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: statusAction,
          notes: statusNotes.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order status')
      }

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: data.message
        })
        
        // Reload order data
        await loadOrderDetail()
        
        // Close modal and reset state
        setStatusModalOpen(false)
        setStatusAction(null)
        setStatusNotes('')
      } else {
        throw new Error(data.error || 'Failed to update order status')
      }

    } catch (error: any) {
      console.error('Error updating order status:', error)
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to update order status'
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'proof_uploaded':
        return (
          <Badge className="bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Waiting for Confirmation
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-[#E63946]/10 text-[#E63946] border-[#E63946]/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge className="bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20">{status}</Badge>
    }
  }

  const openStatusModal = (action: 'completed' | 'failed') => {
    setStatusAction(action)
    setStatusModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1A1A] mx-auto mb-4"></div>
          <p className="text-[#6C757D]">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-[#E63946] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Error Loading Order</h3>
          <p className="text-[#6C757D] mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => router.back()} variant="outline" className="border-[#E0E6ED]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={loadOrderDetail} className="bg-[#1C2331] hover:bg-[#0d1b2a] text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!orderData) return null

  const { order, activity_history, transaction_history } = orderData
  const canUpdateStatus = ['proof_uploaded', 'pending'].includes(order.transaction_status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            size="sm"
            className="border-[#E0E6ED] text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Order #{order.payment_reference}</h1>
            <p className="text-[#6C757D]">Order details and management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(order.transaction_status)}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMN 1 */}
        <div className="space-y-6">
          {/* Order Details Box */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <FileText className="w-5 h-5 mr-2" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Order ID</label>
                  <p className="font-mono text-sm text-[#1A1A1A]">{order.payment_reference}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Amount</label>
                  <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(order.amount, order.currency)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Created</label>
                  <p className="text-sm text-[#1A1A1A]">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Last Updated</label>
                  <p className="text-sm text-[#1A1A1A]">{formatRelativeTime(order.updated_at)}</p>
                </div>
              </div>
              
              {order.verified_by && order.verified_at && (
                <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
                  <label className="text-sm font-medium text-[#6C757D]">Verified</label>
                  <p className="text-sm text-[#1A1A1A]">
                    {formatDate(order.verified_at)}
                    {order.verifier && (
                      <span className="text-[#6C757D]"> by {order.verifier.full_name}</span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Full Name</label>
                <p className="font-medium text-[#1A1A1A]">{order.user.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Email</label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-[#1A1A1A]">{order.user.email}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
                    onClick={() => window.open(`mailto:${order.user.email}`, '_blank')}
                  >
                    <Mail className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {order.metadata?.customer_info?.phone_number && (
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Phone</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-[#1A1A1A]">{order.metadata.customer_info.phone_number}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
                      onClick={() => window.open(`tel:${order.metadata.customer_info.phone_number}`, '_blank')}
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Registration Date</label>
                <p className="text-sm text-[#1A1A1A]">{formatDate(order.user.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Current Plan Status</label>
                <p className="text-sm text-[#1A1A1A]">
                  {order.user.expires_at ? (
                    <>Active until {formatDate(order.user.expires_at)}</>
                  ) : (
                    'No active subscription'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <Package className="w-5 h-5 mr-2" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Package Name</label>
                  <p className="font-medium text-[#1A1A1A]">{order.package.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Billing Period</label>
                  <p className="text-sm text-[#1A1A1A]">{order.metadata?.billing_period || order.package.billing_period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Amount</label>
                  <p className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(order.amount, order.currency)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Description</label>
                <p className="text-sm text-[#6C757D]">{order.package.description}</p>
              </div>
              
              {order.package.features && Array.isArray(order.package.features) && (
                <div>
                  <label className="text-sm font-medium text-[#6C757D] mb-2 block">Features</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {order.package.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="w-3 h-3 mr-2 text-[#4BB543] flex-shrink-0" />
                        <span className="text-[#1A1A1A]">{typeof feature === 'string' ? feature : feature.name || 'Feature'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <Activity className="w-5 h-5 mr-2" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  // Combine and sort all activity data
                  const allActivity = [
                    // Transaction history from dedicated table
                    ...(transaction_history || []).map(th => ({
                      id: th.id,
                      type: 'transaction',
                      event_type: th.action_type,
                      action_description: th.action_description,
                      created_at: th.created_at,
                      user: th.user || { full_name: th.changed_by_type === 'admin' ? 'Admin User' : 'System', role: th.changed_by_type },
                      metadata: { 
                        old_status: th.old_status, 
                        new_status: th.new_status,
                        notes: th.notes,
                        ...th.metadata 
                      }
                    })),
                    // General activity history
                    ...(activity_history || []).map(ah => ({
                      id: ah.id,
                      type: 'activity',
                      event_type: ah.event_type,
                      action_description: ah.action_description,
                      created_at: ah.created_at,
                      user: ah.user || { full_name: 'System', role: 'system' },
                      metadata: ah.metadata
                    }))
                  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                  return allActivity.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-[#E0E6ED]"></div>
                      
                      {allActivity.map((activity, index) => (
                        <div key={activity.id} className="relative flex items-start space-x-3 pb-4">
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 w-4 h-4 bg-[#3D8BFF] rounded-full border-2 border-white relative z-10"></div>
                          
                          {/* Activity content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A]">{activity.action_description}</p>
                            
                            {/* Enhanced display for transaction history */}
                            {activity.type === 'transaction' && activity.metadata?.old_status && (
                              <p className="text-xs text-[#6C757D] mt-1">
                                Status: {activity.metadata.old_status} → {activity.metadata.new_status}
                              </p>
                            )}
                            
                            {activity.metadata?.notes && (
                              <p className="text-xs text-[#6C757D] mt-1 italic">
                                "{activity.metadata.notes}"
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-1 text-xs text-[#6C757D] mt-1">
                              <CalendarDays className="w-3 h-3" />
                              <span>{formatRelativeTime(activity.created_at)}</span>
                              {activity.user?.full_name && (
                                <>
                                  <span>•</span>
                                  <span>{activity.user.full_name}</span>
                                  {activity.user.role && (
                                    <span className="text-[#3D8BFF]">({activity.user.role})</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-[#6C757D] mx-auto mb-2" />
                      <p className="text-sm text-[#6C757D]">No activity yet</p>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2 */}
        <div className="space-y-6">
          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#1A1A1A]">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpdateStatus && (
                <div className="space-y-2">
                  <Button
                    onClick={() => openStatusModal('completed')}
                    className="w-full bg-[#4BB543] hover:bg-[#3DA53A] text-white"
                    disabled={updating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Payment
                  </Button>
                  <Button
                    onClick={() => openStatusModal('failed')}
                    variant="outline"
                    className="w-full border-[#E63946] text-[#E63946] hover:bg-[#E63946] hover:text-white"
                    disabled={updating}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Payment
                  </Button>
                </div>
              )}
              
              <Separator className="bg-[#E0E6ED]" />
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-[#E0E6ED] text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
                  onClick={() => window.open(`mailto:${order.user.email}`, '_blank')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Customer
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#E0E6ED] text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
                  onClick={() => router.push(`/backend/admin/users?search=${order.user.email}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View User Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Gateway</label>
                <p className="font-medium text-[#1A1A1A]">{order.gateway.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Payment Method</label>
                <p className="text-sm text-[#1A1A1A]">{order.payment_method}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Reference Number</label>
                <p className="font-mono text-sm text-[#1A1A1A]">{order.payment_reference}</p>
              </div>
              {order.gateway_transaction_id && (
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Gateway Transaction ID</label>
                  <p className="font-mono text-sm text-[#1A1A1A]">{order.gateway_transaction_id}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-[#6C757D]">Package</label>
                <p className="text-sm text-[#1A1A1A]">{order.package.name} ({order.metadata?.billing_period || order.package.billing_period})</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof */}
          {order.payment_proof_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[#1A1A1A]">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-video bg-[#F7F9FC] rounded-lg flex items-center justify-center">
                    <img
                      src={order.payment_proof_url}
                      alt="Payment Proof"
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <div className="hidden text-center">
                      <FileText className="w-12 h-12 text-[#6C757D] mx-auto mb-2" />
                      <p className="text-sm text-[#6C757D]">Unable to preview file</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(order.payment_proof_url, '_blank')}
                      className="border-[#E0E6ED] text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-[#1A1A1A]">
                <FileText className="w-5 h-5 mr-2" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.notes ? (
                <div>
                  <label className="text-sm font-medium text-[#6C757D]">Admin Notes</label>
                  <p className="text-sm bg-[#F7F9FC] p-3 rounded-lg mt-1 text-[#1A1A1A]">{order.notes}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-[#6C757D] mx-auto mb-2" />
                  <p className="text-sm text-[#6C757D]">No notes added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModalOpen && (
        <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {statusAction === 'completed' ? 'Approve Payment' : 'Reject Payment'}
              </DialogTitle>
              <DialogDescription className="text-[#6C757D]">
                {statusAction === 'completed' 
                  ? 'This will immediately activate the customer\'s subscription and grant access to their selected plan.'
                  : 'This will mark the payment as failed and notify the customer.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#F7F9FC] rounded-lg">
                <h4 className="font-medium text-[#1A1A1A] mb-2">Order Summary</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-[#6C757D]">Order:</span> <span className="text-[#1A1A1A]">#{order.payment_reference}</span></p>
                  <p><span className="text-[#6C757D]">Customer:</span> <span className="text-[#1A1A1A]">{order.user.email}</span></p>
                  <p><span className="text-[#6C757D]">Package:</span> <span className="text-[#1A1A1A]">{order.package.name} ({order.metadata?.billing_period})</span></p>
                  <p><span className="text-[#6C757D]">Amount:</span> <span className="text-[#1A1A1A]">{formatCurrency(order.amount, order.currency)}</span></p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-[#1A1A1A] mb-2 block">
                  Notes (optional)
                </label>
                <Textarea
                  placeholder={statusAction === 'completed' 
                    ? 'Payment verified and approved...' 
                    : 'Payment rejected due to...'
                  }
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="border-[#E0E6ED]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setStatusModalOpen(false)}
                disabled={updating}
                className="border-[#E0E6ED] text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStatusUpdate}
                disabled={updating}
                className={statusAction === 'completed' 
                  ? 'bg-[#4BB543] hover:bg-[#3DA53A] text-white' 
                  : 'bg-[#E63946] hover:bg-[#CC2936] text-white'
                }
              >
                {updating ? 'Processing...' : statusAction === 'completed' ? 'Approve Payment' : 'Reject Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}