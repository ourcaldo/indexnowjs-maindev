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
    // ALWAYS create new submissions for each job run to preserve history
    // This ensures that when a job is re-run, we keep all historical submissions
    console.log(`Creating new URL submissions for job ${job.id} (preserving history)`);
    
    // Get current run count to track job runs
    const { data: existingSubmissions } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('id')
      .eq('job_id', job.id);
      
    const runCount = (existingSubmissions?.length || 0) > 0 ? 
      Math.floor((existingSubmissions?.length || 0) / (job.source_data?.urls?.length || 1)) + 1 : 1;
    
    console.log(`This is run #${runCount} for job ${job.id}`);

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

    // Create URL submissions with run metadata for history tracking
    const submissions = urls.map((url, index) => ({
      job_id: job.id,
      url,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      response_data: { run_number: runCount, batch_index: index } // Track which run this belongs to
    }));

    const { error: insertError } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .insert(submissions);

    if (insertError) {
      console.error('Error creating URL submissions:', insertError);
      throw insertError;
    }

    // Update job total_urls count (only for current run URLs, not cumulative)
    await supabaseAdmin
      .from('indb_indexing_jobs')
      .update({
        total_urls: urls.length,
        processed_urls: 0, // Reset progress for new run
        successful_urls: 0,
        failed_urls: 0,
        progress_percentage: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`Created ${submissions.length} new URL submissions for job ${job.id} (run #${runCount})`);

  } catch (error) {
    console.error('Error in createUrlSubmissions:', error);
    throw error;
  }
}