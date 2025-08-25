import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/database'
import { z } from 'zod'
import crypto from 'crypto'
import { 
  apiRouteWrapper, 
  validateRequest, 
  withDatabaseErrorHandling,
  createApiResponse,
  createErrorResponse,
  AuthenticatedRequest
} from '@/lib/api-middleware'
import { 
  ErrorHandlingService, 
  ErrorType, 
  ErrorSeverity, 
  logger 
} from '@/lib/error-handling'

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
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'

export const GET = apiRouteWrapper(async (request: NextRequest, auth: AuthenticatedRequest, endpoint: string) => {
  // Fetch user's service accounts with proper error handling
  const dbResult = await withDatabaseErrorHandling(
    async () => {
      const { data, error } = await supabaseAdmin!
        .from('indb_google_service_accounts')
        .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false })

      if (error) throw new Error(`Database query failed: ${error.message}`)
      return data || []
    },
    'fetch_service_accounts',
    auth.userId,
    endpoint
  )

  if (!dbResult.success) {
    return createErrorResponse(dbResult.error)
  }

  const serviceAccounts = dbResult.data

  // Fetch quota usage for each service account with error handling
  const quotaResult = await withDatabaseErrorHandling(
    async () => {
      const today = new Date().toISOString().split('T')[0]
      
      return await Promise.all(
        serviceAccounts.map(async (account) => {
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
    },
    'fetch_quota_usage',
    auth.userId,
    endpoint
  )

  if (!quotaResult.success) {
    return createErrorResponse(quotaResult.error)
  }

  logger.info({
    userId: auth.userId,
    accountCount: quotaResult.data.length,
    endpoint
  }, 'Service accounts fetched successfully')

  return createApiResponse({
    service_accounts: quotaResult.data,
  })
})

export const POST = apiRouteWrapper(async (request: NextRequest, auth: AuthenticatedRequest, endpoint: string) => {
  // Validate request body
  const validationResult = await validateRequest(
    request,
    createServiceAccountSchema,
    auth.userId,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { name, credentials } = validationResult.data as { name: string; credentials: any }
  const email = credentials.client_email // Use email from credentials

  // Check if service account with this email already exists for this user
  const existingCheck = await withDatabaseErrorHandling(
    async () => {
      const { data, error } = await supabaseAdmin!
        .from('indb_google_service_accounts')
        .select('id')
        .eq('user_id', auth.userId)
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Database query failed: ${error.message}`)
      }
      return data
    },
    'check_existing_service_account',
    auth.userId,
    endpoint
  )

  if (!existingCheck.success) {
    return createErrorResponse(existingCheck.error)
  }

  if (existingCheck.data) {
    const error = await ErrorHandlingService.createError(
      ErrorType.BUSINESS_LOGIC,
      'Service account with this email already exists',
      {
        severity: ErrorSeverity.LOW,
        userId: auth.userId,
        endpoint,
        statusCode: 409,
        userMessageKey: 'resource_conflict',
        metadata: { email, conflictType: 'service_account_email' }
      }
    )
    return createErrorResponse(error)
  }

  // Check package limitations - Free plan users can only have 1 service account
  const packageCheck = await withDatabaseErrorHandling(
    async () => {
      // Get user's package information
      const { data: userProfile, error } = await supabaseAdmin!
        .from('indb_auth_user_profiles')
        .select(`
          package:indb_payment_packages(
            slug,
            name,
            quota_limits
          )
        `)
        .eq('user_id', auth.userId)
        .single()

      if (error) throw new Error(`Failed to fetch user profile: ${error.message}`)

      // Count existing service accounts
      const { count, error: countError } = await supabaseAdmin!
        .from('indb_google_service_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .eq('is_active', true)

      if (countError) throw new Error(`Failed to count service accounts: ${countError.message}`)

      return { userProfile, existingCount: count || 0 }
    },
    'check_package_limitations',
    auth.userId,
    endpoint
  )

  if (!packageCheck.success) {
    return createErrorResponse(packageCheck.error)
  }

  const { userProfile, existingCount } = packageCheck.data
  const packageData = Array.isArray(userProfile.package) ? userProfile.package[0] : userProfile.package
  const maxServiceAccounts = packageData?.quota_limits?.service_accounts || 1
  
  // Check if user has reached service account limit
  if (maxServiceAccounts !== -1 && existingCount >= maxServiceAccounts) {
    const error = await ErrorHandlingService.createError(
      ErrorType.BUSINESS_LOGIC,
      `${packageData?.name || 'Current'} plan allows maximum ${maxServiceAccounts} service account${maxServiceAccounts > 1 ? 's' : ''}. Upgrade your plan to add more.`,
      {
        severity: ErrorSeverity.LOW,
        userId: auth.userId,
        endpoint,
        statusCode: 403,
        userMessageKey: 'quota_limit_reached',
        metadata: { 
          packageName: packageData?.name,
          maxServiceAccounts,
          currentCount: existingCount,
          limitType: 'service_accounts'
        }
      }
    )
    return createErrorResponse(error)
  }

  // Encrypt credentials with proper error handling
  let encryptedCredentials: string
  try {
    encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials))
  } catch (encryptionError) {
    const error = await ErrorHandlingService.createError(
      ErrorType.ENCRYPTION,
      encryptionError as Error,
      {
        severity: ErrorSeverity.HIGH,
        userId: auth.userId,
        endpoint,
        statusCode: 500,
        userMessageKey: 'encryption_failed',
        metadata: { operation: 'service_account_credentials' }
      }
    )
    return createErrorResponse(error)
  }

  // Create service account with error handling
  const createResult = await withDatabaseErrorHandling(
    async () => {
      const { data, error } = await supabaseAdmin!
        .from('indb_google_service_accounts')
        .insert({
          user_id: auth.userId,
          name,
          email,
          encrypted_credentials: encryptedCredentials,
          is_active: true,
        })
        .select('id, name, email, is_active, daily_quota_limit, minute_quota_limit, created_at, updated_at')
        .single()

      if (error) throw new Error(`Database insert failed: ${error.message}`)
      return data
    },
    'create_service_account',
    auth.userId,
    endpoint
  )

  if (!createResult.success) {
    return createErrorResponse(createResult.error)
  }

  logger.info({
    userId: auth.userId,
    serviceAccountId: createResult.data.id,
    email,
    endpoint
  }, 'Service account created successfully')

  // Log service account creation activity
  try {
    await ActivityLogger.logServiceAccountActivity(
      auth.userId,
      ActivityEventTypes.SERVICE_ACCOUNT_ADD,
      createResult.data.id,
      `Added Google service account: ${name} (${email})`,
      request,
      {
        serviceAccountName: name,
        serviceAccountEmail: email,
        packageData: packageData?.name,
        quotaLimits: {
          dailyQuotaLimit: createResult.data.daily_quota_limit,
          minuteQuotaLimit: createResult.data.minute_quota_limit
        }
      }
    )
  } catch (logError) {
    console.error('Failed to log service account creation activity:', logError)
  }

  return createApiResponse({
    service_account: createResult.data,
    message: 'Service account created successfully',
  }, 201)
})