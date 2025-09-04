'use client'

import { useEffect, useState } from 'react'
import { 
  FileText,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  User,
  Layout,
  CheckCircle,
  AlertTriangle,
  Clock,
  Home,
  Globe
} from 'lucide-react'
import { CMSPage, PageFilters, PageSortOptions } from '@/types/pages'

export default function CMSPages() {
  const [pages, setPages] = useState<CMSPage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [templateFilter, setTemplateFilter] = useState<string>('all')

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/v1/admin/cms/pages', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPages(data.pages || [])
      }
    } catch (error) {
      console.error('Failed to fetch pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const response = await fetch(`/api/v1/admin/cms/pages/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        fetchPages()
      }
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/v1/admin/cms/pages/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchPages()
      }
    } catch (error) {
      console.error('Failed to update page status:', error)
    }
  }

  const filteredPages = pages.filter(page => {
    const matchesSearch = !searchTerm || 
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.author_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter
    const matchesTemplate = templateFilter === 'all' || page.template === templateFilter

    return matchesSearch && matchesStatus && matchesTemplate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-[#4BB543]/10 text-[#4BB543] border-[#4BB543]/20'
      case 'draft':
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
      case 'archived':
        return 'bg-[#F0A202]/10 text-[#F0A202] border-[#F0A202]/20'
      default:
        return 'bg-[#6C757D]/10 text-[#6C757D] border-[#6C757D]/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return CheckCircle
      case 'archived':
        return AlertTriangle
      default:
        return Clock
    }
  }

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case 'landing':
        return Globe
      case 'about':
      case 'contact':
      case 'services':
        return FileText
      default:
        return Layout
    }
  }

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case 'landing':
        return 'Landing'
      case 'about':
        return 'About'
      case 'contact':
        return 'Contact'
      case 'services':
        return 'Services'
      default:
        return 'Default'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] flex items-center gap-3">
            <FileText className="h-8 w-8 text-[#3D8BFF]" />
            Pages Management
          </h1>
          <p className="text-[#6C757D] mt-2">Create and manage your website pages</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <a
            href="/backend/admin/cms/pages/create"
            className="inline-flex items-center gap-2 bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            data-testid="button-create-page"
          >
            <Plus className="h-5 w-5" />
            Create New Page
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E0E6ED] overflow-hidden">
        {/* Filters */}
        <div className="border-b border-[#E0E6ED] p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D]" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                data-testid="input-search-pages"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-[#E0E6ED] rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D] pointer-events-none" />
            </div>

            {/* Template Filter */}
            <div className="relative">
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="appearance-none bg-white border border-[#E0E6ED] rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
                data-testid="select-template-filter"
              >
                <option value="all">All Templates</option>
                <option value="default">Default</option>
                <option value="landing">Landing Page</option>
                <option value="about">About Page</option>
                <option value="contact">Contact Page</option>
                <option value="services">Services Page</option>
              </select>
              <Layout className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6C757D] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Pages List */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D8BFF]"></div>
              <p className="text-[#6C757D] mt-2">Loading pages...</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">
                {searchTerm || statusFilter !== 'all' || templateFilter !== 'all' 
                  ? 'No pages match your filters' 
                  : 'No pages yet'
                }
              </h3>
              <p className="text-[#6C757D] mb-4">
                {searchTerm || statusFilter !== 'all' || templateFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Get started by creating your first page.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && templateFilter === 'all' && (
                <a
                  href="/backend/admin/cms/pages/create"
                  className="inline-flex items-center gap-2 bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Create Your First Page
                </a>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#F7F9FC]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Page
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Template
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Author
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#6C757D] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E0E6ED]">
                {filteredPages.map((page) => {
                  const StatusIcon = getStatusIcon(page.status)
                  const TemplateIcon = getTemplateIcon(page.template)
                  
                  return (
                    <tr key={page.id} className="hover:bg-[#F7F9FC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {page.featured_image_url && (
                            <img 
                              src={page.featured_image_url}
                              alt=""
                              className="w-12 h-12 object-cover rounded-lg border border-[#E0E6ED]"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-[#1A1A1A] truncate">
                                {page.title}
                              </h3>
                              {page.is_homepage && (
                                <div className="flex items-center gap-1 px-2 py-1 text-xs bg-[#4BB543]/10 text-[#4BB543] rounded-full">
                                  <Home className="h-3 w-3" />
                                  Homepage
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-[#6C757D] truncate">
                              /{page.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TemplateIcon className="h-4 w-4 text-[#6C757D]" />
                          <span className="text-sm text-[#1A1A1A]">
                            {getTemplateLabel(page.template)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={page.status}
                          onChange={(e) => handleStatusChange(page.id, e.target.value)}
                          className={`text-xs font-medium border rounded-full px-3 py-1 ${getStatusColor(page.status)}`}
                          data-testid={`select-status-${page.id}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#6C757D]" />
                          <span className="text-sm text-[#1A1A1A]">
                            {page.author_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#6C757D]" />
                          <span className="text-sm text-[#1A1A1A]">
                            {new Date(page.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/backend/admin/cms/pages/${page.id}/edit`}
                            className="p-2 text-[#6C757D] hover:text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                            title="Edit page"
                            data-testid={`button-edit-${page.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </a>
                          {page.status === 'published' && (
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#6C757D] hover:text-[#4BB543] hover:bg-[#4BB543]/5 rounded transition-colors"
                              title="View page"
                              data-testid={`button-view-${page.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="p-2 text-[#6C757D] hover:text-[#E63946] hover:bg-[#E63946]/5 rounded transition-colors"
                            title="Delete page"
                            data-testid={`button-delete-${page.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {filteredPages.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-[#6C757D]">
            Showing {filteredPages.length} of {pages.length} pages
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/backend/admin/cms/pages/homepage"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded-lg transition-colors"
              data-testid="button-homepage-settings"
            >
              <Home className="h-4 w-4" />
              Homepage Settings
            </a>
          </div>
        </div>
      )}
    </div>
  )
}