import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

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
        return date;
      }
    }

    return null;
  } catch (error) {
    console.error("Error converting timestamp:", error);
    return null;
  }
}

// Helper function to get plan name from subscription
function getPlanNameFromSubscription(
  subscription: Stripe.Subscription
): string {
  // Find the active price item (quantity > 0, not canceled)
  const priceItem = subscription.items.data.find(
    (item) => (typeof item.quantity === 'number' && item.quantity > 0) && (Boolean(item.deleted) === false)
  ) || subscription.items.data[0];
  if (!priceItem) return "monthly";

  if (priceItem.price.lookup_key) {
    return priceItem.price.lookup_key;
  }

  const interval = priceItem.price.recurring?.interval;
  if (interval === "year") {
    return "yearly";
  } else if (interval === "month") {
    return "monthly";
  }

  return "monthly";
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as any;

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      `[BILLING API] Fetching subscription for user: ${session.user.email}`
    );

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          role: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionCurrentPeriodEnd: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      });
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json({
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        isAdmin: false,
      });
    }

    if (!user) {
      console.log(
        `[BILLING API] User not found, returning default subscription`
      );
      return NextResponse.json({
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        isAdmin: false,
      });
    }

    // Check if user is admin
    const isAdmin = user.role === "ADMIN";

    if (isAdmin) {
      console.log(`[BILLING API] Admin user, returning pro access`);
      return NextResponse.json({
        plan: "pro",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        isAdmin: true,
      });
    }

    console.log(`[BILLING API] User data from DB:`, {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      periodEnd: user.subscriptionCurrentPeriodEnd,
      stripeSubId: user.stripeSubscriptionId,
    });

    let effectiveStatus = user.subscriptionStatus;
    let effectivePlan = user.subscriptionPlan;
    let periodEnd = user.subscriptionCurrentPeriodEnd;
    let cancelAtPeriodEnd = false;

    // If user has active subscription but missing period end, fetch from Stripe and sync
    if (
      user.stripeSubscriptionId &&
      user.subscriptionStatus === "active" &&
      !periodEnd
    ) {
      console.log(
        `[BILLING API] Active subscription but missing period end, fetching from Stripe`
      );
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        console.log(
          `[BILLING API] Stripe subscription status: ${subscription.status}`
        );
        console.log(
          `[BILLING API] Stripe subscription period end: ${subscription.current_period_end}`
        );

        if (subscription.current_period_end) {
          const fetchedPeriodEnd = convertTimestampToDate(
            subscription.current_period_end
          );
          if (fetchedPeriodEnd) {
            periodEnd = fetchedPeriodEnd;
            console.log(
              `[BILLING API] Updating DB with period end: ${fetchedPeriodEnd}`
            );
          }
        }

        // Also sync plan name
        const stripePlan = getPlanNameFromSubscription(subscription);
        if (stripePlan !== user.subscriptionPlan) {
          effectivePlan = stripePlan;
          console.log(`[BILLING API] Updating DB with plan: ${stripePlan}`);
        }

        // Update database with synced data
        if (periodEnd || stripePlan !== user.subscriptionPlan) {
          await prisma.user.update({
            where: { email: session.user.email },
            data: {
              subscriptionPlan: stripePlan,
              subscriptionCurrentPeriodEnd: periodEnd,
              subscriptionStatus: subscription.status,
            },
          });
        }

        effectiveStatus = subscription.status;
  cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
      } catch (error) {
        console.error("Error syncing with Stripe:", error);
        // Continue with database values
      }
    }
    // If user has Stripe subscription, always check cancel status
    else if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );
        cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

        // Also sync status if it's different
        if (subscription.status !== user.subscriptionStatus) {
          effectiveStatus = subscription.status;
          await prisma.user.update({
            where: { email: session.user.email },
            data: { subscriptionStatus: subscription.status },
          });
        }
      } catch (error) {
        console.error(
          "Error checking Stripe subscription cancel status:",
          error
        );
        cancelAtPeriodEnd =
          user.subscriptionStatus === "canceled" &&
          periodEnd &&
          new Date() < periodEnd;
      }
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = periodEnd && now > periodEnd;

    if (isExpired && effectiveStatus === "active") {
      console.log(`[BILLING API] Subscription expired, setting to inactive`);
      effectiveStatus = "inactive";
      effectivePlan = "free";
    }

    const subscriptionData = {
      plan: effectivePlan || "free",
      status: effectiveStatus || "inactive",
      currentPeriodEnd: periodEnd?.toISOString() || null,
      cancelAtPeriodEnd,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      isAdmin,
    };

    console.log(`[BILLING API] Returning subscription data:`, subscriptionData);

    return NextResponse.json(subscriptionData);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
