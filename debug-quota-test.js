// Debug utility to test quota exhaustion notification system
import { supabaseAdmin } from './lib/supabase.js';

async function testQuotaExhaustion() {
  try {
    console.log('🧪 Starting quota exhaustion notification test...');
    
    // Get any active service account from the database
    const { data: serviceAccounts, error: fetchError } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id, user_id, name, email, is_active')
      .limit(1);
    
    if (fetchError || !serviceAccounts || serviceAccounts.length === 0) {
      console.error('❌ No service accounts found for testing');
      return;
    }
    
    const serviceAccount = serviceAccounts[0];
    console.log(`📋 Testing with service account: ${serviceAccount.name} (${serviceAccount.email})`);
    console.log(`👤 User ID: ${serviceAccount.user_id}`);
    console.log(`🔄 Is Active: ${serviceAccount.is_active}`);
    
    // Create a test notification directly
    const testNotification = {
      user_id: serviceAccount.user_id,
      type: 'service_account_quota_exhausted',
      title: 'Service Account Quota Exhausted (TEST)',
      message: `Service account "${serviceAccount.name}" (${serviceAccount.email}) has exhausted its daily quota. Jobs have been paused and will resume automatically after quota reset (midnight Pacific Time).`,
      metadata: {
        service_account_id: serviceAccount.id,
        service_account_name: serviceAccount.name,
        service_account_email: serviceAccount.email,
        quota_reset_time: 'midnight Pacific Time'
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    console.log('📝 Creating test notification...');
    const { data: notification, error: insertError } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .insert(testNotification)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error creating test notification:', insertError);
      return;
    }
    
    console.log('✅ Test notification created successfully:');
    console.log('  - ID:', notification.id);
    console.log('  - User ID:', notification.user_id);
    console.log('  - Type:', notification.type);
    console.log('  - Title:', notification.title);
    console.log('  - Created:', notification.created_at);
    console.log('  - Expires:', notification.expires_at);
    
    // Check if notification can be fetched via API query
    console.log('\n🔍 Testing API query conditions...');
    const { data: queryResult, error: queryError } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .select('*')
      .eq('user_id', serviceAccount.user_id)
      .eq('type', 'service_account_quota_exhausted')
      .eq('is_read', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (queryError) {
      console.error('❌ Error querying notifications:', queryError);
      return;
    }
    
    console.log(`📊 Query found ${queryResult?.length || 0} notifications`);
    if (queryResult && queryResult.length > 0) {
      queryResult.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} (${notif.id})`);
      });
    }
    
    console.log('\n🧪 Test complete! Check the frontend to see if notification appears.');
    console.log('💡 If you want to clean up the test notification, run:');
    console.log(`   DELETE FROM indb_notifications_dashboard WHERE id = '${notification.id}';`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testQuotaExhaustion().then(() => {
    console.log('🏁 Test execution finished');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testQuotaExhaustion };