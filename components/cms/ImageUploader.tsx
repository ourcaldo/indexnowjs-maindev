'use client'

import { useState } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  onRemove: () => void
  className?: string
}

export default function ImageUploader({ value, onChange, onRemove, className = "" }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/v1/admin/cms/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      onChange(data.url)
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  if (value) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative group">
          <img
            src={value}
            alt="Featured image"
            className="w-full h-48 object-cover rounded-lg border border-[#E0E6ED]"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button
              onClick={onRemove}
              className="bg-[#E63946] text-white p-2 rounded-full hover:bg-[#E63946]/80 transition-colors"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-[#3D8BFF] bg-[#3D8BFF]/5'
            : 'border-[#E0E6ED] hover:border-[#3D8BFF] hover:bg-[#F7F9FC]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-[#3D8BFF] animate-spin mb-2" />
            <p className="text-sm text-[#6C757D]">Uploading...</p>
          </div>
        ) : (
          <>
            <ImageIcon className="h-12 w-12 text-[#6C757D] mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#1A1A1A]">
                Drop your image here, or{' '}
                <label className="text-[#3D8BFF] hover:underline cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-[#6C757D]">
                Support for JPEG, PNG, WebP, GIF up to 5MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}