import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

// Using validation schemas from shared/schema.ts

export async function GET(request: NextRequest) {
  try {
    // Apply validation middleware
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      validateQuery: apiRequestSchemas.keywordsQuery,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 120 // 120 requests per minute for keyword queries
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    // Get validated query parameters and user from validation result
    const queryParams = validationResult.sanitizedData?.query || {};
    const { 
      domain_id, 
      device_type, 
      country_id, 
      tags, 
      page = 1, 
      limit = 20
    } = queryParams;
    
    const user = validationResult.user;

    console.log('Keywords GET: Authenticated user:', user.id)
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('indb_keyword_keywords')
      .select(`
        *,
        domain:indb_keyword_domains(id, domain_name, display_name),
        country:indb_keyword_countries(id, name, iso2_code),
        rankings:indb_keyword_rankings(
          position,
          url,
          search_volume,
          check_date,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Apply filters
    if (domain_id) query = query.eq('domain_id', domain_id)
    if (device_type) query = query.eq('device_type', device_type)
    if (country_id) query = query.eq('country_id', country_id)
    if (tags) {
      const tagArray = tags.split(',').filter(Boolean);
      if (tagArray.length > 0) {
        query = query.overlaps('tags', tagArray);
      }
    }

    // Build count query with same filters as main query
    let countQuery = supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Apply same filters to count query
    if (domain_id) countQuery = countQuery.eq('domain_id', domain_id)
    if (device_type) countQuery = countQuery.eq('device_type', device_type)
    if (country_id) countQuery = countQuery.eq('country_id', country_id)
    if (tags) {
      const tagArray = tags.split(',').filter(Boolean);
      if (tagArray.length > 0) {
        countQuery = countQuery.overlaps('tags', tagArray);
      }
    }

    const { count } = await countQuery

    // Get paginated results
    const { data: keywords, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching keywords:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch keywords' },
        { status: 500 }
      )
    }

    // Get keyword IDs for position change calculation
    const keywordIds = (keywords || []).map((k: any) => k.id)
    
    // Calculate target dates for position changes
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Format dates as YYYY-MM-DD for database query
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(yesterday)
    const threeDaysAgoStr = formatDate(threeDaysAgo)
    const sevenDaysAgoStr = formatDate(sevenDaysAgo)
    
    // Fetch historical position data from rank history table
    const { data: historicalData } = await supabaseAdmin
      .from('indb_keyword_rank_history')
      .select('keyword_id, position, check_date')
      .in('keyword_id', keywordIds)
      .in('check_date', [yesterdayStr, threeDaysAgoStr, sevenDaysAgoStr])
    
    // Create lookup maps for position changes
    const positionHistory: { [keywordId: string]: { [date: string]: number | null } } = {}
    
    if (historicalData) {
      historicalData.forEach((record: any) => {
        if (!positionHistory[record.keyword_id]) {
          positionHistory[record.keyword_id] = {}
        }
        positionHistory[record.keyword_id][record.check_date] = record.position
      })
    }

    // Process keywords with proper position change calculations
    const processedKeywords = (keywords || []).map((keyword: any) => {
      // Get current ranking data
      const rankings = Array.isArray(keyword.rankings) ? keyword.rankings : 
                      keyword.rankings ? [keyword.rankings] : []
      const currentRanking = rankings.length > 0 ? rankings[0] : null
      
      // Calculate position changes using historical data
      const keywordHistory = positionHistory[keyword.id] || {}
      const currentPosition = currentRanking?.position || null
      
      const get1DChange = () => {
        const yesterdayPosition = keywordHistory[yesterdayStr]
        if (!yesterdayPosition || !currentPosition) return null
        return yesterdayPosition - currentPosition // Positive means improved (lower number)
      }

      const get3DChange = () => {
        const threeDaysAgoPosition = keywordHistory[threeDaysAgoStr]
        if (!threeDaysAgoPosition || !currentPosition) return null
        return threeDaysAgoPosition - currentPosition
      }

      const get7DChange = () => {
        const sevenDaysAgoPosition = keywordHistory[sevenDaysAgoStr]
        if (!sevenDaysAgoPosition || !currentPosition) return null
        return sevenDaysAgoPosition - currentPosition
      }

      return {
        ...keyword,
        current_position: currentPosition,
        current_url: currentRanking?.url || null,
        search_volume: currentRanking?.search_volume || null,
        last_updated: currentRanking?.check_date || null,
        position_1d: get1DChange(),
        position_3d: get3DChange(),
        position_7d: get7DChange(),
        rankings: undefined // Remove full rankings from response
      }
    })

    return NextResponse.json({
      success: true,
      data: processedKeywords,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Keywords GET API error:', error)
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

    // Parse and validate request body using shared schema
    const body = await request.json()
    
    console.log('Keyword creation request body:', JSON.stringify(body, null, 2))
    
    const validation = z.object({
      domain_id: z.string().uuid('Invalid domain ID'),
      keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
      device_type: z.enum(['desktop', 'mobile']).default('desktop'),
      country_id: z.string().uuid('Invalid country ID'),
      tags: z.array(z.string()).optional().default([])
    }).safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { domain_id, keywords, device_type, country_id, tags } = validation.data

    // Verify domain belongs to user
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('indb_keyword_domains')
      .select('id')
      .eq('id', domain_id)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      console.error('Domain access check - Domain not found for user:', user.id, 'domain_id:', domain_id, 'error:', domainError)
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 404 }
      )
    }

    // Check user's keyword quota - first from user profile, then subscription
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(quota_limits)
      `)
      .eq('user_id', user.id)
      .single()

    // Get current keyword count for user
    const { count: currentKeywordCount } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Get quota limits - first check direct package assignment, then active subscription
    let quotaLimits: any = null
    
    if (userProfile?.package_id && userProfile?.package) {
      // User has direct package assignment
      quotaLimits = userProfile.package.quota_limits
    } else {
      // Check active subscription
      const { data: activeSubscriptions } = await supabaseAdmin
        .from('indb_payment_subscriptions')
        .select(`
          package:indb_payment_packages(quota_limits)
        `)
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
      
      // Get quota_limits from first active subscription
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const firstSubscription = activeSubscriptions[0] as any
        quotaLimits = firstSubscription?.package?.quota_limits
      }
    }
    
    // Handle unlimited keywords (-1) or default to free tier limit
    let keywordLimit: number
    if (quotaLimits?.keywords_limit === -1) {
      keywordLimit = Infinity // Unlimited
    } else if (quotaLimits?.keywords_limit) {
      keywordLimit = quotaLimits.keywords_limit
    } else {
      keywordLimit = 50 // Default free tier
    }

    // Check quota limit (skip check if unlimited)
    if (keywordLimit !== Infinity && (currentKeywordCount || 0) + keywords.length > keywordLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Adding ${keywords.length} keywords would exceed your limit of ${keywordLimit === Infinity ? 'unlimited' : keywordLimit}. Current usage: ${currentKeywordCount || 0}` 
        },
        { status: 400 }
      )
    }

    // Check for duplicate keywords
    const { data: existingKeywords } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('keyword')
      .eq('user_id', user.id)
      .eq('domain_id', domain_id)
      .eq('device_type', device_type)
      .eq('country_id', country_id)
      .in('keyword', keywords)

    const existingKeywordTexts = existingKeywords?.map((k: any) => k.keyword) || []
    const newKeywords = keywords.filter((k: string) => !existingKeywordTexts.includes(k))

    if (newKeywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All keywords already exist for this domain/device/country combination' },
        { status: 400 }
      )
    }

    // Create keyword entries
    const keywordEntries = newKeywords.map(keyword => ({
      user_id: user.id,
      domain_id,
      keyword: keyword.trim(),
      device_type,
      country_id,
      tags: tags || []
    }))

    const { data: insertedKeywords, error } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .insert(keywordEntries)
      .select(`
        id,
        user_id,
        domain_id,
        keyword,
        device_type,
        country_id,
        tags,
        created_at,
        updated_at,
        domain:indb_keyword_domains(domain_name, display_name),
        country:indb_keyword_countries(name, iso2_code)
      `)

    if (error) {
      console.error('Error inserting keywords:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add keywords' },
        { status: 500 }
      )
    }



    // Trigger immediate rank checks for newly added keywords if user has API key configured
    let hasAPIKey = false
    let enrichmentTriggered = false
    try {
      const { APIKeyManager } = await import('@/lib/rank-tracking/api-key-manager')
      const { RankTracker } = await import('@/lib/rank-tracking/rank-tracker')
      
      const apiKeyManager = new APIKeyManager()
      const siteAPIKey = await apiKeyManager.getActiveAPIKey()
      hasAPIKey = !!siteAPIKey
      
      if (siteAPIKey && insertedKeywords) {
        const rankTracker = new RankTracker()
        
        // Process each keyword asynchronously (don't wait for completion)
        const rankCheckPromises = insertedKeywords.map(async (keyword: any) => {
          try {
            const keywordData = {
              id: keyword.id,
              keyword: keyword.keyword,
              domain: keyword.domain.domain_name,
              deviceType: keyword.device_type,
              countryCode: keyword.country.iso2_code,
              userId: user.id
            }
            
            await rankTracker.trackKeyword(keywordData)
            console.log(`Rank check completed for keyword: ${keyword.keyword}`)
          } catch (error) {
            console.error(`Rank check failed for keyword ${keyword.keyword}:`, error)
            // Don't throw - let other keywords process
          }
        })
        
        // Start the rank checks but don't wait for them to complete
        // This allows the API to return quickly while processing happens in background
        Promise.allSettled(rankCheckPromises).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failed = results.filter(r => r.status === 'rejected').length
          console.log(`Rank check batch completed: ${successful} successful, ${failed} failed`)
        })
      }
    } catch (error) {
      console.error('Error triggering rank checks:', error)
      // Don't fail the keyword creation if rank checking fails
    }

    // Trigger SeRanking keyword enrichment for newly added keywords
    try {
      if (insertedKeywords && insertedKeywords.length > 0) {
        // Prepare keywords for SeRanking enrichment
        const keywordsForEnrichment = insertedKeywords.map((keyword: any) => ({
          keyword: keyword.keyword,
          country_code: keyword.country.iso2_code.toLowerCase(),
          language_code: 'en'
        }))

        console.log(`[INFO] Starting SeRanking enrichment for ${keywordsForEnrichment.length} keywords`)

        // Get system API key for internal SeRanking API call
        const systemApiKey = process.env.SYSTEM_API_KEY
        if (!systemApiKey) {
          console.error('System API key not configured - skipping keyword enrichment')
        } else {
          // Make internal API call to SeRanking bulk enrichment endpoint
          const enrichmentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v1/integrations/seranking/keyword-data/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-System-API-Key': systemApiKey
            },
            body: JSON.stringify({
              keywords: keywordsForEnrichment,
              priority: 'NORMAL'
            })
          })

          if (enrichmentResponse.ok) {
            const enrichmentData = await enrichmentResponse.json()
            console.log(`[INFO] SeRanking enrichment queued: Job ID ${enrichmentData.job_id}`)
            enrichmentTriggered = true
          } else {
            const errorText = await enrichmentResponse.text()
            console.error(`[ERROR] SeRanking enrichment failed:`, errorText)
          }
        }
      }
    } catch (error) {
      console.error('Error triggering SeRanking keyword enrichment:', error)
      // Don't fail the keyword creation if enrichment fails
    }

    return NextResponse.json({
      success: true,
      data: insertedKeywords,
      message: `Successfully added ${newKeywords.length} keywords${existingKeywordTexts.length > 0 ? ` (${existingKeywordTexts.length} duplicates skipped)` : ''}${hasAPIKey ? '. Rank checking started.' : '. Contact admin to configure ScrapingDog API key.'}${enrichmentTriggered ? ' SeRanking keyword enrichment queued.' : ''}`
    })

  } catch (error) {
    console.error('Keywords POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}