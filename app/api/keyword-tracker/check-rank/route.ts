/**
 * Manual Rank Check API Endpoint
 * Allows users to trigger immediate rank checks for specific keywords
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/server-auth'
import { RankTracker } from '@/lib/rank-tracker'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema
const checkRankSchema = z.object({
  keyword_id: z.string().uuid('Invalid keyword ID')
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Validate request body
    const body = await request.json()
    const validation = checkRankSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { keyword_id } = validation.data

    // 3. Initialize rank tracker
    const rankTracker = new RankTracker()

    // 4. Get keyword details with domain and country
    const keywordData = await rankTracker.getKeywordWithDetails(keyword_id, user.id)
    if (!keywordData) {
      return NextResponse.json(
        { success: false, error: 'Keyword not found or access denied' },
        { status: 404 }
      )
    }

    // 5. Check user's quota before proceeding
    const { APIKeyManager } = await import('@/lib/api-key-manager')
    const apiKeyManager = new APIKeyManager()
    const availableQuota = await apiKeyManager.getAvailableQuota(user.id)
    
    if (availableQuota <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API quota exceeded. Please wait for quota reset or add more quota to your plan.',
          quotaInfo: {
            available: availableQuota,
            resetInfo: 'Quota resets daily'
          }
        },
        { status: 429 }
      )
    }

    // 6. Perform immediate rank check
    await rankTracker.trackKeyword(keywordData)

    // 7. Get updated ranking data
    const { data: updatedRanking, error: rankingError } = await supabaseAdmin
      .from('indb_keyword_rankings')
      .select('*')
      .eq('keyword_id', keyword_id)
      .single()

    if (rankingError) {
      console.warn('Could not fetch updated ranking, but check was successful:', rankingError)
    }

    // 8. Get updated keyword with current position
    const { data: updatedKeyword, error: keywordError } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select(`
        *,
        domain:indb_keyword_domains(domain_name, display_name),
        country:indb_keyword_countries(name, iso2_code),
        rankings:indb_keyword_rankings(position, url, check_date)
      `)
      .eq('id', keyword_id)
      .eq('user_id', user.id)
      .single()

    const responseData = {
      keyword: updatedKeyword || null,
      ranking: updatedRanking || null,
      quotaRemaining: availableQuota - 1
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Rank check completed successfully'
    })

  } catch (error) {
    console.error('Manual rank check failed:', error)
    
    // Return appropriate error message based on error type
    const errorMessage = error instanceof Error ? error.message : 'Rank check failed'
    const statusCode = errorMessage.includes('quota') ? 429 : 
                      errorMessage.includes('API key') ? 402 : 500

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: statusCode }
    )
  }
}

// GET endpoint to check if user has ScrapingDog API key configured
export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has ScrapingDog integration configured
    const { data: integration, error } = await supabaseAdmin
      .from('indb_site_integration')
      .select('api_quota_limit, api_quota_used, quota_reset_date, is_active')
      .eq('user_id', user.id)
      .eq('service_name', 'scrapingdog')
      .single()

    if (error || !integration) {
      return NextResponse.json({
        success: true,
        configured: false,
        message: 'ScrapingDog API key not configured. Please add your API key in Settings.'
      })
    }

    const availableQuota = integration.api_quota_limit - integration.api_quota_used
    
    return NextResponse.json({
      success: true,
      configured: true,
      quotaInfo: {
        limit: integration.api_quota_limit,
        used: integration.api_quota_used,
        available: Math.max(0, availableQuota),
        resetDate: integration.quota_reset_date,
        isActive: integration.is_active
      }
    })

  } catch (error) {
    console.error('Error checking rank check configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}