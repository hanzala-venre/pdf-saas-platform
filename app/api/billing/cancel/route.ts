import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        stripeSubscriptionId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user has an active subscription, cancel it
    if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
      try {
        const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        })

        // Update user in database
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: "active", // Keep active until period end
          },
        })

        return NextResponse.json({
          success: true,
          message: "Subscription will be cancelled at the end of the current billing period.",
          cancelAt: new Date(subscription.current_period_end * 1000).toISOString(),
        })
      } catch (error) {
        console.error("Error cancelling subscription:", error)
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
      }
    } else {
      // User is already on free plan or has no subscription
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: "free",
          subscriptionStatus: "inactive",
          stripeSubscriptionId: null,
          subscriptionCurrentPeriodEnd: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: "You are now on the free plan.",
      })
    }
  } catch (error) {
    console.error("Error in cancel endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle GET requests by redirecting to POST (for link clicks)
export async function GET() {
  return POST()
}
