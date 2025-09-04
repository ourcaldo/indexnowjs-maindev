import { supabaseAdmin } from '@/lib/database'

export interface SitemapUrl {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface SiteSettings {
  sitemap_enabled: boolean
  sitemap_posts_enabled: boolean
  sitemap_pages_enabled: boolean
  sitemap_categories_enabled: boolean
  sitemap_tags_enabled: boolean
  sitemap_max_urls_per_file: number
  sitemap_change_frequency: string
}

export class SitemapGenerator {
  private baseUrl: string
  private settings: SiteSettings | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  async getSiteSettings(): Promise<SiteSettings | null> {
    if (this.settings) return this.settings

    try {
      const { data, error } = await supabaseAdmin
        .from('indb_site_settings')
        .select('sitemap_enabled, sitemap_posts_enabled, sitemap_pages_enabled, sitemap_categories_enabled, sitemap_tags_enabled, sitemap_max_urls_per_file, sitemap_change_frequency')
        .single()

      if (error) {
        console.error('Error fetching sitemap settings:', error)
        return null
      }

      this.settings = data
      return data
    } catch (error) {
      console.error('Failed to get site settings:', error)
      return null
    }
  }

  generateXml(urls: SitemapUrl[]): string {
    const urlTags = urls.map(url => {
      let urlTag = `    <url>\n      <loc>${this.escapeXml(url.url)}</loc>\n`
      
      if (url.lastmod) {
        urlTag += `      <lastmod>${url.lastmod}</lastmod>\n`
      }
      
      if (url.changefreq) {
        urlTag += `      <changefreq>${url.changefreq}</changefreq>\n`
      }
      
      if (url.priority !== undefined) {
        urlTag += `      <priority>${url.priority.toFixed(1)}</priority>\n`
      }
      
      urlTag += '    </url>'
      return urlTag
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags}
</urlset>`
  }

  generateSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
    const sitemapTags = sitemaps.map(sitemap => {
      let sitemapTag = `    <sitemap>\n      <loc>${this.escapeXml(sitemap.loc)}</loc>\n`
      
      if (sitemap.lastmod) {
        sitemapTag += `      <lastmod>${sitemap.lastmod}</lastmod>\n`
      }
      
      sitemapTag += '    </sitemap>'
      return sitemapTag
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapTags}
</sitemapindex>`
  }

  async generateMainSitemap(): Promise<string> {
    const settings = await this.getSiteSettings()
    if (!settings?.sitemap_enabled) {
      return this.generateSitemapIndex([])
    }

    const sitemaps: { loc: string; lastmod?: string }[] = []
    const currentDate = new Date().toISOString()

    if (settings.sitemap_posts_enabled) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-posts.xml`,
        lastmod: currentDate
      })
    }

    if (settings.sitemap_pages_enabled) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-pages.xml`,
        lastmod: currentDate
      })
    }

