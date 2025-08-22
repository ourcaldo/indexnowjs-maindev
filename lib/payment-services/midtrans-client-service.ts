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
        resolve()
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
   */
  static async getCreditCardToken(cardData: CardTokenData): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.getCardToken !== 'function') {
        reject(new Error('Midtrans 3DS SDK not loaded'))
        return
      }

      let isResolved = false
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          reject(new Error('Card tokenization timeout'))
        }
      }, 30000)

      try {
        // Store original callback and override it temporarily for JSONP response
        const originalCallback = (window as any).MidtransNew3ds.callback

        ;(window as any).MidtransNew3ds.callback = function(response: any) {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)
            
            // Restore original callback
            ;(window as any).MidtransNew3ds.callback = originalCallback

            if (response && response.token_id) {
              resolve(response.token_id)
            } else if (response && response.validation_messages) {
              reject(new Error(response.validation_messages.join(', ')))
            } else {
              reject(new Error('Card tokenization failed'))
            }
          }
        }

        // Make the API call - response comes through global callback
        window.MidtransNew3ds.getCardToken({
          card_number: cardData.card_number.replace(/\s/g, ''),
          card_exp_month: cardData.card_exp_month.padStart(2, '0'),
          card_exp_year: cardData.card_exp_year,
          card_cvv: cardData.card_cvv,
        }, function() {
          // This callback is required by the API but actual response comes via global callback
        })

      } catch (error) {
        clearTimeout(timeout)
        if (!isResolved) {
          isResolved = true
          console.error('Card tokenization error:', error)
          reject(new Error('Failed to tokenize card'))
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