"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, FileText, TrendingUp, DollarSign, Activity, RefreshCw, ShieldCheck } from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type { AdminStats, RecentUser, RecentOperation } from "@/types/admin"
import type { Session } from "next-auth"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Type-safe session casting
  const adminSession = session as Session | null

  useEffect(() => {
    console.log("🔍 Admin dashboard useEffect - session:", adminSession?.user)
    if (adminSession?.user?.role === "ADMIN") {
      console.log("✅ User is admin, fetching data...")
      fetchDashboardData()
    } else {
      console.log("❌ User is not admin:", adminSession?.user?.role)
      setLoading(false)
    }
  }, [adminSession])

  const fetchDashboardData = async () => {
    console.log("🔍 Starting to fetch dashboard data...")
    setRefreshing(true)
    
    try {
      // Fetch stats first
      console.log("📊 Fetching admin stats...")
      const statsResponse = await fetch("/api/admin/stats")
      console.log("📊 Stats response status:", statsResponse.status)
      
      if (!statsResponse.ok) {
        const errorData = await statsResponse.json()
        console.error("❌ Stats API error:", errorData)
        throw new Error(`Stats API failed: ${errorData.error}`)
      }
      
      const statsData = await statsResponse.json()
      console.log("📊 Stats data received:", statsData)
      setStats(statsData)

      // Try to fetch dashboard data
      try {
        console.log("📋 Fetching dashboard data...")
        const dashboardResponse = await fetch("/api/admin/dashboard")
        console.log("📋 Dashboard response status:", dashboardResponse.status)
        
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          console.log("📋 Dashboard data received:", dashboardData)
          setRecentUsers(dashboardData.recentUsers || [])
          setRecentOperations(dashboardData.recentOperations || [])
        } else {
          console.warn("⚠️ Dashboard API failed, continuing with stats only")
        }
      } catch (dashboardError) {
        console.warn("⚠️ Dashboard fetch failed:", dashboardError)
      }
      
      console.log("✅ Dashboard data loaded successfully!")
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load some dashboard data. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!adminSession || adminSession.user?.role !== "ADMIN") {
    console.log("🚫 Redirecting non-admin user to dashboard")
    redirect("/dashboard")
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-red-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Platform monitoring and management</p>
          </div>
          <Button 
            onClick={fetchDashboardData} 
            disabled={refreshing}
            className="bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Debug Info */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p><strong>User:</strong> {adminSession?.user?.email}</p>
              <p><strong>Role:</strong> {adminSession?.user?.role}</p>
              <p><strong>Session Status:</strong> {status}</p>
              <p><strong>Stats Loaded:</strong> {stats ? "✅ Yes" : "❌ No"}</p>
              <p><strong>Users Count:</strong> {recentUsers.length}</p>
              <p><strong>Operations Count:</strong> {recentOperations.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">+{stats?.newUsersThisMonth || 0} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.subscriptionGrowth || 0}% growth</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.monthlyRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">+{stats?.revenueGrowth || 0}% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF Operations</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOperations || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.operationsThisMonth || 0} this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Users ({recentUsers.length})
              </CardTitle>
              <CardDescription>Latest user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUsers.length > 0 ? (
                <div className="space-y-4">
                  {recentUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "Anonymous"}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={user.subscription === "free" ? "secondary" : "default"}>
                          {user.subscription}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent users data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Operations ({recentOperations.length})
              </CardTitle>
              <CardDescription>Latest PDF processing activities</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOperations.length > 0 ? (
                <div className="space-y-4">
                  {recentOperations.slice(0, 5).map((operation) => (
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
                <p className="text-gray-500 text-center py-4">No recent operations data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent" asChild>
                <a href="/admin/users">
                  <Users className="h-6 w-6" />
                  <span>Manage Users</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent" asChild>
                <a href="/admin/payments">
                  <DollarSign className="h-6 w-6" />
                  <span>View Payments</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent" asChild>
                <a href="/admin/analytics">
                  <TrendingUp className="h-6 w-6" />
                  <span>Analytics</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2 bg-transparent" asChild>
                <a href="/admin/settings">
                  <Activity className="h-6 w-6" />
                  <span>Settings</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
