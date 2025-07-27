import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check if service account exists and belongs to user
    const { data: serviceAccount, error: fetchError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !serviceAccount) {
      return NextResponse.json(
        { error: 'Service account not found' },
        { status: 404 }
      )
    }

    // Delete service account using admin client
    const { error: deleteError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete service account error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete service account' },
        { status: 500 }
      )
    }

    // Log service account deletion activity
    try {
      await ActivityLogger.logServiceAccountActivity(
        user.id,
        ActivityEventTypes.SERVICE_ACCOUNT_DELETE,
        params.id,
        `Deleted Google service account: ${serviceAccount.name} (${serviceAccount.email})`,
        request,
        {
          serviceAccountName: serviceAccount.name,
          serviceAccountEmail: serviceAccount.email,
          wasActive: serviceAccount.is_active
        }
      )
    } catch (logError) {
      console.error('Failed to log service account deletion activity:', logError)
    }

    return NextResponse.json({
      message: 'Service account deleted successfully'
    })

  } catch (error) {
    console.error('Delete service account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}