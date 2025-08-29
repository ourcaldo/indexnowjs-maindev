import React from 'react'
import { Globe, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface DomainSelectorProps {
  domains: Domain[]
  selectedDomainId: string | null
  selectedDomainInfo: Domain | undefined
  showDomainsManager: boolean
  setShowDomainsManager: (show: boolean) => void
  setSelectedDomainId: (id: string) => void
  getDomainKeywordCount: (domainId: string) => number
}

export const DomainSelector = ({
  domains,
  selectedDomainId,
  selectedDomainInfo,
  showDomainsManager,
  setShowDomainsManager,
  setSelectedDomainId,
  getDomainKeywordCount
}: DomainSelectorProps) => {
  const router = useRouter()

  return (
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
              {domains.map((domain) => (
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
  )
}