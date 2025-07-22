import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { GoogleIndexingProcessor } from '../../../../lib/google-indexing-processor';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find pending jobs for this user
    const { data: pendingJobs, error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .is('locked_at', null)
      .limit(3);

    if (error) {
      console.error('Error fetching pending jobs:', error);
      return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return Response.json({ 
        message: 'No pending jobs found',
        timestamp: new Date().toISOString()
      });
    }

    const processor = GoogleIndexingProcessor.getInstance();
    const results = [];

    // Process each job
    for (const job of pendingJobs) {
      try {
        const result = await processor.processIndexingJob(job.id);
        results.push({
          jobId: job.id,
          name: job.name,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        results.push({
          jobId: job.id,
          name: job.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return Response.json({ 
      message: `Processed ${pendingJobs.length} jobs`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering job processing:', error);
    return Response.json(
      { error: 'Failed to trigger job processing' }, 
      { status: 500 }
    );
  }
}