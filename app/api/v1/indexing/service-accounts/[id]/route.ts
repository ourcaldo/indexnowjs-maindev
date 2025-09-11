import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/database'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await context.params;
    
    // Apply validation middleware with URL parameter validation
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      validateParams: apiRequestSchemas.serviceAccountIdParam,
      pathParams: { id: resolvedParams.id },
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20 // 20 service account deletions per minute
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    const user = validationResult.user;
    const { id: serviceAccountId } = validationResult.sanitizedData?.params || resolvedParams;

    // Check if service account exists and belongs to user
    const { data: serviceAccount, error: fetchError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .select('*')
      .eq('id', serviceAccountId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !serviceAccount) {
      return NextResponse.json(
        { error: 'Service account not found' },
        { status: 404 }
      )
    }

    // Delete service account using admin client
    const { error: deleteError } = await supabaseAdmin!
      .from('indb_google_service_accounts')
      .delete()
      .eq('id', serviceAccountId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete service account error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete service account' },
        { status: 500 }
      )
    }

    // Log service account deletion activity
    try {
      await ActivityLogger.logServiceAccountActivity(
        user.id,
        ActivityEventTypes.SERVICE_ACCOUNT_DELETE,
        serviceAccountId,
        `Deleted Google service account: ${serviceAccount.name} (${serviceAccount.email})`,
        request,
        {
          serviceAccountName: serviceAccount.name,
          serviceAccountEmail: serviceAccount.email,
          wasActive: serviceAccount.is_active
        }
      )
    } catch (logError) {
      console.error('Failed to log service account deletion activity:', logError)
    }

    return NextResponse.json({
      message: 'Service account deleted successfully'
    })

  } catch (error) {
    console.error('Delete service account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}