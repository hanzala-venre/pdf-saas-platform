"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAnalytics } from "@/hooks/use-analytics";
import { PlanComparison } from "@/components/plan-comparison";

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  isAdmin: boolean;
}

interface UsageData {
  currentMonth: number;
  limit: number;
  resetDate: string;
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const { trackSubscriptionEvent } = useAnalytics();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (session) {
      const pollForUpgrade = async () => {
        let attempts = 0;
        const maxAttempts = 5; // 5 attempts, 2s interval = 10s
        let upgraded = false;
        while (attempts < maxAttempts && !upgraded) {
          await fetchBillingData();
          // If redirected after payment, poll until plan is not free
          if (
            searchParams?.get("success") === "true" &&
            subscription &&
            subscription.plan !== "free"
          ) {
            upgraded = true;
            break;
          }
          attempts++;
          await new Promise((res) => setTimeout(res, 2000));
        }
      };
      fetchBillingData();
      if (searchParams?.get("success") === "true") {
        toast({
          title: "Plan Upgraded!",
          description: "Your subscription has been updated successfully.",
        });
        pollForUpgrade();
      }
    }
  }, [session, searchParams]);

  const fetchBillingData = async () => {
    try {
      const [subRes, usageRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/usage"),
      ]);
      const [subData, usageData] = await Promise.all([
        subRes.json(),
        usageRes.json(),
      ]);

      setSubscription(subData);
      setUsage(usageData);
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load billing information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });

      if (response.ok) {
        trackSubscriptionEvent("subscription_cancelled", subscription?.plan);
        toast({
          title: "Subscription Cancelled",
          description:
            "Your subscription will end at the current billing period.",
        });
        fetchBillingData();
      } else {
        throw new Error("Failed to cancel subscription");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlan }),
      });

      const result = await response.json();

      if (response.ok) {
        trackSubscriptionEvent("plan_changed", newPlan);
        toast({
          title: "Plan Updated",
          description:
            result.message || `Successfully changed to ${newPlan} plan.`,
        });
        fetchBillingData();
      } else {
        throw new Error(result.error || "Failed to change plan");
      }
    } catch (error) {
      console.error("Error changing plan:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to change plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/billing/reactivate", {
        method: "POST",
      });

      if (response.ok) {
        trackSubscriptionEvent("subscription_reactivated", "monthly");
        toast({
          title: "Subscription Reactivated",
          description: "Your subscription has been reactivated.",
        });
        fetchBillingData();
      } else {
        throw new Error("Failed to reactivate subscription");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getPlanDetails = (plan: string) => {
    switch (plan) {
      case "monthly":
        return { name: "Monthly Pro", price: "$1.99/month", color: "purple" };
      case "yearly":
        return { name: "Yearly Pro", price: "$19.99/year", color: "green" };
      case "pro":
        return { name: "Admin Pro", price: "Unlimited", color: "blue" };
      default:
        return { name: "Free", price: "$0", color: "gray" };
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  const planDetails = getPlanDetails(subscription?.plan || "free");
  const isPaid = subscription?.plan !== "free" || subscription?.isAdmin;
  const isActive = subscription?.status === "active";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </div>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`${
                  planDetails.color === "purple"
                    ? "bg-purple-600"
                    : planDetails.color === "green"
                    ? "bg-green-600"
                    : planDetails.color === "blue"
                    ? "bg-blue-600"
                    : ""
                }`}
              >
                {planDetails.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Plan</p>
                <p className="text-2xl font-bold">{planDetails.name}</p>
                <p className="text-gray-600">{planDetails.price}</p>
              </div>

              {isPaid && (
                <>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="capitalize font-medium">
                        {subscription?.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      {subscription?.cancelAtPeriodEnd
                        ? "Ends On"
                        : "Renews On"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {subscription?.currentPeriodEnd
                          ? new Date(
                              subscription.currentPeriodEnd
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {subscription?.cancelAtPeriodEnd && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Subscription Ending</span>
                </div>
                <p className="text-amber-700 mt-1">
                  Your subscription will end on{" "}
                  {new Date(
                    subscription.currentPeriodEnd!
                  ).toLocaleDateString()}
                  . You can reactivate it anytime before then.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {!isPaid ? (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Upgrade to Monthly
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Upgrade to Monthly Pro
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll be charged $1.99/month and gain unlimited PDF
                          processing, priority support, and advanced features.
                          You can cancel anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <a
                            href="/api/stripe/checkout?plan=monthly"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Upgrade Now
                          </a>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="bg-transparent">
                        Upgrade to Yearly
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Upgrade to Yearly Pro
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You'll be charged $19.99/year (save $4.89 compared to
                          monthly) and gain unlimited PDF processing, priority
                          support, and advanced features. You can cancel
                          anytime.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <a
                            href="/api/stripe/checkout?plan=yearly"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Upgrade Now
                          </a>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  {subscription?.cancelAtPeriodEnd ? (
                    <Button
                      onClick={handleReactivateSubscription}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Reactivate Subscription
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="bg-transparent">
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Cancel Subscription
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription?
                            You'll continue to have access until the end of your
                            current billing period, then your account will
                            revert to the free plan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Keep Subscription
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {subscription?.plan === "monthly" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={actionLoading}
                          variant="outline"
                          className="bg-transparent"
                        >
                          {actionLoading ? "Updating..." : "Switch to Yearly"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Switch to Yearly Plan
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll be upgraded to the Yearly Pro plan
                            ($19.99/year) and save $4.89 compared to monthly
                            billing. The change will be prorated based on your
                            current billing cycle.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleChangePlan("yearly")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Switch to Yearly
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {subscription?.plan === "yearly" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={actionLoading}
                          variant="outline"
                          className="bg-transparent"
                        >
                          {actionLoading ? "Updating..." : "Switch to Monthly"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Switch to Monthly Plan
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll be downgraded to the Monthly Pro plan
                            ($1.99/month). This change will take effect at the
                            end of your current billing period to avoid losing
                            any paid time.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleChangePlan("monthly")}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Switch to Monthly
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              Your PDF processing usage for the current billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usage && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {usage.currentMonth} PDFs processed this month
                  </span>
                  <span className="text-sm text-gray-600">
                    Unlimited usage available
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    Resets on: {new Date(usage.resetDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Compare plans and upgrade or change your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanComparison
              currentPlan={subscription?.plan || "free"}
              currentStatus={subscription?.status || "inactive"}
              showUpgradeOptions={true}
              isAdmin={subscription?.isAdmin || false}
            />
          </CardContent>
        </Card>

        {/* Billing History */}
        {isPaid && (
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                Your recent payments and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Billing history will appear here</p>
                <p className="text-sm">
                  Invoices are sent to your email address
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
