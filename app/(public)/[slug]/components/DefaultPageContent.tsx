'use client'

import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'
import Background from '@/components/shared/Background'
import { usePageData } from '@/hooks/shared/usePageData'

interface CMSPage {
  id: string
  title: string
  slug: string
  content: string | null
  template: string
  featured_image_url: string | null
  status: string
  meta_title: string | null
  meta_description: string | null
  custom_css: string | null
  custom_js: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

interface DefaultPageContentProps {
  page: CMSPage
}

export default function DefaultPageContent({ page }: DefaultPageContentProps) {
  const { user, siteSettings, handleAuthAction } = usePageData()

  const navigation = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' }
  ]

  return (
    <div className="relative min-h-screen">
      <Background />
      
      {/* Header */}
      <Header 
        user={user}
        siteSettings={siteSettings}
        onAuthAction={handleAuthAction}
        navigation={navigation}
        variant="page"
        currentPage={page.slug}
      />

      {/* Main Content */}
      <main className="relative pt-16">
        {/* Page Header */}
        <section className="pt-12 pb-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              {page.title}
            </h1>
            {page.published_at && (
              <p className="text-gray-400 text-sm mb-8">
                Last updated: {new Date(page.published_at).toLocaleDateString('en-US', { 
                  month: '2-digit',
                  day: '2-digit', 
                  year: 'numeric' 
                })}
              </p>
            )}
          </div>
        </section>

        {/* Content Section */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg prose-invert max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: page.content || '<p>No content available.</p>' 
                }} 
                className="text-gray-300 leading-relaxed [&>h1]:text-white [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:mt-12 [&>h2]:text-white [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-12 [&>h2]:mb-6 [&>h3]:text-white [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-4 [&>h4]:text-white [&>h4]:text-lg [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-3 [&>p]:mb-6 [&>p]:leading-relaxed [&>ul]:mb-6 [&>ol]:mb-6 [&>li]:mb-2 [&>li]:text-gray-300 [&>a]:text-blue-400 [&>a]:hover:text-blue-300 [&>a]:underline [&>strong]:text-white [&>em]:text-gray-200 [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-6 [&>blockquote]:italic [&>blockquote]:text-gray-400"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer 
        siteSettings={siteSettings}
      />
    </div>
  )
}