import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Determine if subscription should be cancelled at period end
    const now = new Date()
    const periodEnd = user.subscriptionCurrentPeriodEnd
    const isExpired = periodEnd && now > periodEnd
    
    // Check if subscription is set to cancel at period end (if we have Stripe subscription)
    let cancelAtPeriodEnd = false
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        cancelAtPeriodEnd = subscription.cancel_at_period_end || false
      } catch (error) {
        console.error("Error fetching Stripe subscription:", error)
        // Fall back to database status
        cancelAtPeriodEnd = user.subscriptionStatus === "canceled" && !isExpired
      }
    } else {
      cancelAtPeriodEnd = user.subscriptionStatus === "canceled" && !isExpired
    }
    
    // If subscription is expired, it should show as inactive
    const effectiveStatus = isExpired ? "inactive" : user.subscriptionStatus
    const effectivePlan = isExpired ? "free" : user.subscriptionPlan

    const subscriptionData = {
      plan: effectivePlan,
      status: effectiveStatus,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    }

    return NextResponse.json(subscriptionData)
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
