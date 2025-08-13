import { createTransporter, ADMIN_EMAIL, COMPANY_NAME } from './email-config'
import {
  getPaymentConfirmationTemplate,
  getPlanUpgradeTemplate,
  getAdminPaymentNotificationTemplate,
  getAdminUpgradeNotificationTemplate,
  getCancellationConfirmationTemplate,
  getPlanChangeTemplate,
  getAdminSubscriptionNotificationTemplate
} from './email-templates'

interface PaymentEmailData {
  userName: string
  userEmail: string
  planName: string
  amount: number
  currency: string
  transactionId: string
  billingPeriod: string
}

interface UpgradeEmailData {
  userName: string
  userEmail: string
  oldPlan: string
  newPlan: string
}

export class EmailService {
  private transporter

  constructor() {
    this.transporter = createTransporter()
  }

  // Send payment confirmation email to user
  async sendPaymentConfirmationEmail(data: PaymentEmailData) {
    try {
      const htmlContent = getPaymentConfirmationTemplate(
        data.userName,
        data.planName,
        data.amount,
        data.currency,
        data.transactionId,
        data.billingPeriod
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject: `Payment Confirmation - ${data.planName} Plan Activated`,
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Payment confirmation email sent to user:', data.userEmail)
      return result
    } catch (error) {
      console.error('❌ Error sending payment confirmation email:', error)
      throw error
    }
  }

  // Send payment notification to admin
  async sendPaymentNotificationToAdmin(data: PaymentEmailData) {
    try {
      const htmlContent = getAdminPaymentNotificationTemplate(
        data.userName,
        data.userEmail,
        data.planName,
        data.amount,
        data.currency,
        data.transactionId
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `💰 New Payment: ${data.currency.toUpperCase()} ${(data.amount / 100).toFixed(2)} - ${data.planName}`,
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Payment notification sent to admin:', ADMIN_EMAIL)
      return result
    } catch (error) {
      console.error('❌ Error sending admin payment notification:', error)
      throw error
    }
  }

  // Send plan upgrade confirmation to user
  async sendPlanUpgradeEmail(data: UpgradeEmailData) {
    try {
      const htmlContent = getPlanUpgradeTemplate(
        data.userName,
        data.oldPlan,
        data.newPlan,
        new Date().toLocaleDateString()
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject: `Plan Upgraded - Welcome to ${data.newPlan}!`,
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Plan upgrade email sent to user:', data.userEmail)
      return result
    } catch (error) {
      console.error('❌ Error sending plan upgrade email:', error)
      throw error
    }
  }

  // Send plan upgrade notification to admin
  async sendUpgradeNotificationToAdmin(data: UpgradeEmailData) {
    try {
      const htmlContent = getAdminUpgradeNotificationTemplate(
        data.userName,
        data.userEmail,
        data.oldPlan,
        data.newPlan
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `📈 Plan Upgrade: ${data.userName} upgraded to ${data.newPlan}`,
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Upgrade notification sent to admin:', ADMIN_EMAIL)
      return result
    } catch (error) {
      console.error('❌ Error sending admin upgrade notification:', error)
      throw error
    }
  }

  // Send both user and admin emails for payment
  async sendPaymentEmails(data: PaymentEmailData) {
    const promises = [
      this.sendPaymentConfirmationEmail(data),
      this.sendPaymentNotificationToAdmin(data)
    ]

    try {
      await Promise.all(promises)
      console.log('✅ All payment emails sent successfully')
    } catch (error) {
      console.error('❌ Error sending payment emails:', error)
      // Don't throw here, as we want to continue even if one email fails
    }
  }

  // Send both user and admin emails for upgrade
  async sendUpgradeEmails(data: UpgradeEmailData) {
    const promises = [
      this.sendPlanUpgradeEmail(data),
      this.sendUpgradeNotificationToAdmin(data)
    ]

    try {
      await Promise.all(promises)
      console.log('✅ All upgrade emails sent successfully')
    } catch (error) {
      console.error('❌ Error sending upgrade emails:', error)
      // Don't throw here, as we want to continue even if one email fails
    }
  }

  // Generate plain text version of HTML email (basic implementation)
  private generateTextVersion(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('❌ Email connection test failed:', error)
      return false
    }
  }

  // Send cancellation confirmation to user
  async sendCancellationEmail(data: {
    userName: string
    userEmail: string
    planName: string
    accessEndDate: Date
    subscriptionId: string
  }) {
    try {
      const htmlContent = getCancellationConfirmationTemplate(
        data.userName,
        data.planName,
        data.accessEndDate,
        data.subscriptionId
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject: 'Subscription Canceled - We Hope to See You Again',
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Cancellation email sent to:', data.userEmail)
      return result
    } catch (error) {
      console.error('❌ Error sending cancellation email:', error)
      throw error
    }
  }

  // Send plan change notification to user
  async sendPlanChangeEmail(data: {
    userName: string
    userEmail: string
    oldPlan: string
    newPlan: string
    effectiveDate: string
  }) {
    try {
      const htmlContent = getPlanChangeTemplate(
        data.userName,
        data.oldPlan,
        data.newPlan,
        data.effectiveDate
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: data.userEmail,
        subject: 'Plan Updated Successfully - Welcome to Enhanced Features',
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Plan change email sent to:', data.userEmail)
      return result
    } catch (error) {
      console.error('❌ Error sending plan change email:', error)
      throw error
    }
  }

  // Send admin notification for any subscription event
  async sendAdminSubscriptionNotification(data: {
    eventType: string
    userName: string
    userEmail: string
    planDetails: string
    eventDate: string
  }) {
    try {
      const htmlContent = getAdminSubscriptionNotificationTemplate(
        data.eventType,
        data.userName,
        data.userEmail,
        data.planDetails,
        data.eventDate
      )

      const mailOptions = {
        from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: ADMIN_EMAIL,
        subject: `[Admin Alert] ${data.eventType} - ${data.userName}`,
        html: htmlContent,
        text: this.generateTextVersion(htmlContent)
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Admin subscription notification sent:', ADMIN_EMAIL)
      return result
    } catch (error) {
      console.error('❌ Error sending admin subscription notification:', error)
      throw error
    }
  }

  // Send both user and admin emails for cancellation
  async sendCancellationEmails(data: {
    userName: string
    userEmail: string
    planName: string
    accessEndDate: Date
    subscriptionId: string
  }) {
    const promises = [
      this.sendCancellationEmail(data),
      this.sendAdminSubscriptionNotification({
        eventType: 'Subscription Canceled',
        userName: data.userName,
        userEmail: data.userEmail,
        planDetails: `Plan: ${data.planName}, Access until: ${data.accessEndDate.toLocaleDateString()}`,
        eventDate: new Date().toLocaleDateString()
      })
    ]

    try {
      await Promise.all(promises)
      console.log('✅ All cancellation emails sent successfully')
    } catch (error) {
      console.error('❌ Error sending cancellation emails:', error)
    }
  }

  // Send both user and admin emails for plan change
  async sendPlanChangeEmails(data: {
    userName: string
    userEmail: string
    oldPlan: string
    newPlan: string
    effectiveDate: string
  }) {
    const promises = [
      this.sendPlanChangeEmail(data),
      this.sendAdminSubscriptionNotification({
        eventType: 'Plan Changed',
        userName: data.userName,
        userEmail: data.userEmail,
        planDetails: `Changed from ${data.oldPlan} to ${data.newPlan}`,
        eventDate: data.effectiveDate
      })
    ]

    try {
      await Promise.all(promises)
      console.log('✅ All plan change emails sent successfully')
    } catch (error) {
      console.error('❌ Error sending plan change emails:', error)
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()
