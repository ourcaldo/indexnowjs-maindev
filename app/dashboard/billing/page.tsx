'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Package,
  Receipt,
  TrendingUp,
  Crown,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface PricingTier {
  period: string
  regular_price: number
  promo_price?: number
  discount_percentage?: number
}

interface PaymentPackage {
  id: string
  name: string
  slug: string
  description: string
  price: number
  currency: string
  billing_period: string
  features: string[]
  quota_limits: {
    daily_quota_limit: number
    service_accounts_limit: number
    concurrent_jobs_limit: number
  }
  is_popular: boolean
  is_current: boolean
  pricing_tiers: Record<string, PricingTier>
}

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

interface BillingData {
  currentSubscription: {
    package_name: string
    package_slug: string
    subscription_status: string
    expires_at: string | null
    subscribed_at: string | null
    amount_paid: number
    billing_period: string
  } | null
  billingStats: {
    total_payments: number
    total_spent: number
    next_billing_date: string | null
    days_remaining: number | null
  }
  recentTransactions: Array<{
    id: string
    transaction_type: string
    amount: number
    currency: string
    transaction_status: string
    created_at: string
    package_name: string
    payment_method: string
  }>
}

interface PackagesData {
  packages: PaymentPackage[]
  current_package_id: string | null
  expires_at: string | null
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

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans section state
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)

  // History section state
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})
  const [showComparePlans, setShowComparePlans] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (statusFilter || typeFilter || searchTerm) {
      loadBillingHistory()
    }
  }, [currentPage, statusFilter, typeFilter, searchTerm])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadBillingData(),
        loadPackages(),
        loadBillingHistory()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBillingData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/billing/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load billing data')
      }

      const data = await response.json()
      setBillingData(data)
    } catch (error) {
      console.error('Error loading billing data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load billing data')
    }
  }

  const loadPackages = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const response = await fetch('/api/billing/packages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load packages')
      }

      const data = await response.json()
      setPackagesData(data)
    } catch (error) {
      console.error('Error loading packages:', error)
      setError(error instanceof Error ? error.message : 'Failed to load packages')
    }
  }

  const loadBillingHistory = async () => {
    try {
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
        limit: '10',
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      })

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
    }
  }

  const getBillingPeriodPrice = (pkg: PaymentPackage, period: string): { price: number, originalPrice?: number, discount?: number } => {
    const tier = pkg.pricing_tiers?.[period]
    if (tier) {
      return {
        price: tier.promo_price || tier.regular_price,
        originalPrice: tier.promo_price ? tier.regular_price : undefined,
        discount: tier.discount_percentage
      }
    }
    return { price: pkg.price }
  }

  const handleSubscribe = async (packageId: string) => {
    try {
      setSubscribing(packageId)
      const checkoutUrl = `/dashboard/billing/checkout?package=${packageId}&period=${selectedBillingPeriod}`
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Error subscribing:', error)
      alert(error instanceof Error ? error.message : 'Failed to redirect to checkout')
    } finally {
      setSubscribing(null)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const resetFilters = () => {
    setStatusFilter('')
    setTypeFilter('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-[#4BB543]" />
      case 'pending':
      case 'proof_uploaded':
        return <Clock className="h-4 w-4 text-[#F0A202]" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-[#E63946]" />
      default:
        return <Clock className="h-4 w-4 text-[#6C757D]" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'proof_uploaded':
        return 'WAITING FOR CONFIRMATION'
      default:
        return status.replace('_', ' ').toUpperCase()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'confirmed': 
        return { bg: 'bg-[#4BB543]/10', text: 'text-[#4BB543]', border: 'border-[#4BB543]/20' }
      case 'expired':
      case 'failed':
      case 'cancelled': 
        return { bg: 'bg-[#E63946]/10', text: 'text-[#E63946]', border: 'border-[#E63946]/20' }
      case 'expiring_soon':
      case 'pending':
      case 'proof_uploaded': 
        return { bg: 'bg-[#F0A202]/10', text: 'text-[#F0A202]', border: 'border-[#F0A202]/20' }
      default: 
        return { bg: 'bg-[#6C757D]/10', text: 'text-[#6C757D]', border: 'border-[#6C757D]/20' }
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

  const handleSelectInvoice = (invoiceId: string) => {
    if (selectedInvoices.includes(invoiceId)) {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId))
    } else {
      setSelectedInvoices([...selectedInvoices, invoiceId])
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices([])
      setSelectAll(false)
    } else {
      const allIds = historyData?.transactions.map(t => t.id) || []
      setSelectedInvoices(allIds)
      setSelectAll(true)
    }
  }

  const togglePlanDetails = (planId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }))
  }

  const toggleComparePlans = () => {
    setShowComparePlans(!showComparePlans)
    if (!showComparePlans) {
      // Show all plan details when comparing
      const allPlansDetails: Record<string, boolean> = {}
      packagesData?.packages.forEach(pkg => {
        allPlansDetails[pkg.id] = true
      })
      setShowDetails(allPlansDetails)
    } else {
      // Hide all details when not comparing
      setShowDetails({})
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const billingPeriods = [
    { key: 'monthly', label: 'Monthly', suffix: '/month' },
    { key: 'quarterly', label: '3 Months', suffix: '/3 months' },
    { key: 'biannual', label: '6 Months', suffix: '/6 months' },
    { key: 'annual', label: '12 Months', suffix: '/year' }
  ]

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
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Error Loading Billing Data</h3>
        <p className="text-[#6C757D] mb-4">{error}</p>
        <button
          onClick={loadAllData}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing</h1>
          <p className="text-[#6C757D] mt-1">Manage your plan and billing history here.</p>
        </div>
        <button
          onClick={loadAllData}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Billing Settings Section */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Billing settings</h2>
            <p className="text-sm text-[#6C757D]">Manage your plan and billing history here.</p>
          </div>
          <button 
            onClick={toggleComparePlans}
            className="px-4 py-2 border border-[#E0E6ED] rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F7F9FC] transition-colors flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            {showComparePlans ? 'Hide comparison' : 'Compare plans'}
          </button>
        </div>

        {/* Current Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {packagesData?.packages.map((pkg) => {
            const isCurrentPlan = pkg.is_current
            const pricing = getBillingPeriodPrice(pkg, selectedBillingPeriod)

            return (
              <div key={pkg.id} className={`rounded-lg border p-4 relative flex flex-col h-full ${
                isCurrentPlan 
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                  : 'border-[#E0E6ED] bg-white hover:border-[#1A1A1A] transition-colors'
              }`}>
                {pkg.is_popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-4 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-semibold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
                      {pkg.name}
                    </h3>
                    {isCurrentPlan && (
                      <span className="bg-white text-[#1A1A1A] px-2 py-0.5 rounded text-xs font-medium">
                        Current plan
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                    {pkg.description}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${isCurrentPlan ? 'text-white' : 'text-[#1A1A1A]'}`}>
                      {formatCurrency(pricing.price)}
                    </span>
                    <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                      per month
                    </span>
                  </div>
                </div>

                {/* Expandable Features */}
                <div className="flex-grow">
                  {(showDetails[pkg.id] || showComparePlans) && (
                    <div className={`mb-4 pb-4 border-b ${isCurrentPlan ? 'border-gray-600' : 'border-[#E0E6ED]'}`}>
                      <div className="space-y-3">
                        {/* Database Features ONLY - no hardcoded quota features */}
                        {pkg.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Check className={`h-4 w-4 ${isCurrentPlan ? 'text-white' : 'text-[#4BB543]'}`} />
                            <span className={`text-sm ${isCurrentPlan ? 'text-gray-300' : 'text-[#6C757D]'}`}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto space-y-2">
                  <button 
                    onClick={() => isCurrentPlan ? null : handleSubscribe(pkg.id)}
                    disabled={isCurrentPlan || subscribing === pkg.id}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors h-12 ${
                      isCurrentPlan 
                        ? 'bg-white text-[#1A1A1A] cursor-default'
                        : 'bg-[#1A1A1A] text-white hover:bg-[#0d1b2a]'
                    } ${subscribing === pkg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {subscribing === pkg.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : isCurrentPlan ? 'Current plan' : 'Switch plan'}
                  </button>

                  <button
                    onClick={() => togglePlanDetails(pkg.id)}
                    className={`w-full py-1 text-xs ${isCurrentPlan ? 'text-gray-300 hover:text-white' : 'text-[#6C757D] hover:text-[#1A1A1A]'} transition-colors flex items-center justify-center gap-1`}
                  >
                    {showDetails[pkg.id] ? (
                      <>Hide details <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Show details <ChevronDown className="h-3 w-3" /></>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Billing History Section */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Billing history</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-[#6C757D]">
                {historyData?.summary.total_transactions || 0} invoices selected
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C757D]" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-[#E0E6ED] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A]"
              />
            </div>
            <button className="p-2 border border-[#E0E6ED] rounded-lg hover:bg-[#F7F9FC] transition-colors">
              <Filter className="h-4 w-4 text-[#6C757D]" />
            </button>
            <button className="px-3 py-2 border border-[#E0E6ED] rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F7F9FC] transition-colors flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download all
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-[#F7F9FC] rounded-lg">
            <p className="text-xl font-bold text-[#1A1A1A]">
              {formatCurrency(historyData?.summary.total_amount_spent || 0)}
            </p>
            <p className="text-xs text-[#6C757D]">Total spent</p>
          </div>
          <div className="p-3 bg-[#F7F9FC] rounded-lg">
            <p className="text-xl font-bold text-[#1A1A1A]">
              {historyData?.summary.completed_transactions || 0}
            </p>
            <p className="text-xs text-[#6C757D]">Completed</p>
          </div>
          <div className="p-3 bg-[#F7F9FC] rounded-lg">
            <p className="text-xl font-bold text-[#1A1A1A]">
              {historyData?.summary.pending_transactions || 0}
            </p>
            <p className="text-xs text-[#6C757D]">Pending</p>
          </div>
          <div className="p-3 bg-[#F7F9FC] rounded-lg">
            <p className="text-xl font-bold text-[#1A1A1A]">
              {historyData?.summary.failed_transactions || 0}
            </p>
            <p className="text-xs text-[#6C757D]">Failed</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E6ED]">
                <th className="text-left py-2 px-4 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    className="rounded border-[#E0E6ED]"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="text-left py-2 px-4 text-xs font-medium text-[#6C757D] uppercase tracking-wider">Order ID</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-[#6C757D] uppercase tracking-wider">Billing Date</th>
                <th className="text-left py-2 px-4 text-xs font-medium text-[#6C757D] uppercase tracking-wider">Plan</th>
                <th className="text-center py-2 px-4 text-xs font-medium text-[#6C757D] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {historyData?.transactions.map((transaction) => (
                <tr 
                  key={transaction.id} 
                  className="border-b border-[#E0E6ED] hover:bg-[#F7F9FC] cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/dashboard/billing/order/${transaction.id}`}
                >
                  <td className="py-3 px-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-[#E0E6ED]"
                      checked={selectedInvoices.includes(transaction.id)}
                      onChange={() => handleSelectInvoice(transaction.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-3 px-4 text-left">
                    <span className="text-sm text-[#1A1A1A] font-mono">
                      {transaction.payment_reference || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#6C757D]" />
                      <span className="text-sm text-[#1A1A1A]">
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-left">
                    <span className="text-sm text-[#1A1A1A]">
                      {transaction.package_name || transaction.package?.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(transaction.transaction_status)}
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        transaction.transaction_status === 'pending' || transaction.transaction_status === 'proof_uploaded'
                          ? 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
                          : getStatusColor(transaction.transaction_status).bg + ' ' + getStatusColor(transaction.transaction_status).text + ' ' + getStatusColor(transaction.transaction_status).border
                      }`}>
                        {getStatusText(transaction.transaction_status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {historyData?.pagination && historyData.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-[#6C757D]">
              Showing {((historyData.pagination.current_page - 1) * historyData.pagination.items_per_page) + 1} to{' '}
              {Math.min(historyData.pagination.current_page * historyData.pagination.items_per_page, historyData.pagination.total_items)} of{' '}
              {historyData.pagination.total_items} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(historyData.pagination.current_page - 1)}
                disabled={!historyData.pagination.has_prev}
                className="p-2 border border-[#E0E6ED] rounded-lg hover:bg-[#F7F9FC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-[#1A1A1A]">
                {historyData.pagination.current_page} of {historyData.pagination.total_pages}
              </span>
              <button
                onClick={() => handlePageChange(historyData.pagination.current_page + 1)}
                disabled={!historyData.pagination.has_next}
                className="p-2 border border-[#E0E6ED] rounded-lg hover:bg-[#F7F9FC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar - Only shows when invoices are selected */}
      {selectedInvoices.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[#1A1A1A] text-white rounded-xl px-6 py-4 shadow-xl border border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white">
                {selectedInvoices.length} invoices selected
              </span>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors border border-white/20 text-sm">
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors border border-white/20 text-sm">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}