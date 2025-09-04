import { supabaseAdmin } from '@/lib/database'

export class SitemapDataService {
  async getPosts(page: number = 1, limit: number = 5000): Promise<any[]> {
    const startTime = Date.now()
    
    try {
      const offset = (page - 1) * limit

      const { data, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select(`
          id,
          title,
          slug,
          updated_at,
          published_at,
          featured,
          main_category_id,
          indb_cms_categories!main_category_id (
            slug
          )
        `)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const endTime = Date.now()
      console.log(`[PERF] Posts sitemap query took ${endTime - startTime}ms for page ${page}`)

      if (error) {
        console.error('Error fetching posts for sitemap:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch posts for sitemap:', error)
      return []
    }
  }

  async getCategories(): Promise<any[]> {
    const startTime = Date.now()
    
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_cms_categories')
        .select('id, name, slug, updated_at')
        .order('updated_at', { ascending: false })

      const endTime = Date.now()
      console.log(`[PERF] Categories sitemap query took ${endTime - startTime}ms`)

      if (error) {
        console.error('Error fetching categories for sitemap:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch categories for sitemap:', error)
      return []
    }
  }

  async getTagsFromPosts(): Promise<string[]> {
    const startTime = Date.now()
    
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select('tags, updated_at')
        .eq('status', 'published')
        .not('tags', 'is', null)
        .order('updated_at', { ascending: false })

      const endTime = Date.now()
      console.log(`[PERF] Tags sitemap query took ${endTime - startTime}ms`)

      if (error) {
        console.error('Error fetching tags for sitemap:', error)
        return []
      }

      // Extract and flatten all tags with timestamps for last update
      const tagMap = new Map<string, string>()
      data?.forEach(post => {
        if (Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              const cleanTag = tag.trim()
              // Keep the most recent update time for each tag
              if (!tagMap.has(cleanTag) || post.updated_at > tagMap.get(cleanTag)!) {
                tagMap.set(cleanTag, post.updated_at)
              }
            }
          })
        }
      })

      // Return unique tags
      return Array.from(tagMap.keys())
    } catch (error) {
      console.error('Failed to fetch tags for sitemap:', error)
      return []
    }
  }

  async getTotalPostsCount(): Promise<number> {
    try {
      const { count, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')

      if (error) {
        console.error('Error getting posts count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Failed to get posts count:', error)
      return 0
    }
  }
}