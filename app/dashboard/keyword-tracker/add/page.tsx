'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Globe, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// Simple UI Components using project color scheme
const Card = ({ children, className = '' }: any) => (
  <div className={`p-6 rounded-lg ${className}`} style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}>
    {children}
  </div>
)

const Button = ({ children, variant = 'default', size = 'default', className = '', onClick, disabled, loading, ...props }: any) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variants: { [key: string]: any } = {
    default: { backgroundColor: '#1C2331', color: '#FFFFFF' },
    secondary: { backgroundColor: '#F7F9FC', color: '#1A1A1A', border: '1px solid #E0E6ED' },
    outline: { backgroundColor: 'transparent', color: '#6C757D', border: '1px solid #E0E6ED' },
    ghost: { backgroundColor: 'transparent', color: '#6C757D' },
    destructive: { backgroundColor: '#E63946', color: '#FFFFFF' }
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
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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

const Textarea = ({ placeholder, className = '', value, onChange, rows = 4, ...props }: any) => (
  <textarea
    className={`flex w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      '--tw-ring-color': '#3D8BFF'
    }}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    rows={rows}
    {...props}
  />
)

const Select = ({ children, value, onValueChange, placeholder, disabled, ...props }: any) => (
  <select 
    className="flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      '--tw-ring-color': '#3D8BFF'
    }}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    disabled={disabled}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
)

const Label = ({ children, className = '' }: any) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} style={{color: '#1A1A1A'}}>
    {children}
  </label>
)

const Alert = ({ children, variant = 'default' }: any) => {
  const variants: { [key: string]: any } = {
    default: { backgroundColor: '#F7F9FC', borderColor: '#E0E6ED', color: '#1A1A1A' },
    destructive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' },
    success: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', color: '#065F46' }
  }
  
  return (
    <div 
      className="relative w-full rounded-lg border p-4"
      style={{
        backgroundColor: variants[variant].backgroundColor,
        borderColor: variants[variant].borderColor,
        color: variants[variant].color
      }}
    >
      {children}
    </div>
  )
}

export default function AddKeywords() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Form state
  const [step, setStep] = useState(1) // 1: Domain, 2: Keywords
  const [selectedDomain, setSelectedDomain] = useState('')
  const [newDomainName, setNewDomainName] = useState('')
  const [keywordText, setKeywordText] = useState('')
  const [deviceType, setDeviceType] = useState('desktop')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [tagText, setTagText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Fetch domains
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['/api/keyword-tracker/domains'],
    queryFn: async () => {
      const response = await fetch('/api/keyword-tracker/domains')
      if (!response.ok) throw new Error('Failed to fetch domains')
      return response.json()
    }
  })

  // Fetch countries
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['/api/keyword-tracker/countries'],
    queryFn: async () => {
      const response = await fetch('/api/keyword-tracker/countries')
      if (!response.ok) throw new Error('Failed to fetch countries')
      return response.json()
    }
  })

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async (domainData: { domain_name: string; display_name?: string }) => {
      const response = await fetch('/api/keyword-tracker/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domainData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create domain')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/keyword-tracker/domains'] })
      setSelectedDomain(data.data.id)
      setNewDomainName('')
      setErrors({ ...errors, domain: '' })
    },
    onError: (error: Error) => {
      setErrors({ ...errors, domain: error.message })
    }
  })

  // Add keywords mutation
  const addKeywordsMutation = useMutation({
    mutationFn: async (keywordData: any) => {
      const response = await fetch('/api/keyword-tracker/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add keywords')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/keyword-tracker/keywords'] })
      router.push('/dashboard/keyword-tracker/overview')
    },
    onError: (error: Error) => {
      setErrors({ ...errors, keywords: error.message })
    }
  })

  const domains = domainsData?.data || []
  const countries = countriesData?.data || []

  // Parse keywords from textarea
  const getKeywordsList = () => {
    return keywordText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  const handleCreateDomain = () => {
    if (!newDomainName.trim()) {
      setErrors({ ...errors, domain: 'Domain name is required' })
      return
    }

    createDomainMutation.mutate({
      domain_name: newDomainName.trim(),
      display_name: newDomainName.trim()
    })
  }

  const handleAddTag = () => {
    if (tagText.trim() && !tags.includes(tagText.trim())) {
      setTags([...tags, tagText.trim()])
      setTagText('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmitKeywords = () => {
    const keywordsList = getKeywordsList()
    
    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!selectedDomain) newErrors.domain = 'Please select a domain'
    if (keywordsList.length === 0) newErrors.keywords = 'Please enter at least one keyword'
    if (!selectedCountry) newErrors.country = 'Please select a country'
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length === 0) {
      addKeywordsMutation.mutate({
        domain_id: selectedDomain,
        keywords: keywordsList,
        device_type: deviceType,
        country_id: selectedCountry,
        tags: tags
      })
    }
  }

  const keywordsList = getKeywordsList()

  if (domainsLoading || countriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: '#3D8BFF'}}></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" style={{color: '#1A1A1A'}}>
            Add Keywords to Track
          </h1>
          <p style={{color: '#6C757D'}} className="text-sm mt-1">
            Add keywords to monitor their search rankings and performance
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 1 ? 'font-medium' : ''}`} 
             style={{backgroundColor: step >= 1 ? '#3D8BFF' : '#F7F9FC', color: step >= 1 ? '#FFFFFF' : '#6C757D'}}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{backgroundColor: step >= 1 ? '#FFFFFF' : 'transparent', color: step >= 1 ? '#3D8BFF' : '#6C757D'}}>
            1
          </span>
          Select Domain
        </div>
        <div className="w-8 h-px" style={{backgroundColor: step >= 2 ? '#3D8BFF' : '#E0E6ED'}}></div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 2 ? 'font-medium' : ''}`}
             style={{backgroundColor: step >= 2 ? '#3D8BFF' : '#F7F9FC', color: step >= 2 ? '#FFFFFF' : '#6C757D'}}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{backgroundColor: step >= 2 ? '#FFFFFF' : 'transparent', color: step >= 2 ? '#3D8BFF' : '#6C757D'}}>
            2
          </span>
          Add Keywords
        </div>
      </div>

      {step === 1 && (
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{color: '#1A1A1A'}}>
                Select or Add Domain
              </h2>
              <p style={{color: '#6C757D'}}>
                Choose an existing domain or add a new one to track keywords for.
              </p>
            </div>

            {/* Existing Domains */}
            {domains.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium" style={{color: '#1A1A1A'}}>Existing Domains</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domains.map((domain: any) => (
                    <div
                      key={domain.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedDomain === domain.id ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedDomain === domain.id ? '#F0F9FF' : '#FFFFFF',
                        borderColor: selectedDomain === domain.id ? '#3D8BFF' : '#E0E6ED',
                        '--tw-ring-color': '#3D8BFF'
                      }}
                      onClick={() => setSelectedDomain(domain.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5" style={{color: '#3D8BFF'}} />
                        <div>
                          <div className="font-medium" style={{color: '#1A1A1A'}}>
                            {domain.display_name || domain.domain_name}
                          </div>
                          <div className="text-sm" style={{color: '#6C757D'}}>
                            {domain.domain_name}
                          </div>
                        </div>
                        {selectedDomain === domain.id && (
                          <CheckCircle2 className="w-5 h-5 ml-auto" style={{color: '#3D8BFF'}} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Domain */}
            <div className="space-y-4" style={{borderTop: domains.length > 0 ? '1px solid #E0E6ED' : 'none', paddingTop: domains.length > 0 ? '1.5rem' : '0'}}>
              <h3 className="font-medium" style={{color: '#1A1A1A'}}>Add New Domain</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="example.com"
                    value={newDomainName}
                    onChange={(e: any) => setNewDomainName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateDomain} 
                  disabled={!newDomainName.trim()}
                  loading={createDomainMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </div>
              {errors.domain && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {errors.domain}
                </Alert>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4" style={{borderTop: '1px solid #E0E6ED'}}>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedDomain}
              >
                Continue to Keywords
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Selected Domain Info */}
          <Card>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5" style={{color: '#3D8BFF'}} />
              <div>
                <div className="font-medium" style={{color: '#1A1A1A'}}>
                  Selected Domain: {domains.find((d: any) => d.id === selectedDomain)?.display_name}
                </div>
                <div className="text-sm" style={{color: '#6C757D'}}>
                  {domains.find((d: any) => d.id === selectedDomain)?.domain_name}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="ml-auto">
                Change Domain
              </Button>
            </div>
          </Card>

          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{color: '#1A1A1A'}}>
                  Keyword Configuration
                </h2>
                <p style={{color: '#6C757D'}}>
                  Configure your keywords with device type, location, and optional tags.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Device Type */}
                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        deviceType === 'desktop' ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: deviceType === 'desktop' ? '#F0F9FF' : '#FFFFFF',
                        borderColor: deviceType === 'desktop' ? '#3D8BFF' : '#E0E6ED',
                        '--tw-ring-color': '#3D8BFF'
                      }}
                      onClick={() => setDeviceType('desktop')}
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" style={{color: '#3D8BFF'}} />
                        <span className="font-medium" style={{color: '#1A1A1A'}}>Desktop</span>
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        deviceType === 'mobile' ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: deviceType === 'mobile' ? '#F0F9FF' : '#FFFFFF',
                        borderColor: deviceType === 'mobile' ? '#3D8BFF' : '#E0E6ED',
                        '--tw-ring-color': '#3D8BFF'
                      }}
                      onClick={() => setDeviceType('mobile')}
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" style={{color: '#3D8BFF'}} />
                        <span className="font-medium" style={{color: '#1A1A1A'}}>Mobile</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label>Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: '#6C757D'}} />
                    <Select 
                      value={selectedCountry} 
                      onValueChange={setSelectedCountry} 
                      placeholder="Select country"
                      className="pl-10"
                    >
                      {countries.map((country: any) => (
                        <option key={country.id} value={country.id}>
                          {country.name} ({country.iso2_code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  {errors.country && (
                    <p className="text-sm" style={{color: '#E63946'}}>{errors.country}</p>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-4">
                <div>
                  <Label>Keywords</Label>
                  <p className="text-sm mt-1" style={{color: '#6C757D'}}>
                    Enter one keyword per line. Each keyword + device + country combination will consume 1 quota.
                  </p>
                </div>
                <Textarea
                  placeholder="keyword 1&#10;keyword 2&#10;keyword 3"
                  rows={8}
                  value={keywordText}
                  onChange={(e: any) => setKeywordText(e.target.value)}
                />
                {keywordsList.length > 0 && (
                  <div className="text-sm" style={{color: '#6C757D'}}>
                    {keywordsList.length} keyword(s) to be added • {keywordsList.length} quota will be consumed
                  </div>
                )}
                {errors.keywords && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {errors.keywords}
                  </Alert>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <div>
                  <Label>Tags (Optional)</Label>
                  <p className="text-sm mt-1" style={{color: '#6C757D'}}>
                    Add tags to organize and filter your keywords easily.
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Add a tag"
                      value={tagText}
                      onChange={(e: any) => setTagText(e.target.value)}
                      onKeyPress={(e: any) => e.key === 'Enter' && handleAddTag()}
                    />
                  </div>
                  <Button variant="outline" onClick={handleAddTag} disabled={!tagText.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <div key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm" 
                           style={{backgroundColor: '#F7F9FC', border: '1px solid #E0E6ED'}}>
                        <Tag className="w-3 h-3" style={{color: '#6C757D'}} />
                        <span style={{color: '#1A1A1A'}}>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                        >
                          <Trash2 className="w-3 h-3" style={{color: '#E63946'}} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4" style={{borderTop: '1px solid #E0E6ED'}}>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmitKeywords}
                  disabled={!selectedDomain || keywordsList.length === 0 || !selectedCountry}
                  loading={addKeywordsMutation.isPending}
                  className="flex-1"
                >
                  Add {keywordsList.length} Keyword{keywordsList.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}