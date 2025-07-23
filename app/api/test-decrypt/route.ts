import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { EncryptionService } from '../../../lib/encryption';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing decryption with current encryption key...');
    console.log('Current ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

    // Get a service account to test decryption
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('*')
      .limit(1);

    if (error || !serviceAccounts?.length) {
      return Response.json({ 
        error: 'No service accounts found to test decryption',
        encryptionKey: process.env.ENCRYPTION_KEY?.substring(0, 8) + '...'
      });
    }

    const serviceAccount = serviceAccounts[0];
    
    // Test if we can decrypt the credentials
    const canDecrypt = EncryptionService.testDecryption(serviceAccount.encrypted_credentials);
    
    if (canDecrypt) {
      console.log('✅ Decryption successful with current key');
      
      // Try to decrypt and show partial credentials for verification
      try {
        const decrypted = EncryptionService.decrypt(serviceAccount.encrypted_credentials);
        const parsed = JSON.parse(decrypted);
        
        return Response.json({
          success: true,
          message: 'Decryption works correctly',
          serviceAccountEmail: parsed.client_email,
          encryptionKey: process.env.ENCRYPTION_KEY?.substring(0, 8) + '...',
          credentialsPreview: {
            type: parsed.type,
            project_id: parsed.project_id,
            client_email: parsed.client_email
          }
        });
      } catch (parseError) {
        return Response.json({
          success: false,
          error: 'Decryption successful but JSON parsing failed',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
      }
    } else {
      console.log('❌ Decryption failed with current key');
      
      return Response.json({
        success: false,
        error: 'Cannot decrypt service account credentials with current encryption key',
        currentKey: process.env.ENCRYPTION_KEY?.substring(0, 8) + '...',
        encryptedDataFormat: serviceAccount.encrypted_credentials.substring(0, 50) + '...',
        suggestion: 'The encryption key may have changed or the data was encrypted with a different key'
      });
    }

  } catch (error) {
    console.error('Error testing decryption:', error);
    return Response.json({ 
      error: 'Failed to test decryption',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}