import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session?.user?.email) {
      return NextResponse.json({ 
        isAuthenticated: false,
        isAdmin: false,
        hasUnlimitedAccess: false,
        accessType: 'guest',
        plan: 'free'
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json({ 
        isAuthenticated: true,
        isAdmin: false,
        hasUnlimitedAccess: false,
        accessType: 'free',
        plan: 'free'
      })
    }

    const isAdmin = user.role === "ADMIN"
    const now = new Date()
    const isExpired = user.subscriptionCurrentPeriodEnd && now > user.subscriptionCurrentPeriodEnd
    const effectivePlan = isExpired ? "free" : user.subscriptionPlan
    const isPaidUser = effectivePlan === "monthly" || effectivePlan === "yearly"
    
    // Determine access type
    let accessType = 'free'
    let hasUnlimitedAccess = false
    
    if (isAdmin) {
      accessType = 'admin'
      hasUnlimitedAccess = true
    } else if (isPaidUser && !isExpired) {
      accessType = 'subscription'
      hasUnlimitedAccess = true
    }

    return NextResponse.json({
      isAuthenticated: true,
      isAdmin,
      hasUnlimitedAccess,
      accessType,
      plan: isAdmin ? 'pro' : effectivePlan, // Show pro plan for admins
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionCurrentPeriodEnd?.toISOString() || null,
    })
  } catch (error) {
    console.error("Error fetching user access info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
