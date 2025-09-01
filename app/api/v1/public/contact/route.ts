import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  type: z.enum(['Support', 'Sales', 'Partnership', 'Issues'], {
    required_error: 'Contact type is required'
  }),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  orderId: z.string().max(50, 'Order ID too long').optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long')
})

type ContactFormData = z.infer<typeof contactFormSchema>

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = contactFormSchema.parse(body)
    
    // Get request information for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Send contact email asynchronously (fire-and-forget)
    process.nextTick(async () => {
      try {
        const { contactEmailService } = await import('@/lib/email/contact-email-service')
        
        await contactEmailService.sendContactFormSubmission({
          name: validatedData.name,
          email: validatedData.email,
          type: validatedData.type,
          subject: validatedData.subject,
          orderId: validatedData.orderId || '',
          message: validatedData.message,
          ipAddress,
          userAgent,
          submittedAt: new Date().toISOString()
        })
        
        console.log('✅ Contact form email sent successfully', {
          email: validatedData.email,
          type: validatedData.type,
          subject: validatedData.subject
        })
        
      } catch (emailError) {
        console.error('❌ Failed to send contact form email:', emailError)
      }
    })
    
    // Log the contact form submission for admin tracking
    console.log('📝 Contact form submitted', {
      name: validatedData.name,
      email: validatedData.email,
      type: validatedData.type,
      subject: validatedData.subject,
      hasOrderId: Boolean(validatedData.orderId),
      messageLength: validatedData.message.length,
      ipAddress,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Contact form submitted successfully. We\'ll get back to you soon!' 
      },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Contact form submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid form data',
          errors: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to submit contact form. Please try again.' 
      },
      { status: 500 }
    )
  }
}