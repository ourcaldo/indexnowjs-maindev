import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

const addTagSchema = z.object({
  keywordIds: z.array(z.string().uuid()).min(1, 'At least one keyword ID is required'),
  tag: z.string().min(1, 'Tag is required').max(50, 'Tag must be 50 characters or less')
})

export async function POST(request: NextRequest) {
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
    const validation = addTagSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { keywordIds, tag } = validation.data

    // Clean and normalize the tag
    const cleanTag = tag.trim().toLowerCase()

    // Verify all keywords belong to the user and get current tags
    const { data: keywords, error: verifyError } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id, keyword, tags, domain:indb_keyword_domains(domain_name)')
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

    // Prepare updates for each keyword
    const updates = keywords.map((keyword: any) => {
      const currentTags = keyword.tags || []
      const newTags = currentTags.includes(cleanTag) 
        ? currentTags // Tag already exists, no change
        : [...currentTags, cleanTag] // Add new tag
      
      return {
        id: keyword.id,
        tags: newTags
      }
    })

    // Filter out keywords that already have the tag
    const keywordsToUpdate = updates.filter((update, index) => {
      const currentTags = keywords[index].tags || []
      return !currentTags.includes(cleanTag)
    })

    if (keywordsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All selected keywords already have this tag'
      })
    }

    // Update keywords with new tags
    const updatePromises = keywordsToUpdate.map(update => 
      supabaseAdmin
        .from('indb_keyword_keywords')
        .update({ tags: update.tags })
        .eq('id', update.id)
    )

    const updateResults = await Promise.all(updatePromises)
    
    // Check for errors
    const hasErrors = updateResults.some(result => result.error)
    if (hasErrors) {
      console.error('Error updating keywords:', updateResults.filter(r => r.error))
      return NextResponse.json(
        { success: false, error: 'Failed to update some keywords' },
        { status: 500 }
      )
    }

    // Log activity
    const keywordNames = keywords
      .filter((_, index) => !keywords[index].tags?.includes(cleanTag))
      .map((k: any) => k.keyword)
      .join(', ')
    const domainNames = Array.from(new Set(keywords.map((k: any) => k.domain?.domain_name))).join(', ')
    
    await ActivityLogger.logKeywordActivity(
      user.id,
      ActivityEventTypes.KEYWORD_TAG_ADD,
      `"${tag}" to ${keywordsToUpdate.length} keywords`,
      request,
      {
        tag: cleanTag,
        keywordCount: keywordsToUpdate.length,
        keywordNames: keywordNames.length > 100 ? keywordNames.substring(0, 100) + '...' : keywordNames,
        domains: domainNames
      }
    )

    return NextResponse.json({
      success: true,
      message: `Successfully added tag "${tag}" to ${keywordsToUpdate.length} keywords`
    })

  } catch (error) {
    console.error('Add tag to keywords API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}