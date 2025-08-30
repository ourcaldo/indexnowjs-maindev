'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { Card, Button } from '@/components/dashboard/ui'
import { 
  RankOverviewStats, 
  DomainSelector, 
  FilterPanel, 
  KeywordTable, 
  BulkActions, 
  Pagination 
} from './components'

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
      return response.json()
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

  // Fetch keywords with filters (for display)
  const { data: keywordsData, isLoading: keywordsLoading, refetch: refetchKeywords } = useQuery({
    queryKey: ['/api/v1/rank-tracking/keywords', {
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
      const response = await fetch(`/api/v1/rank-tracking/keywords?${params}`, {
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
    queryKey: ['/api/v1/rank-tracking/keywords-counts'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/v1/rank-tracking/keywords?page=1&limit=1000', {
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
    queryKey: ['/api/v1/rank-tracking/keywords-stats', selectedDomainId],
    queryFn: async () => {
      if (!selectedDomainId) return { data: [] }
      
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.append('domain_id', selectedDomainId)
      params.append('limit', '1000') // Get all keywords for stats
      
      const response = await fetch(`/api/v1/rank-tracking/keywords?${params}`, {
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
      const response = await fetch('/api/v1/rank-tracking/keywords/bulk-delete', {
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
      const response = await fetch('/api/v1/rank-tracking/keywords/add-tag', {
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
            <DomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              selectedDomainInfo={selectedDomainInfo}
              showDomainsManager={showDomainsManager}
              setShowDomainsManager={setShowDomainsManager}
              setSelectedDomainId={setSelectedDomainId}
              getDomainKeywordCount={getDomainKeywordCount}
            />

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
          <RankOverviewStats
            totalKeywords={totalKeywords}
            avgPosition={avgPosition}
            topTenCount={topTenCount}
            improvingCount={improvingCount}
          />

          {/* Filter and Keywords Section */}
          <div className="space-y-4">
            <FilterPanel
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedDevice={selectedDevice}
              setSelectedDevice={setSelectedDevice}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              countries={countries}
              selectedKeywords={selectedKeywords}
              setShowActionsMenu={setShowActionsMenu}
              setShowDeleteConfirm={setShowDeleteConfirm}
              setShowTagModal={setShowTagModal}
              showActionsMenu={showActionsMenu}
            />

            <div className="space-y-4">
              <KeywordTable
                keywords={keywords}
                filteredKeywords={filteredKeywords}
                selectedKeywords={selectedKeywords}
                handleKeywordSelect={handleKeywordSelect}
                handleSelectAll={handleSelectAll}
                searchTerm={searchTerm}
                keywordsLoading={keywordsLoading}
              />

              <Pagination
                pagination={pagination}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </div>
        </>
      )}

      {/* Bulk Actions Modals */}
      <BulkActions
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showTagModal={showTagModal}
        setShowTagModal={setShowTagModal}
        selectedKeywords={selectedKeywords}
        isDeleting={isDeleting}
        handleBulkDelete={handleBulkDelete}
        isAddingTag={isAddingTag}
        newTag={newTag}
        setNewTag={setNewTag}
        handleAddTag={handleAddTag}
      />
    </div>
  )
}