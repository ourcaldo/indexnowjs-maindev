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
   * Process credit card payment with correct Midtrans recurring flow
   * For Midtrans recurring: backend creates initial charge → gets saved_token_id → creates subscription
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
      // For Midtrans recurring payments, pass card data directly to backend
      // Backend will: 1) Create initial charge, 2) Get saved_token_id, 3) Create subscription
      const paymentWithCardData = {
        ...paymentData,
        card_data: cardData  // Pass raw card data instead of pre-tokenizing
      }

      // Process payment - backend handles the correct Midtrans flow
      await processPayment(paymentWithCardData, token)

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
          await handle3DSAuthentication(result.redirect_url, result.data)
          return
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
   * Handle 3DS authentication
   */
  const handle3DSAuthentication = async (redirectUrl: string, transactionData: any) => {
    try {
      await MidtransClientService.handle3DSAuthentication(redirectUrl)
      
      // After 3DS completion, show success
      addToast({
        title: "Payment successful!",
        description: "Your subscription has been activated.",
        type: "success"
      })
      router.push('/dashboard/settings/plans-billing?payment=success')
    } catch (error) {
      console.error('3DS authentication failed:', error)
      addToast({
        title: "Authentication failed",
        description: "Payment authentication was not completed.",
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