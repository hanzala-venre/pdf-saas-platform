import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/email-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Use different webhook secrets for development and production
const endpointSecret =
  process.env.NODE_ENV === "production"
    ? process.env.STRIPE_WEBHOOK_SECRET_PROD ||
      process.env.STRIPE_WEBHOOK_SECRET!
    : process.env.STRIPE_WEBHOOK_SECRET_DEV ||
      process.env.STRIPE_WEBHOOK_SECRET!;

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper function to determine if plan change is an upgrade
function isPlanUpgrade(oldPlan: string, newPlan: string): boolean {
  const planHierarchy: { [key: string]: number } = {
    free: 0,
    starter: 1,
    monthly: 2,
    basic: 2,
    pro: 3,
    premium: 4,
    enterprise: 5,
    yearly: 6, // Yearly should be higher than monthly
  };

  const oldValue = planHierarchy[oldPlan.toLowerCase()] || 0;
  const newValue = planHierarchy[newPlan.toLowerCase()] || 0;
  return newValue > oldValue;
}

// Helper function to safely convert timestamp to Date
function convertTimestampToDate(timestamp: any): Date | null {
  try {
    let unixTimestamp: number | null = null;

    if (typeof timestamp === "number") {
      unixTimestamp = timestamp;
    } else if (typeof timestamp === "string") {
      const parsed = parseInt(timestamp, 10);
      if (!isNaN(parsed)) {
        unixTimestamp = parsed;
      }
    }

    if (unixTimestamp && unixTimestamp > 0) {
      // Stripe timestamps are in seconds, convert to milliseconds
      const date = new Date(unixTimestamp * 1000);
      if (!isNaN(date.getTime())) {
        console.log(
          `[TIMESTAMP] Converting ${unixTimestamp} to ${date.toISOString()}`
        );
        return date;
      }
    }

    console.log(`[TIMESTAMP] Failed to convert timestamp: ${timestamp}`);
    return null;
  } catch (error) {
    console.error("Error converting timestamp:", error);
    return null;
  }
}

// Helper function to determine plan name from subscription
function getPlanNameFromSubscription(
  subscription: Stripe.Subscription
): string {
  // Find the active price item (quantity > 0, not canceled)
  const priceItem = subscription.items.data.find(
    (item) => (typeof item.quantity === 'number' && item.quantity > 0) && (Boolean(item.deleted) === false)
  ) || subscription.items.data[0];
  if (!priceItem) return "monthly"; // fallback

  // First try to get from lookup_key
  if (priceItem.price.lookup_key) {
    return priceItem.price.lookup_key;
  }

  // Fallback to interval-based naming
  const interval = priceItem.price.recurring?.interval;
  if (interval === "year") {
    return "yearly";
  } else if (interval === "month") {
    return "monthly";
  }

  // Final fallback
  return "monthly";
}

