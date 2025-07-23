import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { authService } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For this endpoint, we'll require manual user ID or get it from JWT token
    const body = await request.json();
    const userId = body.userId;
    
    if (!userId) {
      return Response.json({ 
        error: 'User ID required',
        message: 'Please provide userId in request body'
      }, { status: 400 });
    }

    // Clear all encrypted credentials for this user's service accounts
    const { error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .update({
        encrypted_credentials: '',
        encrypted_access_token: null,
        access_token_expires_at: null,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting service accounts:', error);
      return Response.json({ 
        error: 'Failed to reset service accounts',
        details: error.message 
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'All service accounts have been reset. Please re-upload your Google service account JSON files.',
      action_required: 'Visit Settings -> Service Accounts to upload new credentials'
    });

  } catch (error) {
    console.error('Error in reset-encryption:', error);
    return Response.json({ 
      error: 'Failed to reset service accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}