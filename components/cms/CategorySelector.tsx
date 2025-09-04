'use client'

import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Plus, X, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string
}

interface CategorySelectorProps {
  selectedCategories: string[] // Array of category IDs
  mainCategory?: string // ID of the main/primary category
  onChange: (selectedCategories: string[], mainCategory?: string) => void
  className?: string
}

export default function CategorySelector({ 
  selectedCategories = [], 
  mainCategory,
  onChange, 
  className = "" 
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const { addToast } = useToast()

  // Fetch categories from API
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/admin/cms/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        // Fallback to default categories if API fails
        const defaultCategories = [
          { id: '1', name: 'Uncategorized', slug: 'uncategorized' },
          { id: '2', name: 'General', slug: 'general' },
          { id: '3', name: 'SEO', slug: 'seo' },
          { id: '4', name: 'Indexing', slug: 'indexing' },
          { id: '5', name: 'Rank Tracking', slug: 'rank-tracking' },
          { id: '6', name: 'Tutorials', slug: 'tutorials' },
          { id: '7', name: 'News', slug: 'news' },
          { id: '8', name: 'Case Studies', slug: 'case-studies' }
        ]
        setCategories(defaultCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Use fallback categories
      const defaultCategories = [
        { id: '1', name: 'Uncategorized', slug: 'uncategorized' },
        { id: '2', name: 'General', slug: 'general' }
      ]
      setCategories(defaultCategories)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    let updatedSelected = [...selectedCategories]
    let updatedMain = mainCategory

    if (selectedCategories.includes(categoryId)) {
      // Remove category
      updatedSelected = updatedSelected.filter(id => id !== categoryId)
      // If this was the main category, set a new main category
      if (mainCategory === categoryId && updatedSelected.length > 0) {
        updatedMain = updatedSelected[0]
      } else if (mainCategory === categoryId) {
        updatedMain = undefined
      }
    } else {
      // Add category
      updatedSelected.push(categoryId)
      // If this is the first category, make it the main category
      if (!mainCategory || selectedCategories.length === 0) {
        updatedMain = categoryId
      }
    }

    onChange(updatedSelected, updatedMain)
  }

  const handleMainCategoryChange = (categoryId: string) => {
    // Ensure the category is selected
    let updatedSelected = [...selectedCategories]
    if (!selectedCategories.includes(categoryId)) {
      updatedSelected.push(categoryId)
    }
    
    onChange(updatedSelected, categoryId)
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      addToast({
        title: "Error",
        description: "Please enter a category name",
      })
      return
    }

    setIsAddingCategory(true)
    try {
      const response = await fetch('/api/v1/admin/cms/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newCategoryName.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newCategory = data.category
        setCategories(prev => [...prev, newCategory])
        setNewCategoryName('')
        setShowAddForm(false)
        
        // Auto-select the new category
        const updatedSelected = [...selectedCategories, newCategory.id]
        const updatedMain = mainCategory || newCategory.id
        onChange(updatedSelected, updatedMain)

        addToast({
          title: "Success",
          description: `Category "${newCategory.name}" created successfully`,
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
      })
    } finally {
      setIsAddingCategory(false)
    }
  }

  const getSelectedCategoryNames = () => {
    if (selectedCategories.length === 0) return 'Select Categories'
    const names = categories
      .filter(cat => selectedCategories.includes(cat.id))
      .map(cat => cat.name)
    if (names.length > 2) {
      return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
    }
    return names.join(', ')
  }

  const getMainCategoryName = () => {
    if (!mainCategory) return ''
    const category = categories.find(cat => cat.id === mainCategory)
    return category ? category.name : ''
  }

  return (
    <div className={className}>
      {/* Category Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Categories
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent bg-white text-[#1A1A1A] transition-all duration-200"
            disabled={isLoading}
          >
            <span className={selectedCategories.length === 0 ? 'text-[#6C757D]' : 'text-[#1A1A1A]'}>
              {isLoading ? 'Loading categories...' : getSelectedCategoryNames()}
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-[#6C757D]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#6C757D]" />
            )}
          </button>

          {isOpen && !isLoading && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-[#E0E6ED] rounded-lg shadow-lg max-h-64 overflow-y-auto">
              <div className="p-3 space-y-2">
                {/* Most Used Categories Tab */}
                <div className="flex border-b border-[#E0E6ED] -mx-3 px-3 pb-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-[#3D8BFF] border-b-2 border-[#3D8BFF] pb-1"
                  >
                    Most Used
                  </button>
                </div>

                {/* Category Checkboxes */}
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center space-x-2 p-2 hover:bg-[#F7F9FC] rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-[#3D8BFF] border-[#E0E6ED] rounded focus:ring-[#3D8BFF] focus:ring-2"
                      />
                      <span className="text-sm text-[#1A1A1A] flex-1">{category.name}</span>
                      {selectedCategories.includes(category.id) && (
                        <Check className="h-4 w-4 text-[#3D8BFF]" />
                      )}
                    </label>
                  ))}
                </div>

                {/* Add New Category */}
                <div className="border-t border-[#E0E6ED] pt-3 -mx-3 px-3">
                  {!showAddForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center space-x-2 text-sm text-[#3D8BFF] hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Category</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddCategory()
                            } else if (e.key === 'Escape') {
                              setShowAddForm(false)
                              setNewCategoryName('')
                            }
                          }}
                          placeholder="Category name"
                          className="flex-1 px-2 py-1 text-sm border border-[#E0E6ED] rounded focus:ring-1 focus:ring-[#3D8BFF] focus:border-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={isAddingCategory}
                          className="px-2 py-1 text-sm bg-[#3D8BFF] text-white rounded hover:bg-[#2A7AE0] disabled:opacity-50"
                        >
                          {isAddingCategory ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false)
                            setNewCategoryName('')
                          }}
                          className="px-2 py-1 text-sm text-[#6C757D] hover:text-[#1A1A1A]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Category Selection */}
        {selectedCategories.length > 1 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#1A1A1A]">
              Primary Category
            </label>
            <select
              value={mainCategory || ''}
              onChange={(e) => handleMainCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent bg-white text-[#1A1A1A]"
            >
              {categories
                .filter(cat => selectedCategories.includes(cat.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <p className="text-xs text-[#6C757D]">
              The primary category will be used in the URL structure
            </p>
          </div>
        )}
      </div>

      {/* Selected Categories Display */}
      {selectedCategories.length > 0 && (
        <div className="mt-3 p-2 bg-[#F7F9FC] rounded-lg">
          <div className="text-xs text-[#6C757D] mb-1">Selected Categories:</div>
          <div className="flex flex-wrap gap-1">
            {categories
              .filter(cat => selectedCategories.includes(cat.id))
              .map((category) => (
                <span
                  key={category.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    category.id === mainCategory
                      ? 'bg-[#3D8BFF] text-white'
                      : 'bg-white text-[#1A1A1A] border border-[#E0E6ED]'
                  }`}
                >
                  {category.name}
                  {category.id === mainCategory && (
                    <span className="text-xs opacity-75">(Primary)</span>
                  )}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}