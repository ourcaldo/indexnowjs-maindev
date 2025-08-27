import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'

export class TrialMonitorService {
  
  /**
   * Monitor trials that are ending soon and send notifications
   */
  static async checkTrialsEndingSoon(): Promise<void> {
    try {
      console.log('🔍 [Trial Monitor] Checking trials ending soon...')
      
      // Find trials ending in the next 24 hours
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const now = new Date()

      const { data: expiringTrials, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select(`
          user_id,
          email,
          full_name,
          trial_ends_at,
          trial_status,
          auto_billing_enabled,
          indb_payment_packages (
            name,
            slug,
            price,
            billing_period
          )
        `)
        .eq('trial_status', 'active')
        .gte('trial_ends_at', now.toISOString())
        .lte('trial_ends_at', tomorrow.toISOString())

      if (error) {
        console.error('❌ [Trial Monitor] Error fetching expiring trials:', error)
        return
      }

      if (!expiringTrials || expiringTrials.length === 0) {
        console.log('✅ [Trial Monitor] No trials ending soon')
        return
      }

      console.log(`📧 [Trial Monitor] Found ${expiringTrials.length} trials ending soon`)

      // Send notification emails
      for (const trial of expiringTrials) {
        try {
          const trialEndTime = new Date(trial.trial_ends_at!)
          const hoursRemaining = Math.ceil((trialEndTime.getTime() - now.getTime()) / (1000 * 60 * 60))

          // Use existing email service method for now
          const packageData = Array.isArray(trial.indb_payment_packages) ? 
            trial.indb_payment_packages[0] : trial.indb_payment_packages
          
          await emailService.sendBillingConfirmation(trial.email!, {
            customerName: trial.full_name || trial.email!.split('@')[0],
            orderId: `TRIAL-ENDING-${trial.user_id}`,
            packageName: packageData?.name || 'Premium',
            billingPeriod: 'trial',
            amount: `${hoursRemaining} hours remaining`,
            paymentMethod: 'Trial - Auto-billing enabled',
            orderDate: new Date().toLocaleDateString()
          })

          console.log(`✅ [Trial Monitor] Sent ending notification to ${trial.email}`)
        } catch (emailError) {
          console.error(`❌ [Trial Monitor] Failed to send notification to ${trial.email}:`, emailError)
        }
      }

    } catch (error) {
      console.error('❌ [Trial Monitor] Error in checkTrialsEndingSoon:', error)
    }
  }

  /**
   * Check for trials that have ended and update their status
   */
  static async processExpiredTrials(): Promise<void> {
    try {
      console.log('🔍 [Trial Monitor] Processing expired trials...')
      
      const now = new Date()

      // Find trials that have expired
      const { data: expiredTrials, error } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select(`
          user_id,
          email,
          full_name,
          trial_ends_at,
          trial_status,
          auto_billing_enabled,
          package_id
        `)
        .eq('trial_status', 'active')
        .lt('trial_ends_at', now.toISOString())

      if (error) {
        console.error('❌ [Trial Monitor] Error fetching expired trials:', error)
        return
      }

      if (!expiredTrials || expiredTrials.length === 0) {
        console.log('✅ [Trial Monitor] No expired trials to process')
        return
      }

      console.log(`⏰ [Trial Monitor] Found ${expiredTrials.length} expired trials`)

      // Process each expired trial
      for (const trial of expiredTrials) {
        try {
          if (trial.auto_billing_enabled) {
            // For auto-billing trials, mark as ended (billing will be handled by Midtrans webhook)
            await supabaseAdmin
              .from('indb_auth_user_profiles')
              .update({
                trial_status: 'ended'
                // Keep package_id and subscription info for continued access
              })
              .eq('user_id', trial.user_id)

            console.log(`✅ [Trial Monitor] Marked trial as ended for user ${trial.user_id} (auto-billing enabled)`)
          } else {
            // For cancelled trials, remove access
            await supabaseAdmin
              .from('indb_auth_user_profiles')
              .update({
                trial_status: 'ended',
                package_id: null,
                subscribed_at: null,
                expires_at: null
              })
              .eq('user_id', trial.user_id)

            console.log(`✅ [Trial Monitor] Removed access for expired trial user ${trial.user_id}`)
          }

        } catch (updateError) {
          console.error(`❌ [Trial Monitor] Failed to update trial status for user ${trial.user_id}:`, updateError)
        }
      }

    } catch (error) {
      console.error('❌ [Trial Monitor] Error in processExpiredTrials:', error)
    }
  }

  /**
   * Send trial welcome email when trial is activated
   */
  static async sendTrialWelcomeEmail(userEmail: string, customerName: string, planName: string, trialEndDate: string): Promise<void> {
    try {
      await emailService.sendBillingConfirmation(userEmail, {
        customerName,
        orderId: `TRIAL-WELCOME-${Date.now()}`,
        packageName: planName,
        billingPeriod: 'trial',
        amount: 'Free for 3 days',
        paymentMethod: 'Trial Activation',
        orderDate: new Date().toLocaleDateString()
      })
      
      console.log(`✅ [Trial Monitor] Sent welcome email to ${userEmail}`)
    } catch (error) {
      console.error(`❌ [Trial Monitor] Failed to send welcome email to ${userEmail}:`, error)
    }
  }

  /**
   * Main monitoring job - runs all checks
   */
  static async runTrialMonitorJob(): Promise<void> {
    console.log('🚀 [Trial Monitor] Starting trial monitor job...')
    
    try {
      await Promise.all([
        this.checkTrialsEndingSoon(),
        this.processExpiredTrials()
      ])
      
      console.log('✅ [Trial Monitor] Trial monitor job completed successfully')
    } catch (error) {
      console.error('❌ [Trial Monitor] Trial monitor job failed:', error)
    }
  }
}