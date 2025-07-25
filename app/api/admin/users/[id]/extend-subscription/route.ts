import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: userId } = await params
    const { days = 30 } = await request.json()

    // Get current user profile
    const { data: userProfile, error: fetchError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('expires_at')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate new expiration date
    const currentExpiry = userProfile.expires_at ? new Date(userProfile.expires_at) : new Date()
    const newExpiry = new Date(currentExpiry.getTime() + (days * 24 * 60 * 60 * 1000))

    // Update user's subscription expiration
    const { error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error extending subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to extend subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Subscription extended by ${days} days`,
      new_expiry: newExpiry.toISOString()
    })

  } catch (error) {
    console.error('Error extending subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}