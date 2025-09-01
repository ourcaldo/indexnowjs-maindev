import React from 'react'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Download
} from 'lucide-react'
import { Input, Select, Button } from '@/components/dashboard/ui'
import { DataTable, StatusBadge } from '@/components/dashboard/enhanced'

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

interface BillingHistoryProps {
  historyData: BillingHistoryData | null
  currentPage: number
  statusFilter: string
  typeFilter: string
  searchTerm: string
  setCurrentPage: (page: number) => void
  setStatusFilter: (status: string) => void
  setTypeFilter: (type: string) => void
  setSearchTerm: (term: string) => void
  handlePageChange: (page: number) => void
  resetFilters: () => void
  getStatusIcon: (status: string) => React.ReactNode
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => { bg: string, text: string, border: string }
  formatCurrency: (amount: number, currency?: string) => string
  formatDate: (dateString: string) => string
}

export const BillingHistory = ({
  historyData,
  currentPage,
  statusFilter,
  typeFilter,
  searchTerm,
  setCurrentPage,
  setStatusFilter,
  setTypeFilter,
  setSearchTerm,
  handlePageChange,
  resetFilters,
  getStatusIcon,
  getStatusText,
  getStatusColor,
  formatCurrency,
  formatDate
}: BillingHistoryProps) => {
  
  const handleRowClick = (transactionId: string) => {
    window.location.href = `/dashboard/settings/plans-billing/order/${transactionId}`
  }
  const columns = [
    {
      key: 'order_id',
      header: 'ORDER ID',
      render: (value: any, transaction: Transaction) => (
        <div className="font-medium text-[#1A1A1A]">
          #{transaction.id.slice(-8).toUpperCase()}
        </div>
      )
    },
    {
      key: 'package',
      header: 'PACKAGE / TYPE',
      render: (value: any, transaction: Transaction) => (
        <div>
          <div className="font-medium text-[#1A1A1A]">
            {transaction.package?.name || transaction.package_name || 'Unknown Package'}
          </div>
          <div className="text-sm text-[#6C757D] capitalize">
            {transaction.transaction_type.replace('_', ' ')}
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'AMOUNT',
      render: (value: any, transaction: Transaction) => (
        <div className="font-medium text-[#1A1A1A]">
          {formatCurrency(transaction.amount, transaction.currency)}
        </div>
      ),
      align: 'right' as const
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (value: any, transaction: Transaction) => {
        const statusColors = getStatusColor(transaction.transaction_status)
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(transaction.transaction_status)}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
              {getStatusText(transaction.transaction_status)}
            </span>
          </div>
        )
      }
    },
    {
      key: 'created_at',
      header: 'DATE',
      render: (value: any, transaction: Transaction) => (
        <div className="text-sm text-[#6C757D]">
          {formatDate(transaction.created_at)}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      render: (value: any, transaction: Transaction) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
      align: 'center' as const
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Billing History</h2>
          <p className="text-sm text-[#6C757D]">
            {historyData?.summary.total_transactions || 0} transactions • {formatCurrency(historyData?.summary.total_amount_spent || 0, 'USD')} total spent
          </p>
        </div>
        <Button variant="outline" onClick={resetFilters}>
          <Filter className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6C757D]" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
            placeholder="All Status"
            className="w-[140px]"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          
          <Select 
            value={typeFilter} 
            onValueChange={setTypeFilter}
            placeholder="All Types"
            className="w-[140px]"
          >
            <option value="">All Types</option>
            <option value="subscription">Subscription</option>
            <option value="upgrade">Upgrade</option>
            <option value="trial">Trial</option>
            <option value="renewal">Renewal</option>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      {historyData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#1A1A1A]">{historyData.summary.total_transactions}</div>
            <div className="text-sm text-[#6C757D]">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#4BB543]">{historyData.summary.completed_transactions}</div>
            <div className="text-sm text-[#6C757D]">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#F0A202]">{historyData.summary.pending_transactions}</div>
            <div className="text-sm text-[#6C757D]">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#E63946]">{historyData.summary.failed_transactions}</div>
            <div className="text-sm text-[#6C757D]">Failed</div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-[#E0E6ED] overflow-hidden">
        {historyData?.transactions && historyData.transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9FC] border-b border-[#E0E6ED]">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-6 py-3 text-xs font-medium tracking-wider text-[#6C757D] ${
                          column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E0E6ED]">
                  {historyData.transactions.map((transaction) => (
                    <tr 
                      key={transaction.id}
                      className="hover:bg-[#F7F9FC]/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(transaction.id)}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {column.render ? column.render(transaction[column.key as keyof Transaction], transaction) : (transaction as any)[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {historyData.pagination && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-[#E0E6ED] bg-[#F7F9FC]">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(Math.max(historyData.pagination.current_page - 1, 1))}
                    disabled={historyData.pagination.current_page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.min(historyData.pagination.current_page + 1, historyData.pagination.total_pages))}
                    disabled={historyData.pagination.current_page === historyData.pagination.total_pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[#6C757D]">
                      Page <span className="font-medium">{historyData.pagination.current_page}</span> of{' '}
                      <span className="font-medium">{historyData.pagination.total_pages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(Math.max(historyData.pagination.current_page - 1, 1))}
                        disabled={historyData.pagination.current_page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePageChange(Math.min(historyData.pagination.current_page + 1, historyData.pagination.total_pages))}
                        disabled={historyData.pagination.current_page === historyData.pagination.total_pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#6C757D]">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  )
}