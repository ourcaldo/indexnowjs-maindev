'use client'

import { useEffect } from 'react'

// Shared components
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

// Blog components
import PostHeader from '@/components/blog/PostHeader'
import PostContent from '@/components/blog/PostContent'
import RelatedPosts from '@/components/blog/RelatedPosts'
import TableOfContents from '@/components/blog/TableOfContents'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image_url?: string
  meta_title?: string
  meta_description?: string
  tags: string[]
  published_at: string
  created_at: string
  updated_at?: string
  author: {
    name: string
    avatar_url?: string
  }
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  tags: string[]
  author: {
    name: string
  }
}

interface SinglePostContentProps {
  post: BlogPost
  relatedPosts: RelatedPost[]
}

export default function SinglePostContent({ post, relatedPosts }: SinglePostContentProps) {
  const { user, siteSettings, handleAuthAction } = usePageData()

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

  // Calculate estimated read time based on content length
  const calculateReadTime = (content: string): number => {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  const readTime = calculateReadTime(post.content)

  // Update page title in browser tab
  useEffect(() => {
    document.title = `${post.meta_title || post.title} - IndexNow Studio`
  }, [post.meta_title, post.title])

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
        {/* Article Container */}
        <article className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Post Header */}
            <PostHeader
              title={post.title}
              excerpt={post.excerpt}
              author={post.author}
              published_at={post.published_at}
              tags={post.tags}
              featured_image_url={post.featured_image_url}
              readTime={readTime}
              className="mb-12"
            />

            {/* Table of Contents */}
            <TableOfContents 
              content={post.content}
              className="mb-8"
            />

            {/* Post Content */}
            <PostContent 
              content={post.content}
              className="mb-16"
            />

            {/* Author Bio Section */}
            <div className="border-t border-gray-800/50 pt-8 mb-16" data-testid="author-bio">
              <div className="flex items-start gap-4">
                {post.author.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.name}
                    className="w-16 h-16 rounded-full object-cover"
                    data-testid="author-avatar"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-300">
                      {post.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1" data-testid="author-name">
                    {post.author.name}
                  </h3>
                  <p className="text-gray-400" data-testid="author-description">
                    SEO Expert & Content Strategist at IndexNow Studio. Passionate about helping businesses improve their search rankings and online visibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Tags Section */}
            {post.tags.length > 0 && (
              <div className="border-t border-gray-800/50 pt-8 mb-16" data-testid="post-tags-section">
                <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:bg-gray-700/50 transition-colors"
                      data-testid={`post-tag-${tag.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <RelatedPosts 
                posts={relatedPosts}
                className="mb-16"
              />
            )}
          </div>
        </article>

        {/* Newsletter/CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-800/50" data-testid="newsletter-section">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Stay Updated with SEO Insights
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Get the latest rank tracking strategies and SEO tips delivered to your inbox. Join thousands of marketers improving their search performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                data-testid="newsletter-email-input"
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                data-testid="newsletter-subscribe-button"
              >
                Subscribe
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              No spam. Unsubscribe at any time.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}