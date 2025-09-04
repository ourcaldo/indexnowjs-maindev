'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, TrendingUp, Zap } from 'lucide-react'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

// Blog components
import BlogCard from '@/components/blog/BlogCard'
import BlogFilters from '@/components/blog/BlogFilters'
import BlogPagination from '@/components/blog/BlogPagination'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  tags: string[]
  category: string
  post_type: string
  author: {
    name: string
    avatar_url?: string
  }
}

interface PaginationData {
  current_page: number
  per_page: number
  total_posts: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
}

interface BlogResponse {
  posts: BlogPost[]
  pagination: PaginationData
  filters: {
    tag: string | null
    search: string | null
  }
}

export default function BlogArchiveContent() {
  const { user, siteSettings, handleAuthAction } = usePageData()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Navigation configuration for the header
  const navigation = [
    {
      label: 'Features',
      href: '/#features'
    },
    {
      label: 'Pricing',
      href: '/pricing'
    },
    {
      label: 'Blog',
      href: '/blog',
      isActive: true
    },
    {
      label: 'FAQ',
      href: '/faq'
    },
    {
      label: 'Contact',
      href: '/contact'
    }
  ]

  const fetchPosts = useCallback(async (page: number = 1, search: string = '', tag: string | null = null) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })
      
      if (search) params.append('search', search)
      if (tag) params.append('tag', tag)
      
      const response = await fetch(`/api/v1/blog/posts?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts')
      }
      
      const data: BlogResponse = await response.json()
      
      setPosts(data.posts)
      setPagination(data.pagination)
      
      // Extract unique tags from posts for filter dropdown
      const tags = new Set<string>()
      data.posts.forEach(post => {
        post.tags.forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags).sort())
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts(currentPage, searchQuery, selectedTag)
  }, [fetchPosts, currentPage, searchQuery, selectedTag])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleTagFilter = (tag: string | null) => {
    setSelectedTag(tag)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{backgroundColor: '#111113'}}>
      <Background />
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="page"
        currentPage="blog"
      />

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">INSIGHTS</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white" data-testid="blog-hero-title">
              SEO Insights & Strategies
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed" data-testid="blog-hero-description">
              Discover expert insights on rank tracking, search engine optimization, and digital marketing strategies to boost your website's performance.
            </p>
            
            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>SEO Strategies</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Zap className="w-5 h-5 text-blue-400" />
                <span>Rank Tracking Tips</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>Expert Insights</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Filters */}
            <BlogFilters
              onSearch={handleSearch}
              onTagFilter={handleTagFilter}
              currentSearch={searchQuery}
              currentTag={selectedTag || ''}
              availableTags={availableTags}
              className="mb-12"
            />

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" data-testid="blog-loading">
                {[...Array(12)].map((_, index) => (
                  <div key={index} className="bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-[16/10] bg-gray-800/50"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-800/50 rounded mb-3"></div>
                      <div className="h-6 bg-gray-800/50 rounded mb-3"></div>
                      <div className="h-4 bg-gray-800/50 rounded mb-2"></div>
                      <div className="h-4 bg-gray-800/50 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-20" data-testid="blog-error">
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-8 max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Posts</h3>
                  <p className="text-gray-300 mb-4">{error}</p>
                  <button
                    onClick={() => fetchPosts(currentPage, searchQuery, selectedTag)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* No Posts State */}
            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-20" data-testid="blog-no-posts">
                <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Posts Found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery || selectedTag 
                    ? "No posts match your current filters. Try adjusting your search criteria."
                    : "No blog posts have been published yet. Check back soon for exciting content!"
                  }
                </p>
                {(searchQuery || selectedTag) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedTag(null)
                      setCurrentPage(1)
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {/* Blog Posts Grid */}
            {!loading && !error && posts.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12" data-testid="blog-posts-grid">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && (
                  <BlogPagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    className="mt-16"
                  />
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}