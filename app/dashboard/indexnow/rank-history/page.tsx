'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { useDashboardData } from '@/hooks/useDashboardData'
import { NoDomainState } from '@/components/shared/NoDomainState'
import { SharedDomainSelector } from '@/components/shared/DomainSelector'
import { RankOverviewStats } from '@/app/dashboard/indexnow/overview/components/RankOverviewStats'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Calendar, 
  Search,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

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

// Format date for display (e.g., "13/09")
const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

export default function RankHistoryPage() {
  const router = useRouter()
  
  // Activity logging
  usePageViewLogger('/dashboard/indexnow/rank-history', 'Rank History', { section: 'keyword_tracker' })

  // State for domain management
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  
  // State for filters
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
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
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '30d':
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '60d':
        startDate = new Date(today.getTime() - 59 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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

  // Use merged dashboard API for better performance and to prevent loading glitches
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData()

  // Fetch domains with keyword counts (better than dashboard API for accurate counts)
  const { data: domainsWithCounts = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['/api/v1/rank-tracking/domains'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/v1/rank-tracking/domains', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch domains')
      const data = await response.json()
      return data.success ? data.data : []
    }
  })

  // Fetch countries
  const { data: countriesData } = useQuery({
    queryKey: ['/api/v1/rank-tracking/countries'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/v1/rank-tracking/countries', {
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
    queryKey: ['/api/v1/rank-tracking/rank-history', selectedDomainId, selectedDevice, selectedCountry, startDate, endDate],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      if (selectedDomainId) params.append('domain_id', selectedDomainId)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('limit', '1000')
      
      const response = await fetch(`/api/v1/rank-tracking/rank-history?${params}`, {
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

  const domains = domainsWithCounts || []
  const countries = countriesData?.data || []

  // Set default selected domain
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Get selected domain info
  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain (now using domains API with keyword counts)
  const getDomainKeywordCount = (domainId: string) => {
    const domain = domains.find((d: any) => d.id === domainId)
    // Supabase returns count as [{ count: number }] array structure
    return domain?.keyword_count?.[0]?.count || 0
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

  // Calculate stats for RankOverviewStats
  const statsData = {
    totalKeywords: filteredData.length,
    avgPosition: (() => {
      if (filteredData.length === 0) return 0
      const itemsWithPosition = filteredData.filter((item: RankHistoryData) => {
        const latestDate = dateColumns[0]
        return latestDate && item.history[latestDate]?.position
      })
      if (itemsWithPosition.length === 0) return 0
      const totalPositions = filteredData.reduce((acc: number, item: RankHistoryData) => {
        const latestDate = dateColumns[0]
        const position = latestDate ? item.history[latestDate]?.position : null
        return position ? acc + position : acc
      }, 0)
      return Math.round(totalPositions / itemsWithPosition.length)
    })(),
    topTenCount: filteredData.filter((item: RankHistoryData) => {
      const latestDate = dateColumns[0]
      const position = latestDate ? item.history[latestDate]?.position : null
      return position && position <= 10
    }).length,
    improvingCount: filteredData.filter((item: RankHistoryData) => {
      const latestDate = dateColumns[0]
      const previousDate = dateColumns[1]
      if (!latestDate || !previousDate) return false
      const currentPos = item.history[latestDate]?.position
      const previousPos = item.history[previousDate]?.position
      return currentPos && previousPos && currentPos < previousPos
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Check if user has domains */}
      {(dashboardLoading || domainsLoading) ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : domains.length === 0 ? (
        <NoDomainState 
          title="No Domains Added"
          description="Add your first domain to start tracking keywords and view rank history."
          buttonText="Add Your First Domain"
          redirectRoute="/dashboard/indexnow/add"
        />
      ) : (
        <>
          {/* Domain Section and Add Keyword Button - Same Row */}
          <div className="flex items-center justify-between mb-6">
            <SharedDomainSelector 
                  domains={domains}
                  selectedDomainId={selectedDomainId}
                  selectedDomainInfo={selectedDomainInfo}
                  isOpen={showDomainsManager}
                  onToggle={() => setShowDomainsManager(!showDomainsManager)}
                  onDomainSelect={setSelectedDomainId}
                  getDomainKeywordCount={getDomainKeywordCount}
                  showKeywordCount={true}
                  addDomainRoute="/dashboard/indexnow/add"
                  data-testid="rank-history-domain-selector"
                />

                {/* Device and Country Filters + Add Keyword Button */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="select-device"
                  >
                    <option value="">All Devices</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                  
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid="select-country"
                  >
                    <option value="">All Countries</option>
                    {countries.map((country: any) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>

                  <Button 
                    onClick={() => router.push('/dashboard/indexnow/add')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-add-keyword"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Keyword
                  </Button>
                </div>
              </div>

              {/* Rank Overview Stats Widget - Always show when domain is selected */}
              {selectedDomainId && (
                <RankOverviewStats 
                  totalKeywords={statsData.totalKeywords}
                  avgPosition={statsData.avgPosition}
                  topTenCount={statsData.topTenCount}
                  improvingCount={statsData.improvingCount}
                />
              )}

              {/* Filters Section - Reordered: Search (60-70%) → Date → Tags */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar - 60-70% width */}
                    <div className="flex-1 min-w-[250px] max-w-[60%]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search keywords..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 text-sm"
                          data-testid="input-search"
                        />
                      </div>
                    </div>

                    {/* Date Range Filter */}
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
                            data-testid={`filter-date-${range}`}
                          >
                            {range.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                      
                      {/* Custom Date Range Picker */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant={dateRange === 'custom' ? 'default' : 'outline'}
                          onClick={() => {
                            setDateRange('custom')
                            setShowDatePicker(!showDatePicker)
                          }}
                          className="flex items-center gap-1"
                          data-testid="filter-date-custom"
                        >
                          <Calendar className="w-3 h-3" />
                          {dateRange === 'custom' && appliedCustomDates 
                            ? `${new Date(appliedCustomDates.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(appliedCustomDates.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'Custom'
                          }
                        </Button>
                        
                        {showDatePicker && (
                          <div className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-foreground">
                                Select Date Range
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">From</label>
                                  <Input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="text-xs"
                                    data-testid="date-from"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">To</label>
                                  <Input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="text-xs"
                                    data-testid="date-to"
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
                                  data-testid="button-date-cancel"
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
                                  data-testid="button-date-apply"
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags Filter Icon */}
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                        className="flex items-center gap-1 min-w-[100px] justify-between"
                        data-testid="filter-tags-dropdown"
                      >
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Tags {selectedTags.length > 0 && `(${selectedTags.length})`}</span>
                        </div>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      
                      {showTagsDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 min-w-[200px] max-h-[200px] overflow-y-auto">
                          <div className="p-2">
                            {availableTags.length === 0 ? (
                              <div className="text-xs text-muted-foreground py-2">No tags available</div>
                            ) : (
                              availableTags.map((tag: string) => (
                                <label 
                                  key={tag} 
                                  className="flex items-center gap-2 py-1 px-2 text-xs hover:bg-accent cursor-pointer rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTags.includes(tag)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTags([...selectedTags, tag])
                                      } else {
                                        setSelectedTags(selectedTags.filter(t => t !== tag))
                                      }
                                    }}
                                    className="rounded border-input"
                                    data-testid={`tag-${tag}`}
                                  />
                                  <span className="text-foreground">{tag}</span>
                                </label>
                              ))
                            )}
                            
                            {selectedTags.length > 0 && (
                              <div className="border-t pt-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTags([])}
                                  className="text-xs w-full"
                                  data-testid="button-clear-tags"
                                >
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pagination Info */}
              <div className="flex justify-end items-center">
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span className="text-sm text-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rank History Table */}
              <Card>
                <CardHeader className="py-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Rank History</CardTitle>
                    <span className="text-xs text-muted-foreground" data-testid="text-results-info">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} keywords
                    </span>
                  </div>
                </CardHeader>
                <div className="border-t border-border"></div>
                <CardContent className="pt-1 pb-1">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading rank history...</p>
                    </div>
                  ) : paginatedData.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No rank history data found for the selected filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="relative">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/40" style={{backgroundColor: 'var(--muted)'}}>
                              <th className="text-left py-1 px-2 sticky left-0 z-10 text-xs font-bold uppercase tracking-wider" style={{width: '200px', minWidth: '200px', backgroundColor: 'var(--table-frozen-column)', color: 'var(--table-frozen-column-foreground)'}}>
                                Keyword
                              </th>
                              {dateColumns.map((date) => (
                                <th key={date} className="text-center py-1 px-1 text-xs font-bold uppercase tracking-wider" style={{minWidth: '50px', color: 'var(--foreground)'}}>
                                  {formatDateHeader(date)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedData.map((item: RankHistoryData) => (
                              <tr key={item.keyword_id} className="border-b border-border/30 hover:bg-muted/30" data-testid={`row-keyword-${item.keyword_id}`}>
                                <td className="py-1 px-2 sticky left-0 z-10" style={{width: '200px', minWidth: '200px', backgroundColor: 'var(--table-frozen-column)'}}>
                                  <div className="font-medium text-sm truncate" style={{color: 'var(--table-frozen-column-foreground)'}}>
                                    {item.keyword}
                                  </div>
                                </td>
                                {dateColumns.map((date, dateIndex) => {
                                  const dayData = item.history[date]
                                  const position = dayData?.position
                                  
                                  // Get previous day's position for trend comparison
                                  const previousDate = dateColumns[dateIndex + 1] // Next index since dates are reversed
                                  const previousDayData = previousDate ? item.history[previousDate] : null
                                  const previousPosition = previousDayData?.position
                                  
                                  // Calculate trend (positive means improved - lower number)
                                  const trend = position && previousPosition ? 
                                    previousPosition - position : null
                                  
                                  return (
                                    <td key={date} className="text-center py-1 px-0.5 text-xs" data-testid={`cell-${item.keyword_id}-${date}`}>
                                      {position ? (
                                        <div className="flex items-center justify-center gap-0.5">
                                          <span className={`font-semibold text-xs inline-flex items-center justify-center w-6 h-5 rounded ${
                                            position <= 3 ? 'text-white bg-green-500' :
                                            position <= 10 ? 'text-white bg-blue-500' :
                                            position <= 50 ? 'text-white bg-orange-500' :
                                            'text-white bg-red-500'
                                          }`}>
                                            {position}
                                          </span>
                                          {trend !== null && trend !== 0 && (
                                            <div className="ml-0.5">
                                              {trend > 0 ? (
                                                <TrendingUp className="w-2.5 h-2.5 text-green-600 dark:text-green-400" data-testid="trend-up" />
                                              ) : (
                                                <TrendingDown className="w-2.5 h-2.5 text-red-600 dark:text-red-400" data-testid="trend-down" />
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
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
                </CardContent>
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
                      data-testid="button-pagination-prev"
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
                            data-testid={`button-page-${pageNum}`}
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
                      data-testid="button-pagination-next"
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
  )
}