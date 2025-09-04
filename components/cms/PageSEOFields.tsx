'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Globe, Share2 } from 'lucide-react'

interface PageSEOFieldsProps {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
  className?: string
}

export default function PageSEOFields({
  title,
  metaTitle,
  metaDescription,
  slug,
  onMetaTitleChange,
  onMetaDescriptionChange,
  className = ""
}: PageSEOFieldsProps) {
  const [showPreview, setShowPreview] = useState(false)

  // Auto-generate meta title from page title if empty
  useEffect(() => {
    if (!metaTitle && title) {
      onMetaTitleChange(title)
    }
  }, [title, metaTitle, onMetaTitleChange])

  const getMetaTitleDisplay = () => metaTitle || title || 'Untitled Page'
  const getMetaDescriptionDisplay = () => metaDescription || 'No description available.'
  const getUrlDisplay = () => `indexnow.studio/${slug || 'page-slug'}`

  const metaTitleLength = getMetaTitleDisplay().length
  const metaDescriptionLength = getMetaDescriptionDisplay().length

  const getTitleColorClass = () => {
    if (metaTitleLength > 60) return 'text-[#E63946]'
    if (metaTitleLength > 50) return 'text-[#F0A202]'
    return 'text-[#4BB543]'
  }

  const getDescriptionColorClass = () => {
    if (metaDescriptionLength > 160) return 'text-[#E63946]'
    if (metaDescriptionLength > 140) return 'text-[#F0A202]'
    return 'text-[#4BB543]'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
          <Search className="h-5 w-5" />
          SEO Settings
        </h3>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
          type="button"
          data-testid="button-seo-preview"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="space-y-4">
          {/* Google Search Preview */}
          <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-[#6C757D]" />
              <h4 className="text-sm font-medium text-[#1A1A1A]">Google Search Preview</h4>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-[#3D8BFF] underline">
                {getUrlDisplay()}
              </div>
              <div className="text-lg text-[#1A1A1A] font-medium leading-tight">
                {getMetaTitleDisplay()}
              </div>
              <div className="text-sm text-[#6C757D] leading-relaxed">
                {getMetaDescriptionDisplay()}
              </div>
            </div>
          </div>

          {/* Social Media Preview */}
          <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-[#6C757D]" />
              <h4 className="text-sm font-medium text-[#1A1A1A]">Social Media Preview</h4>
            </div>
            <div className="border border-[#E0E6ED] rounded-lg p-3 bg-white">
              <div className="w-full h-32 bg-[#F7F9FC] rounded border-2 border-dashed border-[#E0E6ED] flex items-center justify-center mb-3">
                <span className="text-xs text-[#6C757D]">Featured Image Preview</span>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-[#1A1A1A] leading-tight">
                  {getMetaTitleDisplay()}
                </div>
                <div className="text-xs text-[#6C757D]">
                  {getMetaDescriptionDisplay()}
                </div>
                <div className="text-xs text-[#6C757D] uppercase">
                  {getUrlDisplay()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="page-meta-title" className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Meta Title
          </label>
          <input
            id="page-meta-title"
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={title || "Enter meta title for search engines..."}
            className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            maxLength={70}
            data-testid="input-meta-title"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-[#6C757D]">
              This title will appear in search engine results and browser tabs
            </p>
            <span className={`text-xs font-medium ${getTitleColorClass()}`}>
              {metaTitleLength}/60
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="page-meta-description" className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Meta Description
          </label>
          <textarea
            id="page-meta-description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Write a compelling description that summarizes what visitors will find on this page..."
            className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent resize-none"
            rows={3}
            maxLength={170}
            data-testid="textarea-meta-description"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-[#6C757D]">
              A good description helps search engines understand your page content
            </p>
            <span className={`text-xs font-medium ${getDescriptionColorClass()}`}>
              {metaDescriptionLength}/160
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#3D8BFF]/5 border border-[#3D8BFF]/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#3D8BFF] mb-2">SEO Tips for Pages</h4>
        <ul className="text-xs text-[#3D8BFF] space-y-1">
          <li>• Keep your meta title under 60 characters for best display</li>
          <li>• Write meta descriptions between 140-160 characters</li>
          <li>• Include your main keyword naturally in both title and description</li>
          <li>• Make descriptions compelling to encourage clicks</li>
          <li>• Each page should have unique meta titles and descriptions</li>
        </ul>
      </div>
    </div>
  )
}