'use client'

import { useState } from 'react'
import { 
  Save, 
  Eye, 
  Clock, 
  CheckCircle, 
  Archive,
  Calendar,
  Globe,
  FileText
} from 'lucide-react'

interface PublishControlsProps {
  status: 'draft' | 'published' | 'archived'
  postType: 'post' | 'news' | 'blog'
  onStatusChange: (status: 'draft' | 'published' | 'archived') => void
  onPostTypeChange: (type: 'post' | 'news' | 'blog') => void
  onSave: () => void
  onPreview?: () => void
  isLoading?: boolean
  isDirty?: boolean
  className?: string
}

export default function PublishControls({
  status,
  postType,
  onStatusChange,
  onPostTypeChange,
  onSave,
  onPreview,
  isLoading = false,
  isDirty = false,
  className = ""
}: PublishControlsProps) {
  const [showScheduler, setShowScheduler] = useState(false)

  const getStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case 'published':
        return {
          icon: CheckCircle,
          color: 'text-[#4BB543]',
          bgColor: 'bg-[#4BB543]/10',
          borderColor: 'border-[#4BB543]/20',
          label: 'Published'
        }
      case 'archived':
        return {
          icon: Archive,
          color: 'text-[#F0A202]',
          bgColor: 'bg-[#F0A202]/10',
          borderColor: 'border-[#F0A202]/20',
          label: 'Archived'
        }
      default:
        return {
          icon: Clock,
          color: 'text-[#6C757D]',
          bgColor: 'bg-[#6C757D]/10',
          borderColor: 'border-[#6C757D]/20',
          label: 'Draft'
        }
    }
  }

  const getPostTypeConfig = (type: string) => {
    switch (type) {
      case 'news':
        return {
          icon: Globe,
          label: 'News',
          description: 'News and announcements'
        }
      case 'blog':
        return {
          icon: FileText,
          label: 'Blog',
          description: 'Blog articles and insights'
        }
      default:
        return {
          icon: FileText,
          label: 'Post',
          description: 'General posts and content'
        }
    }
  }

  const statusConfig = getStatusConfig(status)
  const postTypeConfig = getPostTypeConfig(postType)
  const StatusIcon = statusConfig.icon
  const PostTypeIcon = postTypeConfig.icon

  return (
    <div className={`bg-white border border-[#E0E6ED] rounded-lg p-4 space-y-4 ${className}`}>
      {/* Publish Status */}
      <div>
        <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Publish Status</h3>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            <span className={`text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onStatusChange('draft')}
              className={`px-2 py-1.5 text-xs rounded transition-colors ${
                status === 'draft'
                  ? 'bg-[#6C757D] text-white'
                  : 'bg-[#F7F9FC] text-[#6C757D] hover:bg-[#E0E6ED]'
              }`}
              type="button"
            >
              Draft
            </button>
            <button
              onClick={() => onStatusChange('published')}
              className={`px-2 py-1.5 text-xs rounded transition-colors ${
                status === 'published'
                  ? 'bg-[#4BB543] text-white'
                  : 'bg-[#F7F9FC] text-[#6C757D] hover:bg-[#E0E6ED]'
              }`}
              type="button"
            >
              Publish
            </button>
            <button
              onClick={() => onStatusChange('archived')}
              className={`px-2 py-1.5 text-xs rounded transition-colors ${
                status === 'archived'
                  ? 'bg-[#F0A202] text-white'
                  : 'bg-[#F7F9FC] text-[#6C757D] hover:bg-[#E0E6ED]'
              }`}
              type="button"
            >
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Post Type */}
      <div>
        <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Post Type</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E0E6ED] bg-[#F7F9FC]">
            <PostTypeIcon className="h-4 w-4 text-[#3D8BFF]" />
            <div>
              <span className="text-sm font-medium text-[#1A1A1A]">
                {postTypeConfig.label}
              </span>
              <p className="text-xs text-[#6C757D]">
                {postTypeConfig.description}
              </p>
            </div>
          </div>
          
          <select
            value={postType}
            onChange={(e) => onPostTypeChange(e.target.value as 'post' | 'news' | 'blog')}
            className="w-full px-2 py-1.5 text-xs border border-[#E0E6ED] rounded focus:ring-1 focus:ring-[#3D8BFF] focus:border-transparent"
          >
            <option value="post">Post - General content</option>
            <option value="blog">Blog - Articles & insights</option>
            <option value="news">News - Announcements</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-[#E0E6ED]">
        <button
          onClick={onSave}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            status === 'published'
              ? 'bg-[#4BB543] hover:bg-[#4BB543]/90 text-white'
              : 'bg-[#1C2331] hover:bg-[#0d1b2a] text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : status === 'published' ? 'Update' : 'Save'}
        </button>

        {onPreview && (
          <button
            onClick={onPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#E0E6ED] rounded-lg text-[#6C757D] hover:bg-[#F7F9FC] transition-colors"
            type="button"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        )}

        {isDirty && (
          <div className="text-xs text-[#F0A202] text-center">
            • Unsaved changes
          </div>
        )}
      </div>

      {/* Status info */}
      <div className="text-xs text-[#6C757D] space-y-1 pt-2 border-t border-[#E0E6ED]">
        {status === 'draft' && (
          <p>• Drafts are only visible to administrators</p>
        )}
        {status === 'published' && (
          <p>• Published posts are visible to all visitors</p>
        )}
        {status === 'archived' && (
          <p>• Archived posts are hidden from public view</p>
        )}
      </div>
    </div>
  )
}