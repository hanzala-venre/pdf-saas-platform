import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getPriceId } from "@/lib/stripe-config"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const returnTo = searchParams.get('returnTo') || '/tools/compress'
    
    // Get the price ID for one-time payment
    const priceId = getPriceId('oneTime')

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment mode
      success_url: `${process.env.NEXTAUTH_URL}/api/stripe/one-time-success?returnTo=${encodeURIComponent(returnTo)}`,
      cancel_url: `${process.env.NEXTAUTH_URL}${returnTo}?canceled=true`,
      metadata: {
        plan: 'oneTime',
        returnTo: returnTo
      },
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error) {
    console.error("Error creating one-time checkout session:", error)
    const { searchParams } = new URL(req.url)
    const returnTo = searchParams.get('returnTo') || '/tools/compress'
    return NextResponse.redirect(new URL(`${returnTo}?error=checkout-failed`, req.url))
  }
}

export async function POST(req: NextRequest) {
  try {
    const { returnTo } = await req.json()
    
    // Get the price ID for one-time payment
    const priceId = getPriceId('oneTime')

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment mode
      success_url: `${process.env.NEXTAUTH_URL}/api/stripe/one-time-success?returnTo=${encodeURIComponent(returnTo || '/tools/compress')}`,
      cancel_url: `${process.env.NEXTAUTH_URL}${returnTo || '/tools/compress'}?canceled=true`,
      metadata: {
        plan: 'oneTime',
        returnTo: returnTo || '/tools/compress'
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Error creating one-time checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}
