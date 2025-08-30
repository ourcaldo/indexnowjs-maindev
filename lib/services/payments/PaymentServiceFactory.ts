/**
 * Payment Service Factory
 * Creates and configures payment service instances
 */

import { PaymentProcessor } from './core/PaymentProcessor'
import { MidtransSnapService } from './midtrans/MidtransSnapService'
import { MidtransRecurringService } from './midtrans/MidtransRecurringService'
import { supabaseAdmin } from '@/lib/database'

export class PaymentServiceFactory {
  private static processor: PaymentProcessor | null = null

  /**
   * Get configured payment processor instance
   */
  static async getPaymentProcessor(): Promise<PaymentProcessor> {
    if (!this.processor) {
      this.processor = new PaymentProcessor()
      await this.initializeGateways(this.processor)
    }
    return this.processor
  }

  /**
   * Initialize and register payment gateways
   */
  private static async initializeGateways(processor: PaymentProcessor): Promise<void> {
    try {
      // Get active payment gateway configurations
      const { data: gateways, error } = await supabaseAdmin
        .from('indb_payment_gateway_configs')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Error loading payment gateway configurations:', error)
        return
      }

      // Register each gateway
      for (const gateway of gateways || []) {
        await this.registerGateway(processor, gateway)
      }

    } catch (error) {
      console.error('Error initializing payment gateways:', error)
    }
  }

  /**
   * Register individual gateway
   */
  private static async registerGateway(processor: PaymentProcessor, config: any): Promise<void> {
    try {
      switch (config.gateway_name.toLowerCase()) {
        case 'midtrans':
          // Register both Snap and Recurring services for Midtrans
          const snapService = new MidtransSnapService(config)
          const recurringService = new MidtransRecurringService(config)
          
          processor.registerGateway('midtrans_snap', snapService)
          processor.registerGateway('midtrans_recurring', recurringService)
          processor.registerGateway('midtrans', snapService) // Default fallback
          
          console.log('✅ Registered Midtrans payment services')
          break
          
        default:
          console.warn(`Unknown payment gateway: ${config.gateway_name}`)
      }
    } catch (error) {
      console.error(`Error registering ${config.gateway_name} gateway:`, error)
    }
  }

  /**
   * Create standalone Midtrans service
   */
  static createMidtransService(type: 'snap' | 'recurring', config: any) {
    if (type === 'snap') {
      return new MidtransSnapService(config)
    } else {
      return new MidtransRecurringService(config)
    }
  }

  /**
   * Reset processor instance (useful for testing)
   */
  static resetProcessor(): void {
    this.processor = null
  }
}