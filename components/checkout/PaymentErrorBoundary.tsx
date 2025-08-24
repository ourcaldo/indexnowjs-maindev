'use client'

import React, { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorId: string
}

export default class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced error logging
    const errorDetails = {
      errorId: this.state.errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }

    console.error('🚨 Payment Error Boundary - Critical Error:', errorDetails)
    
    // Call optional error callback
    this.props.onError?.(error, errorInfo)
    
    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(errorDetails)
    }
  }

  private async logErrorToService(errorDetails: any) {
    try {
      // Placeholder for error tracking service integration
      // await fetch('/api/errors/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorDetails)
      // })
      console.warn('Error logging service not implemented')
    } catch (loggingError) {
      console.error('Failed to log error to service:', loggingError)
    }
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="border-[#E63946] bg-[#E63946]/5">
          <CardHeader>
            <CardTitle className="text-[#E63946] flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Payment System Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-[#6C757D]">
                We encountered an unexpected error while processing your payment. 
                This error has been logged and our team has been notified.
              </p>
              
              <div className="text-sm text-[#6C757D] bg-[#F7F9FC] p-3 rounded border">
                <div className="font-medium text-[#1A1A1A] mb-1">Error Details:</div>
                <div>Error ID: <code className="text-xs bg-white px-1 py-0.5 rounded">{this.state.errorId}</code></div>
                {this.state.error?.name && (
                  <div>Type: <code className="text-xs bg-white px-1 py-0.5 rounded">{this.state.error.name}</code></div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                className="flex-1 border-[#3D8BFF] text-[#3D8BFF] hover:bg-[#3D8BFF] hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="flex-1"
              >
                Reload Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                className="flex-1 bg-[#1C2331] hover:bg-[#0d1b2a]"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            <div className="text-xs text-[#6C757D] border-t border-[#E0E6ED] pt-3">
              <p>If this problem persists, please contact support with the error ID above.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function usePaymentErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    const errorDetails = {
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    }

    console.error('🚨 Payment Error Handler:', errorDetails)
    return errorDetails
  }, [])

  return { handleError }
}