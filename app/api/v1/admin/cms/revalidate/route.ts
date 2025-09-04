import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Get the JWT token from cookies
    const token = request.cookies.get('supabase-auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify JWT and extract user info
    let userId: string
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as any
      userId = decoded.sub
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { type, paths, tags } = body

    const revalidated: string[] = []

    if (type === 'path' && paths && Array.isArray(paths)) {
      // Revalidate specific paths
      for (const path of paths) {
        try {
          revalidatePath(path)
          revalidated.push(path)
        } catch (error) {
          console.error(`Failed to revalidate path ${path}:`, error)
        }
      }
    } else if (type === 'tag' && tags && Array.isArray(tags)) {
      // Revalidate by tags
      for (const tag of tags) {
        try {
          revalidateTag(tag)
          revalidated.push(tag)
        } catch (error) {
          console.error(`Failed to revalidate tag ${tag}:`, error)
        }
      }
    } else if (type === 'page') {
      // Revalidate specific page and related paths
      const { slug, is_homepage } = body
      
      if (slug) {
        try {
          // Revalidate the specific page
          revalidatePath(`/${slug}`)
          revalidated.push(`/${slug}`)

          // If this is the homepage, also revalidate the root path
          if (is_homepage) {
            revalidatePath('/')
            revalidated.push('/')
          }
        } catch (error) {
          console.error(`Failed to revalidate page ${slug}:`, error)
        }
      }
    } else if (type === 'homepage') {
      // Revalidate homepage specifically
      try {
        revalidatePath('/')
        revalidated.push('/')
      } catch (error) {
        console.error('Failed to revalidate homepage:', error)
      }
    } else if (type === 'all-pages') {
      // Revalidate all pages
      try {
        // Get all published pages
        const { data: pages, error } = await supabaseAdmin
          .from('indb_cms_pages')
          .select('slug, is_homepage')
          .eq('status', 'published')

        if (!error && pages) {
          for (const page of pages) {
            revalidatePath(`/${page.slug}`)
            revalidated.push(`/${page.slug}`)
            
            if (page.is_homepage) {
              revalidatePath('/')
              revalidated.push('/')
            }
          }
        }
      } catch (error) {
        console.error('Failed to revalidate all pages:', error)
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid revalidation type. Use "path", "tag", "page", "homepage", or "all-pages"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully revalidated ${revalidated.length} items`,
      revalidated
    })

  } catch (error) {
    console.error('Cache revalidation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check revalidation status/info
export async function GET(request: NextRequest) {
  try {
    // Get the JWT token from cookies
    const token = request.cookies.get('supabase-auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify JWT and extract user info
    let userId: string
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as any
      userId = decoded.sub
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get published pages count
    const { count } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    return NextResponse.json({
      available_types: [
        'path',    // Revalidate specific paths
        'tag',     // Revalidate by cache tags
        'page',    // Revalidate specific page
        'homepage', // Revalidate homepage
        'all-pages' // Revalidate all published pages
      ],
      published_pages_count: count || 0,
      revalidation_info: {
        homepage_revalidation: '30 minutes (1800 seconds)',
        page_revalidation: '1 hour (3600 seconds)',
        manual_revalidation: 'Available via this API'
      }
    })

  } catch (error) {
    console.error('Cache revalidation info API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}