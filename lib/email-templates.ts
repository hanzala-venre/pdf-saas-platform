import { COMPANY_NAME, COMPANY_LOGO, COMPANY_WEBSITE } from './email-config'

// Base email template with styling
export const getBaseEmailTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .logo { width: 60px; height: 60px; margin: 0 auto 20px; background-color: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .content h2 { color: #2d3748; font-size: 24px; margin-bottom: 20px; }
        .content p { color: #4a5568; font-size: 16px; margin-bottom: 16px; }
        .content ul { color: #4a5568; margin: 16px 0; padding-left: 20px; }
        .content li { margin-bottom: 8px; }
        .highlight { background-color: #edf2f7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
        .highlight h3 { color: #2d3748; font-size: 18px; margin-bottom: 10px; }
        .highlight p { color: #4a5568; margin: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; transition: all 0.3s ease; }
        .button:hover { transform: translateY(-1px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); }
        .footer { background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #718096; font-size: 14px; margin-bottom: 10px; }
        .footer a { color: #667eea; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .social-links { margin: 20px 0; }
        .social-links a { color: #718096; text-decoration: none; margin: 0 10px; font-size: 14px; }
        @media (max-width: 600px) {
            .email-container { margin: 0; border-radius: 0; }
            .header, .content, .footer { padding: 20px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">📄</div>
            <h1>${COMPANY_NAME}</h1>
            <p>Professional PDF Tools & Services</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            <p>Need help? <a href="mailto:support@${COMPANY_WEBSITE.replace('https://', '').replace('http://', '')}">Contact Support</a></p>
            <div class="social-links">
                <a href="${COMPANY_WEBSITE}">Visit Website</a> |
                <a href="${COMPANY_WEBSITE}/privacy">Privacy Policy</a> |
                <a href="${COMPANY_WEBSITE}/terms">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>
`

// Payment confirmation email for user
export const getPaymentConfirmationTemplate = (
  userName: string,
  planName: string,
  amount: number,
  currency: string,
  transactionId: string,
  billingPeriod: string
) => {
  const content = `
    <h2>Payment Confirmed! 🎉</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for your payment! Your subscription has been successfully activated.</p>
    
    <div class="highlight">
        <h3>Payment Details</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Amount:</strong> ${currency.toUpperCase()} ${(amount / 100).toFixed(2)}</p>
        <p><strong>Billing Period:</strong> ${billingPeriod}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <p>Your account has been upgraded and you now have access to:</p>
    <ul>
        <li>Unlimited PDF operations</li>
        <li>Priority processing</li>
        <li>Advanced PDF tools</li>
        <li>24/7 premium support</li>
        <li>No watermarks on processed files</li>
    </ul>
    
    <p>Start using your premium features right away!</p>
    <a href="${COMPANY_WEBSITE}/dashboard" class="button">Go to Dashboard</a>
    
    <p>If you have any questions about your subscription or need assistance, please don't hesitate to contact our support team.</p>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `
  
  return getBaseEmailTemplate(content, 'Payment Confirmation')
}

// Plan upgrade notification for user
export const getPlanUpgradeTemplate = (
  userName: string,
  oldPlan: string,
  newPlan: string,
  upgradeDate: string
) => {
  const content = `
    <h2>Plan Successfully Upgraded! ⬆️</h2>
    <p>Hi ${userName},</p>
    <p>Congratulations! Your subscription plan has been successfully upgraded.</p>
    
    <div class="highlight">
        <h3>Upgrade Details</h3>
        <p><strong>Previous Plan:</strong> ${oldPlan}</p>
        <p><strong>New Plan:</strong> ${newPlan}</p>
        <p><strong>Upgrade Date:</strong> ${upgradeDate}</p>
        <p><strong>Status:</strong> Active</p>
    </div>
    
    <p>You now have access to enhanced features including:</p>
    <ul>
        <li>Increased processing limits</li>
        <li>Advanced PDF editing tools</li>
        <li>Priority customer support</li>
        <li>Batch processing capabilities</li>
    </ul>
    
    <a href="${COMPANY_WEBSITE}/dashboard" class="button">Explore New Features</a>
    
    <p>Thank you for choosing ${COMPANY_NAME} for your PDF processing needs!</p>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `
  
  return getBaseEmailTemplate(content, 'Plan Upgrade Confirmation')
}

// Admin notification for new payment
export const getAdminPaymentNotificationTemplate = (
  userName: string,
  userEmail: string,
  planName: string,
  amount: number,
  currency: string,
  transactionId: string
) => {
  const content = `
    <h2>💰 New Payment Received</h2>
    <p>A new payment has been processed on ${COMPANY_NAME}.</p>
    
    <div class="highlight">
        <h3>Payment Information</h3>
        <p><strong>Customer:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Amount:</strong> ${currency.toUpperCase()} ${(amount / 100).toFixed(2)}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <p>The customer's account has been automatically upgraded and they now have access to premium features.</p>
    
    <a href="${COMPANY_WEBSITE}/admin" class="button">View Admin Dashboard</a>
    
    <p>This is an automated notification from your payment system.</p>
  `
  
  return getBaseEmailTemplate(content, 'New Payment Received')
}

// Admin notification for plan upgrade
export const getAdminUpgradeNotificationTemplate = (
  userName: string,
  userEmail: string,
  oldPlan: string,
  newPlan: string
) => {
  const content = `
    <h2>📈 Plan Upgrade Alert</h2>
    <p>A user has upgraded their subscription plan on ${COMPANY_NAME}.</p>
    
    <div class="highlight">
        <h3>Upgrade Information</h3>
        <p><strong>Customer:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Previous Plan:</strong> ${oldPlan}</p>
        <p><strong>New Plan:</strong> ${newPlan}</p>
        <p><strong>Upgrade Date:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <p>The customer now has access to enhanced features and increased limits.</p>
    
    <a href="${COMPANY_WEBSITE}/admin/users" class="button">View User Details</a>
    
    <p>This is an automated notification from your subscription management system.</p>
  `
  
  return getBaseEmailTemplate(content, 'Plan Upgrade Notification')
}

// Cancellation confirmation email for user
export const getCancellationConfirmationTemplate = (
  userName: string,
  planName: string,
  accessEndDate: Date,
  subscriptionId: string
) => {
  const content = `
    <h2>Subscription Canceled 😢</h2>
    <p>Hi ${userName},</p>
    <p>We're sorry to see you go! Your subscription cancellation has been processed successfully.</p>
    
    <div class="highlight">
        <h3>Cancellation Details</h3>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Access Until:</strong> ${accessEndDate.toLocaleDateString()}</p>
        <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
        <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <p>Important information about your cancellation:</p>
    <ul>
        <li>Your access will continue until ${accessEndDate.toLocaleDateString()}</li>
        <li>No further charges will be applied</li>
        <li>Your data will be preserved for 30 days</li>
        <li>You can reactivate your subscription at any time</li>
    </ul>
    
    <p>We'd love to hear your feedback about your experience.</p>
    <a href="${COMPANY_WEBSITE}/pricing" class="button">Reactivate Subscription</a>
    
    <p>Thank you for being a valued customer. We hope to see you again soon!</p>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `
  
  return getBaseEmailTemplate(content, 'Subscription Canceled')
}

// Plan change notification for user
export const getPlanChangeTemplate = (
  userName: string,
  oldPlan: string,
  newPlan: string,
  effectiveDate: string
) => {
  const content = `
    <h2>Plan Updated Successfully! 🔄</h2>
    <p>Hi ${userName},</p>
    <p>Your subscription plan has been successfully updated.</p>
    
    <div class="highlight">
        <h3>Plan Change Details</h3>
        <p><strong>Previous Plan:</strong> ${oldPlan}</p>
        <p><strong>New Plan:</strong> ${newPlan}</p>
        <p><strong>Effective Date:</strong> ${effectiveDate}</p>
    </div>
    
    <p>Your new plan includes enhanced features and benefits:</p>
    <ul>
        <li>Increased processing limits</li>
        <li>Priority customer support</li>
        <li>Advanced PDF editing tools</li>
        <li>Enhanced security features</li>
        <li>Additional cloud storage</li>
    </ul>
    
    <a href="${COMPANY_WEBSITE}/dashboard" class="button">Explore New Features</a>
    
    <p>Thank you for staying with ${COMPANY_NAME}!</p>
    
    <p>Best regards,<br>The ${COMPANY_NAME} Team</p>
  `
  
  return getBaseEmailTemplate(content, 'Plan Updated')
}

// Admin notification for subscription events
export const getAdminSubscriptionNotificationTemplate = (
  eventType: string,
  userName: string,
  userEmail: string,
  planDetails: string,
  eventDate: string
) => {
  const content = `
    <h2>Subscription Event: ${eventType} 🔔</h2>
    <p>A subscription event has occurred on ${COMPANY_NAME}.</p>
    
    <div class="highlight">
        <h3>Event Details</h3>
        <p><strong>Event:</strong> ${eventType}</p>
        <p><strong>Customer:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Plan Details:</strong> ${planDetails}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
    </div>
    
    <a href="${COMPANY_WEBSITE}/admin/users" class="button">View Customer Details</a>
    
    <p>This is an automated notification from your subscription management system.</p>
  `
  
  return getBaseEmailTemplate(content, `Admin Alert: ${eventType}`)
}
