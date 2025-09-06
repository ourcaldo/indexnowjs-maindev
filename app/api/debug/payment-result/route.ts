import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Only allow debug routes in development or with admin authentication
    if (process.env.NODE_ENV === 'production') {
      // In production, require admin authentication
      await requireServerAdminAuth(request)
    }
    
    const { payment_method, result } = await request.json()
    
    // Sanitize sensitive data in logs
    const sanitizedResult = {
      ...result,
      // Remove sensitive payment details if present
      card_number: result.card_number ? '****' + result.card_number?.slice(-4) : undefined,
      cvv: result.cvv ? '***' : undefined,
      bank_account: result.bank_account ? '****' + result.bank_account?.slice(-4) : undefined
    }
    
    console.log('📋 [DEBUG] Payment result received:', {
      payment_method,
      result: JSON.stringify(sanitizedResult, null, 2),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Debug payment result error:', error)
    
    // Handle authentication errors
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ success: false, error: 'Debug failed' }, { status: 500 })
  }
}