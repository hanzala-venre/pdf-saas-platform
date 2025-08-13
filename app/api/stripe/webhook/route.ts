import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { emailService } from "@/lib/email-service"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Helper function to determine if plan change is an upgrade
function isPlanUpgrade(oldPlan: string, newPlan: string): boolean {
  const planHierarchy: { [key: string]: number } = {
    'free': 0,
    'starter': 1,
    'monthly': 2,
    'basic': 2,
    'pro': 3,
    'premium': 4,
    'enterprise': 5
  }
  
  const oldValue = planHierarchy[oldPlan.toLowerCase()] || 0
  const newValue = planHierarchy[newPlan.toLowerCase()] || 0
  
  return newValue > oldValue
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get customer details
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        })

        if (user) {
          // Get the old plan before update
          const oldPlan = user.subscriptionPlan || "free"
          const newPlan = subscription.items.data[0]?.price.lookup_key || "free"

          // Safely convert timestamp to Date
          let periodEndDate: Date | null = null;
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            const timestamp = subscription.current_period_end * 1000;
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
              periodEndDate = date;
            }
          }

          // Update user subscription
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionPlan: newPlan,
              subscriptionCurrentPeriodEnd: periodEndDate,
            },
          })

          // Send appropriate emails if plan changed
          if (event.type === "customer.subscription.updated" && oldPlan !== newPlan && newPlan !== "free") {
            try {
              // Check if it's an upgrade or just a plan change
              const isUpgrade = isPlanUpgrade(oldPlan, newPlan)
              
              if (isUpgrade) {
                await emailService.sendUpgradeEmails({
                  userName: user.name || customer.name || "User",
                  userEmail: user.email,
                  oldPlan: oldPlan.toUpperCase(),
                  newPlan: newPlan.toUpperCase()
                })
              } else {
                // Send plan change emails for downgrades or lateral changes
                await emailService.sendPlanChangeEmails({
                  userName: user.name || customer.name || "User",
                  userEmail: user.email,
                  oldPlan: oldPlan.toUpperCase(),
                  newPlan: newPlan.toUpperCase(),
                  effectiveDate: new Date().toLocaleDateString()
                })
              }
            } catch (emailError) {
              console.error("Failed to send plan change emails:", emailError)
            }
          }

          console.log(`Updated subscription for user ${user.email} - new plan: ${newPlan}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get customer details
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        })

        // Update user to free plan
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: "canceled",
            subscriptionPlan: "free",
            stripeSubscriptionId: null,
          },
        })

        // Send cancellation emails
        if (user) {
          try {
            const planName = subscription.items.data[0]?.price.lookup_key || "monthly"
            const accessEndDate = new Date(subscription.current_period_end * 1000)

            // Send proper cancellation emails
            await emailService.sendCancellationEmails({
              userName: user.name || customer.name || "User",
              userEmail: user.email,
              planName: planName.toUpperCase(),
              accessEndDate: accessEndDate,
              subscriptionId: subscription.id
            })
          } catch (emailError) {
            console.error("Failed to send cancellation emails:", emailError)
          }
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        const customerId = invoice.customer as string

        if (subscriptionId && customerId) {
          // Get customer and subscription details
          const [customer, subscription] = await Promise.all([
            stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>,
            stripe.subscriptions.retrieve(subscriptionId)
          ])

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: customer.email! },
          })

          if (user) {
            // Update subscription status to active
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "active",
              },
            })

            // Send payment confirmation emails
            try {
              const planName = subscription.items.data[0]?.price.lookup_key || "monthly"
              const amount = invoice.amount_paid || 0
              const currency = invoice.currency || "usd"
              
              await emailService.sendPaymentEmails({
                userName: user.name || customer.name || "User",
                userEmail: user.email,
                planName: planName.toUpperCase(),
                amount: amount,
                currency: currency,
                transactionId: invoice.payment_intent as string || invoice.id,
                billingPeriod: subscription.items.data[0]?.price.recurring?.interval === "year" ? "Yearly" : "Monthly"
              })
            } catch (emailError) {
              console.error("Failed to send payment confirmation emails:", emailError)
            }
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          // Update subscription status to past_due
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              subscriptionStatus: "past_due",
            },
          })
        }
        break
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (customerId && subscriptionId) {
          // Get customer details
          const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: customer.email! },
          })

          if (user) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            // Safely convert timestamp to Date
            let periodEndDate: Date | null = null;
            if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
              const timestamp = subscription.current_period_end * 1000;
              const date = new Date(timestamp);
              if (!isNaN(date.getTime())) {
                periodEndDate = date;
              }
            }

            const oldPlan = user.subscriptionPlan || "free"
            const newPlan = subscription.items.data[0]?.price.lookup_key || "monthly"

            // Update user with subscription details
            await prisma.user.update({
              where: { id: user.id },
              data: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscriptionStatus: subscription.status,
                subscriptionPlan: newPlan,
                subscriptionCurrentPeriodEnd: periodEndDate,
              },
            })

            // Send initial subscription/payment emails for new subscriptions
            try {
              const amount = session.amount_total || 0
              const currency = session.currency || "usd"
              
              await emailService.sendPaymentEmails({
                userName: user.name || customer.name || "User",
                userEmail: user.email,
                planName: newPlan.toUpperCase(),
                amount: amount,
                currency: currency,
                transactionId: session.payment_intent as string || session.id,
                billingPeriod: subscription.items.data[0]?.price.recurring?.interval === "year" ? "Yearly" : "Monthly"
              })
            } catch (emailError) {
              console.error("Failed to send checkout completion emails:", emailError)
            }

            console.log(`Checkout completed for user ${user.email}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
