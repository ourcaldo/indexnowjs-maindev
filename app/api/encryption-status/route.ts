import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { EncryptionService } from '../../../lib/encryption';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking encryption status for all service accounts...');

    // Get all service accounts
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id, name, email, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ 
        error: 'Failed to fetch service accounts',
        details: error.message
      }, { status: 500 });
    }

    if (!serviceAccounts?.length) {
      return Response.json({
        total: 0,
        message: 'No service accounts found. Add service accounts in Settings to enable Google API indexing.',
        status: 'no_accounts'
      });
    }

    const accountStatus = [];
    let working = 0;
    let needsReupload = 0;

    for (const account of serviceAccounts) {
      try {
        // Get the full account data including encrypted credentials
        const { data: fullAccount } = await supabaseAdmin
          .from('indb_google_service_accounts')
          .select('encrypted_credentials')
          .eq('id', account.id)
          .single();

        if (!fullAccount?.encrypted_credentials || fullAccount.encrypted_credentials.trim() === '') {
          accountStatus.push({
            id: account.id,
            name: account.name,
            email: account.email,
            status: 'no_credentials',
            message: 'Service account has no credentials - please upload JSON file'
          });
          needsReupload++;
          continue;
        }

        // Test if we can decrypt the credentials
        const canDecrypt = EncryptionService.testDecryption(fullAccount.encrypted_credentials);
        
        if (canDecrypt) {
          // Try to parse the JSON to ensure it's valid
          const decrypted = EncryptionService.decrypt(fullAccount.encrypted_credentials);
          const parsed = JSON.parse(decrypted);
          
          if (parsed.client_email && parsed.private_key) {
            accountStatus.push({
              id: account.id,
              name: account.name,
              email: account.email,
              status: 'working',
              message: 'Ready for Google API indexing',
              service_email: parsed.client_email
            });
            working++;
          } else {
            accountStatus.push({
              id: account.id,
              name: account.name,
              email: account.email,
              status: 'invalid_format',
              message: 'Invalid service account format - please re-upload'
            });
            needsReupload++;
          }
        } else {
          accountStatus.push({
            id: account.id,
            name: account.name,
            email: account.email,
            status: 'encryption_error',
            message: 'Cannot decrypt credentials - please re-upload service account JSON file'
          });
          needsReupload++;
        }

      } catch (error) {
        accountStatus.push({
          id: account.id,
          name: account.name,
          email: account.email,
          status: 'error',
          message: `Error checking account: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        needsReupload++;
      }
    }

    const statusSummary = working > 0 ? 'ready' : 'needs_setup';
    
    return Response.json({
      total: serviceAccounts.length,
      working,
      needsReupload,
      status: statusSummary,
      accounts: accountStatus,
      message: working > 0 
        ? `${working} service account(s) are ready for Google API indexing`
        : 'All service accounts need to be re-uploaded. Go to Settings → Service Accounts.',
      nextSteps: working === 0 ? [
        'Go to Settings → Service Accounts',
        'Delete existing service accounts',
        'Upload new Google service account JSON files',
        'Test indexing by creating a new job'
      ] : [
        'Your service accounts are working correctly',
        'You can create indexing jobs from the IndexNow page'
      ]
    });

  } catch (error) {
    console.error('Error checking encryption status:', error);
    return Response.json({ 
      error: 'Failed to check encryption status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}