// Helper function to update user subscription
async function updateUserSubscription(
  user: any,
  customerId: string,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const planName = getPlanNameFromSubscription(subscription);
  const periodEndDate = convertTimestampToDate(subscription.current_period_end);

  console.log(
    `[STRIPE WEBHOOK] [${eventType}] Processing subscription for user ${user.email}`
  );
  console.log(
    `[STRIPE WEBHOOK] Plan: ${planName}, Status: ${subscription.status}`
  );
  console.log(
    `[STRIPE WEBHOOK] Period End Raw: ${subscription.current_period_end}, Converted: ${periodEndDate}`
  );

  // Prepare update data
  const updateData: any = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  };

  // Always update plan and period end for active subscriptions
  if (subscription.status === "active") {
    updateData.subscriptionPlan = planName;
    updateData.subscriptionCurrentPeriodEnd = periodEndDate;
  } else if (subscription.status === "incomplete") {
    // For incomplete subscriptions, don't update plan or period end
    console.log(
      `[STRIPE WEBHOOK] [${eventType}] Subscription incomplete, not updating plan or period`
    );
  }

  // Use upsert to handle race conditions
  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  console.log(
    `[STRIPE WEBHOOK] [${eventType}] Updated user ${user.email} - Plan: ${planName}, Status: ${subscription.status}, Period: ${periodEndDate}`
  );

  return {
    planName,
    periodEndDate,
    shouldSetActive: subscription.status === "active",
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    console.log("[STRIPE WEBHOOK] Received event:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer details
        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[STRIPE WEBHOOK] No user found for customer email: ${customer.email}`
          );
          break;
        }

        const oldPlan = user.subscriptionPlan || "free";
        const { planName, shouldSetActive } = await updateUserSubscription(
          user,
          customerId,
          subscription,
          event.type
        );

        // Send emails only for subscription updates (not creation) and when plan changes
        if (
          event.type === "customer.subscription.updated" &&
          oldPlan !== planName &&
          shouldSetActive
        ) {
          try {
            const isUpgrade = isPlanUpgrade(oldPlan, planName);

            if (isUpgrade) {
              await emailService.sendUpgradeEmails({
                userName: user.name || customer.name || "User",
                userEmail: user.email,
                oldPlan: oldPlan.toUpperCase(),
                newPlan: planName.toUpperCase(),
              });
            } else {
              await emailService.sendPlanChangeEmails({
                userName: user.name || customer.name || "User",
                userEmail: user.email,
                oldPlan: oldPlan.toUpperCase(),
                newPlan: planName.toUpperCase(),
                effectiveDate: new Date().toLocaleDateString(),
              });
            }
          } catch (emailError) {
            console.error("Failed to send plan change emails:", emailError);
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer details
        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        // Update user to free plan
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: "canceled",
            subscriptionPlan: "free",
            stripeSubscriptionId: null,
            subscriptionCurrentPeriodEnd: null,
          },
        });

        // Send cancellation emails
        if (user) {
          try {
            const planName = getPlanNameFromSubscription(subscription);
            const accessEndDate =
              convertTimestampToDate(subscription.current_period_end) ||
              new Date();

            await emailService.sendCancellationEmails({
              userName: user.name || customer.name || "User",
              userEmail: user.email,
              planName: planName.toUpperCase(),
              accessEndDate: accessEndDate,
              subscriptionId: subscription.id,
            });
          } catch (emailError) {
            console.error("Failed to send cancellation emails:", emailError);
          }
        }

        console.log(
          `[STRIPE WEBHOOK] Subscription canceled for user: ${
            user?.email || "unknown"
          }`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const customerId = invoice.customer as string;

        console.log(`[STRIPE WEBHOOK] Processing invoice.payment_succeeded`);
        console.log(
          `[STRIPE WEBHOOK] Subscription ID: ${subscriptionId}, Customer ID: ${customerId}`
        );

        if (!subscriptionId || !customerId) {
          console.log(
            "[STRIPE WEBHOOK] Skipping invoice.payment_succeeded - missing subscription or customer"
          );
          break;
        }

        // Get customer and subscription details
        const [customer, subscription] = await Promise.all([
          stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>,
          stripe.subscriptions.retrieve(subscriptionId),
        ]);

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[STRIPE WEBHOOK] No user found for customer email: ${customer.email}`
          );
          break;
        }

        // For payment succeeded, always update plan and period end regardless of current status
        const planName = getPlanNameFromSubscription(subscription);
        const periodEndDate = convertTimestampToDate(
          subscription.current_period_end
        );

        console.log(
          `[STRIPE WEBHOOK] [invoice.payment_succeeded] Updating user with plan: ${planName}, period: ${periodEndDate}`
        );

        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active", // Payment succeeded means active
            subscriptionPlan: planName,
            subscriptionCurrentPeriodEnd: periodEndDate,
          },
        });

        // Send payment confirmation emails
        try {
          const amount = invoice.amount_paid || 0;
          const currency = invoice.currency || "usd";
          const billingPeriod =
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "Yearly"
              : "Monthly";

          console.log(
            `📧 Sending payment confirmation emails to user: ${user.email}`
          );

          await emailService.sendPaymentEmails({
            userName: user.name || customer.name || "User",
            userEmail: user.email,
            planName: planName.toUpperCase(),
            amount: amount,
            currency: currency,
            transactionId: (invoice.payment_intent as string) || invoice.id,
            billingPeriod: billingPeriod,
          });

          console.log(`✅ Payment emails sent successfully to: ${user.email}`);
        } catch (emailError) {
          console.error(
            "❌ Failed to send payment confirmation emails:",
            emailError
          );
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Update subscription status to past_due
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              subscriptionStatus: "past_due",
            },
          });

          console.log(
            `[STRIPE WEBHOOK] Payment failed for subscription: ${subscriptionId}`
          );
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!customerId || !subscriptionId) {
          console.log(
            "[STRIPE WEBHOOK] Skipping checkout.session.completed - missing customer or subscription"
          );
          break;
        }

        // Get customer details
        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[STRIPE WEBHOOK] No user found for customer email: ${customer.email}`
          );
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        // Update user subscription
        const { planName } = await updateUserSubscription(
          user,
          customerId,
          subscription,
          "checkout.session.completed"
        );

        // Send initial subscription emails only for new subscriptions
        try {
          const amount = session.amount_total || 0;
          const currency = session.currency || "usd";
          const billingPeriod =
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "Yearly"
              : "Monthly";

          console.log(
            `📧 Sending checkout completion emails to user: ${user.email}`
          );

          await emailService.sendPaymentEmails({
            userName: user.name || customer.name || "User",
            userEmail: user.email,
            planName: planName.toUpperCase(),
            amount: amount,
            currency: currency,
            transactionId: (session.payment_intent as string) || session.id,
            billingPeriod: billingPeriod,
          });

          console.log(`✅ Checkout emails sent successfully to: ${user.email}`);
        } catch (emailError) {
          console.error(
            "❌ Failed to send checkout completion emails:",
            emailError
          );
        }

        console.log(
          `[STRIPE WEBHOOK] Checkout completed for user ${user.email}`
        );
        break;
      }

      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
