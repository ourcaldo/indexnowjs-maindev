'use client'

import { ChevronDown } from 'lucide-react'

interface CategorySelectorProps {
  value: string
  onChange: (category: string) => void
  className?: string
}

const DEFAULT_CATEGORIES = [
  { value: 'uncategorized', label: 'Uncategorized' },
  { value: 'general', label: 'General' },
  { value: 'seo', label: 'SEO' },
  { value: 'indexing', label: 'Indexing' },
  { value: 'rank-tracking', label: 'Rank Tracking' },
  { value: 'tutorials', label: 'Tutorials' },
  { value: 'news', label: 'News' },
  { value: 'updates', label: 'Updates' },
  { value: 'guides', label: 'Guides' },
  { value: 'tips', label: 'Tips & Tricks' },
  { value: 'technical', label: 'Technical' },
  { value: 'case-studies', label: 'Case Studies' }
]

export default function CategorySelector({ value, onChange, className = "" }: CategorySelectorProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 pr-10 border border-[#E0E6ED] rounded-lg focus:ring-2 focus:ring-[#3D8BFF] focus:border-transparent bg-white text-[#1A1A1A]"
      >
        {DEFAULT_CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-[#6C757D]" />
      </div>
    </div>
  )
}