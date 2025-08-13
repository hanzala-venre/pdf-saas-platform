import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Session } from "next-auth"

export interface WatermarkFreeStatus {
  hasWatermarkFreeAccess: boolean
  isPaidUser: boolean
  hasOneTimeAccess: boolean
  accessType: 'subscription' | 'oneTime' | 'free'
  userId?: string
}

/**
 * Check if user has watermark-free access (either through subscription or one-time payment)
 * This function handles both logged-in users and guests with one-time access
 */
export async function checkWatermarkFreeAccess(request: NextRequest): Promise<WatermarkFreeStatus> {
  const session = await getServerSession(authOptions) as Session | null
  
  // Check for one-time access from request headers (set by frontend)
  const oneTimeAccess = request.headers.get('x-one-time-access') === 'true'
  
  if (!session?.user?.email) {
    // Guest user - only check one-time access
    return {
      hasWatermarkFreeAccess: oneTimeAccess,
      isPaidUser: false,
      hasOneTimeAccess: oneTimeAccess,
      accessType: oneTimeAccess ? 'oneTime' : 'free'
    }
  }

  // Logged-in user - check subscription first
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    })

    if (!user) {
      return {
        hasWatermarkFreeAccess: oneTimeAccess,
        isPaidUser: false,
        hasOneTimeAccess: oneTimeAccess,
        accessType: oneTimeAccess ? 'oneTime' : 'free'
      }
    }

    // Check if subscription is expired
    const now = new Date()
    const isExpired = user.subscriptionCurrentPeriodEnd && now > user.subscriptionCurrentPeriodEnd
    const effectivePlan = isExpired ? "free" : user.subscriptionPlan
    const isPaidUser = effectivePlan === "monthly" || effectivePlan === "yearly"

    // Determine access type and status
    let hasWatermarkFreeAccess = false
    let accessType: 'subscription' | 'oneTime' | 'free' = 'free'

    if (isPaidUser) {
      hasWatermarkFreeAccess = true
      accessType = 'subscription'
    } else if (oneTimeAccess) {
      hasWatermarkFreeAccess = true
      accessType = 'oneTime'
    }

    return {
      hasWatermarkFreeAccess,
      isPaidUser,
      hasOneTimeAccess: oneTimeAccess,
      accessType,
      userId: user.id
    }
  } catch (error) {
    console.error('Error checking watermark-free access:', error)
    return {
      hasWatermarkFreeAccess: oneTimeAccess,
      isPaidUser: false,
      hasOneTimeAccess: oneTimeAccess,
      accessType: oneTimeAccess ? 'oneTime' : 'free'
    }
  }
}

/**
 * Check usage limits for free users
 */
export async function checkUsageLimits(userId: string): Promise<{ canUse: boolean; operationsUsed: number; limit: number }> {
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const operationsThisMonth = await prisma.pdfOperation.count({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    })

    const limit = 5 // Free users get 5 operations per month
    return {
      canUse: operationsThisMonth < limit,
      operationsUsed: operationsThisMonth,
      limit
    }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return { canUse: false, operationsUsed: 0, limit: 5 }
  }
}
