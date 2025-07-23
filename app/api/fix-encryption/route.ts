import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { EncryptionService } from '../../../lib/encryption';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Attempting to fix encryption for existing service accounts...');

    // Get all service accounts with encrypted credentials
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('*');

    if (error || !serviceAccounts?.length) {
      return Response.json({ 
        error: 'No service accounts found',
        details: error?.message
      });
    }

    const results = [];
    let fixed = 0;
    let failed = 0;

    for (const account of serviceAccounts) {
      try {
        // First, try to decrypt with current method
        const canDecrypt = EncryptionService.testDecryption(account.encrypted_credentials);
        
        if (canDecrypt) {
          console.log(`✅ Account ${account.name} can already be decrypted`);
          results.push({
            id: account.id,
            name: account.name,
            status: 'already_working',
            message: 'Already decryptable with current key'
          });
          continue;
        }

        // Try legacy decryption methods
        const encryptedData = account.encrypted_credentials;
        const parts = encryptedData.split(':');
        
        if (parts.length !== 2) {
          results.push({
            id: account.id,
            name: account.name,
            status: 'invalid_format',
            message: 'Invalid encrypted data format'
          });
          failed++;
          continue;
        }

        let decryptedData = null;
        
        // Try different legacy decryption approaches
        const legacyKeys = [
          '11a28471ce34b44641f0b36da9efe38f', // Current key
          'indexnow-pro-encryption-key-32',     // Alternative key
          'your-32-character-encryption-key',   // Default fallback
        ];

        // Method 1: Try legacy createDecipher (deprecated but might work for old data)
        for (const key of legacyKeys) {
          if (key.length !== 32) continue;
          
          try {
            const decipher = crypto.createDecipher('aes-256-cbc', key);
            let decrypted = decipher.update(parts[1], 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            // Test if it's valid JSON
            const parsed = JSON.parse(decrypted);
            if (parsed.client_email && parsed.private_key) {
              decryptedData = decrypted;
              console.log(`✅ Successfully decrypted ${account.name} with legacy method`);
              break;
            }
          } catch (e) {
            // Continue to next approach
          }
        }

        // Method 2: Try different IV interpretations
        if (!decryptedData) {
          for (const key of legacyKeys) {
            if (key.length !== 32) continue;
            
            try {
              // Try interpreting first part as different encodings
              const ivHex = Buffer.from(parts[0], 'hex');
              const keyBuffer = Buffer.from(key, 'utf8');
              
              if (ivHex.length === 16) { // Valid IV length for AES-256-CBC
                const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivHex);
                let decrypted = decipher.update(parts[1], 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                
                // Test if it's valid JSON
                const parsed = JSON.parse(decrypted);
                if (parsed.client_email && parsed.private_key) {
                  decryptedData = decrypted;
                  console.log(`✅ Successfully decrypted ${account.name} with IV method`);
                  break;
                }
              }
            } catch (e) {
              // Continue to next approach
            }
          }
        }

        if (decryptedData) {
          // Re-encrypt with current encryption service
          const reEncrypted = EncryptionService.encrypt(decryptedData);
          
          // Update the database with properly encrypted data
          const { error: updateError } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .update({
              encrypted_credentials: reEncrypted,
              updated_at: new Date().toISOString()
            })
            .eq('id', account.id);

          if (updateError) {
            throw new Error(`Failed to update database: ${updateError.message}`);
          }

          // Verify the fix worked
          const testDecrypt = EncryptionService.testDecryption(reEncrypted);
          if (testDecrypt) {
            results.push({
              id: account.id,
              name: account.name,
              status: 'fixed',
              message: 'Successfully re-encrypted with current key'
            });
            fixed++;
            console.log(`✅ Fixed encryption for ${account.name}`);
          } else {
            throw new Error('Re-encryption verification failed');
          }
        } else {
          results.push({
            id: account.id,
            name: account.name,
            status: 'failed',
            message: 'Could not decrypt with any known method'
          });
          failed++;
          console.log(`❌ Could not fix encryption for ${account.name}`);
        }

      } catch (error) {
        results.push({
          id: account.id,
          name: account.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        failed++;
        console.error(`❌ Error processing ${account.name}:`, error);
      }
    }

    return Response.json({
      success: fixed > 0,
      summary: {
        total: serviceAccounts.length,
        fixed,
        failed,
        alreadyWorking: results.filter(r => r.status === 'already_working').length
      },
      results,
      message: fixed > 0 
        ? `Successfully fixed ${fixed} service account(s). Try running a job again.`
        : 'No service accounts could be fixed. You may need to re-upload the service account JSON files.'
    });

  } catch (error) {
    console.error('Error fixing encryption:', error);
    return Response.json({ 
      error: 'Failed to fix encryption',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}