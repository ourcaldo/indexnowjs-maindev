import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData } from '../channels/shared/base-handler'
import { SecurityMiddlewares } from '@/lib/services/security/middleware/unified-security-middleware'

// Import handlers directly
import MidtransSnapHandler from '../channels/midtrans-snap/handler'
import MidtransRecurringHandler from '../channels/midtrans-recurring/handler'  
import BankTransferHandler from '../channels/bank-transfer/handler'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Payment Router] Starting payment processing')
    
    // ENHANCEMENT #6: Apply unified security middleware for payment endpoints
    const securityResult = await SecurityMiddlewares.PAYMENT(request)
    
    if (!securityResult.shouldContinue) {
      return securityResult.response || NextResponse.json(
        { success: false, message: 'Security validation failed' },
        { status: 400 }
      )
    }

    // Get authenticated user from security middleware result
    const user = securityResult.validationResult?.user
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { payment_method, package_id, billing_period, customer_info, token_id, is_trial } = body

    console.log(`📊 [Payment Router] Routing to channel: ${payment_method}`)

    // Check trial eligibility if this is a trial flow
    if (is_trial) {
      const cookieStore2 = await cookies()
      const supabase2 = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore2.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore2.set(name, value, options)
                )
              } catch {}
            },
          },
        }
      )

      // Check if user has already used trial
      const { data: userProfile } = await supabase2
        .from('indb_auth_user_profiles')
        .select('has_used_trial, trial_used_at')
        .eq('user_id', user.id)
        .single()

      if (userProfile?.has_used_trial) {
        return NextResponse.json({
          success: false,
          message: `Free trial already used on ${new Date(userProfile.trial_used_at).toLocaleDateString()}`
        }, { status: 400 })
      }
    }

    // Prepare payment data
    const paymentData: PaymentData = {
      package_id,
      billing_period,
      customer_info,
      user,
      is_trial
    }

    // Route to specific payment channel handler
    let handler: BasePaymentHandler

    switch (payment_method) {
      case 'midtrans_snap':
        handler = new MidtransSnapHandler(paymentData)
        break
      
      case 'midtrans_recurring':
        if (!token_id) {
          return NextResponse.json({
            success: false,
            message: 'Valid card token is required for recurring payments'
          }, { status: 400 })
        }
        handler = new MidtransRecurringHandler(paymentData, token_id)
        break
        
      case 'bank_transfer':
        handler = new BankTransferHandler(paymentData)
        break
        
      default:
        return NextResponse.json({
          success: false,
          message: `Unsupported payment method: ${payment_method}`
        }, { status: 400 })
    }

    // Execute payment processing
    const result = await handler.execute()
    
    // ENHANCEMENT #6: Apply response encryption if configured
    if (securityResult.responseProcessor) {
      return await securityResult.responseProcessor(result)
    }
    
    return result

  } catch (error: any) {
    console.error('💥 [Payment Router] Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment routing failed' 
    }, { status: 500 })
  }
}