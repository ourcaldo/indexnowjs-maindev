import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/database'

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

    // Stop all running jobs for this user
    const { data, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .in('status', ['running', 'pending'])
      .select()

    if (error) {
      console.error('Error stopping jobs:', error)
      return NextResponse.json({ error: 'Failed to stop jobs' }, { status: 500 })
    }

    console.log(`🛑 Stopped ${data?.length || 0} jobs for user ${user.id} due to daily limit reached`)

    return NextResponse.json({ 
      success: true,
      message: `Stopped ${data?.length || 0} jobs`,
      stopped_jobs: data?.length || 0
    })
  } catch (error) {
    console.error('Error in POST /api/jobs/stop-all:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}