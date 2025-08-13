import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { emailService } from "@/lib/email-service"
import { verifyEmailConnection } from "@/lib/email-config"
import type { Session } from "next-auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as Session | null

    // Only allow admins to test emails
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, data } = await request.json()

    switch (type) {
      case "payment": {
        await emailService.sendPaymentEmails({
          userName: data.userName || "Test User",
          userEmail: data.userEmail || session.user.email,
          planName: data.planName || "PRO",
          amount: data.amount || 2999, // $29.99
          currency: data.currency || "usd",
          transactionId: data.transactionId || "pi_test_1234567890",
          billingPeriod: data.billingPeriod || "Monthly"
        })
        break
      }

      case "upgrade": {
        await emailService.sendUpgradeEmails({
          userName: data.userName || "Test User",
          userEmail: data.userEmail || session.user.email,
          oldPlan: data.oldPlan || "FREE",
          newPlan: data.newPlan || "PRO"
        })
        break
      }

      case "cancellation": {
        await emailService.sendCancellationEmails({
          userName: data.userName || "Test User",
          userEmail: data.userEmail || session.user.email,
          planName: data.planName || "PRO",
          accessEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          subscriptionId: data.subscriptionId || "sub_test_1234567890"
        })
        break
      }

      case "planchange": {
        await emailService.sendPlanChangeEmails({
          userName: data.userName || "Test User",
          userEmail: data.userEmail || session.user.email,
          oldPlan: data.oldPlan || "PRO",
          newPlan: data.newPlan || "PREMIUM",
          effectiveDate: new Date().toLocaleDateString()
        })
        break
      }

      case "connection": {
        const isConnected = await verifyEmailConnection()
        return NextResponse.json({ 
          success: true, 
          connected: isConnected,
          message: isConnected ? "Email connection verified" : "Email connection failed"
        })
      }

      default:
        return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test ${type} email sent successfully` 
    })

  } catch (error) {
    console.error("Email test error:", error)
    return NextResponse.json({ 
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    // Only allow admins to check email status
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isConnected = await verifyEmailConnection()
    
    return NextResponse.json({
      connected: isConnected,
      config: {
        host: process.env.SMTP_HOST || "Not configured",
        port: process.env.SMTP_PORT || "Not configured",
        user: process.env.SMTP_USER ? "Configured" : "Not configured",
        adminEmail: process.env.ADMIN_EMAIL || "Not configured"
      }
    })

  } catch (error) {
    console.error("Email status check error:", error)
    return NextResponse.json({ 
      error: "Failed to check email status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
