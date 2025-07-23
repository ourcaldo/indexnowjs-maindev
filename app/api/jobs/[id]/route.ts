import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the auth token
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Get job details
    const { data: job, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error in job GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the auth token
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();

    // Validate status value before updating
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'paused', 'cancelled'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Check if this is a retry/re-run action (job was completed/failed and now setting to pending)
    const { data: currentJob } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    const isRetry = (currentJob?.status === 'completed' || currentJob?.status === 'failed') && body.status === 'pending';

    // Prepare update data
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString()
    };

    // If this is a retry, reset progress and processed counts
    if (isRetry) {
      updateData.progress_percentage = 0;
      updateData.processed_urls = 0;
      updateData.successful_urls = 0;
      updateData.failed_urls = 0;
      updateData.started_at = null;
      updateData.completed_at = null;
      updateData.error_message = null;

      // Delete existing URL submissions for this job so it can be reprocessed
      await supabaseAdmin
        .from('indb_indexing_url_submissions')
        .delete()
        .eq('job_id', jobId);
    }

    // Update job status and progress if needed
    const { data: job, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .update(updateData)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error in job PUT route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the auth token
    await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Delete job and related submissions
    const { error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting job:', error);
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error in job DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}