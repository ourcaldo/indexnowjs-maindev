/**
 * Login Notification Email Service
 * Sends security notifications when users log into their accounts
 */

import { supabaseAdmin } from '@/lib/supabase'
import * as nodemailer from 'nodemailer'
import * as fs from 'fs'
import * as path from 'path'

interface LoginNotificationData {
  userId: string
  userEmail: string
  userName: string
  ipAddress: string
  userAgent: string
  deviceInfo?: Record<string, any>
  locationData?: Record<string, any>
  loginTime: string
}

export class LoginNotificationService {
  private static instance: LoginNotificationService
  
  private constructor() {}
  
  public static getInstance(): LoginNotificationService {
    if (!LoginNotificationService.instance) {
      LoginNotificationService.instance = new LoginNotificationService()
    }
    return LoginNotificationService.instance
  }

  /**
   * Send login notification email
   */
  async sendLoginNotification(data: LoginNotificationData): Promise<boolean> {
    try {
      console.log('🔐 Preparing to send login notification email...')

      // Get SMTP configuration from site settings
      const smtpConfig = await this.getEmailConfiguration()
      if (!smtpConfig.enabled) {
        console.log('📧 Email notifications disabled, skipping login notification')
        return false
      }

      // Load and process email template
      const emailHtml = await this.prepareEmailTemplate(data)
      if (!emailHtml) {
        console.error('❌ Failed to prepare email template')
        return false
      }

      // Create transporter
      const transporter = await this.createTransporter(smtpConfig)
      if (!transporter) {
        console.error('❌ Failed to create email transporter')
        return false
      }

      // Send email
      const mailOptions = {
        from: `${smtpConfig.fromName} <${smtpConfig.fromEmail}>`,
        to: data.userEmail,
        subject: 'Security Alert: New Login to Your IndexNow Pro Account',
        html: emailHtml
      }

      await transporter.sendMail(mailOptions)
      console.log('✅ Login notification email sent successfully to:', data.userEmail)
      return true

    } catch (error) {
      console.error('❌ Failed to send login notification email:', error)
      return false
    }
  }

  /**
   * Get email configuration from site settings
   */
  private async getEmailConfiguration() {
    try {
      console.log('🔄 Fetching SMTP settings from database...')
      
      const { data: settings, error } = await supabaseAdmin
        .from('indb_site_settings')
        .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_secure, smtp_enabled, id, created_at, updated_at')
        .single()

      if (error) {
        console.error('❌ Database error fetching SMTP settings:', error)
        return this.getFallbackEmailConfiguration()
      }

      if (!settings?.smtp_enabled) {
        console.log('📧 SMTP disabled in database settings')
        return { enabled: false }
      }

      console.log('✅ SMTP settings retrieved from database')
      return {
        enabled: true,
        host: settings.smtp_host,
        port: settings.smtp_port || 465,
        user: settings.smtp_user,
        pass: settings.smtp_pass,
        secure: settings.smtp_secure !== false,
        fromName: settings.smtp_from_name || 'IndexNow Pro',
        fromEmail: settings.smtp_from_email
      }

    } catch (error) {
      console.error('❌ Error fetching email configuration:', error)
      return this.getFallbackEmailConfiguration()
    }
  }

  /**
   * Fallback to environment variables if database settings unavailable
   */
  private getFallbackEmailConfiguration() {
    console.log('🔄 Using fallback environment variable SMTP settings...')
    
    const host = process.env.SMTP_HOST
    const user = process.env.SMTP_USER
    
    if (!host || !user) {
      console.log('❌ No SMTP configuration available (database or environment)')
      return { enabled: false }
    }

    return {
      enabled: true,
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      secure: process.env.SMTP_SECURE !== 'false',
      fromName: process.env.SMTP_FROM_NAME || 'IndexNow Pro',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
    }
  }

  /**
   * Create email transporter
   */
  private async createTransporter(config: any) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      // Verify the connection
      await transporter.verify()
      console.log('✅ SMTP transporter created and verified')
      return transporter

    } catch (error) {
      console.error('❌ SMTP transporter verification failed:', error)
      return null
    }
  }

  /**
   * Prepare email template with user data
   */
  private async prepareEmailTemplate(data: LoginNotificationData): Promise<string | null> {
    try {
      const templatePath = path.join(process.cwd(), 'lib', 'email', 'templates', 'login-notification.html')
      let template = fs.readFileSync(templatePath, 'utf8')

      // Extract device information
      const deviceInfo = data.deviceInfo || {}
      const locationData = data.locationData || {}

      // Format location
      const location = this.formatLocation(locationData)
      
      // Format device info
      const deviceType = deviceInfo.deviceType || 'Unknown Device'
      const browser = `${deviceInfo.browserName || 'Unknown'} ${deviceInfo.browserVersion || ''}`.trim()
      const operatingSystem = `${deviceInfo.osName || 'Unknown'} ${deviceInfo.osVersion || ''}`.trim()
      
      // Determine security risk level
      const securityRisk = this.getSecurityRiskLevel(data.ipAddress, deviceInfo, locationData)

      // Format dates
      const loginTime = new Date(data.loginTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })

      const notificationTime = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })

      // Replace template variables
      const replacements = {
        '{{userName}}': data.userName || data.userEmail.split('@')[0],
        '{{userEmail}}': data.userEmail,
        '{{loginTime}}': loginTime,
        '{{ipAddress}}': data.ipAddress || 'Unknown',
        '{{location}}': location,
        '{{deviceType}}': deviceType,
        '{{browser}}': browser,
        '{{operatingSystem}}': operatingSystem,
        '{{securityRisk}}': securityRisk,
        '{{notificationTime}}': notificationTime,
        '{{secureAccountUrl}}': `${process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.pro'}/forgot-password`
      }

      // Apply replacements
      for (const [placeholder, value] of Object.entries(replacements)) {
        template = template.replace(new RegExp(placeholder, 'g'), value)
      }

      return template

    } catch (error) {
      console.error('❌ Error preparing email template:', error)
      return null
    }
  }

  /**
   * Format location data for display
   */
  private formatLocation(locationData: Record<string, any>): string {
    if (!locationData || Object.keys(locationData).length === 0) {
      return 'Unknown Location'
    }

    const parts = []
    
    if (locationData.city) parts.push(locationData.city)
    if (locationData.region || locationData.state) parts.push(locationData.region || locationData.state)
    if (locationData.country) parts.push(locationData.country)

    return parts.length > 0 ? parts.join(', ') : 'Unknown Location'
  }

  /**
   * Determine security risk level
   */
  private getSecurityRiskLevel(ipAddress: string, deviceInfo: Record<string, any>, locationData: Record<string, any>): string {
    // Simple risk assessment logic
    let riskScore = 0

    // Check for suspicious patterns
    if (!locationData.country) riskScore += 1
    if (deviceInfo.deviceType === 'Unknown') riskScore += 1
    if (!deviceInfo.browserName) riskScore += 1

    // Check for common suspicious indicators
    if (ipAddress?.includes('127.0.0.1') || ipAddress?.includes('localhost')) {
      return 'Low Risk (Local)'
    }

    if (riskScore >= 2) {
      return 'Medium Risk'
    } else if (riskScore === 1) {
      return 'Low Risk'
    } else {
      return 'Very Low Risk'
    }
  }
}

export const loginNotificationService = LoginNotificationService.getInstance()