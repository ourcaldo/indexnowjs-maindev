import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing different decryption approaches...');

    // Get a service account to test decryption
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('*')
      .limit(1);

    if (error || !serviceAccounts?.length) {
      return Response.json({ 
        error: 'No service accounts found to test decryption'
      });
    }

    const serviceAccount = serviceAccounts[0];
    const encryptedData = serviceAccount.encrypted_credentials;
    const parts = encryptedData.split(':');
    
    console.log('Encrypted data format:', encryptedData.substring(0, 50) + '...');
    console.log('Parts length:', parts.length);
    console.log('Current encryption key:', process.env.ENCRYPTION_KEY);

    if (parts.length !== 2) {
      return Response.json({
        error: 'Invalid encrypted data format',
        parts: parts.length,
        data: encryptedData.substring(0, 100)
      });
    }

    const algorithms = ['aes-256-cbc', 'aes-128-cbc', 'aes-192-cbc'];
    const keyVariations = [
      process.env.ENCRYPTION_KEY || '',
      '11a28471ce34b44641f0b36da9efe38f',  // Current key
      'indexnow-pro-encryption-key-32',      // Alternative
    ];

    let successfulResult = null;

    // Try different combinations
    for (const algorithm of algorithms) {
      for (const keyVar of keyVariations) {
        if (keyVar.length !== 32) continue;

        try {
          // Method 1: Legacy createDecipher
          try {
            const decipher = crypto.createDecipher(algorithm, keyVar);
            let decrypted = decipher.update(parts[1], 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            // Test if it's valid JSON
            const parsed = JSON.parse(decrypted);
            if (parsed.client_email) {
              successfulResult = {
                method: 'legacy_createDecipher',
                algorithm,
                key: keyVar.substring(0, 8) + '...',
                client_email: parsed.client_email,
                project_id: parsed.project_id
              };
              console.log('✅ Success with legacy method!');
              break;
            }
          } catch (e) {
            // Continue to next approach
          }

          // Method 2: Modern createDecipheriv with first part as IV
          try {
            const iv = Buffer.from(parts[0], 'hex');
            const key = Buffer.from(keyVar, 'utf8');
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(parts[1], 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            // Test if it's valid JSON
            const parsed = JSON.parse(decrypted);
            if (parsed.client_email) {
              successfulResult = {
                method: 'modern_createDecipheriv',
                algorithm,
                key: keyVar.substring(0, 8) + '...',
                client_email: parsed.client_email,
                project_id: parsed.project_id
              };
              console.log('✅ Success with modern method!');
              break;
            }
          } catch (e) {
            // Continue to next approach
          }

        } catch (error) {
          // Continue to next combination
        }
      }
      if (successfulResult) break;
    }

    if (successfulResult) {
      return Response.json({
        success: true,
        message: 'Found working decryption method!',
        result: successfulResult
      });
    } else {
      return Response.json({
        success: false,
        error: 'None of the decryption methods worked',
        tested: {
          algorithms,
          keyVariations: keyVariations.map(k => k.substring(0, 8) + '...'),
          encryptedDataSample: encryptedData.substring(0, 50) + '...'
        }
      });
    }

  } catch (error) {
    console.error('Error in decryption recovery:', error);
    return Response.json({ 
      error: 'Failed to test decryption recovery',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}