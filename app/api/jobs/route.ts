import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Set the auth token
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for pagination and filtering
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const schedule = url.searchParams.get('schedule') || ''

    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('indb_indexing_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`)
    }
    if (status && status !== 'All Status') {
      query = query.eq('status', status)
    }
    if (schedule && schedule !== 'All Schedules') {
      query = query.eq('schedule_type', schedule)
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Get total count for next job number
    const { data: allJobs } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('id')
      .eq('user_id', user.id)

    return NextResponse.json({ 
      jobs: data || [],
      count: count || 0,
      page,
      limit,
      nextJobNumber: (allJobs?.length || 0) + 1
    })
  } catch (error) {
    console.error('Error in GET /api/jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, urls, sitemapUrl, scheduleType, startTime } = body

    // Security: Sanitize inputs
    const sanitizeInput = (input: string): string => {
      if (typeof input !== 'string') return ''
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }

    const validateUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url)
        return ['http:', 'https:'].includes(urlObj.protocol) && 
               urlObj.hostname.length >= 3 && 
               urlObj.hostname.includes('.')
      } catch {
        return false
      }
    }

    const validateJobName = (name: string): boolean => {
      const validPattern = /^[a-zA-Z0-9\s\-_#]+$/
      return validPattern.test(name) && name.length <= 100
    }

    // Validate and sanitize inputs
    const sanitizedName = sanitizeInput(name)
    
    if (!sanitizedName || !type) {
      return NextResponse.json({ error: 'Job name and type are required' }, { status: 400 })
    }

    if (!validateJobName(sanitizedName)) {
      return NextResponse.json({ error: 'Invalid job name format' }, { status: 400 })
    }

    if (!['manual', 'sitemap'].includes(type)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    if (type === 'manual') {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'URLs are required for manual jobs' }, { status: 400 })
      }

      // Validate and sanitize URLs
      const sanitizedUrls = urls.map(url => sanitizeInput(url)).filter(url => url.trim())
      const invalidUrls = sanitizedUrls.filter(url => !validateUrl(url))
      
      if (invalidUrls.length > 0) {
        return NextResponse.json({ error: 'Invalid URLs detected' }, { status: 400 })
      }

      // Check for duplicates (no limit on URL count per user request)
      const uniqueUrls = Array.from(new Set(sanitizedUrls))
    }

    if (type === 'sitemap') {
      const sanitizedSitemapUrl = sanitizeInput(sitemapUrl)
      if (!sanitizedSitemapUrl || !validateUrl(sanitizedSitemapUrl)) {
        return NextResponse.json({ error: 'Valid sitemap URL is required' }, { status: 400 })
      }
    }

    if (scheduleType && !['one-time', 'hourly', 'daily', 'weekly', 'monthly'].includes(scheduleType)) {
      return NextResponse.json({ error: 'Invalid schedule type' }, { status: 400 })
    }

    // Create the job with sanitized data
    const processedUrls = type === 'manual' 
      ? Array.from(new Set(urls.map((url: string) => sanitizeInput(url)).filter((url: string) => url.trim())))
      : []
      
    const jobData = {
      user_id: user.id,
      name: sanitizedName,
      type,
      status: 'pending',
      schedule_type: scheduleType || 'one-time',
      source_data: type === 'manual' 
        ? { urls: processedUrls } 
        : { sitemap_url: sanitizeInput(sitemapUrl) },
      total_urls: type === 'manual' ? processedUrls.length : 0,
      processed_urls: 0,
      successful_urls: 0,
      failed_urls: 0,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (scheduleType !== 'one-time' && startTime) {
      jobData.next_run_at = startTime
    }

    const { data, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .insert([jobData])
      .select()
      .single()

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Error in POST /api/jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}