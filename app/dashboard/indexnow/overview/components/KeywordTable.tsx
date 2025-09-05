import React from 'react'
import { Check, Smartphone, Monitor, Globe, ExternalLink } from 'lucide-react'
import { Card, Badge } from '@/components/dashboard/ui'
import { PositionChange } from '@/components/dashboard/enhanced'

interface Keyword {
  id: string
  keyword: string
  current_position?: number | null
  position_1d?: number | null
  device_type: string
  country?: {
    iso2_code: string
    name: string
  }
  last_updated?: string
  url?: string
  tags?: string[]
}

interface KeywordTableProps {
  keywords: Keyword[]
  filteredKeywords: Keyword[]
  selectedKeywords: string[]
  handleKeywordSelect: (keywordId: string) => void
  handleSelectAll: () => void
  searchTerm: string
  keywordsLoading: boolean
}

export const KeywordTable = ({
  keywords,
  filteredKeywords,
  selectedKeywords,
  handleKeywordSelect,
  handleSelectAll,
  searchTerm,
  keywordsLoading
}: KeywordTableProps) => {
  if (keywordsLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: '#3D8BFF'}}></div>
        </div>
      </Card>
    )
  }

  if (filteredKeywords.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Globe className="w-16 h-16 mx-auto mb-4" style={{color: '#6C757D'}} />
          <h3 className="text-lg font-semibold mb-2" style={{color: '#1A1A1A'}}>
            {searchTerm ? 'No keywords found' : 'No keywords added'}
          </h3>
          <p style={{color: '#6C757D'}}>
            {searchTerm 
              ? `No keywords match "${searchTerm}" in this domain.`
              : 'Add keywords to start tracking their search positions.'
            }
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{backgroundColor: '#F7F9FC', borderBottom: '1px solid #E0E6ED'}}>
              <th className="px-6 py-3 text-left">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.length === filteredKeywords.length && filteredKeywords.length > 0}
                    onChange={handleSelectAll}
                    className="mr-3"
                  />
                  <span className="text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                    KEYWORD
                  </span>
                </label>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                POSITION
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                CHANGE (1D)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                DEVICE
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                TAGS
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                URL
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                COUNTRY
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium tracking-wider" style={{color: '#6C757D'}}>
                UPDATED
              </th>
            </tr>
          </thead>
          <tbody style={{backgroundColor: '#FFFFFF'}}>
            {filteredKeywords.map((keyword) => (
              <tr key={keyword.id} style={{borderBottom: '1px solid #E0E6ED'}}>
                <td className="p-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKeywords.includes(keyword.id)}
                      onChange={() => handleKeywordSelect(keyword.id)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-sm" style={{color: '#1A1A1A'}}>
                        {keyword.keyword}
                      </div>
                    </div>
                  </label>
                </td>
                <td className="p-3 text-center">
                  <span className="text-lg font-semibold" style={{color: '#1A1A1A'}}>
                    {keyword.current_position || '-'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <PositionChange change={keyword.position_1d ?? null} />
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center">
                    {keyword.device_type === 'mobile' ? (
                      <Smartphone className="w-4 h-4 mr-2" style={{color: '#6C757D'}} />
                    ) : (
                      <Monitor className="w-4 h-4 mr-2" style={{color: '#6C757D'}} />
                    )}
                    <span className="text-sm capitalize" style={{color: '#1A1A1A'}}>
                      {keyword.device_type}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {keyword.tags && keyword.tags.length > 0 ? (
                      keyword.tags.map((tag, index) => (
                        <Badge key={index} variant="default">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span style={{color: '#6C757D'}}>-</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center">
                  {keyword.url ? (
                    <a
                      href={keyword.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm hover:underline justify-center"
                      style={{color: '#3D8BFF'}}
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span style={{color: '#6C757D'}}>-</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs font-mono" style={{color: '#6C757D'}}>
                      {keyword.country?.iso2_code}
                    </span>
                    <span className="text-sm" style={{color: '#1A1A1A'}}>
                      {keyword.country?.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center">
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
    </Card>
  )
}