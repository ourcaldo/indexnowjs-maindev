import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PaymentServiceFactory } from '@/lib/services/payments'

export async function POST(request: NextRequest) {
  try {
    console.log('\n🔐 ============= 3DS AUTHENTICATION CALLBACK =============')
    
    const { transaction_id, order_id } = await request.json()
    
    console.log('📋 3DS Callback received:', {
      transaction_id,
      order_id
    })
    
    // CRITICAL FIX: Check if this transaction has already been processed to prevent double requests
    const supabaseCheck = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: existingProcessed } = await supabaseCheck
      .from('indb_payment_transactions')
      .select('id, transaction_status, metadata')
      .eq('gateway_transaction_id', transaction_id)
      .eq('transaction_status', 'completed')
      .maybeSingle()
    
    if (existingProcessed) {
      console.log('⚠️ Transaction already processed, skipping to prevent duplicate:', {
        transaction_id,
        existing_id: existingProcessed.id,
        status: existingProcessed.transaction_status
      })
      
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed successfully',
        data: {
          transaction_id: existingProcessed.id,
          already_processed: true
        }
      })
    }

    if (!transaction_id || !order_id) {
      return NextResponse.json(
        { success: false, message: 'Missing transaction_id or order_id' },
        { status: 400 }
      )
    }
    
    console.log('✅ New transaction processing - no duplicates found')

    // Initialize Supabase client (using same pattern as working endpoint)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Midtrans configuration
    const { data: midtransGateway, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('id, configuration, api_credentials')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !midtransGateway) {
      console.log('❌ Failed to fetch Midtrans gateway configuration')
      return NextResponse.json(
        { success: false, message: 'Midtrans payment gateway not configured' },
        { status: 500 }
      )
    }

    const { server_key, client_key, merchant_id } = midtransGateway.api_credentials
    const { environment } = midtransGateway.configuration

    // Initialize Midtrans service - use recurring service type
    const midtransService = PaymentServiceFactory.createMidtransService('recurring', {
      server_key,
      client_key,
      environment,
      merchant_id
    }) as import('@/lib/services/payments/midtrans/MidtransRecurringService').MidtransRecurringService

    // Get transaction status to check 3DS result
    console.log('🔍 Checking transaction status after 3DS authentication')
    const transactionStatus = await midtransService.getTransactionStatus(transaction_id)
    
    console.log('📋 Transaction status after 3DS:', {
      transaction_status: transactionStatus.transaction_status,
      fraud_status: transactionStatus.fraud_status,
      status_code: transactionStatus.status_code,
      status_message: transactionStatus.status_message,
      has_saved_token: !!transactionStatus.saved_token_id
    })

    // Check if transaction was successful after 3DS
    if (transactionStatus.transaction_status === 'capture' || transactionStatus.transaction_status === 'settlement') {
      console.log('✅ 3DS Authentication successful, continuing with subscription creation')
      
      // CRITICAL FIX: Use saved_token_id from the transaction status (after 3DS), NOT the original temporary token_id
      const savedTokenId = transactionStatus.saved_token_id
      
      if (!savedTokenId) {
        throw new Error('No saved_token_id found in transaction status - card tokenization may have failed')
      }
      
      console.log('💳 Using saved_token_id from transaction status:', savedTokenId.substring(0, 20) + '...')
      
      // Get the original transaction record for metadata
      const { data: existingTransaction } = await supabase
        .from('indb_payment_transactions')
        .select('id, metadata')
        .eq('gateway_transaction_id', transaction_id)
        .maybeSingle()

      // Get authentication token from the request
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        )
      }

      const token = authHeader.split(' ')[1]
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json(
          { success: false, message: 'Invalid authentication token' },
          { status: 401 }
        )
      }

      console.log('💾 ============= STEP 1: CREATING SUBSCRIPTION AFTER 3DS =============')
      
      // Get customer info from the same transaction record  
      let originalCustomerInfo = null
      if (existingTransaction && existingTransaction.metadata?.customer_info) {
        originalCustomerInfo = existingTransaction.metadata.customer_info
      }
      
      // Get transaction details from Midtrans
      const transactionDetails = await midtransService.getTransactionStatus(transaction_id)
      
      // Debug: Log what customer details Midtrans actually returns
      console.log('🔍 Midtrans transaction details customer_details:', JSON.stringify(transactionDetails.customer_details, null, 2))
      console.log('🔍 Full transactionDetails keys:', Object.keys(transactionDetails))
      
      // Try to find customer info in different places in the Midtrans response
      const midtransFirstName = transactionDetails.customer_details?.first_name || 
                               transactionDetails.customer_detail?.first_name ||
                               transactionDetails.billing_address?.first_name
      console.log('🔍 Customer name extraction attempts:', {
        customer_details_first_name: transactionDetails.customer_details?.first_name,
        customer_detail_first_name: transactionDetails.customer_detail?.first_name,
        billing_address_first_name: transactionDetails.billing_address?.first_name,
        final_extracted_name: midtransFirstName
      })
      
      // Extract package and billing info from original transaction metadata or create default values
      // Since we don't have access to original request data, we'll need to get package from transaction amount
      
      console.log('📦 Fetching all packages to determine which one matches transaction amount...')
      const { data: allPackages, error: packagesError } = await supabase
        .from('indb_payment_packages')
        .select('*')
        .eq('is_active', true)
      
      if (packagesError || !allPackages) {
        throw new Error('Failed to fetch packages for amount matching')
      }
      
      // Convert IDR amount back to USD to match with packages
      const transactionAmountIDR = parseFloat(transactionDetails.gross_amount)
      const USD_TO_IDR_RATE = 16300 // Approximate rate, should match the conversion used in main endpoint
      const transactionAmountUSD = Math.round(transactionAmountIDR / USD_TO_IDR_RATE)
      
      console.log('💰 Transaction amount analysis:', {
        idr_amount: transactionAmountIDR,
        calculated_usd: transactionAmountUSD
      })
      
      // Find matching package by price (checking both regular and promo prices)
      let matchedPackage = null
      let billing_period = 'monthly' // Default billing period
      
      for (const pkg of allPackages) {
        const pricing = pkg.pricing_tiers || {}
        const monthlyUSD = pricing.monthly?.USD
        const yearlyUSD = pricing.yearly?.USD
        
        // Check monthly pricing
        if (monthlyUSD && (monthlyUSD.regular_price === transactionAmountUSD || monthlyUSD.promo_price === transactionAmountUSD)) {
          matchedPackage = pkg
          billing_period = 'monthly'
          break
        }
        
        // Check yearly pricing
        if (yearlyUSD && (yearlyUSD.regular_price === transactionAmountUSD || yearlyUSD.promo_price === transactionAmountUSD)) {
          matchedPackage = pkg
          billing_period = 'yearly'
          break
        }
        
        // Fallback: check base price
        if (pkg.price === transactionAmountUSD) {
          matchedPackage = pkg
          billing_period = pkg.billing_period || 'monthly'
          break
        }
      }
      
      if (!matchedPackage) {
        console.warn('⚠️ Could not match transaction amount to package, using first active package')
        matchedPackage = allPackages[0] // Fallback to first package
      }
      
      console.log('📦 Matched package:', {
        id: matchedPackage.id,
        name: matchedPackage.name,
        amount_usd: transactionAmountUSD,
        billing_period: billing_period
      })
      
      console.log('💾 ============= STEP 2: CREATING SUBSCRIPTION =============') 
      
      // CRITICAL FIX: Check if transaction is trial and get real package price for subscription
      const isTrialTransaction = existingTransaction?.metadata?.is_trial || false;
      
      // For trials, we need to use the REAL package price, not the $1 charge amount
      let realPackageAmount = transactionAmountUSD;
      let realPackageForMatching = matchedPackage; // Default to matched package
      
      if (isTrialTransaction) {
        // Get the real package details from metadata
        const packageDetails = existingTransaction?.metadata?.package_details;
        if (packageDetails) {
          realPackageAmount = packageDetails.price;
          console.log('🔍 [TRIAL] Using real package price from metadata:', packageDetails);
          
          // Re-match package using the real package ID if available
          if (packageDetails.id) {
            const realPackageMatch = allPackages.find(pkg => pkg.id === packageDetails.id);
            if (realPackageMatch) {
              realPackageForMatching = realPackageMatch;
              console.log('🔍 [TRIAL] Re-matched package using real package ID:', realPackageMatch.name);
            }
          }
        } else {
          console.warn('⚠️ [TRIAL] No package details in metadata, using transaction amount');
        }
      }
      
      console.log('🔍 [3DS SUBSCRIPTION AMOUNT DEBUG]:', {
        is_trial: isTrialTransaction,
        transaction_amount_usd: transactionAmountUSD,
        real_package_amount: realPackageAmount,
        matched_package_name: realPackageForMatching.name,
        matched_package_id: realPackageForMatching.id,
        charge_was: isTrialTransaction ? '$1 for tokenization' : '$' + transactionAmountUSD + ' real charge'
      });
      
      // Create subscription using saved_token_id from transaction status (NOT the original temporary token)
      const subscription = await midtransService.createSubscriptionWithAmount(realPackageAmount, {
        name: isTrialTransaction ? 
          `${realPackageForMatching.name.toUpperCase()}_TRIAL_AUTO_BILLING` : 
          `${realPackageForMatching.name}_${billing_period}`.toUpperCase(),
        token: savedTokenId, // Use the permanent saved_token_id, not the temporary token
        schedule: {
          interval: 1,
          interval_unit: billing_period === 'monthly' ? 'month' : 'month',
          max_interval: billing_period === 'monthly' ? 12 : 1,
          start_time: isTrialTransaction ? 
            new Date(Date.now() + 8 * 60 * 1000) : // 8 minutes for trial (testing purposes)
            new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        },
        customer_details: {
          first_name: originalCustomerInfo?.first_name || midtransFirstName || transactionDetails.customer_details?.first_name || 'Customer',
          last_name: originalCustomerInfo?.last_name || transactionDetails.customer_details?.last_name || transactionDetails.billing_address?.last_name || '',
          email: originalCustomerInfo?.email || transactionDetails.customer_details?.email || transactionDetails.billing_address?.email || user.email || '',
          phone: originalCustomerInfo?.phone || transactionDetails.customer_details?.phone || transactionDetails.billing_address?.phone || '',
        },
        metadata: {
          user_id: user.id,
          user_email: user.email,
          package_id: realPackageForMatching.id,
          package_name: realPackageForMatching.name,
          billing_period: billing_period,
          order_id: order_id,
          original_transaction_id: transaction_id,
          trial_type: isTrialTransaction ? 'free_trial_auto_billing' : null,
          original_trial_start: isTrialTransaction ? new Date().toISOString() : null,
          subscription_type: 'recurring_payment'
        },
      })
      
      console.log('✅ Subscription created successfully!', {
        subscription_id: subscription.id,
        name: subscription.name,
        status: subscription.status,
        saved_token_id: subscription.token?.substring(0, 20) + '...'
      })

      // Note: We already have the saved_token_id from transaction status, don't overwrite it
      // The subscription.token should be the same as our savedTokenId
      console.log('✅ Subscription created with saved_token_id:', savedTokenId.substring(0, 20) + '...')
      
      console.log('💾 ============= STEP 3: SAVING TO DATABASE TABLES =============') 
      
      // Update existing pending transaction or create new one
      console.log('📝 Updating/creating transaction record in indb_payment_transactions...')
      
      let transactionData, transactionError;
      
      if (existingTransaction) {
        // Update existing pending transaction
        console.log('📝 Updating existing pending transaction:', existingTransaction.id)
        const { data: updatedTransaction, error: updateError } = await supabase
          .from('indb_payment_transactions')
          .update({
            package_id: realPackageForMatching.id, // Use the correct package ID
            transaction_status: 'completed',
            gateway_response: transactionDetails,
            processed_at: new Date().toISOString(),
            metadata: {
              ...existingTransaction.metadata,
              subscription_id: subscription.id,
              masked_card: transactionDetails.masked_card,
              subscription_status: subscription.status,
              next_execution_at: subscription.schedule?.next_execution_at,
              processing_method: '3ds_callback',
              order_id: order_id,
              final_package_id: realPackageForMatching.id,
              final_package_name: realPackageForMatching.name
            },
          })
          .eq('id', existingTransaction.id)
          .select()
          .single()
        
        transactionData = updatedTransaction
        transactionError = updateError
      } else {
        // Create new transaction record (fallback)
        console.log('📝 Creating new transaction record (no pending transaction found)')
        const { data: newTransaction, error: newError } = await supabase
          .from('indb_payment_transactions')
          .insert({
            user_id: user.id,
            package_id: realPackageForMatching.id,
          gateway_id: midtransGateway.id,
          transaction_type: 'subscription',
          transaction_status: 'completed',
          amount: transactionAmountUSD,
          currency: 'USD',
          payment_method: 'credit_card',
          gateway_transaction_id: transaction_id,
          billing_period: billing_period,
          gateway_response: transactionDetails,
          metadata: {
            subscription_id: subscription.id,
            saved_token_id: savedTokenId,
            masked_card: transactionDetails.masked_card,
            subscription_status: subscription.status,
            next_execution_at: subscription.schedule?.next_execution_at,
            processing_method: '3ds_callback',
            customer_info: {
              first_name: originalCustomerInfo?.first_name || midtransFirstName || transactionDetails.customer_details?.first_name || 'Customer',
              last_name: originalCustomerInfo?.last_name || transactionDetails.customer_details?.last_name || transactionDetails.billing_address?.last_name || '',
              email: originalCustomerInfo?.email || transactionDetails.customer_details?.email || transactionDetails.billing_address?.email || user.email || '',
              phone: originalCustomerInfo?.phone || transactionDetails.customer_details?.phone || transactionDetails.billing_address?.phone || '',
            },
            order_id: order_id
          },
        })
        .select()
        .single()
        
        transactionData = newTransaction
        transactionError = newError
      }

      if (transactionError) {
        console.error('❌ TRANSACTION RECORD CREATION FAILED:', transactionError)
        throw new Error('Failed to save transaction record')
      }
      
      console.log('✅ Transaction record created:', transactionData.id)

      // Create Midtrans-specific data record linked to main transaction
      console.log('📝 Creating Midtrans record in indb_payment_midtrans...')
      const { data: midtransData, error: midtransError } = await supabase
        .from('indb_payment_midtrans')
        .insert({
          transaction_id: transactionData.id, // Link to main transaction record
          user_id: user.id,
          midtrans_subscription_id: subscription.id,
          saved_token_id: savedTokenId,
          masked_card: transactionDetails.masked_card || 'Unknown',
          card_type: transactionDetails.card_type || 'credit',
          bank: transactionDetails.bank || 'Unknown',
          token_expired_at: transactionDetails.saved_token_id_expired_at ? new Date(transactionDetails.saved_token_id_expired_at).toISOString() : null,
          subscription_status: 'active',
          next_billing_date: subscription.schedule?.next_execution_at ? new Date(subscription.schedule.next_execution_at).toISOString() : null,
          metadata: {
            midtrans_transaction_id: transaction_id,
            order_id: order_id,
            subscription_name: subscription.name,
            schedule: subscription.schedule,
            processing_method: '3ds_callback'
          }
        })
        .select()
        .single()

      if (midtransError) {
        console.warn('⚠️ Failed to create Midtrans data record:', midtransError)
        // Don't fail the whole transaction, just log the warning
      } else {
        console.log('✅ Midtrans data record created:', midtransData.id)
      }

      // Update user package with trial-specific logic
      console.log('👤 Updating user profile with package subscription...')
      
      let userUpdateData;
      if (isTrialTransaction) {
        const now = new Date();
        const trialEndDate = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes from now (testing purposes)
        
        userUpdateData = {
          package_id: realPackageForMatching.id,
          subscribed_at: now.toISOString(),
          expires_at: trialEndDate.toISOString(), // Trial expires in 8 minutes (testing purposes)
          trial_started_at: now.toISOString(),
          trial_status: 'active',
          auto_billing_enabled: true,
          has_used_trial: true, // Mark trial as used
          trial_used_at: now.toISOString()
        };
        
        console.log('✅ [Trial] User profile will be updated with trial information');
      } else {
        userUpdateData = {
          package_id: realPackageForMatching.id,
          subscribed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      
      console.log('🔍 [DEBUG] About to update user profile with data:', JSON.stringify(userUpdateData, null, 2));
      console.log('🔍 [DEBUG] User ID:', user.id);
      
      const { data: updatedProfile, error: userUpdateError } = await supabase
        .from('indb_auth_user_profiles')
        .update(userUpdateData)
        .eq('user_id', user.id)
        .select('user_id, package_id, trial_status, expires_at')
        .single()

      if (userUpdateError) {
        console.error('❌ CRITICAL: Failed to update user profile:', userUpdateError)
        throw new Error(`User profile update failed: ${userUpdateError.message}`)
      } else {
        console.log('✅ User profile updated successfully:', {
          user_id: updatedProfile.user_id,
          new_package_id: updatedProfile.package_id,
          trial_status: updatedProfile.trial_status,
          expires_at: updatedProfile.expires_at
        })
        
        // Verify the update worked by checking the database
        console.log('🔍 [VERIFICATION] Double-checking user profile update...');
        const { data: verificationProfile } = await supabase
          .from('indb_auth_user_profiles')
          .select('user_id, package_id, trial_status, expires_at')
          .eq('user_id', user.id)
          .single()
        
        if (verificationProfile) {
          console.log('✅ [VERIFICATION] Current user profile in database:', verificationProfile);
        }
      }
      
      console.log('🎉 ============= SUCCESS: 3DS PAYMENT & SUBSCRIPTION COMPLETED =============')      
      console.log('✅ 3DS authentication and payment completed successfully')
      console.log('💾 All database records saved successfully:', {
        transaction_id: transactionData.id,
        midtrans_record_id: midtransData?.id,
        subscription_id: subscription.id,
        user_id: user.id,
        package_id: matchedPackage.id,
        billing_period: billing_period
      })

      return NextResponse.json({
        success: true,
        message: 'Recurring payment setup successfully completed via 3DS',
        data: {
          transaction_id: transactionData.id,
          midtrans_subscription_id: subscription.id,
          order_id: order_id,
          amount: transactionAmountUSD,
          currency: 'USD',
          billing_period: billing_period,
          next_billing_date: subscription.schedule?.next_execution_at,
          masked_card: transactionDetails.masked_card,
          redirect_url: `/dashboard/settings/plans-billing/orders/${transactionData.id}`,
        },
      })

    } else if (transactionStatus.transaction_status === 'pending') {
      console.log('⏳ Transaction is still pending after 3DS')
      return NextResponse.json({
        success: false,
        message: 'Transaction is still pending. Please wait for notification.',
        transaction_status: 'pending'
      })

    } else {
      console.log('❌ 3DS Authentication failed')
      return NextResponse.json({
        success: false,
        message: `3DS authentication failed: ${transactionStatus.status_message}`,
        transaction_status: transactionStatus.transaction_status
      })
    }

  } catch (error: any) {
    console.error('❌ 3DS callback error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error during 3DS callback' },
      { status: 500 }
    )
  }
}