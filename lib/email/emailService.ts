import * as fs from 'fs'
import * as path from 'path'
import * as nodemailer from 'nodemailer'

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

export class EmailService {
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.initializeTransporter()
  }

  private async initializeTransporter() {
    try {
      console.log('🔧 Initializing SMTP transporter...')
      
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP configuration incomplete, email service disabled')
        return
      }

      console.log(`📧 SMTP Config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '587'}`)
      console.log(`👤 SMTP User: ${process.env.SMTP_USER}`)

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })

      // Test the connection
      await this.transporter.verify()
      console.log('✅ SMTP transporter initialized and verified successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error)
      this.transporter = null
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

      if (!this.transporter) {
        console.log('🔄 Transporter not initialized, attempting to reinitialize...')
        await this.initializeTransporter()
        
        if (!this.transporter) {
          throw new Error('SMTP transporter not available')
        }
      }

      // Load and render template
      const templateHtml = this.loadTemplate('billing-confirmation')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Pro'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Confirmation - ${data.packageName} Subscription`,
        html: renderedHtml
      }

      console.log('📬 Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        htmlLength: renderedHtml.length
      })

      const result = await this.transporter.sendMail(mailOptions)
      
      console.log('✅ Billing confirmation email sent successfully!')
      console.log('📨 Email result:', {
        messageId: result.messageId,
        response: result.response
      })

    } catch (error) {
      console.error('❌ Failed to send billing confirmation email:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initializeTransporter()
      }

      if (!this.transporter) {
        return false
      }

      await this.transporter.verify()
      console.log('✅ SMTP connection test successful')
      return true
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()