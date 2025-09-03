'use client'

import { useState, useEffect } from 'react'
import { Search, Eye } from 'lucide-react'

interface SEOFieldsProps {
  title: string
  metaTitle: string
  metaDescription: string
  slug: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
  className?: string
}

export default function SEOFields({
  title,
  metaTitle,
  metaDescription,
  slug,
  onMetaTitleChange,
  onMetaDescriptionChange,
  className = ""
}: SEOFieldsProps) {
  const [showPreview, setShowPreview] = useState(false)

  // Auto-generate meta title from post title if empty
  useEffect(() => {
    if (!metaTitle && title) {
      onMetaTitleChange(title)
    }
  }, [title, metaTitle, onMetaTitleChange])

  const getMetaTitleDisplay = () => metaTitle || title || 'Untitled Post'
  const getMetaDescriptionDisplay = () => metaDescription || 'No description available.'
  const getUrlDisplay = () => `indexnow.studio/blog/${slug || 'post-slug'}`

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
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Search Engine Preview</h4>
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
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="meta-title" className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Meta Title
          </label>
          <input
            id="meta-title"
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={title || "Enter meta title..."}
            className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
            maxLength={70}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-[#6C757D]">
              This title will appear in search engine results
            </p>
            <span className={`text-xs font-medium ${getTitleColorClass()}`}>
              {metaTitleLength}/60
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="meta-description" className="block text-sm font-medium text-[#1A1A1A] mb-2">
            Meta Description
          </label>
          <textarea
            id="meta-description"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Enter a brief description of your post..."
            rows={3}
            className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent resize-vertical"
            maxLength={170}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-[#6C757D]">
              This description will appear in search results and social shares
            </p>
            <span className={`text-xs font-medium ${getDescriptionColorClass()}`}>
              {metaDescriptionLength}/160
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#3D8BFF]/5 border border-[#3D8BFF]/20 rounded-lg p-3">
        <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">SEO Tips</h4>
        <ul className="text-xs text-[#6C757D] space-y-1">
          <li>• Keep titles under 60 characters for optimal display</li>
          <li>• Descriptions should be 140-160 characters</li>
          <li>• Include target keywords naturally</li>
          <li>• Make both compelling and descriptive</li>
        </ul>
      </div>
    </div>
  )
}