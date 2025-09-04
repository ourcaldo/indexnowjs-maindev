import { SitemapConfigService } from './SitemapConfigService'
import { SitemapXmlGenerator } from './SitemapXmlGenerator'
import { SitemapUrlBuilder } from './SitemapUrlBuilder'
import { SitemapDataService } from './SitemapDataService'

export class SitemapOrchestrator {
  private configService: SitemapConfigService
  private xmlGenerator: SitemapXmlGenerator
  private urlBuilder: SitemapUrlBuilder
  private dataService: SitemapDataService

  constructor(baseUrl: string) {
    this.configService = new SitemapConfigService()
    this.xmlGenerator = new SitemapXmlGenerator()
    this.urlBuilder = new SitemapUrlBuilder(baseUrl)
    this.dataService = new SitemapDataService()
  }

  async generateMainSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled) {
        return this.xmlGenerator.generateSitemapIndexXml([])
      }

      const enabledSitemaps = {
        posts: settings.sitemap_posts_enabled,
        pages: settings.sitemap_pages_enabled,
        categories: settings.sitemap_categories_enabled,
        tags: settings.sitemap_tags_enabled
      }

      const sitemaps = this.urlBuilder.buildSitemapIndexUrls(enabledSitemaps)
      return this.xmlGenerator.generateSitemapIndexXml(sitemaps)
    } catch (error) {
      console.error('Failed to generate main sitemap:', error)
      return this.xmlGenerator.generateSitemapIndexXml([])
    }
  }

  async generatePostsSitemap(page: number = 1): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_posts_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const maxUrls = settings.sitemap_max_urls_per_file || 5000
      const posts = await this.dataService.getPosts(page, maxUrls)
      
      if (!posts.length) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildPostUrls(posts, (updatedAt, defaultFreq) => 
        this.configService.getChangeFrequency(updatedAt, defaultFreq)
      )

      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate posts sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generatePagesSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_pages_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildStaticPageUrls()
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate pages sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generateCategoriesSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_categories_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const categories = await this.dataService.getCategories()
      
      if (!categories.length) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildCategoryUrls(categories)
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate categories sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }

  async generateTagsSitemap(): Promise<string> {
    try {
      const settings = await this.configService.getSiteSettings()
      
      if (!settings?.sitemap_enabled || !settings?.sitemap_tags_enabled) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const tags = await this.dataService.getTagsFromPosts()
      
      if (!tags.length) {
        return this.xmlGenerator.generateUrlSetXml([])
      }

      const urls = this.urlBuilder.buildTagUrls(tags)
      return this.xmlGenerator.generateUrlSetXml(urls)
    } catch (error) {
      console.error('Failed to generate tags sitemap:', error)
      return this.xmlGenerator.generateUrlSetXml([])
    }
  }
}