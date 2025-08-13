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
    const startingAfter = searchParams.get("starting_after")
    const created = searchParams.get("created") // Unix timestamp

    const params: Stripe.PaymentIntentListParams = {
      limit,
      expand: ["data.customer"],
    }

    if (startingAfter) {
      params.starting_after = startingAfter
    }

    if (created) {
      params.created = { gte: parseInt(created) }
    }

    const paymentIntents = await stripe.paymentIntents.list(params)

    const payments = paymentIntents.data.map(payment => ({
      id: payment.id,
      amount: payment.amount / 100, // Convert from cents
      currency: payment.currency.toUpperCase(),
      status: payment.status,
      customerId: payment.customer as string,
      customerEmail: (payment.customer as Stripe.Customer)?.email || "N/A",
      customerName: (payment.customer as Stripe.Customer)?.name || null,
      description: payment.description || "Payment",
      created: payment.created,
      metadata: payment.metadata,
    }))

    return NextResponse.json({
      payments,
      hasMore: paymentIntents.has_more,
    })

  } catch (error) {
    console.error("Error fetching Stripe payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}
