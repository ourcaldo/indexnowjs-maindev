import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import slugify from 'slugify'

interface CreateCategoryRequest {
  name: string
  description?: string
  parent_id?: string
}

interface UpdateCategoryRequest {
  name?: string
  description?: string
  parent_id?: string
  is_active?: boolean
}

// GET /api/v1/admin/cms/categories - List all categories with hierarchy
export async function GET(request: NextRequest) {
  const supabase = supabaseAdmin
  const { searchParams } = new URL(request.url)
  const include_inactive = searchParams.get('include_inactive') === 'true'
  
  try {
    let query = supabase
      .from('indb_cms_categories')
      .select(`
        *,
        parent:parent_id(id, name, slug),
        children:indb_cms_categories!parent_id(id, name, slug, post_count)
      `)
      .order('name')

    if (!include_inactive) {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Failed to fetch categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Organize into hierarchy
    const rootCategories = categories?.filter(cat => !cat.parent_id) || []
    const childCategories = categories?.filter(cat => cat.parent_id) || []

    // Build hierarchy
    const hierarchy = rootCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parent_id === parent.id)
    }))

    return NextResponse.json({
      categories: hierarchy,
      total: categories?.length || 0
    })

  } catch (error) {
    console.error('System error in categories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/admin/cms/categories - Create new category
export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin
  
  try {
    const body: CreateCategoryRequest = await request.json()
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = slugify(body.name, { lower: true, strict: true })

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('indb_cms_categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    // Validate parent category if provided
    if (body.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('indb_cms_categories')
        .select('id')
        .eq('id', body.parent_id)
        .eq('is_active', true)
        .single()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        )
      }
    }

    // Create category
    const { data: category, error } = await supabase
      .from('indb_cms_categories')
      .insert({
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        parent_id: body.parent_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create category:', error)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Category created successfully',
      category
    })

  } catch (error) {
    console.error('System error in create category API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}