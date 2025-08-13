import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import { getPriceId } from "@/lib/stripe-config"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { newPlan } = await req.json()

    if (!newPlan) {
      return NextResponse.json({ error: "Plan not specified" }, { status: 400 })
    }

    // Get the price ID for the new plan
    let priceId: string
    try {
      priceId = getPriceId(newPlan)
    } catch (error) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
    }

    // Check if user is trying to change to the same plan
    if (user.subscriptionPlan === newPlan) {
      return NextResponse.json({ error: "You are already on this plan" }, { status: 400 })
    }

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)

    if (subscription.status !== 'active') {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 })
    }

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    })

    // Update user in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: newPlan,
        subscriptionStatus: updatedSubscription.status,
        subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: `Successfully changed plan to ${newPlan}`,
      newPlan: newPlan 
    })
  } catch (error) {
    console.error("Error changing plan:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
