export async function POST(request: Request) {
  try {
    const { payment_method, result } = await request.json()
    
    console.log('📋 [FRONTEND-TO-BACKEND] Payment result received by frontend:', {
      payment_method,
      result: JSON.stringify(result, null, 2)
    })
    
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false })
  }
}