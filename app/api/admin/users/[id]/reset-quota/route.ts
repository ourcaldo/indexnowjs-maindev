import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const authResult = await requireSuperAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const userId = params.id

    // Reset user's daily quota
    const { error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        daily_quota_used: 0,
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error resetting user quota:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset quota' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'User quota has been successfully reset'
    })

  } catch (error) {
    console.error('Error resetting quota:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}