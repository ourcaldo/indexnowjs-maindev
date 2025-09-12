import { supabaseAdmin } from '@/lib/database'

export class TrialMonitorService {
  

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
          expires_at,
          trial_status,
          auto_billing_enabled,
          package_id
        `)
        .eq('trial_status', 'active')
        .lt('expires_at', now.toISOString())

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
          // CRITICAL FIX: For ALL expired trials, user should NOT have any package until Midtrans payment is processed
          // Whether auto_billing_enabled is true or false, user loses access when trial ends
          // Only when Midtrans webhook confirms successful payment, user regains access
          await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              trial_status: 'ended',
              package_id: null,     // Remove package access immediately when trial ends
              subscribed_at: null,  // Clear subscription info
              expires_at: null      // Clear expiration
            })
            .eq('user_id', trial.user_id)

          if (trial.auto_billing_enabled) {
            console.log(`✅ [Trial Monitor] Trial ended for user ${trial.user_id} - access removed, waiting for Midtrans billing`)
          } else {
            console.log(`✅ [Trial Monitor] Trial ended for user ${trial.user_id} - access removed permanently (auto-billing disabled)`)
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
   * Main monitoring job - runs all checks
   */
  static async runTrialMonitorJob(): Promise<void> {
    console.log('🚀 [Trial Monitor] Starting trial monitor job...')
    
    try {
      await this.processExpiredTrials()
      
      console.log('✅ [Trial Monitor] Trial monitor job completed successfully')
    } catch (error) {
      console.error('❌ [Trial Monitor] Trial monitor job failed:', error)
    }
  }
}