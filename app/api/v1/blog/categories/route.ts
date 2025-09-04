import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET() {
  const supabase = supabaseAdmin
  
  try {
    // Get all active categories first
    const { data: categories, error } = await supabase
      .from('indb_cms_categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name')
    
    if (error) {
      console.error('Failed to fetch categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }
    
    if (!categories || categories.length === 0) {
      return NextResponse.json({
        categories: []
      })
    }
    
    // For each category, count how many published posts it has
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const { count } = await supabase
          .from('indb_cms_posts')
          .select('*', { count: 'exact', head: true })
          .eq('main_category_id', category.id)
          .eq('status', 'published')
          .not('published_at', 'is', null)
        
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          count: count || 0
        }
      })
    )
    
    // Filter to only show categories with posts
    const formattedCategories = categoriesWithCounts.filter(cat => cat.count > 0)
    
    return NextResponse.json({
      categories: formattedCategories
    })
    
  } catch (error) {
    console.error('System error in blog categories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}