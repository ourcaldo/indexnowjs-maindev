'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Folder } from 'lucide-react'
import Link from 'next/link'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

// Blog components
import BlogCard from '@/components/blog/BlogCard'
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
}

interface CategoryArchiveContentProps {
  category: string
}

export default function CategoryArchiveContent({ category }: CategoryArchiveContentProps) {
  const { user, siteSettings, handleAuthAction } = usePageData()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Format category name for display
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')

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

  const fetchCategoryPosts = useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        category: category
      })
      
      const response = await fetch(`/api/v1/blog/posts?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch category posts')
      }
      
      const data: BlogResponse = await response.json()
      
      setPosts(data.posts)
      setPagination(data.pagination)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category posts')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchCategoryPosts(currentPage)
  }, [fetchCategoryPosts, currentPage])

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
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                data-testid="back-to-blog"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Blog</span>
              </Link>
            </div>

            {/* Category Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl">
                <Folder className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2" data-testid="category-title">
                  {categoryName}
                </h1>
                <p className="text-xl text-gray-400" data-testid="category-description">
                  Explore all posts in the {categoryName} category
                </p>
              </div>
            </div>

            {/* Post Count */}
            {pagination && (
              <p className="text-gray-500" data-testid="post-count">
                {pagination.total_posts} {pagination.total_posts === 1 ? 'post' : 'posts'} found
              </p>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" data-testid="category-loading">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 animate-pulse">
                    <div className="w-full h-48 bg-gray-800 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-800 rounded mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12" data-testid="category-error">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 border border-red-500/30 rounded-full mb-4">
                  <Folder className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Posts</h3>
                <p className="text-gray-400 mb-6">{error}</p>
                <button 
                  onClick={() => fetchCategoryPosts(currentPage)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Posts Grid */}
            {!loading && !error && posts.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12" data-testid="category-posts-grid">
                  {posts.map((post) => (
                    <BlogCard
                      key={post.id}
                      title={post.title}
                      excerpt={post.excerpt}
                      slug={post.slug}
                      category={post.category}
                      published_at={post.published_at}
                      tags={post.tags}
                      featured_image_url={post.featured_image_url}
                      author={post.author}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <BlogPagination
                    currentPage={pagination.current_page}
                    totalPages={pagination.total_pages}
                    hasNext={pagination.has_next_page}
                    hasPrev={pagination.has_prev_page}
                    onPageChange={handlePageChange}
                    className="mt-16"
                  />
                )}
              </>
            )}

            {/* No Posts State */}
            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-12" data-testid="category-no-posts">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-600/20 border border-gray-500/30 rounded-full mb-4">
                  <Folder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Posts Found</h3>
                <p className="text-gray-400 mb-6">There are no published posts in the {categoryName} category yet.</p>
                <Link 
                  href="/blog"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-block"
                >
                  Browse All Posts
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}