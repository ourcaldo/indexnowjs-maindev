import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Raw decryption test with multiple methods...');

    // Get the problematic service account
    const { data: serviceAccount, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('encrypted_credentials')
      .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6')
      .single();

    if (error || !serviceAccount) {
      return Response.json({ error: 'Service account not found' });
    }

    const encryptedData = serviceAccount.encrypted_credentials;
    const parts = encryptedData.split(':');
    
    console.log('📊 Encrypted Data Analysis:');
    console.log('- Full encrypted data:', encryptedData);
    console.log('- Parts count:', parts.length);
    console.log('- Part 0 (IV):', parts[0]);
    console.log('- Part 1 (Data):', parts[1]);
    console.log('- Current ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

    const results = [];

    // Method 1: Try with current method and different keys
    const possibleKeys = [
      process.env.ENCRYPTION_KEY || '',
      '11a28471ce34b44641f0b36da9efe38f',
      'indexnow-pro-encryption-key-32',
      'your-32-character-encryption-key',
      'cetta-n8n-indexnow-key-32chars',
      Buffer.from('11a28471ce34b44641f0b36da9efe38f', 'utf8').toString('hex').substring(0, 32),
    ];

    for (const keyTest of possibleKeys) {
      if (keyTest.length !== 32) continue;

      try {
        const keyBuffer = Buffer.from(keyTest, 'utf8');
        const iv = Buffer.from(parts[0], 'hex');
        
        if (iv.length === 16) { // Valid IV length
          const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
          let decrypted = decipher.update(parts[1], 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          // Test if it's valid JSON
          const parsed = JSON.parse(decrypted);
          if (parsed.client_email && parsed.private_key) {
            results.push({
              method: 'aes-256-cbc with key',
              key: keyTest.substring(0, 8) + '...',
              success: true,
              client_email: parsed.client_email,
              project_id: parsed.project_id
            });
            
            console.log('✅ SUCCESS with key:', keyTest.substring(0, 8) + '...');
            console.log('- Client email:', parsed.client_email);
            
            // Re-encrypt with current system
            const { EncryptionService } = await import('../../../lib/encryption');
            const newEncrypted = EncryptionService.encrypt(decrypted);
            
            // Update database
            await supabaseAdmin
              .from('indb_google_service_accounts')
              .update({
                encrypted_credentials: newEncrypted,
                updated_at: new Date().toISOString()
              })
              .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6');
            
            return Response.json({
              success: true,
              message: 'Successfully decrypted and re-encrypted with current system!',
              result: {
                method: 'aes-256-cbc',
                workingKey: keyTest.substring(0, 8) + '...',
                client_email: parsed.client_email,
                updated: true
              }
            });
          }
        }
      } catch (e) {
        // Continue to next key
      }
    }

    // Method 2: Try legacy createDecipher (deprecated but might work)
    for (const keyTest of possibleKeys) {
      if (keyTest.length !== 32) continue;

      try {
        const decipher = crypto.createDecipher('aes-256-cbc', keyTest);
        let decrypted = decipher.update(parts[1], 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const parsed = JSON.parse(decrypted);
        if (parsed.client_email && parsed.private_key) {
          results.push({
            method: 'legacy createDecipher',
            key: keyTest.substring(0, 8) + '...',
            success: true,
            client_email: parsed.client_email
          });
          
          console.log('✅ SUCCESS with legacy method and key:', keyTest.substring(0, 8) + '...');
          
          // Re-encrypt with current system
          const { EncryptionService } = await import('../../../lib/encryption');
          const newEncrypted = EncryptionService.encrypt(decrypted);
          
          // Update database
          await supabaseAdmin
            .from('indb_google_service_accounts')
            .update({
              encrypted_credentials: newEncrypted,
              updated_at: new Date().toISOString()
            })
            .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6');
          
          return Response.json({
            success: true,
            message: 'Successfully decrypted with legacy method and re-encrypted!',
            result: {
              method: 'legacy createDecipher',
              workingKey: keyTest.substring(0, 8) + '...',
              client_email: parsed.client_email,
              updated: true
            }
          });
        }
      } catch (e) {
        // Continue to next approach
      }
    }

    // Method 3: Try different algorithms
    const algorithms = ['aes-128-cbc', 'aes-192-cbc', 'des-ede3-cbc'];
    for (const algorithm of algorithms) {
      for (const keyTest of possibleKeys) {
        if (keyTest.length !== 32) continue;

        try {
          let keyBuffer = Buffer.from(keyTest, 'utf8');
          
          // Adjust key length for algorithm
          if (algorithm === 'aes-128-cbc') {
            keyBuffer = keyBuffer.subarray(0, 16);
          } else if (algorithm === 'aes-192-cbc') {
            keyBuffer = keyBuffer.subarray(0, 24);
          }
          
          const iv = Buffer.from(parts[0], 'hex');
          if (iv.length === 16) {
            const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
            let decrypted = decipher.update(parts[1], 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            const parsed = JSON.parse(decrypted);
            if (parsed.client_email && parsed.private_key) {
              console.log('✅ SUCCESS with algorithm:', algorithm, 'and key:', keyTest.substring(0, 8) + '...');
              
              // Re-encrypt with current system
              const { EncryptionService } = await import('../../../lib/encryption');
              const newEncrypted = EncryptionService.encrypt(decrypted);
              
              // Update database
              await supabaseAdmin
                .from('indb_google_service_accounts')
                .update({
                  encrypted_credentials: newEncrypted,
                  updated_at: new Date().toISOString()
                })
                .eq('id', '91f356fe-2730-46c0-86a4-be81d8f1f6b6');
              
              return Response.json({
                success: true,
                message: `Successfully decrypted with ${algorithm} and re-encrypted!`,
                result: {
                  method: algorithm,
                  workingKey: keyTest.substring(0, 8) + '...',
                  client_email: parsed.client_email,
                  updated: true
                }
              });
            }
          }
        } catch (e) {
          // Continue to next combination
        }
      }
    }

    return Response.json({
      success: false,
      message: 'Could not decrypt with any method',
      encryptedData: encryptedData.substring(0, 100) + '...',
      testedKeys: possibleKeys.length,
      suggestion: 'The data may be corrupted or encrypted with an unknown method. Please re-upload the service account JSON file.'
    });

  } catch (error) {
    console.error('Error in raw decrypt test:', error);
    return Response.json({ 
      error: 'Raw decrypt test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}