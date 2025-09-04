import { supabaseAdmin } from '@/lib/database'

export class SitemapDataService {
  async getPosts(page: number = 1, limit: number = 5000): Promise<any[]> {
    try {
      const offset = (page - 1) * limit

      const { data, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select(`
          id,
          title,
          slug,
          updated_at,
          indb_cms_categories:category_id (
            slug
          )
        `)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

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
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_cms_categories')
        .select('id, name, slug')
        .order('name')

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
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_cms_posts')
        .select('tags')
        .eq('status', 'published')
        .not('tags', 'is', null)

      if (error) {
        console.error('Error fetching tags for sitemap:', error)
        return []
      }

      // Extract and flatten all tags
      const allTags: string[] = []
      data?.forEach(post => {
        if (Array.isArray(post.tags)) {
          allTags.push(...post.tags)
        }
      })

      // Return unique tags
      return Array.from(new Set(allTags.filter(tag => tag && tag.trim())))
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