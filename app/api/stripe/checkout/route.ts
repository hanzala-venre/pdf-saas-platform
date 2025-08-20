import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getPriceId } from "@/lib/stripe-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get("plan");

    console.log(
      `[CHECKOUT] User ${session.user.email} requesting plan: ${plan}`
    );

    if (!plan) {
      return NextResponse.redirect(new URL("/pricing?error=no-plan", req.url));
    }

    // CRITICAL: Validate plan parameter
    const validPlans = [
      "monthly",
      "yearly",
      "basic",
      "pro",
      "premium",
      "starter",
    ];
    if (!validPlans.includes(plan.toLowerCase())) {
      console.error(`[CHECKOUT] Invalid plan requested: ${plan}`);
      return NextResponse.redirect(
        new URL("/pricing?error=invalid-plan", req.url)
      );
    }

    // Get the price ID for the selected plan
    let priceId: string;
    try {
      priceId = getPriceId(plan);
      console.log(`[CHECKOUT] Plan: ${plan}, Price ID: ${priceId}`);
    } catch (error) {
      console.error(
        `[CHECKOUT] Failed to get price ID for plan: ${plan}`,
        error
      );
      return NextResponse.redirect(
        new URL("/pricing?error=invalid-plan", req.url)
      );
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
    });

    if (!user) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    console.log(`[CHECKOUT] User current state:`, {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      hasStripeCustomer: !!user.stripeCustomerId,
      hasSubscription: !!user.stripeSubscriptionId,
    });

    // Get or create customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
      });

      await prisma.user.update({
        where: { email: session.user.email },
        data: { stripeCustomerId: customer.id },
      });

      console.log(`[CHECKOUT] Created new Stripe customer: ${customer.id}`);
    }

    // CRITICAL: Check if user already has an active subscription
    if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        console.log(`[CHECKOUT] Found existing active subscription:`, {
          id: subscription.id,
          status: subscription.status,
          currentPlan: user.subscriptionPlan,
          requestedPlan: plan,
        });

        if (subscription.status === "active") {
          // CRITICAL: Don't allow automatic upgrades through checkout
          // User must explicitly use the plan change API
          console.error(
            `[CHECKOUT] ⚠️  User has active subscription, redirecting to billing`
          );
          return NextResponse.redirect(
            new URL("/billing?message=already-subscribed", req.url)
          );
        }
      } catch (error) {
        console.error(
          "[CHECKOUT] Error checking existing subscription:",
          error
        );
        // Continue with creating new subscription if Stripe subscription doesn't exist
      }
    }

    // Create checkout session for new subscription only
    console.log(`[CHECKOUT] Creating new checkout session for plan: ${plan}`);

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
      success_url: `${
        process.env.NEXTAUTH_URL
      }/billing?success=true&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
        requestedAt: new Date().toISOString(),
      },
      // CRITICAL: Prevent multiple subscriptions
      subscription_data: {
        metadata: {
          userId: user.id,
          originalPlan: plan,
        },
      },
    });

    console.log(
      `[CHECKOUT] ✅ Created checkout session: ${checkoutSession.id} for plan: ${plan}`
    );

    return NextResponse.redirect(checkoutSession.url!);
  } catch (error) {
    console.error("[CHECKOUT] ❌ Error creating checkout session:", error);
    return NextResponse.redirect(
      new URL("/pricing?error=checkout-failed", req.url)
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    console.log(
      `[CHECKOUT POST] User ${session.user.email} requesting plan: ${plan}`
    );

    // CRITICAL: Validate plan parameter
    const validPlans = [
      "monthly",
      "yearly",
      "basic",
      "pro",
      "premium",
      "starter",
    ];
    if (!plan || !validPlans.includes(plan.toLowerCase())) {
      console.error(`[CHECKOUT POST] Invalid plan requested: ${plan}`);
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Get the price ID for the selected plan
    let priceId: string;
    try {
      priceId = getPriceId(plan);
      console.log(`[CHECKOUT POST] Plan: ${plan}, Price ID: ${priceId}`);
    } catch (error) {
      console.error(
        `[CHECKOUT POST] Failed to get price ID for plan: ${plan}`,
        error
      );
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
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
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`[CHECKOUT POST] User current state:`, {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      hasSubscription: !!user.stripeSubscriptionId,
    });

    // Get or create customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
      });

      await prisma.user.update({
        where: { email: session.user.email },
        data: { stripeCustomerId: customer.id },
      });

      console.log(
        `[CHECKOUT POST] Created new Stripe customer: ${customer.id}`
      );
    }

    // CRITICAL: Check if user already has an active subscription
    if (user.stripeSubscriptionId && user.subscriptionStatus === "active") {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        if (subscription.status === "active") {
          console.error(
            `[CHECKOUT POST] ⚠️  User has active subscription, should use plan change API`
          );
          return NextResponse.json(
            {
              error:
                "You already have an active subscription. Use the plan change feature instead.",
              redirectTo: "/billing",
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error(
          "[CHECKOUT POST] Error checking existing subscription:",
          error
        );
        // Continue if Stripe subscription doesn't exist
      }
    }

    // Create checkout session for new subscription only
    console.log(
      `[CHECKOUT POST] Creating new checkout session for plan: ${plan}`
    );

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
      success_url: `${
        process.env.NEXTAUTH_URL
      }/billing?success=true&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
        requestedAt: new Date().toISOString(),
      },
      // CRITICAL: Prevent multiple subscriptions
      subscription_data: {
        metadata: {
          userId: user.id,
          originalPlan: plan,
        },
      },
    });

    console.log(
      `[CHECKOUT POST] ✅ Created checkout session: ${checkoutSession.id} for plan: ${plan}`
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[CHECKOUT POST] ❌ Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    );
  }
}
