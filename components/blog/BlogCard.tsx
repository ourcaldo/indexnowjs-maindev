'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, User, Tag, ArrowRight } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  published_at: string
  tags: string[]
  category: string
  author: {
    name: string
    avatar_url?: string
  }
}

interface BlogCardProps {
  post: BlogPost
  className?: string
}

export default function BlogCard({ post, className = '' }: BlogCardProps) {
  const [imageError, setImageError] = useState(false)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <article 
      className={`group bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700/50 transition-all duration-300 hover:transform hover:-translate-y-1 ${className}`}
      data-testid={`blog-card-${post.slug}`}
    >
      {/* Featured Image */}
      <div className="aspect-[16/10] relative overflow-hidden bg-gray-800/50">
        {post.featured_image_url && !imageError ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            data-testid={`blog-image-${post.slug}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No image available</p>
            </div>
          </div>
        )}
        
        {/* Tags overlay */}
        {post.tags.length > 0 && (
          <div className="absolute top-4 left-4">
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600/90 text-white"
              data-testid={`blog-tag-${post.slug}`}
            >
              {post.tags[0]}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Meta information */}
        <div className="flex items-center gap-4 mb-3 text-sm text-gray-400">
          <div className="flex items-center gap-1" data-testid={`blog-date-${post.slug}`}>
            <Calendar className="w-4 h-4" />
            <span>{formatDate(post.published_at)}</span>
          </div>
          
          <div className="flex items-center gap-1" data-testid={`blog-author-${post.slug}`}>
            <User className="w-4 h-4" />
            <span>{post.author.name}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors">
          <Link href={`/blog/${post.category}/${post.slug}`} data-testid={`blog-title-link-${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        {/* Excerpt */}
        <p className="text-gray-300 mb-4 line-clamp-3" data-testid={`blog-excerpt-${post.slug}`}>
          {post.excerpt}
        </p>

        {/* Read more link */}
        <Link
          href={`/blog/${post.category}/${post.slug}`}
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors group"
          data-testid={`blog-read-more-${post.slug}`}
        >
          <span>Read More</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </article>
  )
}