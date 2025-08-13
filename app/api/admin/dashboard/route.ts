import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import type { Session } from "next-auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null

    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Get recent users (last 10)
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        createdAt: true,
        _count: {
          select: {
            pdfOperations: true,
          },
        },
      },
    })

    // Get recent operations (last 10)
    const recentOperations = await prisma.pdfOperation.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        fileName: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Get recent Stripe payments
    let recentPayments: any[] = []
    try {
      const paymentsResponse = await stripe.paymentIntents.list({
        limit: 10,
        expand: ["data.customer"],
      })

      recentPayments = paymentsResponse.data.map(payment => ({
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency.toUpperCase(),
        status: payment.status,
        customerId: payment.customer as string,
        customerEmail: (payment.customer as Stripe.Customer)?.email || "N/A",
        customerName: (payment.customer as Stripe.Customer)?.name || null,
        description: payment.description || "Payment",
        created: payment.created,
      }))
    } catch (stripeError) {
      console.error("Error fetching recent payments:", stripeError)
    }

    // Get revenue data for the last 30 days
    const revenueData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Get operations count for that day
      const operationsCount = await prisma.pdfOperation.count({
        where: {
          createdAt: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      })

      // Get subscriptions created that day
      const subscriptionsCount = await prisma.user.count({
        where: {
          subscriptionPlan: { not: "free" },
          createdAt: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      })

      revenueData.push({
        date: dateStr,
        amount: subscriptionsCount * 1.99, // Simplified calculation
        subscriptions: subscriptionsCount,
        oneTimePayments: 0, // This would need Stripe webhook data
      })
    }

    // Format the response data
    const formattedRecentUsers = recentUsers.map(user => ({
      ...user,
      subscription: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      createdAt: user.createdAt.toISOString(),
    }))

    const formattedRecentOperations = recentOperations.map(operation => ({
      ...operation,
      createdAt: operation.createdAt.toISOString(),
    }))

    return NextResponse.json({
      recentUsers: formattedRecentUsers,
      recentOperations: formattedRecentOperations,
      recentPayments,
      revenueData,
    })

  } catch (error) {
    console.error("Error fetching admin dashboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
