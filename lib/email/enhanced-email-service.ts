import * as fs from 'fs'
import * as path from 'path'
import * as nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase'

interface EmailTemplate {
  subject: string
  html: string
}

interface BillingConfirmationData {
  customerName: string
  orderId: string
  packageName: string
  billingPeriod: string
  amount: string
  paymentMethod: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  orderDate: string
}

interface SmtpSettings {
  id: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  smtp_from_name: string
  smtp_from_email: string
  smtp_secure: boolean
  smtp_enabled: boolean
  created_at: string
  updated_at: string
}

export class EnhancedEmailService {
  private transporter: nodemailer.Transporter | null = null
  private currentSettings: SmtpSettings | null = null
  private settingsLastFetched: number = 0
  private readonly SETTINGS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.initializeTransporter()
  }

  private async fetchSmtpSettings(): Promise<SmtpSettings | null> {
    try {
      const now = Date.now()
      
      // Use cached settings if still valid
      if (this.currentSettings && (now - this.settingsLastFetched) < this.SETTINGS_CACHE_DURATION) {
        return this.currentSettings
      }

      console.log('🔄 Fetching SMTP settings from database...')
      
      const { data: settings, error } = await supabaseAdmin
        .from('indb_system_smtp_settings')
        .select('*')
        .single()

      if (error) {
        console.warn('⚠️ Failed to fetch SMTP settings from database:', error.message)
        // Fall back to environment variables
        return this.getEnvironmentSmtpSettings()
      }

      if (!settings.smtp_enabled) {
        console.log('📧 SMTP disabled in database settings')
        return null
      }

      this.currentSettings = settings
      this.settingsLastFetched = now
      console.log('✅ SMTP settings loaded from database')
      
      return settings

    } catch (error) {
      console.error('❌ Error fetching SMTP settings:', error)
      return this.getEnvironmentSmtpSettings()
    }
  }

  private getEnvironmentSmtpSettings(): SmtpSettings | null {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ No SMTP configuration available (database or environment)')
      return null
    }

    console.log('📧 Using environment SMTP configuration as fallback')
    
    return {
      id: 'env-fallback',
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT || '465'),
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
      smtp_from_name: process.env.SMTP_FROM_NAME || 'IndexNow Pro',
      smtp_from_email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      smtp_secure: true,
      smtp_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private async initializeTransporter() {
    try {
      console.log('🔧 Initializing enhanced SMTP transporter...')
      
      const settings = await this.fetchSmtpSettings()
      
      if (!settings) {
        console.warn('⚠️ No SMTP settings available, email service disabled')
        this.transporter = null
        return
      }

      console.log(`📧 SMTP Config: ${settings.smtp_host}:${settings.smtp_port}`)
      console.log(`👤 SMTP User: ${settings.smtp_user}`)
      console.log(`🔒 SMTP Secure: ${settings.smtp_secure}`)

      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_secure, // true for 465, false for other ports like 587
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        },
        tls: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      })

      // Test the connection
      await this.transporter.verify()
      console.log('✅ Enhanced SMTP transporter initialized and verified successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced SMTP transporter:', error)
      this.transporter = null
    }
  }

  private async ensureTransporter() {
    if (!this.transporter) {
      console.log('🔄 Transporter not available, attempting to reinitialize...')
      await this.initializeTransporter()
    }
    
    if (!this.transporter) {
      throw new Error('SMTP transporter not available')
    }
  }

  private loadTemplate(templateName: string): string {
    try {
      const templatePath = path.join(process.cwd(), 'lib', 'email', 'templates', `${templateName}.html`)
      console.log(`📄 Loading email template from: ${templatePath}`)
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`)
      }

      const template = fs.readFileSync(templatePath, 'utf-8')
      console.log(`✅ Template loaded successfully (${template.length} characters)`)
      return template
    } catch (error) {
      console.error(`❌ Failed to load template '${templateName}':`, error)
      throw error
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    try {
      console.log('🔄 Rendering email template with data:', Object.keys(data))
      
      let rendered = template
      
      // Replace simple variables {{variable}}
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        rendered = rendered.replace(regex, String(value || ''))
      })

      // Handle conditional blocks {{#if variable}}...{{/if}}
      rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
        return data[variable] ? content : ''
      })

      console.log('✅ Template rendered successfully')
      return rendered
    } catch (error) {
      console.error('❌ Failed to render template:', error)
      throw error
    }
  }

  async sendBillingConfirmation(email: string, data: BillingConfirmationData): Promise<void> {
    try {
      console.log(`📤 Preparing to send billing confirmation email to: ${email}`)
      console.log('📊 Email data:', {
        customerName: data.customerName,
        orderId: data.orderId,
        packageName: data.packageName,
        amount: data.amount
      })

      await this.ensureTransporter()
      
      const settings = await this.fetchSmtpSettings()
      if (!settings) {
        throw new Error('SMTP settings not available')
      }

      // Load and render template
      const template = this.loadTemplate('billing-confirmation')
      const html = this.renderTemplate(template, data)

      const mailOptions = {
        from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
        to: email,
        subject: `Order Confirmation - ${data.orderId}`,
        html: html
      }

      console.log('📧 Sending billing confirmation email...')
      const result = await this.transporter!.sendMail(mailOptions)
      console.log('✅ Billing confirmation email sent successfully:', result.messageId)
      
    } catch (error) {
      console.error('❌ Failed to send billing confirmation email:', error)
      throw error
    }
  }

  async sendJobCompletionEmail(email: string, jobData: any): Promise<void> {
    try {
      console.log(`📤 Preparing to send job completion email to: ${email}`)

      await this.ensureTransporter()
      
      const settings = await this.fetchSmtpSettings()
      if (!settings) {
        throw new Error('SMTP settings not available')
      }

      // Load and render template
      const template = this.loadTemplate('job-completion')
      const html = this.renderTemplate(template, jobData)

      const mailOptions = {
        from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
        to: email,
        subject: `Job Completed - ${jobData.jobName || 'IndexNow Job'}`,
        html: html
      }

      console.log('📧 Sending job completion email...')
      const result = await this.transporter!.sendMail(mailOptions)
      console.log('✅ Job completion email sent successfully:', result.messageId)
      
    } catch (error) {
      console.error('❌ Failed to send job completion email:', error)
      throw error
    }
  }

  async sendJobFailureEmail(email: string, jobData: any): Promise<void> {
    try {
      console.log(`📤 Preparing to send job failure email to: ${email}`)

      await this.ensureTransporter()
      
      const settings = await this.fetchSmtpSettings()
      if (!settings) {
        throw new Error('SMTP settings not available')
      }

      // Load and render template
      const template = this.loadTemplate('job-failure')
      const html = this.renderTemplate(template, jobData)

      const mailOptions = {
        from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
        to: email,
        subject: `Job Failed - ${jobData.jobName || 'IndexNow Job'}`,
        html: html
      }

      console.log('📧 Sending job failure email...')
      const result = await this.transporter!.sendMail(mailOptions)
      console.log('✅ Job failure email sent successfully:', result.messageId)
      
    } catch (error) {
      console.error('❌ Failed to send job failure email:', error)
      throw error
    }
  }

  async sendQuotaAlertEmail(email: string, alertData: any): Promise<void> {
    try {
      console.log(`📤 Preparing to send quota alert email to: ${email}`)

      await this.ensureTransporter()
      
      const settings = await this.fetchSmtpSettings()
      if (!settings) {
        throw new Error('SMTP settings not available')
      }

      // Load and render template
      const template = this.loadTemplate('quota-alert')
      const html = this.renderTemplate(template, alertData)

      const mailOptions = {
        from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
        to: email,
        subject: `Quota Alert - ${alertData.alertLevel || 'Warning'}`,
        html: html
      }

      console.log('📧 Sending quota alert email...')
      const result = await this.transporter!.sendMail(mailOptions)
      console.log('✅ Quota alert email sent successfully:', result.messageId)
      
    } catch (error) {
      console.error('❌ Failed to send quota alert email:', error)
      throw error
    }
  }

  async sendTestEmail(email: string, testData: any = {}): Promise<void> {
    try {
      console.log(`📤 Preparing to send test email to: ${email}`)

      await this.ensureTransporter()
      
      const settings = await this.fetchSmtpSettings()
      if (!settings) {
        throw new Error('SMTP settings not available')
      }

      const defaultTestData = {
        recipientEmail: email,
        testTime: new Date().toLocaleString(),
        smtpHost: settings.smtp_host,
        smtpPort: settings.smtp_port,
        fromEmail: settings.smtp_from_email,
        ...testData
      }

      const mailOptions = {
        from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
        to: email,
        subject: 'IndexNow Pro - Email Test Successful',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Test</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #F7F9FC; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #3D8BFF; margin: 0 0 10px 0; font-size: 24px;">✅ Email Configuration Test</h1>
              <p style="margin: 0; color: #6C757D;">Your email configuration is working correctly!</p>
            </div>
            
            <div style="background: white; border: 1px solid #E0E6ED; border-radius: 8px; padding: 20px;">
              <h2 style="color: #1A1A1A; margin: 0 0 15px 0; font-size: 18px;">Configuration Details</h2>
              <ul style="margin: 0; padding-left: 20px; color: #6C757D;">
                <li><strong>SMTP Host:</strong> ${defaultTestData.smtpHost}</li>
                <li><strong>SMTP Port:</strong> ${defaultTestData.smtpPort}</li>
                <li><strong>From Address:</strong> ${defaultTestData.fromEmail}</li>
                <li><strong>Test Time:</strong> ${defaultTestData.testTime}</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; text-align: center; color: #6C757D; font-size: 12px;">
              <p>IndexNow Pro - Professional URL Indexing Platform</p>
            </div>
          </body>
          </html>
        `
      }

      console.log('📧 Sending test email...')
      const result = await this.transporter!.sendMail(mailOptions)
      console.log('✅ Test email sent successfully:', result.messageId)
      
    } catch (error) {
      console.error('❌ Failed to send test email:', error)
      throw error
    }
  }

  // Force refresh settings from database
  async refreshSettings(): Promise<void> {
    this.settingsLastFetched = 0
    this.currentSettings = null
    await this.initializeTransporter()
  }

  // Get current SMTP settings (for admin display)
  async getCurrentSettings(): Promise<SmtpSettings | null> {
    return await this.fetchSmtpSettings()
  }
}

// Singleton instance
export const enhancedEmailService = new EnhancedEmailService()