import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { JobLoggingService } from '@/lib/job-management/job-logging-service'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

export async function GET(request: NextRequest) {
  try {
    // Apply validation middleware
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      validateQuery: apiRequestSchemas.indexingJobsQuery,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60 // 60 requests per minute for indexing jobs
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    // Get validated query parameters and user from validation result
    const queryParams = validationResult.sanitizedData?.query || {};
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '', 
      schedule = '' 
    } = queryParams;
    
    const user = validationResult.user;

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
    // Apply validation middleware with proper body validation
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      validateBody: apiRequestSchemas.indexingJobCreate,
      sanitizeHtml: true,
      sanitizeUrls: true,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30 // 30 job creations per minute
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    const user = validationResult.user;
    const validatedBody = validationResult.sanitizedData?.body || {};
    const { name, type, urls, sitemapUrl, scheduleType, startTime } = validatedBody;

    // Import QuotaService for quota enforcement
    const { QuotaService } = await import('@/lib/monitoring/quota-service')

    // Process URLs for manual jobs (already validated by schema)
    const processedUrls = type === 'manual' 
      ? Array.from(new Set(urls || [])) // Remove duplicates, URLs already validated
      : []
    
    // Check user's quota before creating job
    const urlCount = processedUrls.length
    
    if (urlCount > 0) {
      const quotaCheck = await QuotaService.canSubmitUrls(user.id, urlCount)
      if (!quotaCheck.canSubmit) {
        return NextResponse.json({ 
          error: quotaCheck.message || 'Quota exceeded. Upgrade your package to submit more URLs.',
          quota_exhausted: quotaCheck.quotaExhausted,
          remaining_quota: quotaCheck.remainingQuota
        }, { status: 403 })
      }
    }
      
    const jobData = {
      user_id: user.id,
      name, // Already validated and sanitized by middleware
      type,
      status: 'pending',
      schedule_type: scheduleType || 'one-time',
      source_data: type === 'manual' 
        ? { urls: processedUrls } 
        : { sitemap_url: sitemapUrl }, // Already validated and sanitized by middleware
      total_urls: type === 'manual' ? processedUrls.length : 0,
      processed_urls: 0,
      successful_urls: 0,
      failed_urls: 0,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (scheduleType !== 'one-time' && startTime) {
      (jobData as any).next_run_at = startTime
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

    // Log job creation
    const jobLogger = JobLoggingService.getInstance();
    await jobLogger.logJobEvent({
      job_id: data.id,
      level: 'INFO',
      message: `Job created: ${data.name}`,
      metadata: {
        event_type: 'job_created',
        user_id: user.id,
        job_type: data.type,
        schedule_type: data.schedule_type,
        total_urls: data.total_urls,
        created_via: 'api_endpoint'
      }
    });

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Error in POST /api/jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}