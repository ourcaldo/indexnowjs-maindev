'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Smartphone,
  Monitor,
  Globe,
  Tag,
  Calendar,
  ExternalLink,
  Trash2,
  Check,
  X
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'

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
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
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

const Input = ({ placeholder, className = '', value, onChange, ...props }: any) => (
  <input
    className={`flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      '--tw-ring-color': '#3D8BFF'
    }}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, placeholder, ...props }: any) => (
  <select 
    className="flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A'
    }}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
)

const Badge = ({ children, variant = 'default' }: any) => {
  const variants: { [key: string]: any } = {
    default: { backgroundColor: '#F7F9FC', color: '#6C757D' },
    success: { backgroundColor: '#4BB543', color: '#FFFFFF' },
    warning: { backgroundColor: '#F0A202', color: '#FFFFFF' },
    error: { backgroundColor: '#E63946', color: '#FFFFFF' }
  }
  
  return (
    <span 
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={variants[variant]}
    >
      {children}
    </span>
  )
}

// Position change indicator component
const PositionChange = ({ change }: { change: number | null }) => {
  if (change === null) return <span style={{color: '#6C757D'}}>-</span>
  
  if (change > 0) {
    return (
      <span className="inline-flex items-center" style={{color: '#4BB543'}}>
        <TrendingUp className="w-4 h-4 mr-1" />
        +{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className="inline-flex items-center" style={{color: '#E63946'}}>
        <TrendingDown className="w-4 h-4 mr-1" />
        {change}
      </span>
    )
  } else {
    return (
      <span className="inline-flex items-center" style={{color: '#6C757D'}}>
        <Minus className="w-4 h-4 mr-1" />
        0
      </span>
    )
  }
}

export default function IndexNowOverview() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showDomainsManager, setShowDomainsManager] = useState(false)
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  
  // New state for multiselect functionality
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)

  // Activity logging
  usePageViewLogger('/dashboard/indexnow/overview', 'Keywords Overview', { section: 'keyword_tracker' })
  const { logActivity } = useActivityLogger()

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

  // Fetch keywords with filters (for display)
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: ['/api/keyword-tracker/keywords', {
      domain_id: selectedDomainId || selectedDomain || undefined,
      device_type: selectedDevice || undefined,
      country_id: selectedCountry || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page: currentPage,
      limit: 20
    }],
    queryFn: async () => {
      const params = new URLSearchParams()
      const domainFilter = selectedDomainId || selectedDomain
      if (domainFilter) params.append('domain_id', domainFilter)
      if (selectedDevice) params.append('device_type', selectedDevice)
      if (selectedCountry) params.append('country_id', selectedCountry)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/keyword-tracker/keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch keywords')
      return response.json()
    }
  })

  // Fetch total keyword counts for each domain
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

  // Fetch ALL keywords for the selected domain for statistics calculation (independent of pagination)
  const { data: allDomainKeywordsData } = useQuery({
    queryKey: ['/api/keyword-tracker/keywords-stats', selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return { data: [] }
      
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.append('domain_id', selectedDomainId)
      params.append('limit', '1000') // Get all keywords for stats
      
      const response = await fetch(`/api/keyword-tracker/keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('Failed to fetch domain keywords for stats')
      return response.json()
    },
    enabled: !!selectedDomainId
  })

  const domains = domainsData?.data || []
  const countries = countriesData?.data || []
  const keywords = keywordsData?.data || []
  const allKeywords = keywordCountsData?.data || []
  const statsKeywords = allDomainKeywordsData?.data || [] // Keywords for statistics calculation

  // Set default selected domain if none selected
  useEffect(() => {
    if (!selectedDomainId && domains.length > 0) {
      setSelectedDomainId(domains[0].id)
    }
  }, [domains, selectedDomainId])

  // Clear selected keywords when domain changes
  useEffect(() => {
    setSelectedKeywords([])
  }, [selectedDomainId])

  // Functions for multiselect and bulk actions
  const handleKeywordSelect = (keywordId: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keywordId) 
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId]
    )
  }

  const handleSelectAll = () => {
    if (selectedKeywords.length === filteredKeywords.length) {
      setSelectedKeywords([])
    } else {
      setSelectedKeywords(filteredKeywords.map((k: any) => k.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedKeywords.length === 0) return
    
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/keywords/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keywordIds: selectedKeywords })
      })

      if (response.ok) {
        // Log activity
        await logActivity({
          eventType: 'keyword_bulk_delete',
          actionDescription: `Bulk deleted ${selectedKeywords.length} keywords from ${selectedDomainInfo?.domain_name || 'domain'}`,
          metadata: {
            keywordCount: selectedKeywords.length,
            domainId: selectedDomainId,
            domainName: selectedDomainInfo?.domain_name
          }
        })

        setSelectedKeywords([])
        refetchKeywords()
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      console.error('Failed to delete keywords:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTag = async () => {
    if (selectedKeywords.length === 0 || !newTag.trim()) return
    
    setIsAddingTag(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/keyword-tracker/keywords/add-tag', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          keywordIds: selectedKeywords,
          tag: newTag.trim()
        })
      })

      if (response.ok) {
        // Log activity
        await logActivity({
          eventType: 'keyword_tag_add',
          actionDescription: `Added tag "${newTag.trim()}" to ${selectedKeywords.length} keywords`,
          metadata: {
            tag: newTag.trim(),
            keywordCount: selectedKeywords.length,
            domainId: selectedDomainId,
            domainName: selectedDomainInfo?.domain_name
          }
        })

        setSelectedKeywords([])
        setNewTag('')
        refetchKeywords()
        setShowTagModal(false)
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    } finally {
      setIsAddingTag(false)
    }
  }

  // Get selected domain info
  const selectedDomainInfo = domains.find((d: any) => d.id === selectedDomainId)

  // Get keyword count for each domain
  const getDomainKeywordCount = (domainId: string) => {
    return allKeywords.filter((k: any) => k.domain_id === domainId).length
  }
  const pagination = keywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }

  // Filter keywords by search term
  const filteredKeywords = keywords.filter((keyword: any) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats calculation using ALL keywords for the domain (not affected by pagination)
  const totalKeywords = pagination.total
  const avgPosition = statsKeywords.length > 0 
    ? Math.round(statsKeywords.reduce((sum: number, k: any) => sum + (k.current_position || 100), 0) / statsKeywords.length) 
    : 0
  const topTenCount = statsKeywords.filter((k: any) => k.current_position && k.current_position <= 10).length
  const improvingCount = statsKeywords.filter((k: any) => k.position_1d && k.position_1d > 0).length

  return (
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
              Add your first domain to start tracking keywords and monitoring your search rankings.
            </p>
            <Button onClick={() => router.push('/dashboard/indexnow/add')}>
              Add Your First Domain
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Domain Section and Add Keyword Button - Same Row */}
          <div className="flex items-center justify-between mb-6">
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
                          router.push('/dashboard/indexnow/add')
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

            {/* Add Keyword Button */}
            <Button 
              onClick={() => router.push('/dashboard/indexnow/add')}
              style={{ backgroundColor: '#22333b', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Keyword
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>
                    Total Keywords
                  </p>
                  <p className="text-3xl font-bold" style={{color: '#1A1A1A'}}>
                    {totalKeywords.toLocaleString()}
                  </p>
                </div>
                <Search className="w-8 h-8" style={{color: '#3D8BFF'}} />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>
                    Average Position
                  </p>
                  <p className="text-3xl font-bold" style={{color: '#1A1A1A'}}>
                    {avgPosition}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8" style={{color: '#F0A202'}} />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>
                    Top 10 Rankings
                  </p>
                  <p className="text-3xl font-bold" style={{color: '#1A1A1A'}}>
                    {topTenCount}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#4BB543'}}>
                  <span className="text-white font-bold">10</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: '#6C757D'}}>
                    Improving (1D)
                  </p>
                  <p className="text-3xl font-bold" style={{color: '#1A1A1A'}}>
                    {improvingCount}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8" style={{color: '#4BB543'}} />
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5" style={{color: '#6C757D'}} />
                <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>Filters</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: '#6C757D'}} />
                    <Input
                      placeholder="Search keywords..."
                      value={searchTerm}
                      onChange={(e: any) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Domain Filter */}
                  <Select value={selectedDomain} onValueChange={setSelectedDomain} placeholder="All Domains">
                    {domains.map((domain: any) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.display_name || domain.domain_name}
                      </option>
                    ))}
                  </Select>

                  {/* Device Filter */}
                  <Select value={selectedDevice} onValueChange={setSelectedDevice} placeholder="All Devices">
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </Select>

                  {/* Country Filter */}
                  <Select value={selectedCountry} onValueChange={setSelectedCountry} placeholder="All Countries">
                    {countries.map((country: any) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </Select>
                </div>


              </div>
            </div>
          </Card>

          {/* Keywords Table */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
                    Keywords ({filteredKeywords.length})
                  </h3>
                  {selectedKeywords.length > 0 && (
                    <span className="text-sm" style={{color: '#6C757D'}}>
                      {selectedKeywords.length} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {selectedKeywords.length > 0 && (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="hover:bg-red-700"
                        style={{ 
                          backgroundColor: '#E63946', 
                          color: '#FFFFFF',
                          borderColor: '#E63946'
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete ({selectedKeywords.length})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowTagModal(true)}
                        style={{ 
                          backgroundColor: '#F0A202', 
                          color: '#FFFFFF', 
                          borderColor: '#F0A202' 
                        }}
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        Add Tag ({selectedKeywords.length})
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {keywordsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: '#3D8BFF'}}></div>
                </div>
              ) : filteredKeywords.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-16 h-16 mx-auto mb-4" style={{color: '#6C757D'}} />
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#1A1A1A'}}>
                    No Keywords Found
                  </h3>
                  <p style={{color: '#6C757D'}}>
                    {searchTerm ? 'Try adjusting your search or filters.' : 'Add some keywords to start tracking.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{borderBottom: '1px solid #E0E6ED'}}>
                        <th className="text-left p-3 font-medium w-12" style={{color: '#6C757D'}}>
                          <input
                            type="checkbox"
                            checked={selectedKeywords.length === filteredKeywords.length && filteredKeywords.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>Keyword</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>Position</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>1D</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>3D</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>7D</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>Volume</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>URL</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>Location</th>
                        <th className="text-left p-3 font-medium" style={{color: '#6C757D'}}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeywords.map((keyword: any) => (
                        <tr key={keyword.id} style={{borderBottom: '1px solid #E0E6ED'}}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedKeywords.includes(keyword.id)}
                              onChange={() => handleKeywordSelect(keyword.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-medium" style={{color: '#1A1A1A'}}>
                                {keyword.keyword}
                              </div>
                              <div className="flex items-center gap-2">
                                {keyword.device_type === 'mobile' ? (
                                  <Smartphone className="w-3 h-3" style={{color: '#6C757D'}} />
                                ) : (
                                  <Monitor className="w-3 h-3" style={{color: '#6C757D'}} />
                                )}
                                <span className="text-xs" style={{color: '#6C757D'}}>
                                  {keyword.domain?.display_name || keyword.domain?.domain_name}
                                </span>
                                {keyword.tags && keyword.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {keyword.tags.slice(0, 2).map((tag: string) => (
                                      <Badge key={tag} variant="default">{tag}</Badge>
                                    ))}
                                    {keyword.tags.length > 2 && (
                                      <Badge variant="default">+{keyword.tags.length - 2}</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-lg" style={{color: '#1A1A1A'}}>
                              {keyword.current_position || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <PositionChange change={keyword.position_1d} />
                          </td>
                          <td className="p-3">
                            <PositionChange change={keyword.position_3d} />
                          </td>
                          <td className="p-3">
                            <PositionChange change={keyword.position_7d} />
                          </td>
                          <td className="p-3">
                            <span style={{color: '#1A1A1A'}}>
                              {keyword.search_volume ? keyword.search_volume.toLocaleString() : '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            {keyword.current_url ? (
                              <a 
                                href={keyword.current_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm hover:underline"
                                style={{color: '#3D8BFF'}}
                              >
                                View
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span style={{color: '#6C757D'}}>-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono" style={{color: '#6C757D'}}>
                                {keyword.country?.iso2_code}
                              </span>
                              <span className="text-sm" style={{color: '#1A1A1A'}}>
                                {keyword.country?.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm" style={{color: '#6C757D'}}>
                              {keyword.last_updated 
                                ? new Date(keyword.last_updated).toLocaleDateString()
                                : '-'
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4" style={{borderTop: '1px solid #E0E6ED'}}>
                  <div className="text-sm" style={{color: '#6C757D'}}>
                    Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} keywords
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={pagination.page <= 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={pagination.page >= pagination.total_pages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{color: '#1A1A1A'}}>
              Delete Keywords
            </h3>
            <p className="mb-6" style={{color: '#6C757D'}}>
              Are you sure you want to delete {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{color: '#1A1A1A'}}>
              Add Tag to Keywords
            </h3>
            <p className="mb-4" style={{color: '#6C757D'}}>
              Add a tag to {selectedKeywords.length} selected keyword{selectedKeywords.length > 1 ? 's' : ''}:
            </p>
            <Input
              placeholder="Enter tag name..."
              value={newTag}
              onChange={(e: any) => setNewTag(e.target.value)}
              className="mb-6"
              onKeyPress={(e: any) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  handleAddTag()
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTagModal(false)
                  setNewTag('')
                }}
                disabled={isAddingTag}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddTag}
                disabled={isAddingTag || !newTag.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAddingTag ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {isAddingTag ? 'Adding...' : 'Add Tag'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}