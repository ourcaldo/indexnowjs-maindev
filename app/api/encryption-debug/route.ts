import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUGGING ENCRYPTION KEY MISMATCH');
    
    // Check what key is being used
    const envKey = process.env.ENCRYPTION_KEY;
    console.log('📋 Environment Variables:');
    console.log('- ENCRYPTION_KEY from .env:', envKey);
    console.log('- ENCRYPTION_KEY length:', envKey?.length || 0);
    
    // Get ALL service accounts to see what's in database
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id, name, email, encrypted_credentials, is_active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching service accounts:', error);
      return Response.json({ error: 'Failed to fetch service accounts' });
    }

    console.log('💾 Database Service Accounts:');
    const accountInfo = serviceAccounts.map(account => {
      const credLength = account.encrypted_credentials?.length || 0;
      console.log(`- ID: ${account.id}`);
      console.log(`  Name: ${account.name}`);
      console.log(`  Email: ${account.email}`);
      console.log(`  Active: ${account.is_active}`);
      console.log(`  Encrypted Credentials Length: ${credLength}`);
      if (credLength > 0) {
        console.log(`  Encrypted Preview: ${account.encrypted_credentials.substring(0, 100)}...`);
      }
      console.log('');
      
      return {
        id: account.id,
        name: account.name,
        email: account.email,
        is_active: account.is_active,
        encrypted_credentials_length: credLength,
        has_credentials: credLength > 0,
        preview: credLength > 0 ? account.encrypted_credentials.substring(0, 50) + '...' : 'empty'
      };
    });

    // Test encryption with current key
    const testData = JSON.stringify({
      type: "service_account",
      project_id: "test",
      client_email: "test@test.iam.gserviceaccount.com"
    });
    
    let encryptionTest = null;
    try {
      const { EncryptionService } = await import('../../../lib/encryption');
      const encrypted = EncryptionService.encrypt(testData);
      const decrypted = EncryptionService.decrypt(encrypted);
      const isValid = decrypted === testData;
      
      encryptionTest = {
        canEncrypt: true,
        canDecrypt: true,
        roundTripValid: isValid,
        encryptedLength: encrypted.length,
        encryptedPreview: encrypted.substring(0, 50) + '...'
      };
      
      console.log('🔧 Encryption Test Results:');
      console.log('- Can encrypt:', true);
      console.log('- Can decrypt:', true);
      console.log('- Round trip valid:', isValid);
      console.log('- Encrypted length:', encrypted.length);
      
    } catch (encryptError) {
      console.error('❌ Encryption test failed:', encryptError);
      encryptionTest = {
        canEncrypt: false,
        canDecrypt: false,
        error: encryptError instanceof Error ? encryptError.message : String(encryptError)
      };
    }

    return Response.json({
      environment: {
        encryption_key: envKey?.substring(0, 8) + '...',
        encryption_key_length: envKey?.length || 0,
        encryption_key_full: envKey // REMOVE THIS IN PRODUCTION
      },
      service_accounts: accountInfo,
      encryption_test: encryptionTest,
      summary: {
        total_accounts: serviceAccounts.length,
        accounts_with_credentials: accountInfo.filter(a => a.has_credentials).length,
        encryption_working: encryptionTest?.roundTripValid || false
      }
    });

  } catch (error) {
    console.error('Error in encryption debug:', error);
    return Response.json({ 
      error: 'Encryption debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}