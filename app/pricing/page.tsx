"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, Crown, Zap } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useSession } from "next-auth/react"
import { useAnalytics } from "@/hooks/use-analytics"
import { useEffect, useState } from "react"

interface SubscriptionInfo {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export default function PricingPage() {
  const { data: session } = useSession()
  const { trackPageView, trackSubscriptionEvent } = useAnalytics()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    trackPageView("pricing")
    if (session?.user) {
      fetchSubscriptionInfo()
    }
  }, [trackPageView, session])

  const fetchSubscriptionInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/billing/subscription")
      if (response.ok) {
        const data = await response.json()
        setSubscriptionInfo(data)
      } else {
        console.error("Failed to fetch subscription info:", response.status)
        // Set default values on error
        setSubscriptionInfo({
          plan: "free",
          status: "inactive",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        })
      }
    } catch (error) {
      console.error("Error fetching subscription info:", error)
      // Set default values on error
      setSubscriptionInfo({
        plan: "free", 
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePlanClick = (plan: string) => {
    trackSubscriptionEvent("plan_click", plan)
  }

  const isCurrentPlan = (plan: string) => {
    if (!subscriptionInfo) return false
    return subscriptionInfo.plan === plan && subscriptionInfo.status === "active"
  }

  const getPlanStatus = (plan: string) => {
    if (isCurrentPlan(plan)) {
      return subscriptionInfo?.cancelAtPeriodEnd ? "Cancelling" : "Current Plan"
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-800">
              💎 Simple, Transparent Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Choose Your Perfect Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade when you need more. No hidden fees, cancel anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className={`relative ${isCurrentPlan("free") ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Free</CardTitle>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-gray-400" />
                    {isCurrentPlan("free") && (
                      <Badge className="bg-blue-100 text-blue-800">Current Plan</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Perfect for trying out our tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All PDF operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Basic merge & split tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All file sizes supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Watermarked outputs</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-transparent"
                  variant="outline"
                  asChild
                  onClick={() => handlePlanClick("free")}
                >
                  <a href={session ? "/dashboard" : "/auth/signup"}>Get Started Free</a>
                </Button>
              </CardContent>
            </Card>

            {/* One-Time Payment */}
            <Card className="relative border-2 border-orange-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-orange-600 text-white">No Login Required</Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">One-Time Remove</CardTitle>
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$2.49</span>
                  <span className="text-gray-600">/use</span>
                </div>
                <CardDescription>Single-use watermark removal for guests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">No registration needed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>One-time use of any tool</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All file sizes supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">No watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Instant activation</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  asChild
                  onClick={() => handlePlanClick("oneTime")}
                >
                  <a href="/api/stripe/one-time-checkout?returnTo=/tools/compress">Remove Watermarks Now</a>
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Plan */}
            <Card className={`relative border-2 shadow-lg ${isCurrentPlan("monthly") ? "ring-2 ring-purple-500 ring-offset-2" : "border-purple-200"}`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                {isCurrentPlan("monthly") ? (
                  <Badge className="bg-green-600 text-white">
                    {getPlanStatus("monthly")}
                  </Badge>
                ) : (
                  <Badge className="bg-purple-600 text-white">Most Popular</Badge>
                )}
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Monthly Pro</CardTitle>
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$1.99</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription>Great for regular PDF users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Unlimited PDF operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All tools (merge, split, compress, edit)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All file sizes supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">No watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Priority processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  asChild
                  onClick={() => handlePlanClick("monthly")}
                  disabled={isCurrentPlan("monthly")}
                >
                  {isCurrentPlan("monthly") ? (
                    <span>Current Plan</span>
                  ) : (
                    <a href={session ? "/api/stripe/checkout?plan=monthly" : "/auth/signup?plan=monthly"}>
                      Upgrade to Monthly
                    </a>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Yearly Plan */}
            <Card className={`relative ${isCurrentPlan("yearly") ? "ring-2 ring-green-500 ring-offset-2 border-green-200" : ""}`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                {isCurrentPlan("yearly") ? (
                  <Badge className="bg-green-600 text-white">
                    {getPlanStatus("yearly")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Save $4/year
                  </Badge>
                )}
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Yearly Pro</CardTitle>
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$19.99</span>
                  <span className="text-gray-600">/year</span>
                </div>
                <CardDescription>Best value for power users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Everything in Monthly Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>All file sizes supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Batch processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Save $4 per year</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  asChild
                  onClick={() => handlePlanClick("yearly")}
                  disabled={isCurrentPlan("yearly")}
                >
                  {isCurrentPlan("yearly") ? (
                    <span>Current Plan</span>
                  ) : (
                    <a href={session ? "/api/stripe/checkout?plan=yearly" : "/auth/signup?plan=yearly"}>
                      Upgrade to Yearly
                    </a>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time. You'll continue to have access until the end of
                  your billing period.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Are my files secure?</h3>
                <p className="text-gray-600">
                  Absolutely. All files are processed securely and deleted immediately after processing. We never store
                  or access your documents.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">
                  We accept all major credit cards through Stripe, including Visa, MasterCard, American Express, and
                  more.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-gray-600">
                  Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
