import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const proofFile = formData.get('proof_file') as File
    const transactionId = formData.get('transaction_id') as string

    if (!proofFile || !transactionId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(proofFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload JPG, PNG, WebP, or PDF files only.' },
        { status: 400 }
      )
    }

    if (proofFile.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Verify transaction ownership
    const { data: transaction, error: transactionError } = await supabase
      .from('indb_payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const fileExtension = proofFile.name.split('.').pop()
    const fileName = `payment-proof-${transactionId}-${Date.now()}.${fileExtension}`
    const filePath = `payment-proofs/${user.id}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('indexnow-public')
      .upload(filePath, proofFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, message: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('indexnow-public')
      .getPublicUrl(filePath)

    // Update transaction with proof URL and status
    const { error: updateError } = await supabase
      .from('indb_payment_transactions')
      .update({
        payment_proof_url: urlData.publicUrl,
        transaction_status: 'proof_uploaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to update transaction' },
        { status: 500 }
      )
    }

    // Log payment proof upload activity
    try {
      const { ActivityLogger, ActivityEventTypes } = await import('@/lib/monitoring/activity-logger')
      await ActivityLogger.logBillingActivity(
        user.id,
        ActivityEventTypes.PAYMENT_PROOF_UPLOADED,
        `Order #${transactionId.slice(0, 8)} - ${fileName}`,
        request,
        {
          transaction_id: transactionId,
          file_name: fileName,
          file_size: proofFile.size,
          file_type: proofFile.type,
          order_id: transactionId,
          storage_path: filePath
        }
      )
    } catch (logError) {
      console.error('Failed to log payment proof upload activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      file_url: urlData.publicUrl
    })

  } catch (error) {
    console.error('Upload proof error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}