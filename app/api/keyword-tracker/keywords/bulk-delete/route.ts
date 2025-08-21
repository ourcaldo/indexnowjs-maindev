import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

const bulkDeleteSchema = z.object({
  keywordIds: z.array(z.string().uuid()).min(1, 'At least one keyword ID is required')
})

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validation = bulkDeleteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { keywordIds } = validation.data

    // Verify all keywords belong to the user
    const { data: keywords, error: verifyError } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id, keyword, domain:indb_keyword_domains(domain_name)')
      .eq('user_id', user.id)
      .in('id', keywordIds)

    if (verifyError) {
      console.error('Error verifying keywords:', verifyError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify keywords' },
        { status: 500 }
      )
    }

    if (!keywords || keywords.length !== keywordIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some keywords not found or access denied' },
        { status: 404 }
      )
    }

    // Delete related rank history first (to maintain referential integrity)
    const { error: rankHistoryError } = await supabaseAdmin
      .from('indb_keyword_rank_history')
      .delete()
      .in('keyword_id', keywordIds)

    if (rankHistoryError) {
      console.error('Error deleting rank history:', rankHistoryError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete rank history' },
        { status: 500 }
      )
    }

    // Delete rankings
    const { error: rankingsError } = await supabaseAdmin
      .from('indb_keyword_rankings')
      .delete()
      .in('keyword_id', keywordIds)

    if (rankingsError) {
      console.error('Error deleting rankings:', rankingsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete rankings' },
        { status: 500 }
      )
    }

    // Delete keywords
    const { error: deleteError } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .delete()
      .in('id', keywordIds)

    if (deleteError) {
      console.error('Error deleting keywords:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete keywords' },
        { status: 500 }
      )
    }

    // Log activity
    const keywordNames = keywords.map((k: any) => k.keyword).join(', ')
    const domainNames = Array.from(new Set(keywords.map((k: any) => k.domain?.domain_name))).join(', ')
    
    await ActivityLogger.logKeywordActivity(
      user.id,
      ActivityEventTypes.KEYWORD_BULK_DELETE,
      `${keywords.length} keywords from ${domainNames}`,
      request,
      {
        keywordCount: keywords.length,
        keywordNames: keywordNames.length > 100 ? keywordNames.substring(0, 100) + '...' : keywordNames,
        domains: domainNames
      }
    )

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${keywords.length} keywords`
    })

  } catch (error) {
    console.error('Bulk delete keywords API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}