    if (settings.sitemap_categories_enabled) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-categories.xml`,
        lastmod: currentDate
      })
    }

    if (settings.sitemap_tags_enabled) {
      sitemaps.push({
        loc: `${this.baseUrl}/sitemap-tags.xml`,
        lastmod: currentDate
      })
    }

    return this.generateSitemapIndex(sitemaps)
  }

  async generatePostsSitemap(page: number = 1): Promise<string> {
    const settings = await this.getSiteSettings()
    if (!settings?.sitemap_enabled || !settings?.sitemap_posts_enabled) {
      return this.generateXml([])
    }

    const maxUrls = settings.sitemap_max_urls_per_file || 5000
    const offset = (page - 1) * maxUrls

    try {
      const { data: posts, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select(`
          slug,
          updated_at,
          indb_cms_categories!main_category_id(slug)
        `)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + maxUrls - 1)

      if (error) {
        console.error('Error fetching posts for sitemap:', error)
        return this.generateXml([])
      }

      const urls: SitemapUrl[] = posts.map(post => {
        const category = Array.isArray(post.indb_cms_categories) ? post.indb_cms_categories[0] : post.indb_cms_categories
        return {
          url: `${this.baseUrl}/blog/${category?.slug || 'uncategorized'}/${post.slug}`,
          lastmod: new Date(post.updated_at).toISOString().split('T')[0],
          changefreq: this.getChangeFrequency(post.updated_at, settings.sitemap_change_frequency),
          priority: 0.7
        }
      })

      return this.generateXml(urls)
    } catch (error) {
      console.error('Failed to generate posts sitemap:', error)
      return this.generateXml([])
    }
  }

  async generatePagesSitemap(): Promise<string> {
    const settings = await this.getSiteSettings()
    if (!settings?.sitemap_enabled || !settings?.sitemap_pages_enabled) {
      return this.generateXml([])
    }

    const staticPages = [
      { url: '', priority: 1.0 }, // Homepage
      { url: '/pricing', priority: 0.8 },
      { url: '/contact', priority: 0.8 },
      { url: '/faq', priority: 0.8 },
      { url: '/blog', priority: 0.9 }
    ]

    const urls: SitemapUrl[] = staticPages.map(page => ({
      url: `${this.baseUrl}${page.url}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: settings.sitemap_change_frequency as any || 'monthly',
      priority: page.priority
    }))

    return this.generateXml(urls)
  }

  async generateCategoriesSitemap(): Promise<string> {
    const settings = await this.getSiteSettings()
    if (!settings?.sitemap_enabled || !settings?.sitemap_categories_enabled) {
      return this.generateXml([])
    }

    try {
      const { data: categories, error } = await supabaseAdmin
        .from('indb_cms_categories')
        .select('slug, updated_at')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching categories for sitemap:', error)
        return this.generateXml([])
      }

      const urls: SitemapUrl[] = categories.map(category => ({
        url: `${this.baseUrl}/blog/category/${category.slug}`,
        lastmod: new Date(category.updated_at).toISOString().split('T')[0],
        changefreq: settings.sitemap_change_frequency as any || 'weekly',
        priority: 0.8
      }))

      return this.generateXml(urls)
    } catch (error) {
      console.error('Failed to generate categories sitemap:', error)
      return this.generateXml([])
    }
  }

  async generateTagsSitemap(): Promise<string> {
    const settings = await this.getSiteSettings()
    if (!settings?.sitemap_enabled || !settings?.sitemap_tags_enabled) {
      return this.generateXml([])
    }

    try {
      // Get all unique tags from published posts
      const { data: posts, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select('tags, updated_at')
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .not('tags', 'is', null)

      if (error) {
        console.error('Error fetching tags for sitemap:', error)
        return this.generateXml([])
      }

      const tagsMap = new Map<string, Date>()

      posts.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              const existingDate = tagsMap.get(tag)
              const postDate = new Date(post.updated_at)
              if (!existingDate || postDate > existingDate) {
                tagsMap.set(tag, postDate)
              }
            }
          })
        }
      })

      const urls: SitemapUrl[] = Array.from(tagsMap.entries()).map(([tag, lastmod]) => ({
        url: `${this.baseUrl}/blog/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`,
        lastmod: lastmod.toISOString().split('T')[0],
        changefreq: settings.sitemap_change_frequency as any || 'monthly',
        priority: 0.6
      }))

      return this.generateXml(urls)
    } catch (error) {
      console.error('Failed to generate tags sitemap:', error)
      return this.generateXml([])
    }
  }

  private getChangeFrequency(updatedAt: string, defaultFreq: string): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceUpdate < 7) return 'daily'
    if (daysSinceUpdate < 30) return 'weekly'
    return defaultFreq as any || 'monthly'
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '&': return '&amp;'
        case "'": return '&apos;'
        case '"': return '&quot;'
        default: return c
      }
    })
  }
}