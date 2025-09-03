import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' 
      }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const fileName = `cms-${timestamp}-${randomStr}.${fileExtension}`
    const filePath = `cms/posts/${fileName}`

    try {
      // Optimize image with Sharp
      let optimizedBuffer = buffer
      
      if (file.type !== 'image/gif') {
        optimizedBuffer = await sharp(new Uint8Array(buffer))
          .resize(1200, 800, { 
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 85,
            progressive: true
          })
          .toBuffer()
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('indexnow-bucket')
        .upload(filePath, optimizedBuffer, {
          contentType: file.type === 'image/gif' ? file.type : 'image/jpeg',
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Failed to upload file:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }

      // Get public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('indexnow-bucket')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 })
      }

      return NextResponse.json({
        url: publicUrlData.publicUrl,
        path: filePath,
        fileName: fileName,
        originalName: file.name,
        size: optimizedBuffer.length,
        type: file.type === 'image/gif' ? file.type : 'image/jpeg'
      })

    } catch (processingError) {
      console.error('Error processing image:', processingError)
      return NextResponse.json({ error: 'Error processing image' }, { status: 500 })
    }

  } catch (error) {
    console.error('CMS upload API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}