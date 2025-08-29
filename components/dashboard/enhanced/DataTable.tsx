import React from 'react'
import { Card } from '../ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Column {
  key: string
  header: string
  render?: (value: any, row: any) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  pagination?: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const DataTable = ({ 
  data, 
  columns, 
  pagination, 
  loading = false, 
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps) => {
  if (loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: '#3D8BFF'}}></div>
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <p style={{color: '#6C757D'}}>{emptyMessage}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{backgroundColor: '#F7F9FC', borderBottom: '1px solid #E0E6ED'}}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium tracking-wider ${
                    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{color: '#6C757D', width: column.width}}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{backgroundColor: '#FFFFFF'}}>
            {data.map((row, index) => (
              <tr key={index} style={{borderBottom: '1px solid #E0E6ED'}}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                    style={{color: '#1A1A1A'}}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="px-6 py-3 flex items-center justify-between" style={{borderTop: '1px solid #E0E6ED', backgroundColor: '#F7F9FC'}}>
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(Math.max(pagination.currentPage - 1, 1))}
              disabled={pagination.currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.currentPage + 1, pagination.totalPages))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm" style={{color: '#6C757D'}}>
                Page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                <span className="font-medium">{pagination.totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => pagination.onPageChange(Math.max(pagination.currentPage - 1, 1))}
                  disabled={pagination.currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => pagination.onPageChange(Math.min(pagination.currentPage + 1, pagination.totalPages))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}