import { NextRequest, NextResponse } from 'next/server'

// Redirect to unified webhook
export async function POST(request: NextRequest) {
  console.log('⚠️ [DEPRECATED] Old recurring webhook called, redirecting to unified webhook')
  
  // Forward the request to the unified webhook
  const body = await request.text()
  
  const unifiedWebhookUrl = new URL('/api/midtrans/webhook', request.url)
  
  const response = await fetch(unifiedWebhookUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body
  })
  
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
}