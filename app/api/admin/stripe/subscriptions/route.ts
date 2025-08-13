import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Stripe from "stripe"
import type { Session } from "next-auth"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status") // active, canceled, etc.
    const startingAfter = searchParams.get("starting_after")

    const params: Stripe.SubscriptionListParams = {
      limit,
      expand: ["data.customer", "data.items.data.price"],
    }

    if (status) {
      params.status = status as Stripe.SubscriptionListParams.Status
    }

    if (startingAfter) {
      params.starting_after = startingAfter
    }

    const subscriptions = await stripe.subscriptions.list(params)

    const formattedSubscriptions = subscriptions.data.map(subscription => {
      const customer = subscription.customer as Stripe.Customer
      const price = subscription.items.data[0]?.price
      
      return {
        id: subscription.id,
        customerId: customer.id,
        customerEmail: customer.email || "N/A",
        customerName: customer.name || null,
        status: subscription.status,
        planName: price?.nickname || `${price?.unit_amount ? price.unit_amount / 100 : 0} ${price?.currency?.toUpperCase() || ''} / ${price?.recurring?.interval || ''}`,
        planAmount: price?.unit_amount ? price.unit_amount / 100 : 0,
        interval: price?.recurring?.interval || "month",
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        created: subscription.created,
      }
    })

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      hasMore: subscriptions.has_more,
    })

  } catch (error) {
    console.error("Error fetching Stripe subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}

// Cancel a subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscriptionId, cancelAtPeriodEnd = true } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID required" }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    })

    return NextResponse.json({ subscription })

  } catch (error) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
