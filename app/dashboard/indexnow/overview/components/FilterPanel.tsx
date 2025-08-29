import React from 'react'
import { Search, Filter, Trash2, Tag } from 'lucide-react'
import { Input, Select, Button } from '@/components/dashboard/ui'

interface Country {
  id: string
  name: string
  iso2_code: string
}

interface FilterPanelProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedDevice: string
  setSelectedDevice: (device: string) => void
  selectedCountry: string
  setSelectedCountry: (country: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  countries: Country[]
  selectedKeywords: string[]
  setShowActionsMenu: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowTagModal: (show: boolean) => void
  showActionsMenu: boolean
}

export const FilterPanel = ({
  searchTerm,
  setSearchTerm,
  selectedDevice,
  setSelectedDevice,
  selectedCountry,
  setSelectedCountry,
  selectedTags,
  setSelectedTags,
  countries,
  selectedKeywords,
  setShowActionsMenu,
  setShowDeleteConfirm,
  setShowTagModal,
  showActionsMenu
}: FilterPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: '#6C757D'}} />
            <Input
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Select 
            value={selectedDevice} 
            onValueChange={setSelectedDevice}
            placeholder="All Devices"
            className="w-[140px]"
          >
            <option value="">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </Select>
          
          <Select 
            value={selectedCountry} 
            onValueChange={setSelectedCountry}
            placeholder="All Countries"
            className="w-[140px]"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Row */}
      {selectedKeywords.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg" style={{backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED'}}>
          <span className="text-sm" style={{color: '#1A1A1A'}}>
            {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? 's' : ''} selected
          </span>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              style={{color: '#E63946', borderColor: '#E63946'}}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagModal(true)}
              style={{color: '#F0A202', borderColor: '#F0A202'}}
            >
              <Tag className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}