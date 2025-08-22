/**
 * Midtrans Client Service
 * Frontend service for handling Midtrans SDK interactions
 * Manages SDK loading, tokenization, and Snap popup display
 */

// Use existing Window interface declarations from the project

export interface SnapCallbacks {
  onSuccess?: (result: any) => void
  onPending?: (result: any) => void
  onError?: (result: any) => void
  onClose?: () => void
}

export interface CardTokenData {
  card_number: string
  card_exp_month: string
  card_exp_year: string
  card_cvv: string
}

export class MidtransClientService {
  /**
   * Load Midtrans Snap.js SDK for popup payments
   */
  static async loadSnapSDK(clientKey: string, environment: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector('#snap-script') && window.snap) {
        resolve()
        return
      }

      // Remove existing script if present but not working
      const existingScript = document.querySelector('#snap-script')
      if (existingScript) {
        existingScript.remove()
      }

      const script = document.createElement('script')
      script.src = environment === 'production' 
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('id', 'snap-script')
      script.async = true
      
      script.onload = () => {
        console.log('✅ Snap SDK loaded successfully')
        resolve()
      }
      
      script.onerror = () => {
        console.error('❌ Failed to load Snap SDK')
        reject(new Error('Failed to load Midtrans Snap SDK'))
      }
      
