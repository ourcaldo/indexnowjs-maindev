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
  Globe,
  Smartphone,
  Monitor,
  Tag
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
  // State for domain management (matching overview page)
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  
  // State for filters
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // State for date range
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Set default date range (30 days)
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch domains (matching overview page)
  const { data: domainsData } = useQuery({
    queryKey: ['/api/keyword-tracker/domains'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/domains', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch domains')
      return response.json()
    }
  })

  // Fetch countries (matching overview page)
  const { data: countriesData } = useQuery({
    queryKey: ['/api/keyword-tracker/countries'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/countries', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch countries')
      return response.json()
    }
  })

  // Fetch rank history data
  const { data: rankHistory = [], isLoading } = useQuery({
    queryKey: ['/api/keyword-tracker/rank-history', selectedDomainId, selectedDevice, selectedCountry, startDate, endDate],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomainId) params.append('domain_id', selectedDomainId)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      
      const response = await fetch(`/api/keyword-tracker/rank-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!startDate && !!endDate
  })

  // Fetch total keyword counts for each domain (matching overview page)
  const { data: keywordCountsData } = useQuery({
    queryKey: ['/api/keyword-tracker/keywords-counts'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/keywords?page=1&limit=1000', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch keyword counts')
      return response.json()
    }
  })

  const domains = domainsData?.data || []
  const countries = countriesData?.data || []
  const allKeywords = keywordCountsData?.data || []

  // Set default selected domain if none selected (matching overview page)
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Get selected domain info (matching overview page)
  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain (matching overview page)
  const getDomainKeywordCount = (domainId: string) => {
    return allKeywords.filter((k: any) => k.domain_id === domainId).length
  }

  const dateRange = startDate && endDate ? generateDateRange(startDate, endDate) : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="max-w-7xl mx-auto p-6">
        
        <div className="space-y-6">
          {/* Check if user has domains (matching overview page) */}
          {domains.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Globe className="w-16 h-16 mx-auto mb-4" style={{color: '#6C757D'}} />
                <h3 className="text-lg font-semibold mb-2" style={{color: '#1A1A1A'}}>
                  No Domains Added
                </h3>
                <p style={{color: '#6C757D'}} className="mb-6">
                  Add your first domain to start tracking keywords and view rank history.
                </p>
                <Button onClick={() => window.location.href = '/dashboard/indexnow/add'}>
                  Add Your First Domain
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Domain Section - Left Top Corner */}
              <div className="mb-6">
                <div className="inline-block">
                  <div 
                    className="bg-white rounded-lg border cursor-pointer px-3 py-2 shadow-sm hover:shadow-md transition-shadow min-w-[280px] max-w-[320px]"
                    style={{borderColor: '#E0E6ED'}}
                    onClick={() => setShowDomainsManager(!showDomainsManager)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" style={{color: '#6C757D'}} />
                        <span className="text-sm font-medium" style={{color: '#1A1A1A'}}>
                          {selectedDomainInfo ? (selectedDomainInfo.display_name || selectedDomainInfo.domain_name) : 'Select Domain'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedDomainInfo && (
                          <>
                            <span className="text-xs" style={{color: '#6C757D'}}>Keywords</span>
                            <span className="font-bold text-sm" style={{color: '#1A1A1A'}}>
                              {getDomainKeywordCount(selectedDomainInfo.id)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Domain Selection List */}
                    {showDomainsManager && (
                      <div className="border-t mt-2 pt-2" style={{borderColor: '#E0E6ED'}}>
                        <div className="space-y-1">
                          {domains.map((domain: any) => (
                            <div 
                              key={domain.id} 
                              className={`flex items-center justify-between py-1 px-2 text-xs rounded cursor-pointer hover:bg-gray-50 ${
                                selectedDomainId === domain.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDomainId(domain.id)
                                setShowDomainsManager(false)
                              }}
                            >
                              <span style={{color: '#1A1A1A'}}>
                                {domain.display_name || domain.domain_name}
                              </span>
                              <span style={{color: '#6C757D'}}>
                                {getDomainKeywordCount(domain.id)}
                              </span>
                            </div>
                          ))}
                          <div 
                            className="flex items-center py-1 px-2 text-xs rounded cursor-pointer hover:bg-gray-50 border-t"
                            style={{borderColor: '#E0E6ED', color: '#3D8BFF'}}
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = '/dashboard/indexnow/add'
                            }}
                          >
                            <span>+ Add New Domain</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Filters - Right Side */}
              <div className="flex justify-end mb-6">
                <div className="flex items-center space-x-3 bg-white rounded-xl border shadow-sm px-4 py-3" style={{ borderColor: '#E0E6ED' }}>
                  
                  {/* Date Range */}
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#6C757D' }} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e: any) => setStartDate(e.target.value)}
                      className="border-0 bg-transparent text-xs font-medium outline-none"
                      style={{ color: '#1A1A1A', width: '110px' }}
                    />
                    <span className="text-xs font-medium" style={{ color: '#6C757D' }}>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e: any) => setEndDate(e.target.value)}
                      className="border-0 bg-transparent text-xs font-medium outline-none"
                      style={{ color: '#1A1A1A', width: '110px' }}
                    />
                  </div>

                  <div className="w-px h-6" style={{ backgroundColor: '#E0E6ED' }}></div>
                  
                  {/* Device Filter */}
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED' }}>
                    {selectedDevice === 'mobile' ? 
                      <Smartphone className="w-4 h-4" style={{ color: '#6C757D' }} /> : 
                      <Monitor className="w-4 h-4" style={{ color: '#6C757D' }} />
                    }
                    <select
                      value={selectedDevice}
                      onChange={(e: any) => setSelectedDevice(e.target.value)}
                      className="border-0 bg-transparent text-xs font-medium outline-none"
                      style={{ color: '#1A1A1A', width: '80px' }}
                    >
                      <option value="">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>

                  <div className="w-px h-6" style={{ backgroundColor: '#E0E6ED' }}></div>

                  {/* Country Filter */}
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED' }}>
                    <Globe className="w-4 h-4" style={{ color: '#6C757D' }} />
                    <select
                      value={selectedCountry}
                      onChange={(e: any) => setSelectedCountry(e.target.value)}
                      className="border-0 bg-transparent text-xs font-medium outline-none"
                      style={{ color: '#1A1A1A', width: '100px' }}
                    >
                      <option value="">All Countries</option>
                      {countries.map((country: any) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
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
                    <Calendar className="w-16 h-16 mx-auto mb-4" style={{color: '#6C757D'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: '#1A1A1A'}}>
                      No Rank History Data
                    </h3>
                    <p style={{ color: '#6C757D' }} className="mb-4">
                      No rank history data found for the selected period and filters.
                    </p>
                    <div className="text-sm" style={{ color: '#6C757D' }}>
                      Try adjusting your date range or removing some filters.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E0E6ED' }}>
                          <th className="sticky left-0 z-10 px-4 py-3 text-left text-sm font-medium" style={{ backgroundColor: '#F7F9FC', color: '#1A1A1A' }}>
                            Keyword Details
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
                                <div className="text-xs mt-1 space-y-1" style={{ color: '#6C757D' }}>
                                  <div>{item.domain.display_name || item.domain.domain_name}</div>
                                  <div className="flex items-center space-x-2">
                                    {item.device_type === 'mobile' ? 
                                      <Smartphone className="w-3 h-3" /> : 
                                      <Monitor className="w-3 h-3" />
                                    }
                                    <span>{item.device_type}</span>
                                    {item.country && (
                                      <>
                                        <span>•</span>
                                        <span>{item.country.name}</span>
                                      </>
                                    )}
                                  </div>
                                  {(item as any).tags && (item as any).tags.length > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <Tag className="w-3 h-3" />
                                      <div className="flex flex-wrap gap-1">
                                        {(item as any).tags.map((tag: string, tagIndex: number) => (
                                          <span 
                                            key={tagIndex}
                                            className="px-1 py-0.5 rounded text-xs"
                                            style={{ backgroundColor: '#F0F9FF', color: '#0369A1', fontSize: '10px' }}
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {dateRange.slice(0, 30).map((date, dateIndex) => {
                              const historyData = item.history[date]
                              const position = historyData?.position
                              const previousData = dateIndex < dateRange.length - 1 ? item.history[dateRange[dateIndex + 1]] : null
                              const trend = getPositionTrend(position, previousData?.position || null)
                              
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}