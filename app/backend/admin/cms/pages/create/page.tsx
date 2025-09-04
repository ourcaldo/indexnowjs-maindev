'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import PageForm from '@/components/cms/PageForm'
import { PageFormData } from '@/lib/cms/pageValidation'
import { useToast } from '@/hooks/use-toast'

export default function CreatePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (data: PageFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/v1/admin/cms/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create page')
      }

      const result = await response.json()
      
      addToast({
        title: 'Page created successfully',
        description: `Your page "${data.title}" has been created and ${data.status === 'published' ? 'published' : 'saved as ' + data.status}.`,
      })

      // Redirect to edit page or pages list
      if (result.page?.id) {
        router.push(`/backend/admin/cms/pages/${result.page.id}/edit`)
      } else {
        router.push('/backend/admin/cms/pages')
      }
      
    } catch (error) {
      console.error('Error creating page:', error)
      addToast({
        title: 'Error creating page',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      router.push('/backend/admin/cms/pages')
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="bg-white border-b border-[#E0E6ED] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] rounded-lg transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">Create New Page</h1>
                <p className="text-[#6C757D] text-sm">Create a new page for your website</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-[#6C757D] hover:text-[#1A1A1A] hover:bg-[#F7F9FC] rounded-lg transition-colors"
                disabled={isLoading}
                data-testid="button-cancel-create"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F9FC] rounded-lg text-sm text-[#6C757D]">
                <Save className="h-4 w-4" />
                Auto-save: {isLoading ? 'Saving...' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg border border-[#E0E6ED] p-6">
          <PageForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}