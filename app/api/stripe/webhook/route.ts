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
    yearly: 6, // Keep yearly separate, not necessarily "higher"
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
      const date = new Date(unixTimestamp * 1000);
      if (!isNaN(date.getTime())) {
        console.log(
          `[WEBHOOK] Converting timestamp ${unixTimestamp} to ${date.toISOString()}`
        );
        return date;
      }
    }

    console.log(`[WEBHOOK] Failed to convert timestamp: ${timestamp}`);
    return null;
  } catch (error) {
    console.error("[WEBHOOK] Error converting timestamp:", error);
    return null;
  }
}

// CRITICAL: Helper function to get plan name from subscription - EXACT MATCH ONLY
function getPlanNameFromSubscription(
  subscription: Stripe.Subscription
): string {
  const priceItem = subscription.items.data[0];
  if (!priceItem) {
    console.error("[WEBHOOK] No price item found in subscription");
    return "monthly"; // Safe fallback
  }

  console.log(`[WEBHOOK] Price lookup_key: ${priceItem.price.lookup_key}`);
  console.log(
    `[WEBHOOK] Price interval: ${priceItem.price.recurring?.interval}`
  );
  console.log(`[WEBHOOK] Price ID: ${priceItem.price.id}`);

  // CRITICAL: First try to get from lookup_key - this should be exact
  if (priceItem.price.lookup_key) {
    const lookupKey = priceItem.price.lookup_key.toLowerCase();
    console.log(`[WEBHOOK] Using lookup_key: ${lookupKey}`);
    return lookupKey;
  }

  // CRITICAL: Fallback to interval-based naming ONLY if lookup_key is missing
  const interval = priceItem.price.recurring?.interval;
  console.log(`[WEBHOOK] Fallback to interval: ${interval}`);

  if (interval === "year") {
    return "yearly";
  } else if (interval === "month") {
    return "monthly";
  }

  // Final safe fallback
  console.warn("[WEBHOOK] Using final fallback: monthly");
  return "monthly";
}

// Process queue to handle race conditions
const processingQueue = new Map<string, boolean>();

