import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/monitoring'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to calculate expiry date based on billing period
function calculateExpiryDate(billingPeriod: string): Date {
  const now = new Date()
  
  switch (billingPeriod) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1))
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3))
    case 'biannual':
      return new Date(now.setMonth(now.getMonth() + 6))
    case 'annual':
      return new Date(now.setFullYear(now.getFullYear() + 1))
    default:
      return new Date(now.setMonth(now.getMonth() + 1))
  }
}

// Helper function to activate user plan
async function activateUserPlan(transaction: any, adminUserId: string) {
  const billingPeriod = transaction.metadata?.billing_period || 'monthly'
  const expiryDate = calculateExpiryDate(billingPeriod)
  
  // Update user profile with new plan
  const { error: profileError } = await supabaseAdmin
    .from('indb_auth_user_profiles')
    .update({
      package_id: transaction.package_id,
      subscribed_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString(),
      daily_quota_used: 0,
      daily_quota_reset_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('user_id', transaction.user_id)

  if (profileError) {
    throw new Error(`Failed to update user profile: ${profileError.message}`)
  }

  // Log plan activation
  try {
    await ActivityLogger.logAdminAction(
      adminUserId,
      'plan_activation',
      transaction.user_id,
      `Plan activated after payment confirmation for ${transaction.payment_reference}`,
      undefined,
      {
        packageId: transaction.package_id,
        billingPeriod,
        expiresAt: expiryDate.toISOString(),
        transactionId: transaction.id,
        planActivation: true
      }
    )
  } catch (logError) {
    console.error('Failed to log plan activation:', logError)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminUser = await requireServerAdminAuth(request)
    const resolvedParams = await params
    const orderId = resolvedParams.id

    // Parse request body
    const body = await request.json()
    const { status, notes } = body

    // Validate status
    const validStatuses = ['completed', 'failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "completed" or "failed"' },
        { status: 400 }
      )
    }

    // Get the current transaction to check current status
    const { data: currentTransaction, error: fetchError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(*)
      `)
      .eq('id', orderId)
      .single()

    if (fetchError || !currentTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Get user profile data
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', currentTransaction.user_id)
      .single()

    // Attach user data to transaction
    currentTransaction.user = userProfile

    // Validate current status - can't update if already completed or failed
    if (currentTransaction.transaction_status === 'completed' || currentTransaction.transaction_status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot update transactions that are already completed or failed' },
        { status: 400 }
      )
    }

    // Update transaction status
    const updateData = {
      transaction_status: status,
      verified_by: adminUser.id,
      verified_at: new Date().toISOString(),
      processed_at: status === 'completed' ? new Date().toISOString() : null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    }

    const { data: updatedTransaction, error: updateError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        package:indb_payment_packages(*),
        gateway:indb_payment_gateways(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return NextResponse.json(
        { error: 'Failed to update transaction status' },
        { status: 500 }
      )
    }

    // Get updated user profile and verifier profile
    const { data: updatedUserProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', updatedTransaction.user_id)
      .single()

    let verifierProfile = null
    if (updatedTransaction.verified_by) {
      const { data: verifier } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id, full_name, role')
        .eq('user_id', updatedTransaction.verified_by)
        .single()
      verifierProfile = verifier
    }

    // Attach user and verifier data
    updatedTransaction.user = updatedUserProfile
    updatedTransaction.verifier = verifierProfile

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return NextResponse.json(
        { error: 'Failed to update transaction status' },
        { status: 500 }
      )
    }

    // If approved, activate user plan
    if (status === 'completed') {
      try {
        await activateUserPlan(updatedTransaction, adminUser.id)
      } catch (activationError: any) {
        console.error('Plan activation error:', activationError)
        // Rollback transaction status update if plan activation fails
        await supabaseAdmin
          .from('indb_payment_transactions')
          .update({
            transaction_status: 'proof_uploaded',
            verified_by: null,
            verified_at: null,
            processed_at: null,
            notes: `Plan activation failed: ${activationError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)

        return NextResponse.json(
          { error: `Payment approved but plan activation failed: ${activationError.message}` },
          { status: 500 }
        )
      }
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'order_status_update',
        orderId,
        `Updated order ${currentTransaction.payment_reference} status from ${currentTransaction.transaction_status} to ${status}`,
        request,
        {
          previousStatus: currentTransaction.transaction_status,
          newStatus: status,
          orderId,
          orderReference: currentTransaction.payment_reference,
          customerId: currentTransaction.user_id,
          notes: notes || null,
          orderStatusUpdate: true
        }
      )
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: `Order ${status === 'completed' ? 'approved' : 'rejected'} successfully${status === 'completed' ? ' and plan activated' : ''}`,
      transaction: updatedTransaction
    })

  } catch (error: any) {
    console.error('Admin order status update API error:', error)
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}