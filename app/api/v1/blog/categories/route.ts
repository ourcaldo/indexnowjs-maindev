import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET() {
  const supabase = supabaseAdmin
  
  try {
    // Get categories with their labels from the categories table
    const { data: categories, error } = await supabase
      .from('indb_cms_categories')
      .select('id, name, slug, post_count')
      .eq('is_active', true)
      .gt('post_count', 0)
      .order('name')
    
    if (error) {
      console.error('Failed to fetch categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }
    
    // Format categories for frontend consumption
    const formattedCategories = categories?.map(cat => ({
      id: cat.id,
      name: cat.name,        // Display label like "Case Studies"
      slug: cat.slug,        // URL slug like "case-studies"
      count: cat.post_count
    })) || []
    
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