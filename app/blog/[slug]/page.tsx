import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SinglePostContent from './components/SinglePostContent'

// Generate metadata for each blog post
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/blog/posts/${params.slug}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      return {
        title: 'Post Not Found - IndexNow Studio',
        description: 'The requested blog post could not be found.'
      }
    }
    
    const { post } = await response.json()
    
    return {
      title: `${post.meta_title || post.title} - IndexNow Studio`,
      description: post.meta_description || post.excerpt || `Read ${post.title} on IndexNow Studio blog`,
      keywords: `${post.tags?.join(', ') || ''}, SEO, rank tracking, digital marketing, IndexNow Studio`,
      openGraph: {
        title: post.meta_title || post.title,
        description: post.meta_description || post.excerpt,
        type: 'article',
        url: `/blog/${post.slug}`,
        images: post.featured_image_url ? [
          {
            url: post.featured_image_url,
            width: 1200,
            height: 630,
            alt: post.title,
          }
        ] : undefined,
        publishedTime: post.published_at,
        modifiedTime: post.updated_at,
        tags: post.tags,
        authors: [post.author.name],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.meta_title || post.title,
        description: post.meta_description || post.excerpt,
        images: post.featured_image_url ? [post.featured_image_url] : undefined,
      },
      alternates: {
        canonical: `/blog/${post.slug}`
      },
      robots: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      }
    }
  } catch (error) {
    return {
      title: 'Blog Post - IndexNow Studio',
      description: 'Read the latest SEO insights and rank tracking tips on IndexNow Studio blog.'
    }
  }
}

export default async function SinglePostPage({ params }: { params: { slug: string } }) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/blog/posts/${params.slug}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      notFound()
    }
    
    const { post, related_posts } = await response.json()
    
    // Generate structured data for the blog post
    const postStructuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt || post.meta_description,
      "image": post.featured_image_url ? [post.featured_image_url] : undefined,
      "datePublished": post.published_at,
      "dateModified": post.updated_at || post.published_at,
      "author": {
        "@type": "Person",
        "name": post.author.name,
        "image": post.author.avatar_url
      },
      "publisher": {
        "@type": "Organization",
        "name": "IndexNow Studio",
        "url": "https://indexnow.studio"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://indexnow.studio/blog/${post.slug}`
      },
      "keywords": post.tags?.join(', '),
      "articleSection": "SEO & Digital Marketing",
      "articleBody": post.content
    }
    
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(postStructuredData)
          }}
        />
        <SinglePostContent post={post} relatedPosts={related_posts} />
      </>
    )
  } catch (error) {
    notFound()
  }
}