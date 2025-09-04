'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, Settings, Eye, CheckCircle, Globe, Layout } from 'lucide-react'
import { CMSPage } from '@/types/pages'
import { useToast } from '@/hooks/use-toast'

interface HomepageSettings {
  current_homepage_id: string | null
  current_homepage_slug: string | null
  current_homepage_title: string | null
  is_custom_homepage: boolean
}

export default function HomepageManagement() {
  const router = useRouter()
  const { addToast } = useToast()

  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null)
  const [publishedPages, setPublishedPages] = useState<CMSPage[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchHomepageSettings()
    fetchPublishedPages()
  }, [])

  const fetchHomepageSettings = async () => {
    try {
      const response = await fetch('/api/v1/admin/cms/pages/homepage', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setHomepageSettings(data)
      }
    } catch (error) {
      console.error('Error fetching homepage settings:', error)
    }
  }

  const fetchPublishedPages = async () => {
    try {
      const response = await fetch('/api/v1/admin/cms/pages?status=published', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setPublishedPages(data.pages || [])
      }
    } catch (error) {
      console.error('Error fetching published pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetHomepage = async (pageId: string, pageTitle: string) => {
    if (!confirm(`Set "${pageTitle}" as your website homepage?`)) return

    setUpdating(true)
    
    try {
      const response = await fetch('/api/v1/admin/cms/pages/homepage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ page_id: pageId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to set homepage')
      }

      const result = await response.json()
      setHomepageSettings(result)

      addToast({
        title: 'Homepage updated',
        description: `"${pageTitle}" is now your website homepage.`,
      })

      // Refresh data
      fetchPublishedPages()
      
    } catch (error) {
      console.error('Error setting homepage:', error)
      addToast({
        title: 'Error setting homepage',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveHomepage = async () => {
    if (!confirm('Remove custom homepage? Your site will use the default homepage.')) return

    setUpdating(true)
    
    try {
      const response = await fetch('/api/v1/admin/cms/pages/homepage', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove homepage')
      }

      const result = await response.json()
      setHomepageSettings(result)

      addToast({
        title: 'Homepage reset',
        description: 'Your site will now use the default homepage.',
      })

      // Refresh data
      fetchPublishedPages()
      
    } catch (error) {
      console.error('Error removing homepage:', error)
      addToast({
        title: 'Error removing homepage',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setUpdating(false)
    }
  }

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case 'landing': return 'Landing Page'
      case 'about': return 'About Page'
      case 'contact': return 'Contact Page'
      case 'services': return 'Services Page'
      default: return 'Default Page'
    }
  }

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'landing': return Globe
      default: return Layout
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D8BFF] mb-4"></div>
          <p className="text-[#6C757D]">Loading homepage settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="bg-white border-b border-[#E0E6ED]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/backend/admin/cms/pages')}
                className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A1A] flex items-center gap-3">
                  <Home className="h-8 w-8 text-[#3D8BFF]" />
                  Homepage Settings
                </h1>
                <p className="text-[#6C757D] mt-2">Configure which page serves as your website's homepage</p>
              </div>
            </div>

            {homepageSettings?.is_custom_homepage && (
              <button
                onClick={handleRemoveHomepage}
                disabled={updating}
                className="px-4 py-2 text-[#6C757D] hover:text-[#E63946] hover:bg-[#E63946]/5 rounded-lg transition-colors disabled:opacity-50"
                data-testid="button-reset-homepage"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Current Homepage Status */}
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Homepage
          </h2>

          {homepageSettings?.is_custom_homepage ? (
            <div className="border border-[#4BB543]/20 bg-[#4BB543]/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#4BB543] rounded-lg flex items-center justify-center">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-[#1A1A1A]">
                      {homepageSettings.current_homepage_title}
                    </h3>
                    <p className="text-sm text-[#6C757D]">
                      indexnow.studio/{homepageSettings.current_homepage_slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#4BB543]/10 text-[#4BB543] rounded-full text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Active Homepage
                  </div>
                  <a
                    href={`/${homepageSettings.current_homepage_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#6C757D] hover:text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                    title="View homepage"
                    data-testid="button-view-homepage"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-[#6C757D]/20 bg-[#6C757D]/5 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#6C757D] rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#1A1A1A]">Default Homepage</h3>
                  <p className="text-sm text-[#6C757D]">
                    Using the default application homepage (indexnow.studio)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Available Pages */}
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">
            Set as Homepage
          </h2>
          <p className="text-[#6C757D] mb-6">
            Select a published page to use as your website's homepage. Only published pages are shown.
          </p>

          {publishedPages.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No published pages</h3>
              <p className="text-[#6C757D] mb-4">
                You need to have at least one published page to set as homepage.
              </p>
              <button
                onClick={() => router.push('/backend/admin/cms/pages/create')}
                className="px-4 py-2 bg-[#3D8BFF] text-white rounded-lg hover:bg-[#3D8BFF]/90 transition-colors"
                data-testid="button-create-first-page"
              >
                Create Your First Page
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedPages.map((page) => {
                const TemplateIcon = getTemplateIcon(page.template)
                const isCurrentHomepage = homepageSettings?.current_homepage_id === page.id
                
                return (
                  <div key={page.id} className={`border rounded-lg p-4 transition-all ${
                    isCurrentHomepage 
                      ? 'border-[#4BB543] bg-[#4BB543]/5'
                      : 'border-[#E0E6ED] hover:border-[#3D8BFF]/50 hover:bg-[#F7F9FC]'
                  }`}>
                    <div className="flex items-start gap-3 mb-4">
                      {page.featured_image_url ? (
                        <img 
                          src={page.featured_image_url}
                          alt=""
                          className="w-16 h-16 object-cover rounded-lg border border-[#E0E6ED]"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#F7F9FC] rounded-lg border border-[#E0E6ED] flex items-center justify-center">
                          <TemplateIcon className="h-8 w-8 text-[#6C757D]" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#1A1A1A] mb-1 truncate">
                          {page.title}
                        </h3>
                        <p className="text-xs text-[#6C757D] truncate mb-2">
                          /{page.slug}
                        </p>
                        <div className="text-xs text-[#6C757D]">
                          {getTemplateLabel(page.template)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrentHomepage ? (
                        <div className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#4BB543]/10 text-[#4BB543] rounded-lg text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Current Homepage
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetHomepage(page.id, page.title)}
                          disabled={updating}
                          className="flex-1 px-3 py-2 bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 disabled:bg-[#6C757D]/50 text-white text-sm rounded-lg transition-colors"
                          data-testid={`button-set-homepage-${page.id}`}
                        >
                          {updating ? 'Setting...' : 'Set as Homepage'}
                        </button>
                      )}
                      
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#6C757D] hover:text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                        title="Preview page"
                        data-testid={`button-preview-${page.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Homepage Information */}
        <div className="bg-[#3D8BFF]/5 border border-[#3D8BFF]/20 rounded-lg p-6">
          <h3 className="text-lg font-medium text-[#3D8BFF] mb-3">About Homepage Settings</h3>
          <div className="space-y-2 text-sm text-[#3D8BFF]">
            <p>• The homepage is the main page visitors see when they visit your website root URL (indexnow.studio)</p>
            <p>• Only published pages can be set as the homepage</p>
            <p>• If you don't set a custom homepage, the default application homepage will be used</p>
            <p>• You can change your homepage anytime from this page</p>
            <p>• Landing page templates work best as homepages due to their full-width design</p>
          </div>
        </div>
      </div>
    </div>
  )
}