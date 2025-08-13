'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  Smartphone,
  Monitor,
  Tag,
  X,
  Plus
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

interface Domain {
  id: string
  domain_name: string
  display_name: string
}

interface RankHistoryData {
  keyword_id: string
  keyword: string
  device_type: string
  tags: string[]
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

export default function RankHistoryPage() {
  // State for domain management
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  
  // State for filters
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // State for date range and pagination
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '60d' | 'custom'>('30d')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [appliedCustomDates, setAppliedCustomDates] = useState<{start: string, end: string} | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 20

  // Calculate actual date range based on selection
  const getDateRange = () => {
    const today = new Date()
    let startDate: string
    let endDate: string = today.toISOString().split('T')[0]
    
    switch (dateRange) {
      case '7d':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '30d':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '60d':
        startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'custom':
        if (appliedCustomDates) {
          startDate = appliedCustomDates.start
          endDate = appliedCustomDates.end
        } else {
          // Don't return dates until custom dates are applied
          return { startDate: '', endDate: '' }
        }
        break
      default:
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    
    return { startDate, endDate }
  }

  const { startDate, endDate } = getDateRange()

  // Fetch domains
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

  // Fetch countries
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

  // Get all keywords for domain (for keyword count - not affected by filters)
  const { data: allDomainKeywords = [] } = useQuery({
    queryKey: ['/api/keyword-tracker/keywords', selectedDomainId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomainId) params.append('domain_id', selectedDomainId)
      params.append('limit', '1000') // Get all keywords for count
      
      const response = await fetch(`/api/keyword-tracker/keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!selectedDomainId
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
      params.append('limit', '1000')
      
      const response = await fetch(`/api/keyword-tracker/rank-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      return data.success ? data.data : []
    },
    enabled: !!startDate && !!endDate && !!selectedDomainId
  })

  const domains = domainsData?.data || []
  const countries = countriesData?.data || []

  // Set default selected domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Get selected domain info
  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain (from all keywords, not affected by filters)
  const getDomainKeywordCount = (domainId: string) => {
    if (domainId === selectedDomainId && allDomainKeywords) {
      return allDomainKeywords.length
    }
    // For non-selected domains, we'll show 0 since we don't have their data
    return 0
  }

  // Filter and search logic
  const filteredData = rankHistory.filter((item: RankHistoryData) => {
    // Search filter
    if (searchQuery && !item.keyword.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Tags filter
    if (selectedTags.length > 0) {
      const hasMatchingTag = selectedTags.some(tag => 
        item.tags?.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
      )
      if (!hasMatchingTag) return false
    }
    
    return true
  })

  // Pagination logic
  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Get unique tags for filter
  const availableTags = Array.from(new Set(
    rankHistory.flatMap((item: RankHistoryData) => item.tags || [])
  )).filter(Boolean) as string[]

  const dateColumns = startDate && endDate ? generateDateRange(startDate, endDate) : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="max-w-7xl mx-auto p-6">
        
        <div className="space-y-6">
          {/* Check if user has domains */}
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
              {/* Selected Domain Card - Shows active domain */}
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
                            <span className="font-medium truncate" style={{color: '#1A1A1A'}}>
                              {domain.display_name || domain.domain_name}
                            </span>
                            <div className="flex items-center gap-1 ml-2">
                              <span style={{color: '#6C757D'}}>Keywords</span>
                              <span className="font-bold px-1 py-0.5 rounded text-xs" style={{color: '#1A1A1A', backgroundColor: '#F7F9FC'}}>
                                {getDomainKeywordCount(domain.id)}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {/* Add Domain Button */}
                        <div className="pt-1 border-t" style={{borderColor: '#E0E6ED'}}>
                          <button 
                            className="text-xs px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
                            style={{color: '#6C757D'}}
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = '/dashboard/indexnow/add'
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            Add Domain
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Filters Section - One Line */}
              <Card>
                <div className="flex flex-wrap items-center gap-4">
                  {/* Date Range */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {['7d', '30d', '60d'].map((range) => (
                        <Button
                          key={range}
                          size="sm"
                          variant={dateRange === range ? 'default' : 'outline'}
                          onClick={() => {
                            setDateRange(range as any)
                            setShowDatePicker(false)
                          }}
                        >
                          {range.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Single Date Range Picker */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant={dateRange === 'custom' ? 'default' : 'outline'}
                        onClick={() => {
                          setDateRange('custom')
                          setShowDatePicker(!showDatePicker)
                        }}
                        className="flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        {dateRange === 'custom' && appliedCustomDates 
                          ? `${new Date(appliedCustomDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(appliedCustomDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'Custom'
                        }
                      </Button>
                      
                      {showDatePicker && (
                        <div 
                          className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
                          style={{border: '1px solid #E0E6ED'}}
                        >
                          <div className="space-y-3">
                            <div className="text-sm font-medium" style={{color: '#1A1A1A'}}>
                              Select Date Range
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs" style={{color: '#6C757D'}}>From</label>
                                <Input
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e: any) => setCustomStartDate(e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs" style={{color: '#6C757D'}}>To</label>
                                <Input
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e: any) => setCustomEndDate(e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setShowDatePicker(false)
                                  setCustomStartDate('')
                                  setCustomEndDate('')
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (customStartDate && customEndDate) {
                                    setAppliedCustomDates({ start: customStartDate, end: customEndDate })
                                  }
                                  setShowDatePicker(false)
                                }}
                                disabled={!customStartDate || !customEndDate}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device Filter */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={selectedDevice === '' ? 'default' : 'outline'}
                      onClick={() => setSelectedDevice('')}
                    >
                      <Monitor className="w-3 h-3 mr-1" />
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedDevice === 'desktop' ? 'default' : 'outline'}
                      onClick={() => setSelectedDevice('desktop')}
                    >
                      <Monitor className="w-3 h-3 mr-1" />
                      Desktop
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedDevice === 'mobile' ? 'default' : 'outline'}
                      onClick={() => setSelectedDevice('mobile')}
                    >
                      <Smartphone className="w-3 h-3 mr-1" />
                      Mobile
                    </Button>
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Search keywords..."
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      className="w-40 text-sm"
                    />
                  </div>

                  {/* Tags Multi-Select Dropdown */}
                  <div className="relative">
                    <select
                      multiple
                      value={selectedTags}
                      onChange={(e: any) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, (option: any) => option.value)
                        setSelectedTags(selectedOptions)
                      }}
                      className="w-32 text-sm h-9 rounded-md px-3 py-2 border border-gray-300 bg-white text-gray-900"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E0E6ED',
                        color: '#1A1A1A'
                      }}
                      size={1}
                    >
                      {availableTags.map((tag: string) => (
                        <option key={tag} value={tag} selected={selectedTags.includes(tag)}>
                          {selectedTags.includes(tag) ? `✓ ${tag}` : tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              {/* Results and Pagination Info */}
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{color: '#6C757D'}}>
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} keywords
                </span>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span className="text-sm" style={{color: '#1A1A1A'}}>
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rank History Table */}
              <Card>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: '#3D8BFF'}}></div>
                    <p className="mt-2" style={{color: '#6C757D'}}>Loading rank history...</p>
                  </div>
                ) : paginatedData.length === 0 ? (
                  <div className="text-center py-8">
                    <p style={{color: '#6C757D'}}>No rank history data found for the selected filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="relative">
                      <table className="w-full">
                        <thead>
                          <tr style={{borderBottom: '1px solid #E0E6ED'}}>
                            <th 
                              className="text-left py-3 px-2 sticky left-0 z-10" 
                              style={{
                                color: '#1A1A1A', 
                                backgroundColor: '#F0F4F8', 
                                width: '200px',
                                minWidth: '200px'
                              }}
                            >
                              Keyword
                            </th>
                            {dateColumns.map((date) => (
                              <th key={date} className="text-center py-3 px-2 text-xs" style={{color: '#6C757D', minWidth: '60px'}}>
                                {formatDateHeader(date)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.map((item: RankHistoryData, index: number) => (
                            <tr key={item.keyword_id} style={{borderBottom: '1px solid #F0F4F8'}}>
                              <td 
                                className="py-3 px-2 sticky left-0 z-10" 
                                style={{
                                  backgroundColor: '#F8FAFC', 
                                  borderRight: '1px solid #E0E6ED',
                                  width: '200px',
                                  minWidth: '200px'
                                }}
                              >
                                <div className="font-medium text-sm" style={{color: '#1A1A1A'}}>
                                  {item.keyword}
                                </div>
                              </td>
                              {dateColumns.map((date) => {
                                const dayData = item.history[date]
                                const position = dayData?.position
                                return (
                                  <td key={date} className="text-center py-3 px-2 text-sm">
                                    {position ? (
                                      <span className={`font-medium ${
                                        position <= 3 ? 'text-green-600' :
                                        position <= 10 ? 'text-blue-600' :
                                        position <= 50 ? 'text-orange-600' :
                                        'text-red-600'
                                      }`}>
                                        {position}
                                      </span>
                                    ) : (
                                      <span style={{color: '#E0E6ED'}}>-</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}