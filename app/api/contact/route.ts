import { NextRequest, NextResponse } from 'next/server'
import { createTransporter, ADMIN_EMAIL, COMPANY_NAME } from '@/lib/email-config'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json()
    const { name, email, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = createTransporter()

    // Email content for admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #495057; }
          .field-value { margin-top: 5px; padding: 10px; background-color: #f8f9fa; border-radius: 4px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 New Contact Form Submission</h2>
            <p>You have received a new message through the contact form on ${COMPANY_NAME}.</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="field-label">👤 Name:</div>
              <div class="field-value">${name}</div>
            </div>
            
            <div class="field">
              <div class="field-label">📧 Email:</div>
              <div class="field-value">${email}</div>
            </div>
            
            <div class="field">
              <div class="field-label">📋 Subject:</div>
              <div class="field-value">${subject}</div>
            </div>
            
            <div class="field">
              <div class="field-label">💬 Message:</div>
              <div class="field-value" style="white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This email was automatically generated from the contact form on your website.</p>
            <p>Reply directly to this email to respond to ${name} at ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Email content for user confirmation
    const userConfirmationHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message Received - ${COMPANY_NAME}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .content { background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #6c757d; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Message Received!</h1>
          </div>
          
          <div class="content">
            <p>Dear ${name},</p>
            
            <p>Thank you for contacting us! We have successfully received your message and will get back to you within 24 hours.</p>
            
            <h3>Your Message Summary:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${message}</p>
            
            <p>If you have any urgent questions, please don't hesitate to reach out to us directly at ${ADMIN_EMAIL}.</p>
            
            <p>Best regards,<br/>
            The ${COMPANY_NAME} Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated confirmation email. Please do not reply to this message.</p>
            <p>If you didn't send this message, please contact us immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email to admin
    const adminMailOptions = {
      from: `"${COMPANY_NAME} Contact Form" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      replyTo: email, // Allow admin to reply directly to the user
      subject: `[Contact Form] ${subject}`,
      html: adminEmailHtml,
      text: `
New contact form submission from ${COMPANY_NAME}

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Reply to this email to respond directly to the user.
      `
    }

    // Send confirmation email to user
    const userMailOptions = {
      from: `"${COMPANY_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `Message Received - ${COMPANY_NAME}`,
      html: userConfirmationHtml,
      text: `
Dear ${name},

Thank you for contacting ${COMPANY_NAME}! We have successfully received your message and will get back to you within 24 hours.

Your Message Summary:
Subject: ${subject}

Message:
${message}

If you have any urgent questions, please don't hesitate to reach out to us directly at ${ADMIN_EMAIL}.

Best regards,
The ${COMPANY_NAME} Team

---
This is an automated confirmation email. Please do not reply to this message.
      `
    }

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions)
    ])

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error sending contact form email:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
}
