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
  Edit,
  Settings
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

  // Fetch domains
  const { data: domainsData, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
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
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
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

  // Fetch keywords with filters
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: ['/api/keyword-tracker/keywords', {
      domain_id: selectedDomain || undefined,
      device_type: selectedDevice || undefined,
      country_id: selectedCountry || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      page: currentPage,
      limit: 20
    }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedDomain) params.append('domain_id', selectedDomain)
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

  const domains = domainsData?.data || []
  const countries = countriesData?.data || []
  const keywords = keywordsData?.data || []
  const pagination = keywordsData?.pagination || { page: 1, total: 0, total_pages: 1 }

  // Filter keywords by search term
  const filteredKeywords = keywords.filter((keyword: any) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats calculation
  const totalKeywords = pagination.total
  const avgPosition = keywords.length > 0 
    ? Math.round(keywords.reduce((sum: number, k: any) => sum + (k.current_position || 100), 0) / keywords.length) 
    : 0
  const topTenCount = keywords.filter((k: any) => k.current_position && k.current_position <= 10).length
  const improvingCount = keywords.filter((k: any) => k.position_1d && k.position_1d > 0).length

  return (
    <div className="space-y-6">
      {/* Domains Section - Show when user has domains */}
      {domains.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
              Your Domains
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/dashboard/indexnow/add')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain: any) => (
              <div 
                key={domain.id} 
                className="p-4 rounded-lg border hover:shadow-sm transition-all duration-200 cursor-pointer"
                style={{backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED'}}
                onClick={() => setSelectedDomain(domain.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 mr-3" style={{color: '#3D8BFF'}} />
                    <div>
                      <p className="font-medium" style={{color: '#1A1A1A'}}>
                        {domain.domain}
                      </p>
                      <p className="text-xs" style={{color: '#6C757D'}}>
                        Added {new Date(domain.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Check if user has domains - show empty state when no domains */}
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

          {/* Filters Section */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: '#1A1A1A'}}>
                  Domain
                </label>
                <Select 
                  value={selectedDomain} 
                  onValueChange={setSelectedDomain}
                  placeholder="All domains"
                >
                  {domains.map((domain: any) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.domain}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: '#1A1A1A'}}>
                  Device Type
                </label>
                <Select 
                  value={selectedDevice} 
                  onValueChange={setSelectedDevice}
                  placeholder="All devices"
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: '#1A1A1A'}}>
                  Country
                </label>
                <Select 
                  value={selectedCountry} 
                  onValueChange={setSelectedCountry}
                  placeholder="All countries"
                >
                  {countries.map((country: any) => (
                    <option key={country.id} value={country.id}>
                      {country.country_name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block" style={{color: '#1A1A1A'}}>
                  Search Keywords
                </label>
                <Input
                  placeholder="Search keywords..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Keywords Table */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
                Keywords Performance
              </h3>
              <Button onClick={() => router.push('/dashboard/indexnow/add')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Keywords
              </Button>
            </div>

            {keywordsLoading ? (
              <div className="text-center py-8">
                <p style={{color: '#6C757D'}}>Loading keywords...</p>
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto mb-4" style={{color: '#6C757D'}} />
                <p style={{color: '#6C757D'}}>No keywords found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{borderBottom: '1px solid #E0E6ED'}}>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        Keyword
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        Domain
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        Position
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        1D Change
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        3D Change
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        7D Change
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        Device
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{color: '#6C757D'}}>
                        Country
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKeywords.map((keyword: any, index: number) => (
                      <tr 
                        key={keyword.id} 
                        className="hover:bg-gray-50"
                        style={{
                          borderBottom: index < filteredKeywords.length - 1 ? '1px solid #E0E6ED' : 'none'
                        }}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span className="font-medium" style={{color: '#1A1A1A'}}>
                              {keyword.keyword}
                            </span>
                            {keyword.tags && keyword.tags.length > 0 && (
                              <div className="ml-2 flex gap-1">
                                {keyword.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                  <Badge key={tagIndex} variant="default">
                                    {tag}
                                  </Badge>
                                ))}
                                {keyword.tags.length > 2 && (
                                  <Badge variant="default">
                                    +{keyword.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span style={{color: '#6C757D'}}>
                            {domains.find((d: any) => d.id === keyword.domain_id)?.domain || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold" style={{color: '#1A1A1A'}}>
                            {keyword.current_position || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <PositionChange change={keyword.position_1d} />
                        </td>
                        <td className="py-3 px-4">
                          <PositionChange change={keyword.position_3d} />
                        </td>
                        <td className="py-3 px-4">
                          <PositionChange change={keyword.position_7d} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {keyword.device_type === 'mobile' ? (
                              <Smartphone className="w-4 h-4 mr-1" style={{color: '#6C757D'}} />
                            ) : (
                              <Monitor className="w-4 h-4 mr-1" style={{color: '#6C757D'}} />
                            )}
                            <span style={{color: '#6C757D'}} className="capitalize">
                              {keyword.device_type || 'desktop'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span style={{color: '#6C757D'}}>
                            {countries.find((c: any) => c.id === keyword.country_id)?.country_name || 'N/A'}
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
              <div className="flex justify-between items-center mt-6 pt-6" style={{borderTop: '1px solid #E0E6ED'}}>
                <p style={{color: '#6C757D'}} className="text-sm">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} keywords
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                    disabled={currentPage === pagination.total_pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}