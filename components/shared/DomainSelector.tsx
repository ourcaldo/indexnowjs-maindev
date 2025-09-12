'use client'

import React from 'react'
import { Globe, Plus, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string
  domain_name: string
  display_name?: string
}

interface SharedDomainSelectorProps {
  domains: Domain[]
  selectedDomainId: string | null
  selectedDomainInfo: Domain | undefined
  isOpen: boolean
  onToggle: () => void
  onDomainSelect: (id: string) => void
  getDomainKeywordCount?: (domainId: string) => number
  showKeywordCount?: boolean
  className?: string
  addDomainRoute?: string
  placeholder?: string
}

export const SharedDomainSelector = ({
  domains,
  selectedDomainId,
  selectedDomainInfo,
  isOpen,
  onToggle,
  onDomainSelect,
  getDomainKeywordCount,
  showKeywordCount = true,
  className = '',
  addDomainRoute = '/dashboard/indexnow/add',
  placeholder = 'Select Domain'
}: SharedDomainSelectorProps) => {
  const router = useRouter()

  const handleDomainSelect = (domainId: string) => {
    onDomainSelect(domainId)
    onToggle() // Close dropdown
  }

  const handleAddDomain = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(addDomainRoute)
    onToggle() // Close dropdown
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] max-w-[320px]"
        onClick={onToggle}
        data-testid="domain-selector-trigger"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {selectedDomainInfo ? (selectedDomainInfo.display_name || selectedDomainInfo.domain_name) : placeholder}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDomainInfo && showKeywordCount && getDomainKeywordCount && (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400">Keywords</span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  {getDomainKeywordCount(selectedDomainInfo.id)}
                </span>
              </>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      
      {/* Domain Selection Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-h-60 overflow-y-auto"
             data-testid="domain-selector-dropdown">
          <div className="p-2">
            {domains.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                No domains available
              </div>
            ) : (
              <div className="space-y-1">
                {domains.map((domain) => (
                  <div 
                    key={domain.id} 
                    className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg cursor-pointer transition-colors duration-150 ${
                      selectedDomainId === domain.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDomainSelect(domain.id)
                    }}
                    data-testid={`domain-option-${domain.id}`}
                  >
                    <span className="font-medium truncate flex-1">
                      {domain.display_name || domain.domain_name}
                    </span>
                    {showKeywordCount && getDomainKeywordCount && (
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Keywords</span>
                        <span className={`font-bold px-2 py-1 rounded text-xs ${
                          selectedDomainId === domain.id
                            ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}>
                          {getDomainKeywordCount(domain.id)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Domain Button */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <button 
                className="w-full text-sm px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-150"
                onClick={handleAddDomain}
                data-testid="button-add-domain"
              >
                <Plus className="w-4 h-4" />
                Add New Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}