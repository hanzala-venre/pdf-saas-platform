import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getPriceId } from "@/lib/stripe-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Helper function to get plan name from subscription
function getPlanNameFromSubscription(
  subscription: Stripe.Subscription
): string {
  const priceItem = subscription.items.data[0];
  if (!priceItem) return "monthly";

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

  return "monthly";
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
        return date;
      }
    }

    return null;
  } catch (error) {
    console.error("Error converting timestamp:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPlan } = await req.json();

    if (!newPlan) {
      return NextResponse.json(
        { error: "Plan not specified" },
        { status: 400 }
      );
    }

    console.log(
      `[PLAN CHANGE] User ${session.user.email} requesting change to: ${newPlan}`
    );

    // Get the price ID for the new plan
    let priceId: string;
    try {
      priceId = getPriceId(newPlan);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Check if user is trying to change to the same plan
    if (user.subscriptionPlan === newPlan) {
      return NextResponse.json(
        { error: "You are already on this plan" },
        { status: 400 }
      );
    }

    console.log(
      `[PLAN CHANGE] Current plan: ${user.subscriptionPlan}, New plan: ${newPlan}`
    );

    // Retrieve current subscription to validate
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    console.log(
      `[PLAN CHANGE] Updating Stripe subscription ${user.stripeSubscriptionId}`
    );

    // Update the subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      }
    );

    console.log(`[PLAN CHANGE] Stripe subscription updated successfully`);

    // Get the actual plan name from the updated subscription (don't trust the parameter)
    const actualPlanName = getPlanNameFromSubscription(updatedSubscription);
    const periodEndDate = convertTimestampToDate(
      updatedSubscription.current_period_end
    );

    console.log(`[PLAN CHANGE] Actual plan from Stripe: ${actualPlanName}`);
    console.log(`[PLAN CHANGE] Period end: ${periodEndDate}`);

    // Update user in database with actual Stripe data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: actualPlanName,
        subscriptionStatus: updatedSubscription.status,
        subscriptionCurrentPeriodEnd: periodEndDate,
      },
    });

    console.log(
      `[PLAN CHANGE] Database updated successfully for user ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully changed plan to ${actualPlanName}`,
      newPlan: actualPlanName,
      currentPeriodEnd: periodEndDate?.toISOString() || null,
      status: updatedSubscription.status,
    });
  } catch (error) {
    console.error("Error changing plan:", error);

    // Provide more specific error information
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: `Stripe error: ${error.message}`,
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
