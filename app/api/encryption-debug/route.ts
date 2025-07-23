import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { EncryptionService } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUGGING ENCRYPTION KEY MISMATCH')
    
    // Check environment variables
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key'
    console.log('📋 Environment Variables:')
    console.log('- ENCRYPTION_KEY from .env:', encryptionKey)
    console.log('- ENCRYPTION_KEY length:', encryptionKey.length)
    
    // Get service accounts from database
    const { data: serviceAccounts, error } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .select('id, name, email, is_active, encrypted_credentials')
      .limit(5)
    
    console.log('💾 Database Service Accounts:')
    const accountsInfo = (serviceAccounts || []).map(account => {
      const hasCredentials = account.encrypted_credentials && account.encrypted_credentials.trim() !== ''
      const credentialsLength = account.encrypted_credentials ? account.encrypted_credentials.length : 0
      
      console.log(`- ID: ${account.id}`)
      console.log(`  Name: ${account.name}`)
      console.log(`  Email: ${account.email}`)
      console.log(`  Active: ${account.is_active}`)
      console.log(`  Encrypted Credentials Length: ${credentialsLength}`)
      
      return {
        id: account.id,
        name: account.name,
        email: account.email,
        is_active: account.is_active,
        encrypted_credentials_length: credentialsLength,
        has_credentials: hasCredentials,
        preview: hasCredentials ? account.encrypted_credentials.substring(0, 50) + '...' : 'empty'
      }
    })
    
    // Test encryption/decryption
    const testData = { 
      type: "service_account",
      project_id: "test",
      client_email: "test@test.iam.gserviceaccount.com" 
    }
    
    let encryptionTest = {
      canEncrypt: false,
      canDecrypt: false,
      roundTripValid: false,
      encryptedLength: 0,
      encryptedPreview: ''
    }
    
    try {
      const encrypted = EncryptionService.encrypt(JSON.stringify(testData))
      encryptionTest.canEncrypt = true
      encryptionTest.encryptedLength = encrypted.length
      encryptionTest.encryptedPreview = encrypted.substring(0, 50) + '...'
      
      const decrypted = EncryptionService.decrypt(encrypted)
      encryptionTest.canDecrypt = true
      
      const parsedDecrypted = JSON.parse(decrypted)
      encryptionTest.roundTripValid = parsedDecrypted.type === testData.type
      
      console.log('🔧 Encryption Test Results:')
      console.log('- Can encrypt:', encryptionTest.canEncrypt)
      console.log('- Can decrypt:', encryptionTest.canDecrypt)
      console.log('- Round trip valid:', encryptionTest.roundTripValid)
      console.log('- Encrypted length:', encryptionTest.encryptedLength)
      
    } catch (testError) {
      console.error('❌ Encryption test failed:', testError)
    }
    
    return NextResponse.json({
      environment: {
        encryption_key: encryptionKey.substring(0, 8) + '...',
        encryption_key_length: encryptionKey.length,
        encryption_key_full: encryptionKey
      },
      service_accounts: accountsInfo,
      encryption_test: encryptionTest,
      summary: {
        total_accounts: accountsInfo.length,
        accounts_with_credentials: accountsInfo.filter(a => a.has_credentials).length,
        encryption_working: encryptionTest.roundTripValid
      }
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}