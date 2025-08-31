import cron from 'node-cron'
import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'

/**
 * Auto-cancel service for expired payment transactions
 * 
 * Handles two scenarios:
 * 1. Transactions older than 24 hours that are still pending
 * 2. Transactions marked as 'expire' by Midtrans webhooks (handled in webhook)
 */
export class AutoCancelJob {
  private isRunning: boolean = false
  private cronJob: any | null = null

  constructor() {
    // Don't setup job during build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      this.setupJob()
    }
  }

  private setupJob() {
    // Run every hour to check for expired transactions
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.executeJob()
    })

    console.log('[INFO] Auto-cancel job scheduled to run every hour')
    console.log('[INFO] Auto-cancel scheduler: ACTIVE')
    console.log('[INFO] Next scheduled run: Checks for transactions older than 24 hours')
  }

  async executeJob() {
    if (this.isRunning) {
      console.log('[WARN] Auto-cancel job already running, skipping...')
      return
    }

    this.isRunning = true
    console.log('[INFO] 🔄 Starting auto-cancel job execution...')

    try {
      // Find transactions older than 24 hours that are still pending
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

      const { data: expiredTransactions, error } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('*')
        .eq('transaction_status', 'pending')
        .lt('created_at', twentyFourHoursAgo.toISOString())

      if (error) {
        console.error('[ERROR] ❌ Failed to fetch expired transactions:', error)
        return
      }

      if (!expiredTransactions || expiredTransactions.length === 0) {
        console.log('[INFO] ✅ No expired transactions found')
        return
      }

      console.log(`[INFO] 📋 Found ${expiredTransactions.length} expired transactions to cancel`)

      let successCount = 0
      let errorCount = 0

      // Cancel each expired transaction
      for (const transaction of expiredTransactions) {
        try {
          await this.cancelTransaction(transaction)
          successCount++
          console.log(`[INFO] ✅ Cancelled transaction: ${transaction.id}`)
        } catch (cancelError) {
          errorCount++
          console.error(`[ERROR] ❌ Failed to cancel transaction ${transaction.id}:`, cancelError)
        }
      }

      console.log(`[INFO] 🏁 Auto-cancel job completed: ${successCount} cancelled, ${errorCount} failed`)

      if (successCount > 0) {
        console.log(`[INFO] 🔥 Successfully cancelled ${successCount} expired transactions`)
      }
      if (errorCount > 0) {
        console.log(`[WARN] ⚠️ Failed to cancel ${errorCount} transactions`)
      }

    } catch (error) {
      console.error('[ERROR] ❌ Auto-cancel job execution error:', error)
    } finally {
      this.isRunning = false
      console.log('[INFO] 🏁 Auto-cancel job execution completed')
    }
  }

  /**
   * Cancel an individual transaction
   */
  private async cancelTransaction(transaction: any): Promise<void> {
    try {
      console.log(`[INFO] 🔄 Cancelling transaction: ${transaction.id}`)

      // Update transaction status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_status: 'cancelled',
          processed_at: new Date().toISOString(),
          gateway_response: {
            ...transaction.gateway_response,
            cancellation_data: {
              reason: 'auto_expired',
              cancelled_at: new Date().toISOString(),
              original_created_at: transaction.created_at,
              hours_expired: Math.floor((Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60))
            }
          },
          notes: transaction.notes ? 
            `${transaction.notes}\n[AUTO-CANCEL] Transaction auto-cancelled after 24 hours` :
            '[AUTO-CANCEL] Transaction auto-cancelled after 24 hours'
        })
        .eq('id', transaction.id)

      if (updateError) {
        throw new Error(`Failed to update transaction status: ${updateError.message}`)
      }

      // Log to transaction history
      const { error: historyError } = await supabaseAdmin
        .from('indb_payment_transactions_history')
        .insert({
          transaction_id: transaction.id,
          old_status: transaction.transaction_status,
          new_status: 'cancelled',
          action_type: 'auto_cancel',
          action_description: 'Transaction automatically cancelled after 24 hours',
          changed_by_type: 'system',
          notes: 'Auto-cancelled by background service due to 24-hour expiry',
          metadata: {
            auto_cancel: true,
            original_created_at: transaction.created_at,
            cancelled_at: new Date().toISOString(),
            reason: 'expired_24_hours'
          }
        })

      if (historyError) {
        console.warn(`[WARN] ⚠️ Failed to log transaction history for ${transaction.id}:`, historyError)
      }

      // Log activity if user_id exists
      if (transaction.user_id) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
          const activityResponse = await fetch(`${baseUrl}/api/v1/admin/activity`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SYSTEM_API_KEY || 'system'}`
            },
            body: JSON.stringify({
              user_id: transaction.user_id,
              event_type: 'payment_cancelled',
              action: `Payment transaction auto-cancelled after 24 hours - ID: ${transaction.id}`,
              metadata: {
                transaction_id: transaction.id,
                payment_method: transaction.payment_method,
                amount: transaction.amount,
                currency: transaction.currency,
                auto_cancelled: true,
                cancellation_reason: 'expired_24_hours'
              }
            })
          })

          if (!activityResponse.ok) {
            console.warn(`[WARN] ⚠️ Failed to log activity for transaction ${transaction.id}`)
          }
        } catch (activityError) {
          console.warn(`[WARN] ⚠️ Activity logging error for transaction ${transaction.id}:`, activityError)
        }
      }

      // Send order expired email
      try {
        const { data: userData } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, email')
          .eq('user_id', transaction.user_id)
          .single()

        const { data: packageData } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('name')
          .eq('id', transaction.package_id)
          .single()

        if (userData && packageData) {
          await emailService.sendOrderExpired(userData.email, {
            customerName: userData.full_name || 'Customer',
            orderId: transaction.order_id || transaction.id,
            packageName: packageData.name,
            billingPeriod: transaction.billing_period || 'monthly',
            amount: `IDR ${Number(transaction.amount).toLocaleString('id-ID')}`,
            status: 'Expired',
            expiredDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            subscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'}/dashboard/settings/plans-billing`
          })
          console.log(`[INFO] ✅ Order expired email sent for transaction ${transaction.id}`)
        }
      } catch (emailError) {
        console.warn(`[WARN] ⚠️ Failed to send order expired email for transaction ${transaction.id}:`, emailError)
      }

      console.log(`[INFO] ✅ Transaction ${transaction.id} cancelled successfully`)

    } catch (error) {
      console.error(`[ERROR] ❌ Failed to cancel transaction ${transaction.id}:`, error)
      throw error
    }
  }

  /**
   * Handle Midtrans 'expire' webhook notification
   * This method is called from the webhook handler
   */
  static async handleMidtransExpireNotification(transaction: any, midtransData: any): Promise<void> {
    try {
      console.log(`[INFO] 🔔 Processing Midtrans expire notification for transaction: ${transaction.id}`)

      // Update transaction status to expired
      const { error: updateError } = await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_status: 'expired',
          processed_at: new Date().toISOString(),
          gateway_response: {
            ...transaction.gateway_response,
            expire_notification: {
              received_at: new Date().toISOString(),
              midtrans_data: midtransData,
              expiry_time: midtransData.expiry_time,
              transaction_time: midtransData.transaction_time
            }
          },
          notes: transaction.notes ? 
            `${transaction.notes}\n[MIDTRANS-EXPIRE] Transaction expired via Midtrans notification` :
            '[MIDTRANS-EXPIRE] Transaction expired via Midtrans notification'
        })
        .eq('id', transaction.id)

      if (updateError) {
        throw new Error(`Failed to update transaction status: ${updateError.message}`)
      }

      // Log to transaction history
      const { error: historyError } = await supabaseAdmin
        .from('indb_payment_transactions_history')
        .insert({
          transaction_id: transaction.id,
          old_status: transaction.transaction_status,
          new_status: 'expired',
          action_type: 'webhook_expire',
          action_description: 'Transaction expired via Midtrans webhook notification',
          changed_by_type: 'system',
          notes: 'Expired via Midtrans webhook notification',
          metadata: {
            webhook_data: midtransData,
            midtrans_expire: true,
            expiry_time: midtransData.expiry_time,
            transaction_time: midtransData.transaction_time
          }
        })

      if (historyError) {
        console.warn(`[WARN] ⚠️ Failed to log transaction history for ${transaction.id}:`, historyError)
      }

      // Log activity
      if (transaction.user_id) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
          const activityResponse = await fetch(`${baseUrl}/api/v1/admin/activity`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SYSTEM_API_KEY || 'system'}`
            },
            body: JSON.stringify({
              user_id: transaction.user_id,
              event_type: 'payment_expired',
              action: `Payment transaction expired via Midtrans - ID: ${transaction.id}`,
              metadata: {
                transaction_id: transaction.id,
                payment_method: transaction.payment_method,
                amount: transaction.amount,
                currency: transaction.currency,
                midtrans_expired: true,
                expiry_time: midtransData.expiry_time
              }
            })
          })

          if (!activityResponse.ok) {
            console.warn(`[WARN] ⚠️ Failed to log activity for expired transaction ${transaction.id}`)
          }
        } catch (activityError) {
          console.warn(`[WARN] ⚠️ Activity logging error for expired transaction ${transaction.id}:`, activityError)
        }
      }

      console.log(`[INFO] ✅ Midtrans expire notification processed for transaction: ${transaction.id}`)

    } catch (error) {
      console.error(`[ERROR] ❌ Failed to handle Midtrans expire notification for transaction ${transaction.id}:`, error)
      throw error
    }
  }

  start() {
    if (this.cronJob) {
      this.cronJob.start()
      console.log('[INFO] ✅ Auto-cancel job started')
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      console.log('[INFO] ⏹️ Auto-cancel job stopped')
    }
  }

  getStatus() {
    return {
      isScheduled: !!this.cronJob,
      isRunning: this.isRunning,
      schedule: '0 * * * *', // Every hour
      description: 'Auto-cancels payment transactions older than 24 hours and handles Midtrans expire notifications'
    }
  }

  // Manual trigger for testing
  async triggerManually() {
    console.log('[INFO] 🧪 Manually triggering auto-cancel job...')
    await this.executeJob()
  }
}

// Export singleton instance following project pattern
export const autoCancelJob = new AutoCancelJob()