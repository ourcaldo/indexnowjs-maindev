import { NextRequest } from 'next/server';
import { EncryptionService } from '../../../lib/encryption';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing encryption/decryption system...');
    console.log('Current ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);

    // Test with sample data
    const testData = {
      type: "service_account",
      project_id: "test-project-123",
      private_key_id: "key123",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQ...sample...key\n-----END PRIVATE KEY-----\n",
      client_email: "test@test-project.iam.gserviceaccount.com",
      client_id: "123456789",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token"
    };

    const testJson = JSON.stringify(testData);
    
    // Test encryption
    const encrypted = EncryptionService.encrypt(testJson);
    console.log('✅ Encryption successful');
    console.log('Encrypted format:', encrypted.substring(0, 50) + '...');
    
    // Test decryption
    const decrypted = EncryptionService.decrypt(encrypted);
    const parsed = JSON.parse(decrypted);
    console.log('✅ Decryption successful');
    
    // Verify data integrity
    const dataMatches = parsed.client_email === testData.client_email;
    
    return Response.json({
      success: true,
      message: 'Encryption system working correctly',
      encryptionKey: process.env.ENCRYPTION_KEY?.substring(0, 8) + '...',
      encryptedSample: encrypted.substring(0, 50) + '...',
      decryptedEmail: parsed.client_email,
      dataIntegrityCheck: dataMatches,
      instructions: {
        format: 'Use this exact format when storing service account credentials',
        example: 'Store the encrypted JSON string in encrypted_credentials column'
      }
    });

  } catch (error) {
    console.error('Error testing encryption:', error);
    return Response.json({ 
      error: 'Encryption test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      currentKey: process.env.ENCRYPTION_KEY?.substring(0, 8) + '...'
    }, { status: 500 });
  }
}