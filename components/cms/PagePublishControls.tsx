'use client'

import { useState } from 'react'
import { 
  Save, 
  Eye, 
  Clock, 
  CheckCircle, 
  Archive,
  Home,
  Layout,
  Globe
} from 'lucide-react'

interface PagePublishControlsProps {
  status: 'draft' | 'published' | 'archived'
  template: 'default'
  onStatusChange: (status: 'draft' | 'published' | 'archived') => void
  onTemplateChange: (template: 'default') => void
  onSave: () => void
  onPreview?: () => void
  isLoading?: boolean
  isDirty?: boolean
  className?: string
}

export default function PagePublishControls({
  status,
  template,
  onStatusChange,
  onTemplateChange,
  onSave,
  onPreview,
  isLoading = false,
  isDirty = false,
  className = ""
}: PagePublishControlsProps) {
  const [showTemplateInfo, setShowTemplateInfo] = useState(false)

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

  const getTemplateConfig = (templateType: string) => {
    switch (templateType) {
      case 'landing':
        return {
          icon: Globe,
          label: 'Landing Page',
          description: 'Full-width layout with hero section'
        }
      case 'about':
        return {
          icon: Globe,
          label: 'About Page',
          description: 'Team and company information layout'
        }
      case 'contact':
        return {
          icon: Globe,
          label: 'Contact Page',
          description: 'Contact form and information layout'
        }
      case 'services':
        return {
          icon: Globe,
          label: 'Services Page',
          description: 'Service listings and features layout'
        }
      default:
        return {
          icon: Layout,
          label: 'Default',
          description: 'Standard page layout with sidebar'
        }
    }
  }

  const statusConfig = getStatusConfig(status)
  const templateConfig = getTemplateConfig(template)
  const StatusIcon = statusConfig.icon
  const TemplateIcon = templateConfig.icon

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
          
          <div className="grid grid-cols-3 gap-2">
            {(['draft', 'published', 'archived'] as const).map((statusOption) => (
              <button
                key={statusOption}
                onClick={() => onStatusChange(statusOption)}
                className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
                  status === statusOption
                    ? 'bg-[#3D8BFF] text-white'
                    : 'bg-[#F7F9FC] text-[#6C757D] hover:bg-[#E0E6ED] hover:text-[#1A1A1A]'
                }`}
                disabled={isLoading}
                data-testid={`button-status-${statusOption}`}
              >
                {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Template - Hidden since only default is available */}
      <div style={{ display: 'none' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#1A1A1A]">Page Template</h3>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E0E6ED] bg-[#F7F9FC]`}>
          <TemplateIcon className="h-4 w-4 text-[#6C757D]" />
          <span className="text-sm font-medium text-[#1A1A1A]">
            {templateConfig.label}
          </span>
        </div>

        {showTemplateInfo && (
          <div className="mt-2 p-3 bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg">
            <p className="text-xs text-[#6C757D]">{templateConfig.description}</p>
          </div>
        )}

        <select
          value={template}
          onChange={(e) => onTemplateChange(e.target.value as any)}
          className="mt-2 w-full px-3 py-2 text-sm border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent"
          disabled={isLoading}
          data-testid="select-template"
        >
          <option value="default">Default Page</option>
          <option value="landing">Landing Page</option>
          <option value="about">About Page</option>
          <option value="contact">Contact Page</option>
          <option value="services">Services Page</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-[#E0E6ED]">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 disabled:bg-[#6C757D]/50 text-white text-sm font-medium rounded-lg transition-colors"
          data-testid="button-save-page"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : isDirty ? 'Save Changes' : 'Save Page'}
        </button>
        
        {onPreview && (
          <button
            onClick={onPreview}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#F7F9FC] hover:bg-[#E0E6ED] text-[#1A1A1A] text-sm font-medium rounded-lg transition-colors"
            disabled={isLoading}
            data-testid="button-preview-page"
          >
            <Eye className="h-4 w-4" />
            Preview Page
          </button>
        )}
      </div>

      {/* Status Info */}
      {status === 'draft' && (
        <div className="text-xs text-[#6C757D] bg-[#6C757D]/5 p-3 rounded-lg">
          <strong>Draft:</strong> Page is saved but not visible to the public. Only you can see it in preview mode.
        </div>
      )}
      
      {status === 'published' && (
        <div className="text-xs text-[#4BB543] bg-[#4BB543]/5 p-3 rounded-lg">
          <strong>Published:</strong> Page is live and visible to all visitors.
        </div>
      )}
      
      {status === 'archived' && (
        <div className="text-xs text-[#F0A202] bg-[#F0A202]/5 p-3 rounded-lg">
          <strong>Archived:</strong> Page is hidden from public but preserved. You can republish it anytime.
        </div>
      )}
    </div>
  )
}