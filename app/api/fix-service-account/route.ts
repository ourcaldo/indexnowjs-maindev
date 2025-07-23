import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing corrupted service account by clearing encrypted data...');

    // Clear the corrupted encrypted credentials
    const { error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .update({
        encrypted_credentials: '',
        encrypted_access_token: null,
        access_token_expires_at: null,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6');

    if (error) {
      console.error('Error clearing service account:', error);
      return Response.json({ 
        error: 'Failed to clear service account',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ Successfully cleared corrupted service account data');

    return Response.json({
      success: true,
      message: 'Successfully cleared corrupted service account data. The indexing error should now stop.',
      nextSteps: [
        'Go to Settings → Service Accounts',
        'Delete the "indexnow" service account entry',
        'Upload a fresh Google service account JSON file',
        'Test indexing by creating a new job'
      ],
      note: 'The background job processor will no longer crash on decryption errors.'
    });

  } catch (error) {
    console.error('Error in fix-service-account:', error);
    return Response.json({ 
      error: 'Failed to fix service account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}