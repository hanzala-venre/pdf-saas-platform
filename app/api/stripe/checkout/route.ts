import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { getPriceId } from "@/lib/stripe-config"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    const { searchParams } = new URL(req.url)
    const plan = searchParams.get('plan')
    
    if (!plan) {
      return NextResponse.redirect(new URL('/pricing?error=no-plan', req.url))
    }

    // Get the price ID for the selected plan
    let priceId: string
    try {
      priceId = getPriceId(plan)
    } catch (error) {
      return NextResponse.redirect(new URL('/pricing?error=invalid-plan', req.url))
    }

    // Get user with subscription info
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
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // Get or create customer
    let customer
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId)
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
      })

      // Update user with customer ID
      await prisma.user.update({
        where: { email: session.user.email },
        data: { stripeCustomerId: customer.id },
      })
    }

    // Check if user has an active subscription
    if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
      try {
        // Retrieve current subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        
        if (subscription.status === 'active') {
          // Update existing subscription instead of creating new checkout
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
              subscriptionPlan: plan,
              subscriptionStatus: updatedSubscription.status,
              subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            },
          })

          return NextResponse.redirect(new URL('/billing?success=plan-updated', req.url))
        }
      } catch (error) {
        console.error('Error updating subscription:', error)
        // Fall through to create new checkout session
      }
    }

    // Create checkout session for new subscription or if update failed
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.redirect(new URL('/pricing?error=checkout-failed', req.url))
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan } = await req.json()
    
    // Get the price ID for the selected plan
    let priceId: string
    try {
      priceId = getPriceId(plan)
    } catch (error) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    // Get user with subscription info
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

    // Get or create customer
    let customer
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId)
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
      })

      // Update user with customer ID
      await prisma.user.update({
        where: { email: session.user.email },
        data: { stripeCustomerId: customer.id },
      })
    }

    // Check if user has an active subscription
    if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
      try {
        // Retrieve current subscription
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
        
        if (subscription.status === 'active') {
          // Update existing subscription instead of creating new checkout
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
              subscriptionPlan: plan,
              subscriptionStatus: updatedSubscription.status,
              subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            },
          })

          return NextResponse.json({ success: true, message: "Plan updated successfully" })
        }
      } catch (error) {
        console.error('Error updating subscription:', error)
        // Fall through to create new checkout session
      }
    }

    // Create checkout session for new subscription or if update failed
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 })
  }
}
