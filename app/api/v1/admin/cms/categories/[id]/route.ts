import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import slugify from 'slugify'

interface UpdateCategoryRequest {
  name?: string
  description?: string
  parent_id?: string
  is_active?: boolean
}

// GET /api/v1/admin/cms/categories/[id] - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin
  
  try {
    const { data: category, error } = await supabase
      .from('indb_cms_categories')
      .select(`
        *,
        parent:parent_id(id, name, slug),
        children:indb_cms_categories!parent_id(id, name, slug, post_count)
      `)
      .eq('id', params.id)
      .single()

    if (error || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ category })

  } catch (error) {
    console.error('System error in get category API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/admin/cms/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin
  
  try {
    const body: UpdateCategoryRequest = await request.json()
    
    // Get existing category
    const { data: existing, error: fetchError } = await supabase
      .from('indb_cms_categories')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}

    // Update name and slug if provided
    if (body.name && body.name.trim() !== existing.name) {
      const newSlug = slugify(body.name, { lower: true, strict: true })
      
      // Check for duplicate slug
      const { data: duplicate } = await supabase
        .from('indb_cms_categories')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', params.id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 400 }
        )
      }

      updateData.name = body.name.trim()
      updateData.slug = newSlug
    }

    // Update description
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    // Update parent_id
    if (body.parent_id !== undefined) {
      if (body.parent_id === params.id) {
        return NextResponse.json(
          { error: 'Category cannot be parent of itself' },
          { status: 400 }
        )
      }

      if (body.parent_id) {
        // Validate parent exists
        const { data: parent } = await supabase
          .from('indb_cms_categories')
          .select('id')
          .eq('id', body.parent_id)
          .eq('is_active', true)
          .single()

        if (!parent) {
          return NextResponse.json(
            { error: 'Parent category not found' },
            { status: 400 }
          )
        }
      }

      updateData.parent_id = body.parent_id || null
    }

    // Update active status
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString()

    // Update category
    const { data: category, error } = await supabase
      .from('indb_cms_categories')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update category:', error)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Category updated successfully',
      category
    })

  } catch (error) {
    console.error('System error in update category API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/admin/cms/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin
  
  try {
    // Check if category has posts
    const { data: postCount } = await supabase
      .from('indb_cms_post_categories')
      .select('id', { count: 'exact' })
      .eq('category_id', params.id)

    if (postCount && postCount.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated posts. Move posts to another category first.' },
        { status: 400 }
      )
    }

    // Check if category has children
    const { data: children } = await supabase
      .from('indb_cms_categories')
      .select('id')
      .eq('parent_id', params.id)

    if (children && children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with child categories. Delete or move child categories first.' },
        { status: 400 }
      )
    }

    // Delete category
    const { error } = await supabase
      .from('indb_cms_categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Failed to delete category:', error)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Category deleted successfully'
    })

  } catch (error) {
    console.error('System error in delete category API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}