      document.head.appendChild(script)
    })
  }

  /**
   * Load Midtrans 3DS SDK for credit card tokenization
   */
  static async load3DSSDK(clientKey: string, environment: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector('#midtrans-3ds-script') && window.MidtransNew3ds) {
        resolve()
        return
      }

      // Remove existing script if present but not working
      const existingScript = document.querySelector('#midtrans-3ds-script')
      if (existingScript) {
        existingScript.remove()
      }

      const script = document.createElement('script')
      script.src = 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
      script.setAttribute('data-environment', environment)
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('id', 'midtrans-3ds-script')
      script.async = true

      script.onload = () => {
        console.log('✅ 3DS SDK loaded successfully')
        // Give the SDK a moment to initialize
        setTimeout(() => {
          console.log('🔍 Checking if window.MidtransNew3ds is available after load...')
          console.log('🔍 window.MidtransNew3ds:', !!window.MidtransNew3ds)
          if (window.MidtransNew3ds) {
            console.log('🔍 Available methods:', Object.keys(window.MidtransNew3ds))
            console.log('🔍 getCardToken available:', typeof window.MidtransNew3ds.getCardToken === 'function')
          }
          resolve()
        }, 100)
      }

      script.onerror = () => {
        console.error('❌ Failed to load 3DS SDK')
        reject(new Error('Failed to load Midtrans 3DS SDK'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Display Snap payment popup
   */
  static async showSnapPayment(token: string, callbacks: SnapCallbacks): Promise<void> {
    if (!window.snap || typeof window.snap.pay !== 'function') {
      throw new Error('Midtrans Snap SDK not loaded')
    }

    try {
      window.snap.pay(token, callbacks)
    } catch (error) {
      console.error('Snap payment error:', error)
      throw new Error('Failed to display Snap payment popup')
    }
  }

  /**
   * Get credit card token using 3DS SDK
   * Uses JSONP callback mechanism - response comes through global callback override
   * Implementation matches the original working version exactly
   */
  static async getCreditCardToken(cardData: CardTokenData): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Starting card tokenization...')
      console.log('🔍 Card data received:', { 
        has_card_number: !!cardData.card_number, 
        exp_month: cardData.card_exp_month, 
        exp_year: cardData.card_exp_year,
        has_cvv: !!cardData.card_cvv 
      })
      
      let isResolved = false

      // Add timeout to prevent hanging (reduced from 30s to 15s for better UX)
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          console.error('❌ Card tokenization timeout after 15 seconds')
          reject(new Error('Card tokenization timeout. Please try again.'))
        }
      }, 15000)

      if (!window.MidtransNew3ds) {
        console.error('❌ window.MidtransNew3ds not available')
        clearTimeout(timeout)
        reject(new Error('Payment system not ready. Please refresh the page.'))
        return
      }

      console.log('✅ window.MidtransNew3ds is available')
      console.log('🔍 Available methods:', Object.keys(window.MidtransNew3ds))
      console.log('🔍 getCardToken function available:', typeof window.MidtransNew3ds.getCardToken === 'function')

      // Store original callback and override it temporarily
      const originalCallback = (window as any).MidtransNew3ds.callback
      console.log('🔄 Setting up JSONP callback override...')

      ;(window as any).MidtransNew3ds.callback = function(response: any) {
        console.log('📥 Received JSONP callback response:', response)
        if (!isResolved) {
          isResolved = true
          clearTimeout(timeout)

          // Restore original callback
          ;(window as any).MidtransNew3ds.callback = originalCallback

          if (response && response.status_code === '200' && response.token_id) {
            console.log('✅ Tokenization successful, token_id:', response.token_id)
            resolve(response.token_id)
          } else {
            console.error('❌ Tokenization failed:', response)
            reject(new Error(response?.status_message || 'Card tokenization failed'))
          }
        }
      }

      try {
        if (typeof window.MidtransNew3ds.getCardToken === 'function') {
          const tokenizationData = {
            card_number: cardData.card_number.replace(/\s/g, ''),
            card_exp_month: cardData.card_exp_month.padStart(2, '0'),
            card_exp_year: cardData.card_exp_year,
            card_cvv: cardData.card_cvv,
          }
          
          console.log('🚀 Calling Midtrans getCardToken with data:', {
            card_number: '****' + tokenizationData.card_number.slice(-4),
            card_exp_month: tokenizationData.card_exp_month,
            card_exp_year: tokenizationData.card_exp_year,
            has_cvv: !!tokenizationData.card_cvv
          })
          
          window.MidtransNew3ds.getCardToken(tokenizationData, function(response?: any) {
            console.log('📋 getCardToken direct callback (usually empty):', response)
            // This callback is required by the API but the actual response comes via global callback
          })
        } else {
          console.error('❌ getCardToken function not available')
          throw new Error('getCardToken function not available')
        }

      } catch (error) {
        console.error('💥 Error in tokenization try block:', error)
        clearTimeout(timeout)
        if (!isResolved) {
          isResolved = true
          // Restore original callback on error
          ;(window as any).MidtransNew3ds.callback = originalCallback
          reject(new Error('Payment processing failed. Please try again.'))
        }
      }
    })
  }

  /**
   * Handle 3DS authentication
   */
  static async handle3DSAuthentication(redirectUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.authenticate !== 'function') {
        reject(new Error('Midtrans 3DS SDK not loaded'))
        return
      }

      try {
        window.MidtransNew3ds.authenticate(redirectUrl, {
          performAuthentication: (redirect_url: string) => {
            // Open 3DS authentication in popup/iframe
            const popup = window.open(redirect_url, '3ds_popup', 'width=500,height=600')
            
            const checkClosed = setInterval(() => {
              if (popup?.closed) {
                clearInterval(checkClosed)
                resolve()
              }
            }, 1000)
          },
          onSuccess: (response: any) => {
            console.log('3DS authentication successful', response)
            resolve()
          },
          onPending: (response: any) => {
            console.log('3DS authentication pending', response)
            // Handle pending state if needed
          },
          onFailure: (response: any) => {
            console.error('3DS authentication failed:', response)
            reject(new Error('3DS authentication failed'))
          }
        })
      } catch (error) {
        console.error('3DS authentication error:', error)
        reject(new Error('Failed to handle 3DS authentication'))
      }
    })
  }

  /**
   * Get Midtrans configuration from backend
   */
  static async getMidtransConfig(token: string): Promise<{ client_key: string, environment: string }> {
    try {
      const response = await fetch('/api/billing/midtrans-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get Midtrans config: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get Midtrans configuration')
      }

      return data.data
    } catch (error) {
      console.error('Error getting Midtrans config:', error)
      throw error
    }
  }
}