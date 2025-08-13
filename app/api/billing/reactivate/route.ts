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
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 })
    }

    // Reactivate the Stripe subscription (remove cancel_at_period_end)
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    // Update user subscription status
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        subscriptionStatus: "active",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reactivating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
