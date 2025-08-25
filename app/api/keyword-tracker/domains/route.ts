import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { z } from 'zod'

// Validation schema
const createDomainSchema = z.object({
  domain_name: z.string().min(1, 'Domain name is required'),
  display_name: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from server context
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's domains
    const { data: domains, error } = await supabaseAdmin
      .from('indb_keyword_domains')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching domains:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: domains || []
    })

  } catch (error) {
    console.error('Domains GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from server context
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validation = createDomainSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { domain_name, display_name } = validation.data

    // Clean domain name (remove protocol, www, trailing slash)
    const cleanDomain = domain_name
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase()

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabaseAdmin
      .from('indb_keyword_domains')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain_name', cleanDomain)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: 'Domain already exists' },
        { status: 400 }
      )
    }

    // Create new domain
    const { data: newDomain, error } = await supabaseAdmin
      .from('indb_keyword_domains')
      .insert({
        user_id: user.id,
        domain_name: cleanDomain,
        display_name: display_name || cleanDomain,
        verification_status: 'verified' // For now, auto-verify
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating domain:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create domain' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newDomain
    })

  } catch (error) {
    console.error('Domains POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}