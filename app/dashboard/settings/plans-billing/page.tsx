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
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'

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
    total_amount: number
    average_transaction: number
  }
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export default function PlansBillingSettingsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'history'>('overview')
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [packagesData, setPackagesData] = useState<PackagesData | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans tab states
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('monthly')
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [showComparePlans, setShowComparePlans] = useState(false)

  // History tab states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Activity logging - log as part of settings not separate billing page
  usePageViewLogger('/dashboard/settings/plans-billing', 'Plans & Billing Settings', { section: 'plans_billing' })
  const { logActivity } = useActivityLogger()

  useEffect(() => {
    loadBillingData()
  }, [])

  useEffect(() => {
    if (activeTab === 'plans') {
      loadPackagesData()
    } else if (activeTab === 'history') {
      loadHistoryData()
    }
  }, [activeTab, currentPage, perPage, statusFilter, typeFilter, sortBy, sortOrder, searchTerm])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/billing/overview', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load billing data')
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
      setError('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  const loadPackagesData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/billing/packages', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPackagesData(data)
      }
    } catch (error) {
      console.error('Error loading packages data:', error)
    }
  }

  const loadHistoryData = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/billing/history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setHistoryData(data)
      }
    } catch (error) {
      console.error('Error loading history data:', error)
    }
  }

  const handleSubscription = async (packageId: string, billingPeriod: string) => {
    try {
      setSubscribing(packageId)
      
      const user = await authService.getCurrentUser()
      if (!user) return

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return

      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          package_id: packageId,
          billing_period: billingPeriod
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Handle subscription success - redirect to payment if needed
        if (data.checkout_url) {
          window.location.href = data.checkout_url
        } else {
          setShowSuccessNotification(true)
          setTimeout(() => setShowSuccessNotification(false), 5000)
          loadBillingData()
          loadPackagesData()
        }
      }
    } catch (error) {
      console.error('Error subscribing:', error)
    } finally {
      setSubscribing(null)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <span className="ml-2">Loading billing information...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
        <span className="text-red-600">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg" style={{backgroundColor: '#4BB543', color: '#FFFFFF'}}>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Subscription updated successfully!</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b" style={{borderColor: '#E0E6ED'}}>
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: DollarSign },
            { id: 'plans', label: 'Plans', icon: Package },
            { id: 'history', label: 'History', icon: Receipt }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Billing Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
              <div className="flex items-center">
                <div className="p-2 rounded-lg" style={{backgroundColor: '#4BB543'}}>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>Total Spent</p>
                  <p className="text-2xl font-bold" style={{color: '#1A1A1A'}}>
                    {formatCurrency(billingData?.billingStats.total_spent || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
              <div className="flex items-center">
                <div className="p-2 rounded-lg" style={{backgroundColor: '#3D8BFF'}}>
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>Total Payments</p>
                  <p className="text-2xl font-bold" style={{color: '#1A1A1A'}}>
                    {billingData?.billingStats.total_payments || 0}
                  </p>
                </div>
              </div>
            </div>

            {billingData?.currentSubscription && (
              <>
                <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg" style={{backgroundColor: '#F0A202'}}>
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium" style={{color: '#6C757D'}}>Next Billing</p>
                      <p className="text-2xl font-bold" style={{color: '#1A1A1A'}}>
                        {billingData?.billingStats.next_billing_date 
                          ? new Date(billingData.billingStats.next_billing_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg" style={{backgroundColor: '#E63946'}}>
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium" style={{color: '#6C757D'}}>Days Remaining</p>
                      <p className="text-2xl font-bold" style={{color: '#1A1A1A'}}>
                        {billingData?.billingStats.days_remaining || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Current Subscription */}
          {billingData?.currentSubscription ? (
            <div className="p-6 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Current Subscription</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  billingData.currentSubscription.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {billingData.currentSubscription.subscription_status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm" style={{color: '#6C757D'}}>Plan</p>
                  <p className="font-semibold" style={{color: '#1A1A1A'}}>{billingData.currentSubscription.package_name}</p>
                </div>
                <div>
                  <p className="text-sm" style={{color: '#6C757D'}}>Amount</p>
                  <p className="font-semibold" style={{color: '#1A1A1A'}}>
                    {formatCurrency(billingData.currentSubscription.amount_paid)}
                    <span className="text-sm font-normal" style={{color: '#6C757D'}}>
                      /{billingData.currentSubscription.billing_period}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{color: '#6C757D'}}>Expires</p>
                  <p className="font-semibold" style={{color: '#1A1A1A'}}>
                    {billingData.currentSubscription.expires_at 
                      ? new Date(billingData.currentSubscription.expires_at).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED', borderRadius: '8px'}}>
              <Package className="w-12 h-12 mx-auto mb-4" style={{color: '#6C757D'}} />
              <h3 className="text-lg font-medium mb-2" style={{color: '#1A1A1A'}}>No Active Subscription</h3>
              <p className="text-sm mb-6" style={{color: '#6C757D'}}>Choose a plan to get started with premium features</p>
              <button 
                className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:opacity-90"
                style={{backgroundColor: '#1C2331'}}
                onClick={() => setActiveTab('plans')}
              >
                View Plans
              </button>
            </div>
          )}

          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Recent Transactions</h3>
              <button 
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{color: '#3D8BFF'}}
                onClick={() => setActiveTab('history')}
              >
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {billingData?.recentTransactions.length ? (
                billingData.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg" style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.transaction_status === 'completed' ? 'bg-green-100' :
                        transaction.transaction_status === 'pending' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        {transaction.transaction_status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : transaction.transaction_status === 'pending' ? (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium" style={{color: '#1A1A1A'}}>{transaction.package_name}</p>
                        <p className="text-sm" style={{color: '#6C757D'}}>
                          {new Date(transaction.created_at).toLocaleDateString()} • {transaction.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{color: '#1A1A1A'}}>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className={`text-sm capitalize ${
                        transaction.transaction_status === 'completed' ? 'text-green-600' :
                        transaction.transaction_status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {transaction.transaction_status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{backgroundColor: '#F7F9FC', borderRadius: '8px'}}>
                  <Receipt className="w-8 h-8 mx-auto mb-2" style={{color: '#6C757D'}} />
                  <p className="text-sm" style={{color: '#6C757D'}}>No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-6">
          <p className="text-sm" style={{color: '#6C757D'}}>
            Choose the plan that best fits your indexing needs. All plans include unlimited support and regular updates.
          </p>
          
          {/* Billing Period Toggle */}
          <div className="flex justify-center">
            <div className="p-1 rounded-lg" style={{backgroundColor: '#F7F9FC'}}>
              <div className="flex">
                {['monthly', 'yearly'].map((period) => (
                  <button
                    key={period}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedBillingPeriod === period
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setSelectedBillingPeriod(period)}
                  >
                    {period === 'monthly' ? 'Monthly' : 'Yearly'}
                    {period === 'yearly' && (
                      <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">Save 20%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packagesData?.packages.map((pkg) => (
              <div 
                key={pkg.id} 
                className={`relative p-6 rounded-lg border-2 transition-all ${
                  pkg.is_popular ? 'border-blue-500 transform scale-105' : 'border-gray-200'
                } ${pkg.is_current ? 'bg-blue-50' : 'bg-white'}`}
              >
                {pkg.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-600 mt-2">{pkg.description}</p>
                  
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(pkg.price)}
                    </span>
                    <span className="text-sm text-gray-600">/{pkg.billing_period}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {pkg.is_current ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 bg-gray-50"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscription(pkg.id, selectedBillingPeriod)}
                      disabled={subscribing === pkg.id}
                      className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        pkg.is_popular
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50`}
                    >
                      {subscribing === pkg.id ? 'Processing...' : 'Choose Plan'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Transaction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {historyData?.transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{transaction.package?.name || 'Unknown Package'}</p>
                        <p className="text-sm text-gray-600">#{transaction.payment_reference}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        transaction.transaction_status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.transaction_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.transaction_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600 capitalize">
                      {transaction.payment_method}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyData?.pagination && historyData.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((historyData.pagination.current_page - 1) * historyData.pagination.per_page) + 1} to{' '}
                {Math.min(historyData.pagination.current_page * historyData.pagination.per_page, historyData.pagination.total_count)} of{' '}
                {historyData.pagination.total_count} transactions
              </p>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 text-sm">
                  Page {historyData.pagination.current_page} of {historyData.pagination.total_pages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= historyData.pagination.total_pages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}