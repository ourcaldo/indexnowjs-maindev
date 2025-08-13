'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react'

// Simple UI Components using project color scheme
const Card = ({ children, className = '' }: any) => (
  <div className={`p-6 rounded-lg ${className}`} style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
    {children}
  </div>
)

const Button = ({ children, variant = 'default', size = 'default', className = '', onClick, disabled, ...props }: any) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variants: { [key: string]: any } = {
    default: { backgroundColor: '#1C2331', color: '#FFFFFF' },
    secondary: { backgroundColor: '#F7F9FC', color: '#1A1A1A', border: '1px solid #E0E6ED' },
    outline: { backgroundColor: 'transparent', color: '#6C757D', border: '1px solid #E0E6ED' },
    ghost: { backgroundColor: 'transparent', color: '#6C757D' }
  }
  
  const sizes: { [key: string]: string } = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-9 w-9'
  }
  
  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${className}`}
      style={variants[variant]}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

const Input = ({ placeholder, className = '', value, onChange, type = 'text', ...props }: any) => (
  <input
    type={type}
    className={`flex h-9 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      ['--tw-ring-color' as any]: '#3D8BFF'
    }}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
)

const Select = ({ children, value, onChange, className = '', ...props }: any) => (
  <select 
    className={`flex h-9 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      ['--tw-ring-color' as any]: '#3D8BFF'
    }}
    value={value}
    onChange={onChange}
    {...props}
  >
    {children}
  </select>
)

interface Domain {
  id: string
  domain_name: string
  display_name: string
}

interface RankHistoryData {
  keyword_id: string
  keyword: string
  device_type: string
  domain: Domain
  country: any
  history: { [date: string]: { position: number | null, url: string | null } }
}

// Generate array of dates for the date range
const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  
  return dates.reverse() // Most recent first
}

// Format date for display (e.g., "Jan 15")
const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Get position trend indicator
const getPositionTrend = (currentPos: number | null, previousPos: number | null) => {
  if (!currentPos || !previousPos) return null
  
  if (currentPos < previousPos) {
    return <TrendingUp className="w-4 h-4 text-green-600" />
  } else if (currentPos > previousPos) {
    return <TrendingDown className="w-4 h-4 text-red-600" />
  }
  return <Minus className="w-4 h-4" style={{ color: '#6C757D' }} />
}

export default function RankHistoryPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Set default date range (30 days)
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch domains
  const { data: domains = [] } = useQuery({
    queryKey: ['/api/keyword-tracker/domains'],
    queryFn: async () => {
      const session = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/domains', {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data.success ? data.data : []
    }
  })

  // Fetch rank history data
  const { data: rankHistory = [], isLoading } = useQuery({
    queryKey: ['/api/keyword-tracker/rank-history', selectedDomain, startDate, endDate],
    queryFn: async () => {
      const session = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomain) params.append('domain_id', selectedDomain)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      
      const response = await fetch(`/api/keyword-tracker/rank-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!startDate && !!endDate
  })

  const dateRange = startDate && endDate ? generateDateRange(startDate, endDate) : []
  const selectedDomainData = domains.find((d: Domain) => d.id === selectedDomain)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Domain Section - Left Top Corner */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED' }}>
              <Globe className="w-5 h-5" style={{ color: '#3D8BFF' }} />
              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                {selectedDomainData ? selectedDomainData.display_name || selectedDomainData.domain_name : 'All Domains'}
              </span>
            </div>
          </div>

          {/* Compact Date Picker and Filters */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" style={{ color: '#6C757D' }} />
              <Input
                type="date"
                value={startDate}
                onChange={(e: any) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span className="text-sm" style={{ color: '#6C757D' }}>to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e: any) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" style={{ color: '#6C757D' }} />
              <Select
                value={selectedDomain}
                onChange={(e: any) => setSelectedDomain(e.target.value)}
                className="w-48"
              >
                <option value="">All Domains</option>
                {domains.map((domain: Domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.display_name || domain.domain_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Rank History Table */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p style={{ color: '#6C757D' }}>Loading rank history...</p>
              </div>
            </div>
          ) : rankHistory.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: '#6C757D' }}>No rank history data found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E0E6ED' }}>
                    <th className="sticky left-0 z-10 px-4 py-3 text-left text-sm font-medium" style={{ backgroundColor: '#F7F9FC', color: '#1A1A1A' }}>
                      Keyword
                    </th>
                    {dateRange.slice(0, 30).map((date) => (
                      <th key={date} className="px-3 py-3 text-center text-xs font-medium" style={{ color: '#6C757D', minWidth: '60px' }}>
                        {formatDateHeader(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankHistory.map((item: RankHistoryData, index: number) => (
                    <tr key={item.keyword_id} style={{ borderBottom: index < rankHistory.length - 1 ? '1px solid #E0E6ED' : 'none' }}>
                      <td className="sticky left-0 z-10 px-4 py-4" style={{ backgroundColor: '#FFFFFF' }}>
                        <div>
                          <div className="font-medium text-sm" style={{ color: '#1A1A1A' }}>
                            {item.keyword}
                          </div>
                          <div className="text-xs mt-1" style={{ color: '#6C757D' }}>
                            {item.domain.display_name || item.domain.domain_name} • {item.device_type}
                          </div>
                        </div>
                      </td>
                      {dateRange.slice(0, 30).map((date, dateIndex) => {
                        const historyData = item.history[date]
                        const position = historyData?.position
                        const previousData = dateIndex < dateRange.length - 1 ? item.history[dateRange[dateIndex + 1]] : null
                        const trend = getPositionTrend(position, previousData?.position)
                        
                        return (
                          <td key={date} className="px-3 py-4 text-center">
                            {position ? (
                              <div className="flex items-center justify-center space-x-1">
                                <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                                  {position}
                                </span>
                                {trend}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: '#6C757D' }}>-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}