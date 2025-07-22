import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const jobId = params.id;

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
  { params }: { params: { id: string } }
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

    const jobId = params.id;
    const body = await request.json();

    // Update job status
    const { data: job, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .update({
        status: body.status,
        updated_at: new Date().toISOString()
      })
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
  { params }: { params: { id: string } }
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

    const jobId = params.id;

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