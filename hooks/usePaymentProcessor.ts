/**
 * usePaymentProcessor Hook
 * React hook for handling payment processing logic
 * Encapsulates payment flow, loading states, and error handling
 */

import '@/types/midtrans'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentRouter, type PaymentRequest } from '@/lib/payment-services/payment-router'
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service'
import { useToast } from '@/hooks/use-toast'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/database'
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
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    setSubmitting(true)
    setError(null)
    onPaymentStart?.()
    
    try {
      const paymentRouter = new PaymentRouter(token)
      const result = await paymentRouter.processPayment(paymentData)

      if (result.success) {
        
        await handlePaymentSuccess(result, paymentData.payment_method, paymentData)
        
        // Only call onSuccess for non-Midtrans payments (Midtrans handles success via popup/3DS callbacks)
        if (paymentData.payment_method !== 'midtrans_snap' && paymentData.payment_method !== 'midtrans_recurring') {
          onSuccess?.(result)
        }
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
            // Payment successful - let webhook handle the final confirmation
            addToast({
              title: "Payment successful!",
              description: "Your subscription has been activated successfully.",
              type: "success"
            })
            logPaymentActivity('payment_success', paymentData, snapResult)
            setTimeout(() => {
              router.push(`/dashboard/settings/plans-billing/orders/${result.data.order_id}`)
            }, 1500)
          },
          onPending: (snapResult) => {
            // Payment is pending - redirect to billing page for user to track status
            addToast({
              title: "Payment pending",
              description: "Your payment is being processed. Please wait...",
              type: "info"
            })
            logPaymentActivity('payment_pending', paymentData, snapResult)
            setTimeout(() => {
              router.push(`/dashboard/settings/plans-billing/orders/${result.data.order_id}`)
            }, 1500)
          },
          onError: (snapResult) => {
            // Only show toast and reset state - NO REDIRECT
            addToast({
              title: "Payment failed",
              description: "There was an error processing your payment. Please try again.",
              type: "error"
            })
            logPaymentActivity('payment_error', paymentData, snapResult)
            setSubmitting(false)
          },
          onClose: () => {
            // Only show toast and reset state - NO REDIRECT
            addToast({
              title: "Payment cancelled",
              description: "You cancelled the payment process.",
              type: "info"
            })
            logPaymentActivity('payment_cancelled', paymentData)
            setSubmitting(false)
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
        router.push(`/dashboard/settings/plans-billing/orders/${result.data.order_id}`)
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
      // Re-throw 3DS errors so they can be handled by the calling component
      if (error && typeof error === 'object' && 'requires_3ds' in error) {
        throw error
      }
      // Error handling payment success - logged internally
      setError('Payment completed but there was an error with the follow-up process')
    }
  }

  /**
   * Handle 3DS authentication with iframe popup
   * Simple implementation using exact Midtrans example
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

      // 3DS Modal implementation following Midtrans documentation exactly
      let modal: any = null
      const popupModal = {
        openPopup: (url: string) => {
          // Create modal container exactly like Midtrans docs
          const modalDiv = document.createElement('div')
          modalDiv.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.7); z-index: 10000; display: flex; 
            justify-content: center; align-items: center; padding: 20px;
          `
          
          // Create modal content container
          const modalContent = document.createElement('div')
          modalContent.style.cssText = `
            position: relative; width: 75%; height: 90vh; background: white; 
            border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            display: flex; flex-direction: column;
          `
          
          // Create header with cancel button
          const header = document.createElement('div')
          header.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 20px; border-bottom: 1px solid #e0e6ed; background: #f7f9fc;
            border-radius: 8px 8px 0 0;
          `
          
          const title = document.createElement('h3')
          title.textContent = 'Complete Payment Authentication'
          title.style.cssText = 'margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;'
          
          const cancelButton = document.createElement('button')
          cancelButton.textContent = '✕'
          cancelButton.style.cssText = `
            background: none; border: none; font-size: 20px; color: #6c757d;
            cursor: pointer; padding: 4px 8px; border-radius: 4px;
            transition: background-color 0.2s;
          `
          cancelButton.onmouseover = () => cancelButton.style.backgroundColor = '#e0e6ed'
          cancelButton.onmouseout = () => cancelButton.style.backgroundColor = 'transparent'
          cancelButton.onclick = () => {
            popupModal.closePopup()
            setSubmitting(false)
            addToast({
              title: "Payment cancelled",
              description: "You cancelled the payment authentication.",
              type: "info"
            })
          }
          
          header.appendChild(title)
          header.appendChild(cancelButton)
          
          // Create iframe with exact Midtrans specifications
          const iframe = document.createElement('iframe')
          iframe.src = url
          iframe.frameBorder = '0'
          iframe.style.cssText = `
            width: 100%; flex: 1; border: none; border-radius: 0 0 8px 8px;
          `
          
          // Add sandbox attributes for security
          iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-top-navigation')
          iframe.setAttribute('allow', 'payment')
          
          modalContent.appendChild(header)
          modalContent.appendChild(iframe)
          modalDiv.appendChild(modalContent)
          document.body.appendChild(modalDiv)
          modal = modalDiv
          
          onModalOpen?.(url)
        },
        closePopup: () => {
          if (modal && modal.parentNode) {
            try {
              modal.parentNode.removeChild(modal)
            } catch (e) {
              // Ignore if already removed
            }
            modal = null
          }
          onModalClose?.()
        }
      }

      // Options exactly matching Midtrans documentation structure
      const options = {
        performAuthentication: function(redirect_url: string) {
          // Implement exactly as Midtrans docs show
          popupModal.openPopup(redirect_url)
        },
        onSuccess: async function(response: any) {
          popupModal.closePopup()

          try {
            const { data: { session } } = await supabaseBrowser.auth.getSession()
            const token = session?.access_token

            if (!token) {
              throw new Error('Authentication token expired')
            }

            // Call 3DS callback API to finalize payment
            const callbackResponse = await fetch('/api/v1/billing/midtrans-3ds-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                transaction_id: transactionId,
                order_id: orderId,
                status_code: response.status_code,
                transaction_status: response.transaction_status,
                gross_amount: response.gross_amount,
                payment_type: response.payment_type
              }),
            })

            const callbackResult = await callbackResponse.json()

            if (callbackResult.success) {
              // Don't show toast here - billing page will handle it via URL parameter
              router.push(`/dashboard/settings/plans-billing/orders/${orderId}`)
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
        onFailure: function(response: any) {
          popupModal.closePopup()
          setSubmitting(false)
          addToast({
            title: "Payment authentication failed",
            description: "Please verify your card details and try again.",
            type: "error"
          })
        },
        onPending: function(response: any) {
          // For credit card recurring payments, there's no pending state - only success or failure
          // Keep popup open and let user complete the authentication
        }
      }

      // Trigger 3DS authentication - exactly like your example
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
    // Payment activity logged internally
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