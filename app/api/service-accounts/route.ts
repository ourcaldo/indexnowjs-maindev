import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import crypto from 'crypto'

// Schema for Google service account JSON
const googleServiceAccountSchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email(),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
  universe_domain: z.string().optional(),
})

// Schema for creating a new service account
const createServiceAccountSchema = z.object({
  name: z.string().min(1, 'Service account name is required'),
  email: z.string().email('Valid email is required'),
  credentials: googleServiceAccountSchema,
})

// Use the same EncryptionService as the main system
import { EncryptionService } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Fetch user's service accounts (without decrypted credentials for security) using admin client
    const { data: serviceAccounts, error: accountsError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (accountsError) {
      return NextResponse.json(
        { error: 'Failed to fetch service accounts' },
        { status: 500 }
      )
    }

    // Fetch quota usage for each service account
    const accountsWithQuota = await Promise.all(
      (serviceAccounts || []).map(async (account) => {
        const today = new Date().toISOString().split('T')[0]
        
        const { data: quotaUsage } = await supabaseAdmin!
          .from('indb_google_quota_usage')
          .select('requests_made, requests_successful, requests_failed')
          .eq('service_account_id', account.id)
          .eq('date', today)
          .single()

        return {
          ...account,
          quota_usage: quotaUsage || {
            requests_made: 0,
            requests_successful: 0,
            requests_failed: 0,
          },
        }
      })
    )

    return NextResponse.json({
      service_accounts: accountsWithQuota,
    })

  } catch (error) {
    console.error('Service accounts fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Validate input
    const result = createServiceAccountSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid service account format', details: result.error.errors },
        { status: 400 }
      )
    }

    const { name, credentials } = result.data
    const email = credentials.client_email // Use email from credentials

    // Check if service account with this email already exists for this user
    const { data: existingAccount } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single()

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Service account with this email already exists' },
        { status: 400 }
      )
    }

    // Encrypt the credentials using the same system as main application
    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials))

    // Create service account using admin client
    const { data: serviceAccount, error: accountError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .insert({
        user_id: user.id,
        name,
        email,
        encrypted_credentials: encryptedCredentials,
        is_active: true,
      })
      .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
      .single()

    if (accountError) {
      console.error('Database insert error:', accountError)
      return NextResponse.json(
        { error: 'Failed to create service account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      service_account: serviceAccount,
      message: 'Service account created successfully',
    })

  } catch (error) {
    console.error('Service account creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}