import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET() {
  const supabase = supabaseAdmin
  
  try {
    // Get distinct categories from published posts
    const { data: categories, error } = await supabase
      .from('indb_cms_posts')
      .select('category')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .not('category', 'is', null)
    
    if (error) {
      console.error('Failed to fetch categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }
    
    // Extract unique categories and filter out empty ones
    const uniqueCategories = Array.from(
      new Set(
        categories
          ?.map(item => item.category)
          .filter(category => category && category.trim() !== '')
      )
    ).sort()
    
    return NextResponse.json({
      categories: uniqueCategories
    })
    
  } catch (error) {
    console.error('System error in blog categories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}