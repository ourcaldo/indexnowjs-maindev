'use client'

import { useState } from 'react'
import { Home, AlertCircle, Info } from 'lucide-react'

interface HomepageToggleProps {
  isHomepage: boolean
  pageTitle: string
  onHomepageChange: (isHomepage: boolean) => void
  className?: string
  disabled?: boolean
}

export default function HomepageToggle({
  isHomepage,
  pageTitle,
  onHomepageChange,
  className = "",
  disabled = false
}: HomepageToggleProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleToggleClick = () => {
    if (disabled) return
    
    if (!isHomepage) {
      // Show confirmation when setting as homepage
      setShowConfirmation(true)
    } else {
      // Direct toggle when removing homepage status
      onHomepageChange(false)
    }
  }

  const handleConfirm = () => {
    onHomepageChange(true)
    setShowConfirmation(false)
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-[#1A1A1A] flex items-center gap-2 mb-3">
          <Home className="h-5 w-5" />
          Homepage Setting
        </h3>
        
        <div className="bg-white border border-[#E0E6ED] rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="homepage-toggle"
                  checked={isHomepage}
                  onChange={handleToggleClick}
                  disabled={disabled}
                  className="w-4 h-4 text-[#3D8BFF] border-[#E0E6ED] rounded focus:ring-[#3D8BFF] focus:ring-2"
                  data-testid="checkbox-homepage-toggle"
                />
                <label 
                  htmlFor="homepage-toggle" 
                  className={`text-sm font-medium ${disabled ? 'text-[#6C757D]' : 'text-[#1A1A1A] cursor-pointer'}`}
                >
                  Set as Homepage
                </label>
              </div>
              
              <p className="text-xs text-[#6C757D] mt-2 ml-6">
                {isHomepage 
                  ? `"${pageTitle || 'This page'}" is currently set as your website's homepage.`
                  : 'Make this page your website\'s main homepage that visitors see first.'
                }
              </p>
            </div>

            {isHomepage && (
              <div className="flex-shrink-0 ml-3">
                <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#4BB543]/10 text-[#4BB543] rounded-full">
                  <Home className="h-3 w-3" />
                  Active Homepage
                </div>
              </div>
            )}
          </div>

          {isHomepage && (
            <div className="mt-4 p-3 bg-[#4BB543]/5 border border-[#4BB543]/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-[#4BB543] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-[#4BB543]">
                  <strong>Homepage Active:</strong> This page will be displayed when visitors access your website's root URL (indexnow.studio).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-homepage-confirmation">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#F0A202]/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-[#F0A202]" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-[#1A1A1A]">Set as Homepage?</h4>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-[#6C757D] leading-relaxed">
                Are you sure you want to set <strong>"{pageTitle || 'this page'}"</strong> as your website's homepage? 
                This will replace your current homepage and visitors will see this page when they visit your website.
              </p>
              
              <div className="mt-3 p-3 bg-[#F7F9FC] rounded-lg">
                <div className="text-xs text-[#6C757D]">
                  <strong>Note:</strong> You can change this setting anytime from any page's settings.
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-[#6C757D] bg-[#F7F9FC] hover:bg-[#E0E6ED] rounded-lg transition-colors"
                data-testid="button-homepage-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#3D8BFF] hover:bg-[#3D8BFF]/90 rounded-lg transition-colors"
                data-testid="button-homepage-confirm"
              >
                Set as Homepage
              </button>
            </div>
          </div>
        </div>
      )}

      {disabled && (
        <div className="text-xs text-[#6C757D] bg-[#F7F9FC] p-3 rounded-lg">
          <strong>Note:</strong> Homepage setting is only available for published pages. Save and publish your page first to enable this option.
        </div>
      )}
    </div>
  )
}