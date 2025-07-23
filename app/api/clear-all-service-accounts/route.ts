import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Clearing ALL corrupted service accounts...');

    // Get all service accounts first
    const { data: serviceAccounts, error: fetchError } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id, name, email, encrypted_credentials');

    if (fetchError) {
      console.error('Error fetching service accounts:', fetchError);
      return Response.json({ error: 'Failed to fetch service accounts' });
    }

    console.log(`Found ${serviceAccounts.length} service accounts to clear:`);
    serviceAccounts.forEach(account => {
      console.log(`- ${account.name} (${account.id}): ${account.encrypted_credentials?.length || 0} chars`);
    });

    // Clear all encrypted credentials
    const { error: updateError } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .update({
        encrypted_credentials: '',
        encrypted_access_token: null,
        access_token_expires_at: null,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (updateError) {
      console.error('Error clearing service accounts:', updateError);
      return Response.json({ 
        error: 'Failed to clear service accounts',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully cleared ALL service account encrypted credentials');

    return Response.json({
      success: true,
      cleared_accounts: serviceAccounts.length,
      accounts: serviceAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        previous_credential_length: acc.encrypted_credentials?.length || 0
      })),
      message: 'All service accounts cleared. Background job processor should stop crashing now.',
      next_steps: [
        'Go to Settings → Service Accounts',
        'Delete all existing service account entries',
        'Upload fresh Google service account JSON files',
        'Test indexing functionality'
      ]
    });

  } catch (error) {
    console.error('Error in clear-all-service-accounts:', error);
    return Response.json({ 
      error: 'Failed to clear service accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}