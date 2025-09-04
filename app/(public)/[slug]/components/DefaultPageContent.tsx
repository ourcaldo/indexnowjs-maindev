'use client'

import { Calendar, User } from 'lucide-react'

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  status: string
  is_homepage: boolean
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author_name?: string
}

interface DefaultPageContentProps {
  page: CMSPage
}

export default function DefaultPageContent({ page }: DefaultPageContentProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              {page.title}
            </h1>
            
            {page.meta_description && (
              <p className="text-xl text-[#F7F9FC] leading-relaxed mb-8">
                {page.meta_description}
              </p>
            )}
            
            {/* Page Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-[#F7F9FC]">
              {page.author_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>By {page.author_name}</span>
                </div>
              )}
              {page.published_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Published {new Date(page.published_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Featured Image */}
            {page.featured_image_url && (
              <div className="mb-8">
                <img 
                  src={page.featured_image_url}
                  alt={page.title}
                  className="w-full h-64 lg:h-96 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Page Content */}
            <div className="prose prose-lg max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: page.content || '<p>No content available.</p>' 
                }} 
                className="leading-relaxed text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Page Info */}
            <div className="bg-[#F7F9FC] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Page Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6C757D]">Template:</span>
                  <span className="text-[#1A1A1A] font-medium">Default Page</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6C757D]">Author:</span>
                  <span className="text-[#1A1A1A] font-medium">{page.author_name || 'Unknown'}</span>
                </div>
                {page.published_at && (
                  <div className="flex justify-between">
                    <span className="text-[#6C757D]">Published:</span>
                    <span className="text-[#1A1A1A] font-medium">
                      {new Date(page.published_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6C757D]">Last Updated:</span>
                  <span className="text-[#1A1A1A] font-medium">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-[#F7F9FC] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a 
                  href="/"
                  className="block px-4 py-2 text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                >
                  Home
                </a>
                <a 
                  href="/blog"
                  className="block px-4 py-2 text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                >
                  Blog
                </a>
                <a 
                  href="/contact"
                  className="block px-4 py-2 text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                >
                  Contact
                </a>
                <a 
                  href="/pricing"
                  className="block px-4 py-2 text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
                >
                  Pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}