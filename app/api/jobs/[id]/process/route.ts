import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { authService } from '../../../../../lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    
    // Get current user
    const user = await authService.getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify job ownership
    const { data: job, error: jobError } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if job is already running
    if (job.status === 'running' && job.locked_at) {
      return Response.json({ error: 'Job is already running' }, { status: 400 });
    }

    // Create URL submissions if not exists
    await createUrlSubmissions(job);

    // Mark job as pending to be picked up by the monitor
    const { error: updateError } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return Response.json({ error: 'Failed to start job' }, { status: 500 });
    }

    return Response.json({
      message: 'Job processing started',
      jobId,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error processing job:', error);
    return Response.json(
      { error: 'Failed to process job' }, 
      { status: 500 }
    );
  }
}

async function createUrlSubmissions(job: any) {
  try {
    // Check if submissions already exist
    const { data: existingSubmissions } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('id')
      .eq('job_id', job.id)
      .limit(1);

    if (existingSubmissions && existingSubmissions.length > 0) {
      console.log(`Submissions already exist for job ${job.id}`);
      return;
    }

    let urls: string[] = [];

    if (job.type === 'manual' && job.source_data?.urls) {
      urls = job.source_data.urls;
    } else if (job.type === 'sitemap' && job.source_data?.sitemap_url) {
      // For now, use a mock URL extraction - implement proper sitemap parsing later
      urls = [`${job.source_data.sitemap_url}/page1`, `${job.source_data.sitemap_url}/page2`];
    }

    if (urls.length === 0) {
      console.log(`No URLs to process for job ${job.id}`);
      return;
    }

    // Create URL submissions
    const submissions = urls.map(url => ({
      job_id: job.id,
      url,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .insert(submissions);

    if (insertError) {
      console.error('Error creating URL submissions:', insertError);
      throw insertError;
    }

    // Update job total_urls count
    await supabaseAdmin
      .from('indb_indexing_jobs')
      .update({
        total_urls: urls.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`Created ${submissions.length} URL submissions for job ${job.id}`);

  } catch (error) {
    console.error('Error in createUrlSubmissions:', error);
    throw error;
  }
}