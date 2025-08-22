/**
 * usePaymentProcessor Hook
 * React hook for handling payment processing logic
 * Encapsulates payment flow, loading states, and error handling
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentRouter, type PaymentRequest } from '@/lib/payment-services/payment-router'
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service'
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/supabase-browser'
// ActivityLogger is imported dynamically to avoid server-side imports in browser

export interface UsePaymentProcessorProps {
  packageData?: any
  onSuccess?: (result?: any) => void
  onError?: (error: Error) => void
  onPaymentStart?: () => void
}

export interface PaymentProcessorState {
  loading: boolean
  submitting: boolean
  error: string | null
}

export function usePaymentProcessor({ 
  packageData, 
  onSuccess, 
  onError,
  onPaymentStart 
}: UsePaymentProcessorProps = {}) {
  const [state, setState] = useState<PaymentProcessorState>({
    loading: false,
    submitting: false,
    error: null
  })
  
  const { addToast } = useToast()
  const router = useRouter()

  /**
   * Set loading state
   */
  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }

  /**
   * Set submitting state
   */
  const setSubmitting = (submitting: boolean) => {
    setState(prev => ({ ...prev, submitting }))
  }

  /**
   * Set error state
   */
  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }

  /**
   * Process payment using unified payment API
   */
  const processPayment = async (paymentData: PaymentRequest, token: string): Promise<void> => {
    setSubmitting(true)
    setError(null)
    onPaymentStart?.()
    
    try {
      const paymentRouter = new PaymentRouter(token)
      const result = await paymentRouter.processPayment(paymentData)

      if (result.success) {
        await handlePaymentSuccess(result, paymentData.payment_method, paymentData)
        onSuccess?.(result)
      } else {
        throw new Error(result.message || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      setError(errorMessage)
      onError?.(error as Error)
      
      addToast({
        title: "Payment failed",
        description: errorMessage,
        type: "error"
      })
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Process credit card payment with proper Midtrans tokenization flow
   * 1) Tokenize card using Midtrans.min.js → 2) Charge with token → 3) Subscription with saved_token
   */
  const processCreditCardPayment = async (
    paymentData: Omit<PaymentRequest, 'token_id'>, 
    cardData: { card_number: string; card_exp_month: string; card_exp_year: string; card_cvv: string },
    token: string
  ): Promise<void> => {
    setSubmitting(true)
    setError(null)
    onPaymentStart?.()

    try {
      console.log('🚀 [Credit Card Payment] Starting credit card payment process...')
      console.log('📄 [Credit Card Payment] Payment data:', paymentData)
      console.log('💳 [Credit Card Payment] Card data:', { 
        has_card_number: !!cardData.card_number, 
        exp_month: cardData.card_exp_month, 
        exp_year: cardData.card_exp_year,
        has_cvv: !!cardData.card_cvv 
      })
      
      // Step 1: Load 3DS SDK and get configuration
      console.log('🔄 [Credit Card Payment] Getting Midtrans configuration...')
      const config = await MidtransClientService.getMidtransConfig(token)
      console.log('✅ [Credit Card Payment] Config loaded:', { environment: config.environment })
      
      console.log('🔄 [Credit Card Payment] Ensuring 3DS SDK is loaded...')
      await MidtransClientService.load3DSSDK(config.client_key, config.environment)
      console.log('✅ [Credit Card Payment] 3DS SDK loaded')

      // Step 2: Tokenize card using Midtrans JavaScript SDK
      console.log('🚀 [Credit Card Payment] Starting card tokenization...')
      const cardToken = await MidtransClientService.getCreditCardToken(cardData)
      console.log('✅ [Credit Card Payment] Card tokenization successful, token:', cardToken)

      if (!cardToken) {
        throw new Error('Failed to process card information')
      }

      // Step 3: Process payment with token_id (backend will charge → get saved_token → create subscription)
      console.log('💳 [Credit Card Payment] Processing payment with card token...')
      await processPayment({ ...paymentData, token_id: cardToken }, token)
      console.log('✅ [Credit Card Payment] Payment processing completed')

    } catch (error) {
      console.error('Credit card payment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Credit card payment failed'
      setError(errorMessage)
      onError?.(error as Error)
      
      addToast({
        title: "Payment failed",
        description: errorMessage,
        type: "error"
      })
      setSubmitting(false)
    }
  }

  /**
   * Handle successful payment response
   */
  const handlePaymentSuccess = async (result: any, paymentMethod: string, paymentData: PaymentRequest) => {
    try {
      if (paymentMethod === 'midtrans_snap') {
        // Handle Snap popup
        const { token, client_key, environment } = result.data
        
        await MidtransClientService.loadSnapSDK(client_key, environment)
        
        await MidtransClientService.showSnapPayment(token, {
          onSuccess: (snapResult) => {
            addToast({
              title: "Payment successful!",
              description: "Your subscription has been activated.",
              type: "success"
            })
            logPaymentActivity('payment_success', paymentData, snapResult)
            router.push('/dashboard/settings/plans-billing?payment=success')
          },
          onPending: (snapResult) => {
            addToast({
              title: "Payment pending",
              description: "Your payment is being processed.",
              type: "info"
            })
            logPaymentActivity('payment_pending', paymentData, snapResult)
            router.push('/dashboard/settings/plans-billing?payment=pending')
          },
          onError: (snapResult) => {
            addToast({
              title: "Payment failed",
              description: "There was an error processing your payment.",
              type: "error"
            })
            logPaymentActivity('payment_error', paymentData, snapResult)
          },
          onClose: () => {
            addToast({
              title: "Payment cancelled",
              description: "You cancelled the payment process.",
              type: "info"
            })
            logPaymentActivity('payment_cancelled', paymentData)
          }
        })
      } else if (paymentMethod === 'midtrans_recurring') {
        // Handle 3DS authentication if required
        if (result.requires_redirect && result.redirect_url) {
          // Throw a special error that the component can catch and handle for 3DS
          const threeDSError = new Error('3DS authentication required') as any
          threeDSError.requires_3ds = true
          threeDSError.redirect_url = result.redirect_url
          threeDSError.transaction_id = result.data?.transaction_id
          threeDSError.order_id = result.data?.order_id
          throw threeDSError
        }

        // Direct success without 3DS
        addToast({
          title: "Payment successful!",
          description: "Your subscription has been activated.",
          type: "success"
        })
        logPaymentActivity('payment_success', paymentData, result.data)
        router.push('/dashboard/settings/plans-billing?payment=success')
      } else {
        // Handle redirect payments (bank transfer, etc.)
        if (result.redirect_url) {
          window.location.href = result.redirect_url
        } else {
          addToast({
            title: "Payment initiated",
            description: "Please follow the payment instructions.",
            type: "success"
          })
          logPaymentActivity('payment_initiated', paymentData, result.data)
          router.push('/dashboard/settings/plans-billing')
        }
      }
    } catch (error) {
      console.error('Error handling payment success:', error)
      setError('Payment completed but there was an error with the follow-up process')
    }
  }

  /**
   * Handle 3DS authentication with modal display
   * This function should be called by the UI component that manages the modal state
   */
  const handle3DSAuthentication = async (
    redirectUrl: string, 
    transactionId: string, 
    orderId: string,
    onModalOpen?: (url: string) => void,
    onModalClose?: () => void
  ) => {
    try {
      console.log('🔐 Starting 3DS authentication process')

      if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.authenticate !== 'function') {
        throw new Error('3DS authentication not available. Please refresh the page and try again.')
      }

      const options = {
        performAuthentication: (url: string) => {
          // Open 3DS page in modal/iframe
          console.log('🔐 Opening 3DS authentication page')
          onModalOpen?.(url)
        },
        onSuccess: async (response: any) => {
          console.log('✅ 3DS Authentication successful:', response)
          onModalClose?.()

          // Call our callback API to complete the payment process
          try {
            const user = await authService.getCurrentUser()
            const { data: { session } } = await supabaseBrowser.auth.getSession()
            const token = session?.access_token

            if (!token) {
              throw new Error('Authentication token expired')
            }

            const callbackResponse = await fetch('/api/billing/midtrans-3ds-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                transaction_id: transactionId,
                order_id: orderId
              }),
            })

            const callbackResult = await callbackResponse.json()

            if (callbackResult.success) {
              addToast({
                title: "Payment successful!",
                description: "Your subscription has been activated successfully.",
                type: "success"
              })

              // Log the successful activity
              logPaymentActivity('subscription_created_3ds', {
                package_id: packageData?.id || '',
                billing_period: packageData?.billing_period || 'monthly',
                payment_method: 'midtrans_recurring',
                customer_info: {
                  first_name: 'User',
                  last_name: '',
                  email: user?.email || '',
                  phone: '',
                  address: '',
                  city: '',
                  state: '',
                  zip_code: '',
                  country: 'Indonesia'
                }
              }, {
                transaction_id: transactionId,
                order_id: orderId,
                authentication_method: '3ds'
              })

              router.push('/dashboard/settings/plans-billing?payment=success')
            } else {
              throw new Error(callbackResult.message || '3DS authentication callback failed')
            }
          } catch (error) {
            console.error('3DS callback error:', error)
            addToast({
              title: "Payment processing failed",
              description: error instanceof Error ? error.message : "Please contact support.",
              type: "error"
            })
          } finally {
            setSubmitting(false)
          }
        },
        onFailure: (response: any) => {
          console.log('❌ 3DS Authentication failed:', response)
          onModalClose?.()
          setSubmitting(false)

          addToast({
            title: "Payment authentication failed",
            description: "Please verify your card details and try again.",
            type: "error"
          })
        },
        onPending: (response: any) => {
          console.log('⏳ 3DS Authentication pending:', response)
          onModalClose?.()
          setSubmitting(false)

          addToast({
            title: "Payment pending",
            description: "Your payment is being processed. You will receive a confirmation email shortly.",
            type: "info"
          })
        }
      }

      // Trigger 3DS authentication
      window.MidtransNew3ds.authenticate(redirectUrl, options)

    } catch (error) {
      console.error('3DS authentication failed:', error)
      onModalClose?.()
      setSubmitting(false)
      addToast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Payment authentication was not completed.",
        type: "error"
      })
    }
  }

  /**
   * Log payment activity for audit trail
   * Temporarily disabled to avoid server-side import issues
   */
  const logPaymentActivity = async (action: string, paymentData: PaymentRequest, additionalData?: any) => {
    // Activity logging temporarily disabled during refactoring
    // Will be re-enabled with proper API endpoint approach
    console.log('Payment activity:', { action, paymentData, additionalData })
  }

  return {
    // State
    loading: state.loading,
    submitting: state.submitting,
    error: state.error,
    
    // Actions
    processPayment,
    processCreditCardPayment,
    setLoading,
    setSubmitting,
    setError,
    
    // Utility functions
    handlePaymentSuccess,
    handle3DSAuthentication
  }
}