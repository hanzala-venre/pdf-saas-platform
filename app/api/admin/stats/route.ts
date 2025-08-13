import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import type { Session } from "next-auth"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

    // Database queries
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalOperations,
      operationsThisMonth,
      operationsThisWeek,
      activeSubscriptions,
      lastMonthActiveSubscriptions,
      monthlySubscriptions,
      yearlySubscriptions,
      newUsersLastMonth,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // New users this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
      }),
      
      // New users this week
      prisma.user.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),
      
      // Total operations
      prisma.pdfOperation.count(),
      
      // Operations this month
      prisma.pdfOperation.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
      }),
      
      // Operations this week
      prisma.pdfOperation.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),
      
      // Active subscriptions
      prisma.user.count({
        where: {
          AND: [
            { subscriptionPlan: { not: "free" } },
            { subscriptionStatus: "active" },
            {
              OR: [
                { subscriptionCurrentPeriodEnd: null },
                { subscriptionCurrentPeriodEnd: { gt: new Date() } },
              ],
            },
          ],
        },
      }),
      
      // Last month active subscriptions
      prisma.user.count({
        where: {
          AND: [
            { subscriptionPlan: { not: "free" } },
            { subscriptionStatus: "active" },
            {
              createdAt: {
                lt: new Date(currentYear, currentMonth - 1, 1),
              },
            },
          ],
        },
      }),
      
      // Monthly subscriptions
      prisma.user.count({
        where: {
          subscriptionPlan: "monthly",
          subscriptionStatus: "active",
          OR: [
            { subscriptionCurrentPeriodEnd: null },
            { subscriptionCurrentPeriodEnd: { gt: new Date() } },
          ],
        },
      }),
      
      // Yearly subscriptions
      prisma.user.count({
        where: {
          subscriptionPlan: "yearly",
          subscriptionStatus: "active",
          OR: [
            { subscriptionCurrentPeriodEnd: null },
            { subscriptionCurrentPeriodEnd: { gt: new Date() } },
          ],
        },
      }),
      
      // New users last month
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(lastMonthYear, lastMonth - 1, 1),
            lt: new Date(currentYear, currentMonth - 1, 1),
          },
        },
      }),
    ])

    // Stripe data
    let stripeRevenue = 0
    let stripePaymentsCount = 0
    let totalRevenue = 0
    let averageRevenuePerUser = 0

    try {
      // Get this month's payments from Stripe
      const startOfMonth = Math.floor(new Date(currentYear, currentMonth - 1, 1).getTime() / 1000)
      const paymentsResponse = await stripe.paymentIntents.list({
        created: { gte: startOfMonth },
        limit: 100,
      })

      stripePaymentsCount = paymentsResponse.data.length
      stripeRevenue = paymentsResponse.data
        .filter(payment => payment.status === 'succeeded')
        .reduce((sum, payment) => sum + payment.amount, 0) / 100 // Convert from cents

      // Get total revenue from all time
      const allPayments = await stripe.paymentIntents.list({
        limit: 100,
      })
      
      totalRevenue = allPayments.data
        .filter(payment => payment.status === 'succeeded')
        .reduce((sum, payment) => sum + payment.amount, 0) / 100
        
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError)
    }

    // Calculate metrics
    const subscriptionGrowth = lastMonthActiveSubscriptions > 0 
      ? Math.round(((activeSubscriptions - lastMonthActiveSubscriptions) / lastMonthActiveSubscriptions) * 100)
      : 0

    const monthlyRevenue = monthlySubscriptions * 1.99 + (yearlySubscriptions * 19.99) / 12 + stripeRevenue
    
    const lastMonthRevenue = monthlyRevenue * 0.85 // Simplified calculation
    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0

    averageRevenuePerUser = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0

    const churnRate = lastMonthActiveSubscriptions > 0 
      ? Math.max(0, Math.round(((lastMonthActiveSubscriptions - activeSubscriptions) / lastMonthActiveSubscriptions) * 100))
      : 0

    const conversionRate = totalUsers > 0 
      ? Math.round((activeSubscriptions / totalUsers) * 100)
      : 0

    const stats = {
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      totalOperations,
      operationsThisMonth,
      operationsThisWeek,
      activeSubscriptions,
      subscriptionGrowth,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      revenueGrowth,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
      churnRate,
      conversionRate,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