// Helper function to update user subscription with race condition protection
async function updateUserSubscription(
  user: any,
  customerId: string,
  subscription: Stripe.Subscription,
  eventType: string
) {
  const queueKey = `${user.id}-${subscription.id}`;

  // Prevent race conditions
  if (processingQueue.get(queueKey)) {
    console.log(
      `[WEBHOOK] [${eventType}] Skipping - already processing subscription for user ${user.email}`
    );
    return {
      planName: user.subscriptionPlan,
      periodEndDate: null,
      shouldSetActive: false,
    };
  }

  processingQueue.set(queueKey, true);

  try {
    const planName = getPlanNameFromSubscription(subscription);
    const periodEndDate = convertTimestampToDate(
      subscription.current_period_end
    );

    console.log(
      `[WEBHOOK] [${eventType}] Processing subscription for user ${user.email}`
    );
    console.log(
      `[WEBHOOK] [${eventType}] Current DB plan: ${user.subscriptionPlan}`
    );
    console.log(`[WEBHOOK] [${eventType}] Stripe plan: ${planName}`);
    console.log(
      `[WEBHOOK] [${eventType}] Stripe status: ${subscription.status}`
    );
    console.log(`[WEBHOOK] [${eventType}] Period End: ${periodEndDate}`);

    // CRITICAL: Only update if subscription is truly active AND we have valid data
    const shouldUpdate =
      subscription.status === "active" && planName && periodEndDate;

    if (shouldUpdate) {
      // CRITICAL: Check if plan change is unexpected
      if (user.subscriptionPlan && user.subscriptionPlan !== planName) {
        console.error(`[WEBHOOK] [${eventType}] ⚠️  PLAN MISMATCH DETECTED!`);
        console.error(
          `[WEBHOOK] [${eventType}] DB has: ${user.subscriptionPlan}, Stripe has: ${planName}`
        );
        console.error(
          `[WEBHOOK] [${eventType}] This might be an unwanted upgrade!`
        );

        // Log the full subscription for investigation
        console.error(
          `[WEBHOOK] [${eventType}] Full subscription:`,
          JSON.stringify(subscription, null, 2)
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionPlan: planName,
          subscriptionCurrentPeriodEnd: periodEndDate,
        },
      });

      console.log(
        `[WEBHOOK] [${eventType}] ✅ Updated user ${user.email} - Plan: ${planName}, Status: ${subscription.status}`
      );
    } else {
      // For incomplete subscriptions, only update connection details
      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
        },
      });

      console.log(
        `[WEBHOOK] [${eventType}] ⚠️  Partial update - Status: ${subscription.status}, not updating plan/period`
      );
    }

    return { planName, periodEndDate, shouldSetActive: shouldUpdate };
  } finally {
    processingQueue.delete(queueKey);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`[WEBHOOK] Signature verification failed:`, err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    console.log(`[WEBHOOK] 📨 Received event: ${event.type} (${event.id})`);

    // CRITICAL: Log all subscription-related events for debugging
    if (
      event.type.includes("subscription") ||
      event.type.includes("checkout") ||
      event.type.includes("invoice")
    ) {
      console.log(
        `[WEBHOOK] 🔍 Event data:`,
        JSON.stringify(event.data.object, null, 2)
      );
    }

    switch (event.type) {
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(
          `[WEBHOOK] [subscription.created] Subscription ID: ${subscription.id}`
        );
        console.log(
          `[WEBHOOK] [subscription.created] Status: ${subscription.status}`
        );

        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[WEBHOOK] [subscription.created] No user found for email: ${customer.email}`
          );
          break;
        }

        await updateUserSubscription(
          user,
          customerId,
          subscription,
          "subscription.created"
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(
          `[WEBHOOK] [subscription.updated] Subscription ID: ${subscription.id}`
        );
        console.log(
          `[WEBHOOK] [subscription.updated] Status: ${subscription.status}`
        );

        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[WEBHOOK] [subscription.updated] No user found for email: ${customer.email}`
          );
          break;
        }

        const oldPlan = user.subscriptionPlan || "free";
        const { planName, shouldSetActive } = await updateUserSubscription(
          user,
          customerId,
          subscription,
          "subscription.updated"
        );

        // CRITICAL: Alert on plan changes that might be unwanted
        if (shouldSetActive && oldPlan !== planName && oldPlan !== "free") {
          console.error(
            `[WEBHOOK] [subscription.updated] 🚨 PLAN CHANGED: ${oldPlan} → ${planName}`
          );
          console.error(`[WEBHOOK] [subscription.updated] User: ${user.email}`);
          console.error(
            `[WEBHOOK] [subscription.updated] This might be an automatic upgrade!`
          );

          // Send email notifications for plan changes
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
            console.error(
              "[WEBHOOK] Failed to send plan change emails:",
              emailError
            );
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log(
          `[WEBHOOK] [subscription.deleted] Subscription ID: ${subscription.id}`
        );

        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: "canceled",
            subscriptionPlan: "free",
            stripeSubscriptionId: null,
            subscriptionCurrentPeriodEnd: null,
          },
        });

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
            console.error(
              "[WEBHOOK] Failed to send cancellation emails:",
              emailError
            );
          }
        }

        console.log(
          `[WEBHOOK] [subscription.deleted] ✅ Subscription canceled for user: ${
            user?.email || "unknown"
          }`
        );
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        console.log(`[WEBHOOK] [checkout.completed] Session ID: ${session.id}`);
        console.log(
          `[WEBHOOK] [checkout.completed] Customer: ${customerId}, Subscription: ${subscriptionId}`
        );

        if (!customerId || !subscriptionId) {
          console.log(
            "[WEBHOOK] [checkout.completed] Missing customer or subscription, skipping"
          );
          break;
        }

        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[WEBHOOK] [checkout.completed] No user found for email: ${customer.email}`
          );
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        const { planName } = await updateUserSubscription(
          user,
          customerId,
          subscription,
          "checkout.completed"
        );

        // Send initial subscription emails
        try {
          const amount = session.amount_total || 0;
          const currency = session.currency || "usd";
          const billingPeriod =
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "Yearly"
              : "Monthly";

          console.log(
            `[WEBHOOK] [checkout.completed] 📧 Sending emails for ${planName} plan`
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

          console.log(
            `[WEBHOOK] [checkout.completed] ✅ Emails sent to: ${user.email}`
          );
        } catch (emailError) {
          console.error(
            "[WEBHOOK] Failed to send checkout completion emails:",
            emailError
          );
        }

        console.log(
          `[WEBHOOK] [checkout.completed] ✅ Completed for user ${user.email}, plan: ${planName}`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        const customerId = invoice.customer as string;

        console.log(`[WEBHOOK] [payment.succeeded] Invoice: ${invoice.id}`);
        console.log(
          `[WEBHOOK] [payment.succeeded] Subscription: ${subscriptionId}, Customer: ${customerId}`
        );

        if (!subscriptionId || !customerId) {
          console.log(
            "[WEBHOOK] [payment.succeeded] Missing subscription or customer, skipping"
          );
          break;
        }

        const [customer, subscription] = await Promise.all([
          stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>,
          stripe.subscriptions.retrieve(subscriptionId),
        ]);

        const user = await prisma.user.findUnique({
          where: { email: customer.email! },
        });

        if (!user) {
          console.warn(
            `[WEBHOOK] [payment.succeeded] No user found for email: ${customer.email}`
          );
          break;
        }

        // For recurring payments, ensure we maintain the correct plan
        const { planName } = await updateUserSubscription(
          user,
          customerId,
          subscription,
          "payment.succeeded"
        );

        try {
          const amount = invoice.amount_paid || 0;
          const currency = invoice.currency || "usd";
          const billingPeriod =
            subscription.items.data[0]?.price.recurring?.interval === "year"
              ? "Yearly"
              : "Monthly";

          await emailService.sendPaymentEmails({
            userName: user.name || customer.name || "User",
            userEmail: user.email,
            planName: planName.toUpperCase(),
            amount: amount,
            currency: currency,
            transactionId: (invoice.payment_intent as string) || invoice.id,
            billingPeriod: billingPeriod,
          });

          console.log(
            `[WEBHOOK] [payment.succeeded] ✅ Payment emails sent to: ${user.email}`
          );
        } catch (emailError) {
          console.error(
            "[WEBHOOK] Failed to send payment confirmation emails:",
            emailError
          );
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { subscriptionStatus: "past_due" },
          });
          console.log(
            `[WEBHOOK] [payment.failed] ⚠️  Set to past_due: ${subscriptionId}`
          );
        }
        break;
      }

      default:
        console.log(`[WEBHOOK] 🤷 Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK] ❌ Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
