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
      // Re-throw 3DS authentication errors so checkout page can handle them
      if (error && typeof error === 'object' && 'requires_3ds' in error) {
        setSubmitting(false) // Reset submitting state before re-throwing
        throw error
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
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
      // Step 1: Load 3DS SDK and get configuration
      const config = await MidtransClientService.getMidtransConfig(token)
      await MidtransClientService.load3DSSDK(config.client_key, config.environment)

      // Step 2: Tokenize card using Midtrans JavaScript SDK
      const cardToken = await MidtransClientService.getCreditCardToken(cardData)

      if (!cardToken) {
        throw new Error('Failed to process card information')
      }

      // Step 3: Process payment with token_id (backend will charge → get saved_token → create subscription)
      await processPayment({ ...paymentData, token_id: cardToken }, token)

    } catch (error) {
      // Re-throw 3DS authentication errors so checkout page can handle them
      if (error && typeof error === 'object' && 'requires_3ds' in error) {
        setSubmitting(false)
        throw error
      }
      
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
        // Handle 3DS authentication if required - check for requires_redirect from backend
        if (result.requires_redirect && result.redirect_url) {
          // Throw a special error that the component can catch and handle for 3DS
          const threeDSError = new Error('3DS authentication required') as any
          threeDSError.requires_3ds = true
          threeDSError.redirect_url = result.redirect_url
          threeDSError.transaction_id = result.data?.transaction_id
          threeDSError.order_id = result.data?.order_id
          
          throw threeDSError
        }

        // Direct success without 3DS (should be rare - most recurring payments require 3DS)
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
   * Implements the proper Midtrans 3DS flow using MidtransNew3ds.authenticate()
   */
  const handle3DSAuthentication = async (
    redirectUrl: string, 
    transactionId: string, 
    orderId: string,
    onModalOpen?: (url: string) => void,
    onModalClose?: () => void
  ) => {
    try {
      if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.authenticate !== 'function') {
        throw new Error('3DS authentication not available. Please refresh the page and try again.')
      }

      const options = {
        performAuthentication: (url: string) => {
          onModalOpen?.(url)
        },
        onSuccess: async (response: any) => {
          onModalClose?.()

          try {
            const user = await authService.getCurrentUser()
            const { data: { session } } = await supabaseBrowser.auth.getSession()
            const token = session?.access_token

            if (!token) {
              throw new Error('Authentication token expired')
            }

            // Call 3DS callback API to finalize payment
            const callbackResponse = await fetch('/api/billing/midtrans-3ds-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                transaction_id: transactionId,
                order_id: orderId,
                status_code: response.status_code,
                transaction_status: response.transaction_status
              }),
            })

            const callbackResult = await callbackResponse.json()

            if (callbackResult.success) {
              addToast({
                title: "Payment successful!",
                description: "Your subscription has been activated successfully.",
                type: "success"
              })

              router.push('/dashboard/settings/plans-billing?payment=success')
            } else {
              throw new Error(callbackResult.message || '3DS authentication callback failed')
            }
          } catch (error) {
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
          onModalClose?.()
          setSubmitting(false)

          addToast({
            title: "Payment authentication failed",
            description: "Please verify your card details and try again.",
            type: "error"
          })
        },
        onPending: (response: any) => {
          onModalClose?.()
          setSubmitting(false)

          addToast({
            title: "Payment pending",
            description: "Your payment is being processed. You will receive a confirmation email shortly.",
            type: "info"
          })
        }
      }

      // Trigger 3DS authentication using Midtrans JavaScript library
      window.MidtransNew3ds.authenticate(redirectUrl, options)

    } catch (error) {
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