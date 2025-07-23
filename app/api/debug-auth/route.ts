import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { GoogleAuthService } from '../../../lib/google-auth-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting manual debug of Google Auth process...');

    // Get the service account that's causing issues
    const { data: serviceAccount, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('*')
      .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6')
      .single();

    if (error || !serviceAccount) {
      return Response.json({ 
        error: 'Service account not found',
        details: error?.message
      });
    }

    console.log('🔍 DEBUG - Service account found, attempting to get access token...');
    
    // This will trigger all the detailed debugging we added
    const googleAuth = GoogleAuthService.getInstance();
    const accessToken = await googleAuth.getAccessToken(serviceAccount.id);

    return Response.json({
      success: accessToken !== null,
      hasAccessToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      message: accessToken 
        ? 'Successfully obtained access token with debugging'
        : 'Failed to obtain access token - check console logs for detailed debugging'
    });

  } catch (error) {
    console.error('Error in debug-auth:', error);
    return Response.json({ 
      error: 'Debug auth failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}