import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
}

// Admin email configuration
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yourcompany.com'
export const COMPANY_NAME = process.env.COMPANY_NAME || 'PDF Tools Pro'
export const COMPANY_LOGO = process.env.COMPANY_LOGO || 'https://your-domain.com/logo.png'
export const COMPANY_WEBSITE = process.env.COMPANY_WEBSITE || 'https://your-domain.com'

// Create transporter
export const createTransporter = () => {
  return nodemailer.createTransport(emailConfig)
}

// Verify transporter configuration
export const verifyEmailConnection = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ Email server connection verified')
    return true
  } catch (error) {
    console.error('❌ Email server connection failed:', error)
    return false
  }
}
