'use client'

import { useState, useEffect } from 'react'
import { 
  Filter, 
  Search, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Transaction {
  id: string
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  payment_method: string
  payment_reference: string
  gateway_transaction_id: string
  created_at: string
  processed_at: string | null
  verified_at: string | null
  notes: string | null
  package_name?: string
  package?: {
    name: string
    slug: string
  }
  gateway?: {
    name: string
    slug: string
  }
  subscription?: {
    billing_period: string
    started_at: string
    expires_at: string
  } | null
}

interface BillingHistoryData {
  transactions: Transaction[]
  summary: {
    total_transactions: number
    completed_transactions: number
    pending_transactions: number
    failed_transactions: number
    total_amount_spent: number
  }
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

export default function HistoryTab() {
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    loadBillingHistory()
  }, [currentPage, statusFilter, typeFilter])

  const loadBillingHistory = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(`/api/billing/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load billing history')
      }

      const data = await response.json()
      setHistoryData(data)
    } catch (error) {
      console.error('Error loading billing history:', error)
      setError(error instanceof Error ? error.message : 'Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-[#4BB543]" />
      case 'pending': return <Clock className="h-4 w-4 text-[#F0A202]" />
      case 'failed': return <XCircle className="h-4 w-4 text-[#E63946]" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-[#6C757D]" />
      default: return <AlertCircle className="h-4 w-4 text-[#6C757D]" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-[#4BB543]/10', text: 'text-[#4BB543]', border: 'border-[#4BB543]/20' }
      case 'pending': return { bg: 'bg-[#F0A202]/10', text: 'text-[#F0A202]', border: 'border-[#F0A202]/20' }
      case 'failed': return { bg: 'bg-[#E63946]/10', text: 'text-[#E63946]', border: 'border-[#E63946]/20' }
      case 'cancelled': return { bg: 'bg-[#6C757D]/10', text: 'text-[#6C757D]', border: 'border-[#6C757D]/20' }
      default: return { bg: 'bg-[#6C757D]/10', text: 'text-[#6C757D]', border: 'border-[#6C757D]/20' }
    }
  }

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'subscription': return 'New Subscription'
      case 'renewal': return 'Renewal'
      case 'upgrade': return 'Plan Upgrade'
      case 'downgrade': return 'Plan Downgrade'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const filteredTransactions = historyData?.transactions.filter(transaction => {
    if (!searchTerm) return true
    return (
      transaction.package.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.gateway_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-[#E63946] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Error Loading History</h3>
        <p className="text-[#6C757D] mb-4">{error}</p>
        <button
          onClick={loadBillingHistory}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {historyData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-[#E0E6ED]">
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {historyData.summary.total_transactions}
            </div>
            <div className="text-sm text-[#6C757D]">Total Transactions</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#E0E6ED]">
            <div className="text-2xl font-bold text-[#4BB543]">
              {historyData.summary.completed_transactions}
            </div>
            <div className="text-sm text-[#6C757D]">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#E0E6ED]">
            <div className="text-2xl font-bold text-[#F0A202]">
              {historyData.summary.pending_transactions}
            </div>
            <div className="text-sm text-[#6C757D]">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#E0E6ED]">
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {formatCurrency(historyData.summary.total_amount_spent)}
            </div>
            <div className="text-sm text-[#6C757D]">Total Spent</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D]" />
              <input
                type="text"
                placeholder="Search by package, reference, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E0E6ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-[150px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="subscription">New Subscription</option>
              <option value="renewal">Renewal</option>
              <option value="upgrade">Upgrade</option>
              <option value="downgrade">Downgrade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg border border-[#E0E6ED]">
        {filteredTransactions.length > 0 ? (
          <>
            <div className="divide-y divide-[#E0E6ED]">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="p-6 hover:bg-[#F7F9FC]/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/billing/order/${transaction.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(transaction.transaction_status)}
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A]">
                            {formatTransactionType(transaction.transaction_type)}
                          </h3>
                          <p className="text-sm text-[#6C757D]">
                            {transaction.package?.name || transaction.package_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-[#6C757D]">Date: </span>
                          <span className="text-[#1A1A1A]">{formatDate(transaction.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-[#6C757D]">Order ID: </span>
                          <span className="text-[#1A1A1A] font-mono text-xs">
                            {transaction.payment_reference || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6C757D]">Method: </span>
                          <span className="text-[#1A1A1A]">
                            {transaction.gateway?.name || 'Unknown Gateway'} - {transaction.payment_method || 'N/A'}
                          </span>
                        </div>
                        {transaction.subscription && (
                          <div>
                            <span className="text-[#6C757D]">Period: </span>
                            <span className="text-[#1A1A1A]">
                              {transaction.subscription.billing_period}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#1A1A1A] mb-2">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(transaction.transaction_status).bg
                      } ${getStatusColor(transaction.transaction_status).text} ${
                        getStatusColor(transaction.transaction_status).border
                      }`}>
                        {transaction.transaction_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {transaction.verified_at && (
                    <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
                      <div className="text-xs text-[#6C757D]">
                        Verified: {formatDate(transaction.verified_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {historyData?.pagination && historyData.pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-[#E0E6ED] flex items-center justify-between">
                <div className="text-sm text-[#6C757D]">
                  Showing {((historyData.pagination.current_page - 1) * historyData.pagination.items_per_page) + 1} to{' '}
                  {Math.min(historyData.pagination.current_page * historyData.pagination.items_per_page, historyData.pagination.total_items)} of{' '}
                  {historyData.pagination.total_items} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!historyData.pagination.has_prev}
                    className={`p-2 rounded-lg transition-colors ${
                      historyData.pagination.has_prev
                        ? 'hover:bg-[#F7F9FC] text-[#1A1A1A]'
                        : 'text-[#6C757D] cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[#1A1A1A] px-3 py-1">
                    Page {historyData.pagination.current_page} of {historyData.pagination.total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!historyData.pagination.has_next}
                    className={`p-2 rounded-lg transition-colors ${
                      historyData.pagination.has_next
                        ? 'hover:bg-[#F7F9FC] text-[#1A1A1A]'
                        : 'text-[#6C757D] cursor-not-allowed'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">No Transactions Found</h3>
            <p className="text-[#6C757D]">
              {searchTerm || statusFilter || typeFilter
                ? 'No transactions match your current filters.'
                : 'You haven\'t made any transactions yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}