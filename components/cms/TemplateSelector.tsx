'use client'

import { useState } from 'react'
import { Layout, Home, User, Mail, Briefcase, Eye } from 'lucide-react'

export interface PageTemplate {
  id: 'default' | 'landing' | 'about' | 'contact' | 'services'
  name: string
  description: string
  icon: typeof Layout
  preview_image?: string
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard page layout with content and sidebar',
    icon: Layout
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Full-width landing page with hero section and CTA',
    icon: Home
  },
  {
    id: 'about',
    name: 'About Page',
    description: 'Team showcase, company story, and mission statement',
    icon: User
  },
  {
    id: 'contact',
    name: 'Contact Page',
    description: 'Contact form, location map, and contact information',
    icon: Mail
  },
  {
    id: 'services',
    name: 'Services Page',
    description: 'Service listings, features, and pricing information',
    icon: Briefcase
  }
]

interface TemplateSelectorProps {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  className?: string
}

export default function TemplateSelector({
  selectedTemplate,
  onTemplateChange,
  className = ""
}: TemplateSelectorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const getSelectedTemplate = () => {
    return PAGE_TEMPLATES.find(template => template.id === selectedTemplate) || PAGE_TEMPLATES[0]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Page Template
        </h3>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
          type="button"
          data-testid="button-template-preview"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Template Preview</h4>
          <div className="space-y-2">
            <div className="text-lg text-[#1A1A1A] font-medium">
              {getSelectedTemplate().name}
            </div>
            <div className="text-sm text-[#6C757D]">
              {getSelectedTemplate().description}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAGE_TEMPLATES.map((template) => {
          const IconComponent = template.icon
          const isSelected = selectedTemplate === template.id
          
          return (
            <div key={template.id} className="relative">
              <input
                type="radio"
                id={`template-${template.id}`}
                name="pageTemplate"
                value={template.id}
                checked={isSelected}
                onChange={(e) => onTemplateChange(e.target.value)}
                className="sr-only"
                data-testid={`input-template-${template.id}`}
              />
              <label
                htmlFor={`template-${template.id}`}
                className={`block w-full p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#3D8BFF] bg-[#3D8BFF]/5'
                    : 'border-[#E0E6ED] hover:border-[#3D8BFF]/50 hover:bg-[#F7F9FC]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    isSelected ? 'bg-[#3D8BFF] text-white' : 'bg-[#F7F9FC] text-[#6C757D]'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium mb-1 ${
                      isSelected ? 'text-[#3D8BFF]' : 'text-[#1A1A1A]'
                    }`}>
                      {template.name}
                    </h4>
                    <p className="text-xs text-[#6C757D] leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </div>
              </label>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-[#3D8BFF] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-xs text-[#6C757D] bg-[#F7F9FC] p-3 rounded-lg">
        <strong>Note:</strong> Templates define the layout and structure of your page. You can customize the content, styling, and functionality for each template type.
      </div>
    </div>
  )
}