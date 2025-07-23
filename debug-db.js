// Debug database submissions for specific job
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://base.indexnow.studio';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTMwMzA4MDAsImV4cCI6MTkxMDc5NzIwMH0.LIQX0iP6uE6PsrDCA7ia4utqKBWOTa6dRpq6AZJ5O7U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugJob() {
  const jobId = '16f86f9e-1eda-4ad5-a143-967fc6b1b1d6';
  
  console.log('🔍 Debugging job submissions for:', jobId);
  
  // Get all submissions
  const { data: submissions, error } = await supabase
    .from('indb_indexing_url_submissions')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total submissions: ${submissions?.length || 0}`);
  
  submissions?.forEach((sub, index) => {
    console.log(`\n${index + 1}. ${sub.id}`);
    console.log(`   URL: ${sub.url}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   Created: ${sub.created_at}`);
    console.log(`   Submitted: ${sub.submitted_at}`);
    console.log(`   Response Data:`, JSON.stringify(sub.response_data, null, 2));
  });

  // Check job status
  const { data: job } = await supabase
    .from('indb_indexing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  console.log('\n📋 Job Status:');
  console.log(`   Status: ${job?.status}`);
  console.log(`   Progress: ${job?.progress_percentage}%`);
  console.log(`   Total URLs: ${job?.total_urls}`);
  console.log(`   Processed: ${job?.processed_urls}`);
  console.log(`   Successful: ${job?.successful_urls}`);
  console.log(`   Failed: ${job?.failed_urls}`);
}

debugJob().catch(console.error);