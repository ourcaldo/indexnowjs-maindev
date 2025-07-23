// Debug script to check URL submissions for the specific job
import { supabaseAdmin } from './lib/supabase.js';

async function debugSubmissions() {
  const jobId = '16f86f9e-1eda-4ad5-a143-967fc6b1b1d6';
  
  console.log('🔍 Checking URL submissions for job:', jobId);
  
  // Get all submissions for this job
  const { data: submissions, error } = await supabaseAdmin
    .from('indb_indexing_url_submissions') 
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${submissions?.length || 0} submissions:`);
  submissions?.forEach((sub, index) => {
    console.log(`${index + 1}. ID: ${sub.id}`);
    console.log(`   URL: ${sub.url}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${sub.created_at}`);
    console.log(`   Submitted: ${sub.submitted_at}`);
    console.log(`   Response Data:`, sub.response_data);
    console.log('   ---');
  });

  // Check job data
  const { data: job } = await supabaseAdmin
    .from('indb_indexing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  console.log('\n📋 Job Data:');
  console.log('  Status:', job?.status);
  console.log('  Progress:', job?.progress_percentage);
  console.log('  Total URLs:', job?.total_urls);
  console.log('  Processed:', job?.processed_urls);
  console.log('  Successful:', job?.successful_urls);
  console.log('  Failed:', job?.failed_urls);
}

debugSubmissions().catch(console.error);