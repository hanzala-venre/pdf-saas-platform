"use client"

import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Merge,
  Split,
  FileArchiveIcon as Compress,
  Edit,
  TrendingUp,
  Calendar,
  Crown,
  Plus,
  FileType,
  Image,
  ArrowUpDown,
  Monitor,
  Table,
  Clock,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAnalytics } from "@/hooks/use-analytics"

interface DashboardStats {
  operationsThisMonth: number
  operationsLimit: number
  subscription: string
  subscriptionStatus: string
  currentPeriodEnd: string | null
  recentOperations: Array<{
    id: string
    type: string
    fileName: string
    createdAt: string
    status: string
  }>
}

interface SubscriptionInfo {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId: string | null
  paymentProcessing?: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const { trackPageView } = useAnalytics()

  useEffect(() => {
    trackPageView("dashboard")
  }, [trackPageView])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session?.user])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, subscriptionResponse] = await Promise.all([
        fetch("/api/user/stats"),
        fetch("/api/billing/subscription")
      ])
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setSubscriptionInfo(subscriptionData)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const userSession = session as Session | null
  
  // Use subscription info from billing API for more accurate data
  const currentPlan = subscriptionInfo?.plan || stats?.subscription || "free"
  const subscriptionStatus = subscriptionInfo?.status || stats?.subscriptionStatus || "inactive"
  const isPaymentProcessing = subscriptionStatus === "incomplete" || subscriptionStatus === "incomplete_expired" || subscriptionInfo?.paymentProcessing
  const isPaidUser = (currentPlan !== "free" && subscriptionStatus === "active") || isPaymentProcessing
  
  // Format plan name for display
  const getPlanDisplayName = (plan: string) => {
    if (isPaymentProcessing) {
      return "Payment Processing..."
    }
    switch (plan) {
      case "monthly":
        return "Pro Monthly"
      case "yearly":
        return "Pro Yearly"
      case "free":
        return "Free Plan"
      default:
        return "Free Plan"
    }
  }

  const getPlanBadgeColor = (plan: string, status: string) => {
    if (isPaymentProcessing) {
      return "secondary"
    }
    if (plan === "free" || status !== "active") {
      return "secondary"
    }
    return "default"
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userSession) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {userSession?.user?.name || "User"}!</h1>
            <p className="text-gray-600 mt-1">Manage your PDF operations and track your usage</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getPlanBadgeColor(currentPlan, subscriptionStatus)} 
              className={isPaidUser && !isPaymentProcessing ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white" : isPaymentProcessing ? "bg-orange-500 text-white animate-pulse" : ""}
            >
              {isPaymentProcessing ? (
                <>
                  <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing Payment...
                </>
              ) : isPaidUser && !isPaymentProcessing ? (
                <>
                  <Crown className="mr-1 h-3 w-3" />
                  {getPlanDisplayName(currentPlan)}
                </>
              ) : (
                "Free Plan"
              )}
            </Badge>
            {(!isPaidUser || isPaymentProcessing) && (
              <Button size="sm" asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" disabled={isPaymentProcessing}>
                {isPaymentProcessing ? (
                  <span>Processing...</span>
                ) : (
                  <Link href="/pricing">
                    <Plus className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Link>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Subscription Status Card */}
        <Card className={isPaidUser && !isPaymentProcessing ? "bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200" : isPaymentProcessing ? "bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isPaidUser && !isPaymentProcessing ? "text-purple-600" : isPaymentProcessing ? "text-orange-600" : "text-gray-400"}`} />
              Subscription Status
            </CardTitle>
            <CardDescription>
              {isPaymentProcessing 
                ? "Your payment is being processed. This may take a few moments."
                : isPaidUser 
                ? "Your Pro subscription is active" 
                : "Upgrade to unlock all features"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg">{getPlanDisplayName(currentPlan)}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    Status: {isPaymentProcessing ? "Processing" : subscriptionStatus}
                  </p>
                  {isPaymentProcessing && (
                    <p className="text-sm text-orange-600 mt-1">
                      <div className="inline-block mr-2 h-3 w-3 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
                      Payment confirmation in progress...
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {isPaidUser && subscriptionInfo?.currentPeriodEnd ? (
                    <div>
                      <p className="text-sm text-gray-600">Next billing</p>
                      <p className="font-medium">
                        {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}
                      </p>
                      {subscriptionInfo.cancelAtPeriodEnd && (
                        <Badge variant="destructive" className="mt-1">
                          Cancelling
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Button asChild size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600">
                      <Link href="/pricing">Choose Plan</Link>
                    </Button>
                  )}
                </div>
              </div>
              {isPaidUser && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/billing">Manage Billing</Link>
                  </Button>
                  {currentPlan === "monthly" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/api/stripe/checkout?plan=yearly">Upgrade to Yearly</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>Your PDF processing usage for the current billing period</CardDescription>
          </CardHeader>
          <CardContent>
            {stats && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {stats.operationsThisMonth} PDFs processed this month
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    Resets on: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Merge className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Merge PDFs</CardTitle>
              <CardDescription>Combine multiple PDF files</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/merge">Start Merging</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Split className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Split PDFs</CardTitle>
              <CardDescription>Extract pages from PDFs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/split">Start Splitting</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileType className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Image to PDF</CardTitle>
              <CardDescription>Convert images to PDF</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/image-to-pdf">Start Converting</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Image className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>PDF to Image</CardTitle>
              <CardDescription>Convert PDF to images</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/pdf-to-image">Start Converting</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Compress className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Compress PDFs</CardTitle>
              <CardDescription>Reduce file size</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/compress">Start Compressing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Edit className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>PDF Editor</CardTitle>
              <CardDescription>Advanced PDF editor with professional tools</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/react-editor">Start Editing</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Processing History</CardTitle>
              <CardDescription>View your recent PDF operations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/history">View History</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Rearrange Pages</CardTitle>
              <CardDescription>Reorder PDF pages</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/rearrange">Start Rearranging</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileType className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>PDF to Word</CardTitle>
              <CardDescription>Convert PDF to Word document</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/pdf-to-word">Start Converting</Link>
              </Button>
            </CardContent>
          </Card>

          {/* PDF to Excel removed */}

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Monitor className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>PDF to PowerPoint</CardTitle>
              <CardDescription>Convert PDF to presentation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/tools/pdf-to-powerpoint">Start Converting</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Operations
            </CardTitle>
            <CardDescription>Your latest PDF processing activities</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentOperations && stats.recentOperations.length > 0 ? (
              <div className="space-y-4">
                {stats.recentOperations.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{operation.type}</p>
                        <p className="text-sm text-gray-600">{operation.fileName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          operation.status === "COMPLETED"
                            ? "default"
                            : operation.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {operation.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{new Date(operation.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No operations yet</p>
                <p className="text-sm">Start by using one of our PDF tools above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
