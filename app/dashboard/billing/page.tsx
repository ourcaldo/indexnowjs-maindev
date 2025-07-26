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
  TrendingUp
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import PlansTab from './plans/PlansTab'
import HistoryTab from './history/HistoryTab'

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

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'history'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-[#4BB543]/10', text: 'text-[#4BB543]', border: 'border-[#4BB543]/20' }
      case 'expired': return { bg: 'bg-[#E63946]/10', text: 'text-[#E63946]', border: 'border-[#E63946]/20' }
      case 'expiring_soon': return { bg: 'bg-[#F0A202]/10', text: 'text-[#F0A202]', border: 'border-[#F0A202]/20' }
      case 'pending': return { bg: 'bg-[#3D8BFF]/10', text: 'text-[#3D8BFF]', border: 'border-[#3D8BFF]/20' }
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
      month: 'long',
      day: 'numeric'
    })
  }

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
          onClick={loadBillingData}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing & Payment</h1>
          <p className="text-[#6C757D] mt-1">Manage your subscription and billing information</p>
        </div>
        <button
          onClick={loadBillingData}
          className="px-4 py-2 bg-[#1C2331] text-white rounded-lg hover:bg-[#0d1b2a] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-[#F7F9FC] p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'plans', label: 'Plans & Pricing', icon: Package },
          { key: 'history', label: 'Billing History', icon: Receipt }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-white/50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Current Subscription</h3>
                {billingData?.currentSubscription ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-[#1A1A1A]">
                        {billingData.currentSubscription.package_name}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(billingData.currentSubscription.subscription_status).bg
                      } ${getStatusColor(billingData.currentSubscription.subscription_status).text} ${
                        getStatusColor(billingData.currentSubscription.subscription_status).border
                      }`}>
                        {billingData.currentSubscription.subscription_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#6C757D]">
                      {formatCurrency(billingData.currentSubscription.amount_paid)} / {billingData.currentSubscription.billing_period}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg text-[#6C757D]">No active subscription</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#6C757D]/10 text-[#6C757D] border border-[#6C757D]/20">
                      FREE
                    </span>
                  </div>
                )}
              </div>
              <CreditCard className="h-8 w-8 text-[#3D8BFF]" />
            </div>

            {billingData?.currentSubscription && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E0E6ED]">
                <div>
                  <p className="text-sm text-[#6C757D]">Next Billing Date</p>
                  <p className="font-semibold text-[#1A1A1A]">
                    {billingData.currentSubscription.expires_at 
                      ? formatDate(billingData.currentSubscription.expires_at)
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6C757D]">Days Remaining</p>
                  <p className="font-semibold text-[#1A1A1A]">
                    {billingData.billingStats.days_remaining !== null 
                      ? `${billingData.billingStats.days_remaining} days`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Billing Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6C757D]">Total Payments</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {billingData?.billingStats.total_payments || 0}
                  </p>
                </div>
                <div className="p-2 bg-[#3D8BFF]/10 rounded-lg">
                  <Receipt className="h-6 w-6 text-[#3D8BFF]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6C757D]">Total Spent</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {formatCurrency(billingData?.billingStats.total_spent || 0)}
                  </p>
                </div>
                <div className="p-2 bg-[#4BB543]/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-[#4BB543]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#6C757D]">Account Status</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {billingData?.currentSubscription ? 'Premium' : 'Free'}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${
                  billingData?.currentSubscription ? 'bg-[#4BB543]/10' : 'bg-[#6C757D]/10'
                }`}>
                  {billingData?.currentSubscription ? (
                    <CheckCircle className="h-6 w-6 text-[#4BB543]" />
                  ) : (
                    <Clock className="h-6 w-6 text-[#6C757D]" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white p-6 rounded-lg border border-[#E0E6ED]">
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Recent Transactions</h3>
            {billingData?.recentTransactions && billingData.recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {billingData.recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Receipt className="h-4 w-4 text-[#3D8BFF]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{transaction.package_name}</p>
                        <p className="text-sm text-[#6C757D]">
                          {transaction.transaction_type} • {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1A1A1A]">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        getStatusColor(transaction.transaction_status).bg
                      } ${getStatusColor(transaction.transaction_status).text}`}>
                        {transaction.transaction_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
                <p className="text-[#6C757D]">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  )
}