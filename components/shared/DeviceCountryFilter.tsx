import React from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Country {
  id: string
  name: string
}

interface DeviceCountryFilterProps {
  selectedDevice: string
  selectedCountry: string
  countries: Country[]
  onDeviceChange: (device: string) => void
  onCountryChange: (country: string) => void
  className?: string
  compact?: boolean
}

export const DeviceCountryFilter = ({
  selectedDevice,
  selectedCountry,
  countries,
  onDeviceChange,
  onCountryChange,
  className = '',
  compact = false
}: DeviceCountryFilterProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Device Filter */}
      <Select value={selectedDevice} onValueChange={onDeviceChange}>
        <SelectTrigger className={`${compact ? 'w-[140px]' : 'w-[180px]'} text-sm bg-background justify-start`} data-testid="select-device">
          <div className="flex items-center gap-2">
            {selectedDevice === 'desktop' && <Monitor className="w-3 h-3" />}
            {selectedDevice === 'mobile' && <Smartphone className="w-3 h-3" />}
            {!selectedDevice && <Monitor className="w-3 h-3 text-muted-foreground" />}
            <SelectValue placeholder="All Devices" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex items-center gap-2">
              <Monitor className="w-3 h-3 text-muted-foreground" />
              <span>All Devices</span>
            </div>
          </SelectItem>
          <SelectItem value="desktop">
            <div className="flex items-center gap-2">
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </div>
          </SelectItem>
          <SelectItem value="mobile">
            <div className="flex items-center gap-2">
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Country Filter */}
      <Select value={selectedCountry} onValueChange={onCountryChange}>
        <SelectTrigger className={`${compact ? 'w-[150px]' : 'min-w-[180px] max-w-[220px]'} text-sm bg-background`} data-testid="select-country">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <span>All Countries</span>
          </SelectItem>
          {countries.map((country: Country) => (
            <SelectItem key={country.id} value={country.id}>
              <span className="truncate">{country.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}