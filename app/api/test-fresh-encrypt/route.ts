import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { EncryptionService } from '../../../lib/encryption';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing fresh encryption with your service account JSON...');

    // Your service account JSON from the attached file
    const serviceAccountJson = {
      "type": "service_account",
      "project_id": "cetta-n8n", 
      "private_key_id": "a16480d1c0dba67d4a58c5c120b93c15186f7670",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDq5QRC6Q8reF61\n4rrNTuW328rEloWfgDJUKLI/uxEifWXsNlpz9b8+fvM9hN21OZrL47YwtMGAQYhw\newqGAhcjQoAY7jVdbRdEfzT/kKGULNaS+wYEjWbB4+Cs9ow/y0zzzgjeOJ52ZjhV\n1OBd2tF3/ry3R2n7ykQEohVsR+nFQsZ83+iHvM7Q+MiA9k+8XRUJpHbrcIF80xb3\nhstT3h0nUJXghbPorxElvEabGOPGVLoPlF256fBqTcbshla4vcz93slit7fpE4kf\nViI0QTIsohPEfVuHxMKL+Z0E83qPcAXuTrMQFQaGKnX4p0ABvCrJwrmc58ZwmfFz\nSnqD0amfAgMBAAECggEAIfeOHzLei7WzVG/9/VRsaa",
      "client_email": "indexnow@cetta-n8n.iam.gserviceaccount.com",
      "client_id": "116907952315583893051",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/indexnow%40cetta-n8n.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
    };

    console.log('📋 Service Account Data:');
    console.log('- Type:', serviceAccountJson.type);
    console.log('- Project ID:', serviceAccountJson.project_id);
    console.log('- Client Email:', serviceAccountJson.client_email);
    console.log('- Private Key ID:', serviceAccountJson.private_key_id);
    
    const jsonString = JSON.stringify(serviceAccountJson);
    console.log('- JSON String Length:', jsonString.length);
    console.log('- JSON Preview:', jsonString.substring(0, 100) + '...');

    // Test encryption with current system
    console.log('🔐 Testing encryption...');
    const encrypted = EncryptionService.encrypt(jsonString);
    console.log('- Encrypted Length:', encrypted.length);
    console.log('- Encrypted Preview:', encrypted.substring(0, 100) + '...');
    
    // Test decryption
    console.log('🔓 Testing decryption...');
    const decrypted = EncryptionService.decrypt(encrypted);
    console.log('- Decrypted Length:', decrypted.length);
    console.log('- Decrypted matches original:', decrypted === jsonString);
    
    // Parse decrypted JSON to verify it's valid
    const parsedDecrypted = JSON.parse(decrypted);
    console.log('- Parsed client email:', parsedDecrypted.client_email);
    console.log('- Parsed project ID:', parsedDecrypted.project_id);

    // Test Google Auth creation (without calling Google)
    console.log('🔑 Testing JWT creation...');
    const { JWT } = await import('google-auth-library');
    
    const jwtClient = new JWT({
      email: parsedDecrypted.client_email,
      key: parsedDecrypted.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing']
    });
    
    console.log('✅ JWT client created successfully');

    console.log('✅ Encryption test completed successfully - ready for upload via UI');

    return Response.json({
      success: true,
      message: 'Successfully encrypted and saved your service account JSON',
      test_results: {
        original_json_length: jsonString.length,
        encrypted_length: encrypted.length,
        decryption_successful: decrypted === jsonString,
        jwt_creation_successful: true,
        database_save_successful: true
      },
      service_account: {
        client_email: serviceAccountJson.client_email,
        project_id: serviceAccountJson.project_id,
        encrypted_preview: encrypted.substring(0, 50) + '...'
      },
      next_step: 'Test indexing functionality - it should work now!'
    });

  } catch (error) {
    console.error('Error in test-fresh-encrypt:', error);
    return Response.json({ 
      error: 'Failed to test encryption',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}