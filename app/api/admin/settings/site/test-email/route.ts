import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'
import * as nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    const adminUser = await requireSuperAdminAuth(request)

    const body = await request.json()
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      smtp_from_name,
      smtp_from_email,
      smtp_secure
    } = body

    // Validate required fields
    if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from_email) {
      return NextResponse.json(
        { error: 'All SMTP fields are required for testing' },
        { status: 400 }
      )
    }

    // Create transporter with provided settings
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port) || 465,
      secure: smtp_secure !== false, // true for 465, false for other ports
      auth: {
        user: smtp_user,
        pass: smtp_pass
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    })

    // Test the connection
    try {
      await transporter.verify()
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError)
      return NextResponse.json(
        { error: `SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Send test email
    const testEmailOptions = {
      from: `${smtp_from_name || 'IndexNow Pro'} <${smtp_from_email}>`,
      to: adminUser?.email || smtp_from_email, // Send to admin user's email
      subject: 'IndexNow Pro - SMTP Test Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SMTP Test Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #F7F9FC; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #3D8BFF; margin: 0 0 10px 0; font-size: 24px;">✅ SMTP Test Successful</h1>
            <p style="margin: 0; color: #6C757D;">Your email configuration is working correctly!</p>
          </div>
          
          <div style="background: white; border: 1px solid #E0E6ED; border-radius: 8px; padding: 20px;">
            <h2 style="color: #1A1A1A; margin: 0 0 15px 0; font-size: 18px;">Configuration Details</h2>
            <ul style="margin: 0; padding-left: 20px; color: #6C757D;">
              <li><strong>SMTP Host:</strong> ${smtp_host}</li>
              <li><strong>SMTP Port:</strong> ${smtp_port}</li>
              <li><strong>Username:</strong> ${smtp_user}</li>
              <li><strong>Security:</strong> ${smtp_secure ? 'TLS/SSL Enabled' : 'No encryption'}</li>
              <li><strong>From Address:</strong> ${smtp_from_email}</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #E8F4FD; border-radius: 8px; border-left: 4px solid #3D8BFF;">
            <p style="margin: 0; color: #1A1A1A; font-size: 14px;">
              <strong>Test completed at:</strong> ${new Date().toLocaleString()}<br>
              <strong>Tested by:</strong> ${adminUser?.email || 'Admin'}
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #6C757D; font-size: 12px;">
            <p>IndexNow Pro - Professional URL Indexing Platform</p>
          </div>
        </body>
        </html>
      `
    }

    try {
      await transporter.sendMail(testEmailOptions)
    } catch (sendError) {
      console.error('Failed to send test email:', sendError)
      return NextResponse.json(
        { error: `Failed to send test email: ${sendError instanceof Error ? sendError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Log email test activity
    if (adminUser?.id) {
      try {
        await ActivityLogger.logAdminSettingsActivity(
          adminUser.id,
          ActivityEventTypes.SETTINGS_VIEW,
          'Tested SMTP email configuration',
          request,
          {
            section: 'site_settings',
            action: 'test_smtp',
            adminEmail: adminUser.email,
            smtpHost: smtp_host,
            testRecipient: adminUser.email
          }
        )
      } catch (logError) {
        console.error('Failed to log email test activity:', logError)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Test email sent successfully to ${adminUser?.email || smtp_from_email}`
    })

  } catch (error: any) {
    console.error('Email test API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}