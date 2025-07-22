import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authService } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from auth token
    const { user, error: authError } = await authService.getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Verify job belongs to user
    const { data: job, error: jobError } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get submissions for this job
    const { data: submissions, error, count } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ 
      submissions: submissions || [], 
      count: count || 0,
      page,
      limit 
    });
  } catch (error) {
    console.error('Error in submissions GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}