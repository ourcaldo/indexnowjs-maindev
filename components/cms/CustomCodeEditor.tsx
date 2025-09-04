'use client'

import { useState } from 'react'
import { Code, Eye, EyeOff, AlertTriangle, Info } from 'lucide-react'

interface CustomCodeEditorProps {
  customCSS: string
  customJS: string
  onCSSChange: (css: string) => void
  onJSChange: (js: string) => void
  className?: string
}

export default function CustomCodeEditor({
  customCSS,
  customJS,
  onCSSChange,
  onJSChange,
  className = ""
}: CustomCodeEditorProps) {
  const [activeTab, setActiveTab] = useState<'css' | 'js'>('css')
  const [showPreview, setShowPreview] = useState(false)

  const tabs = [
    { id: 'css' as const, label: 'Custom CSS', icon: Code },
    { id: 'js' as const, label: 'Custom JavaScript', icon: Code }
  ]

  const getCodeExample = (type: 'css' | 'js') => {
    if (type === 'css') {
      return `/* Example CSS */
.custom-page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 4rem 0;
  color: white;
}

.custom-button {
  background-color: #3D8BFF;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  transition: all 0.3s ease;
}

.custom-button:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}`
    } else {
      return `// Example JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Add smooth scrolling to all anchor links
  const links = document.querySelectorAll('a[href^="#"]');
  
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // Add fade-in animation to elements
  const observeElements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  });
  
  observeElements.forEach(el => observer.observe(el));
});`
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
          <Code className="h-5 w-5" />
          Custom Code
        </h3>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-3 py-1 text-sm text-[#3D8BFF] hover:bg-[#3D8BFF]/5 rounded transition-colors"
          type="button"
          data-testid="button-code-preview"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Code Preview</h4>
          <div className="space-y-4">
            {customCSS && (
              <div>
                <h5 className="text-xs font-medium text-[#6C757D] mb-2">CSS ({customCSS.length} characters)</h5>
                <div className="bg-[#1A1A1A] text-[#4BB543] p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  {customCSS.substring(0, 200)}{customCSS.length > 200 ? '...' : ''}
                </div>
              </div>
            )}
            {customJS && (
              <div>
                <h5 className="text-xs font-medium text-[#6C757D] mb-2">JavaScript ({customJS.length} characters)</h5>
                <div className="bg-[#1A1A1A] text-[#F0A202] p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  {customJS.substring(0, 200)}{customJS.length > 200 ? '...' : ''}
                </div>
              </div>
            )}
            {!customCSS && !customJS && (
              <p className="text-sm text-[#6C757D] italic">No custom code added yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border border-[#E0E6ED] rounded-lg overflow-hidden bg-white">
        <div className="flex border-b border-[#E0E6ED]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#3D8BFF] text-white'
                  : 'text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC]'
              }`}
              data-testid={`button-tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CSS Editor */}
        {activeTab === 'css' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-[#6C757D]">
              <Info className="h-4 w-4" />
              <span>Add custom CSS styles that will be applied to this page only.</span>
            </div>
            
            <textarea
              value={customCSS}
              onChange={(e) => onCSSChange(e.target.value)}
              placeholder={getCodeExample('css')}
              className="w-full h-64 p-3 text-sm font-mono border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent resize-none bg-[#1A1A1A] text-[#4BB543]"
              data-testid="textarea-custom-css"
            />
            
            <div className="flex items-start gap-2 p-3 bg-[#F0A202]/5 border border-[#F0A202]/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-[#F0A202] flex-shrink-0 mt-0.5" />
              <div className="text-[#F0A202]">
                <strong>CSS Guidelines:</strong>
                <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                  <li>Use specific class names to avoid conflicts</li>
                  <li>Prefix custom classes with "custom-" for clarity</li>
                  <li>Test styles in preview mode before publishing</li>
                  <li>Avoid !important declarations when possible</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* JavaScript Editor */}
        {activeTab === 'js' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-[#6C757D]">
              <Info className="h-4 w-4" />
              <span>Add custom JavaScript that will execute when this page loads.</span>
            </div>
            
            <textarea
              value={customJS}
              onChange={(e) => onJSChange(e.target.value)}
              placeholder={getCodeExample('js')}
              className="w-full h-64 p-3 text-sm font-mono border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent resize-none bg-[#1A1A1A] text-[#F0A202]"
              data-testid="textarea-custom-js"
            />
            
            <div className="flex items-start gap-2 p-3 bg-[#E63946]/5 border border-[#E63946]/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-[#E63946] flex-shrink-0 mt-0.5" />
              <div className="text-[#E63946]">
                <strong>JavaScript Security:</strong>
                <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                  <li>Only add trusted JavaScript code</li>
                  <li>Avoid inline event handlers and eval()</li>
                  <li>Test functionality thoroughly before publishing</li>
                  <li>Code will be sanitized for security</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-[#6C757D] bg-[#F7F9FC] p-3 rounded-lg">
        <strong>Note:</strong> Custom code is specific to this page only. For site-wide styles, use your theme's global CSS files. 
        All code is sanitized for security before being applied to your page.
      </div>
    </div>
  )
}