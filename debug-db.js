// Debug database submissions for specific job
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://base.indexnow.studio';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTMwMzA4MDAsImV4cCI6MTkxMDc5NzIwMH0.LIQX0iP6uE6PsrDCA7ia4utqKBWOTa6dRpq6AZJ5O7U';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugJob() {
  const jobId = '16f86f9e-1eda-4ad5-a143-967fc6b1b1d6';
  
  console.log('🔍 Debugging job submissions for:', jobId);
  
  // Get ALL submissions for this job (not limited)
  const { data: submissions, error } = await supabase
    .from('indb_indexing_url_submissions')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 TOTAL SUBMISSIONS FOUND: ${submissions?.length || 0}`);
  console.log(`📅 Database query executed at: ${new Date().toISOString()}`);
  
  if (submissions && submissions.length > 0) {
    console.log('\n🔍 DETAILED SUBMISSION ANALYSIS:');
    
    // Group by creation time to detect patterns
    const groupedByHour = {};
    submissions?.forEach((sub, index) => {
      const hour = sub.created_at.substring(0, 13); // YYYY-MM-DDTHH
      if (!groupedByHour[hour]) {
        groupedByHour[hour] = [];
      }
      groupedByHour[hour].push(sub);
      
      console.log(`\n${index + 1}. ID: ${sub.id}`);
      console.log(`   URL: ${sub.url}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${sub.created_at}`);
      console.log(`   Submitted: ${sub.submitted_at || 'NOT_SUBMITTED'}`);
      console.log(`   Response Data:`, JSON.stringify(sub.response_data, null, 2));
      console.log(`   Service Account ID: ${sub.service_account_id || 'NOT_SET'}`);
    });
    
    console.log('\n📊 SUBMISSIONS BY HOUR:');
    Object.keys(groupedByHour).forEach(hour => {
      console.log(`   ${hour}: ${groupedByHour[hour].length} submissions`);
    });
  } else {
    console.log('\n⚠️ NO SUBMISSIONS FOUND - THIS IS THE PROBLEM!');
  }

  // Check job status
  const { data: job } = await supabase
    .from('indb_indexing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  console.log('\n📋 JOB STATUS:');
  console.log(`   Status: ${job?.status}`);
  console.log(`   Progress: ${job?.progress_percentage}%`);
  console.log(`   Total URLs: ${job?.total_urls}`);
  console.log(`   Processed: ${job?.processed_urls}`);
  console.log(`   Successful: ${job?.successful_urls}`);
  console.log(`   Failed: ${job?.failed_urls}`);
  console.log(`   Created: ${job?.created_at}`);
  console.log(`   Started: ${job?.started_at}`);
  console.log(`   Completed: ${job?.completed_at}`);
  
  // Check if there are submissions for OTHER jobs (to verify DB is working)
  const { data: allSubmissions } = await supabase
    .from('indb_indexing_url_submissions')
    .select('job_id, created_at')
    .limit(10);
    
  console.log('\n🔍 OTHER SUBMISSIONS IN DATABASE:');
  if (allSubmissions && allSubmissions.length > 0) {
    allSubmissions.forEach(sub => {
      console.log(`   Job: ${sub.job_id}, Created: ${sub.created_at}`);
    });
  } else {
    console.log('   NO SUBMISSIONS IN ENTIRE DATABASE!');
  }
}

debugJob().catch(console.error);