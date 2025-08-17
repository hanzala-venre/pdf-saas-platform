"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { Session } from "next-auth"
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  BarChart3,
  PieChart,
  Trash2,
  UserX,
  RefreshCw
} from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type { AdminStats, RecentUser, RecentOperation, StripePayment, RevenueData } from "@/types/admin"
import { Line, LineChart, Bar, BarChart, Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>([])
  const [recentPayments, setRecentPayments] = useState<StripePayment[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [stripeSubscriptions, setStripeSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false })
  const { toast } = useToast()

  // Type-safe session casting
  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchDashboardData()
    }
  }, [adminSession])

  const fetchDashboardData = async () => {
    setRefreshing(true)
    try {
      const [statsRes, dashboardRes, subscriptionsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/stripe/subscriptions?limit=20"),
      ])

      const [statsData, dashboardData, subscriptionsData] = await Promise.all([
        statsRes.json(),
        dashboardRes.json(),
        subscriptionsRes.json(),
      ])

      setStats(statsData)
      setRecentUsers(dashboardData.recentUsers)
      setRecentOperations(dashboardData.recentOperations)
      setRecentPayments(dashboardData.recentPayments)
      setRevenueData(dashboardData.revenueData)
      setStripeSubscriptions(subscriptionsData.subscriptions || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully.",
        })
        fetchDashboardData() // Refresh data
      } else {
        throw new Error("Failed to delete user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      })
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!adminSession || adminSession.user?.role !== "ADMIN") {
    redirect("/dashboard")
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
            <p className="text-gray-600 mt-1">Comprehensive platform monitoring and management</p>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +{stats?.newUsersThisMonth || 0} this month
              </div>
              <Progress value={75} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {(stats?.subscriptionGrowth || 0) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
                )}
                {stats?.subscriptionGrowth || 0}% growth
              </div>
              <Progress value={65} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.monthlyRevenue || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {(stats?.revenueGrowth || 0) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1 text-red-500" />
                )}
                {stats?.revenueGrowth || 0}% from last month
              </div>
              <Progress value={80} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF Operations</CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOperations || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Activity className="h-3 w-3 mr-1 text-blue-500" />
                {stats?.operationsThisMonth || 0} this month
              </div>
              <Progress value={90} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full mr-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-semibold">{stats?.conversionRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Churn Rate</p>
                  <p className="text-2xl font-semibold">{stats?.churnRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full mr-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">ARPU</p>
                  <p className="text-2xl font-semibold">${stats?.averageRevenuePerUser || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">New Users (Week)</p>
                  <p className="text-2xl font-semibold">{stats?.newUsersThisWeek || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenue Trends (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscription Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Subscription Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Free</span>
                    <span className="text-sm font-semibold">{(stats?.totalUsers || 0) - (stats?.activeSubscriptions || 0)}</span>
                  </div>
                  <Progress value={((stats?.totalUsers || 0) - (stats?.activeSubscriptions || 0)) / (stats?.totalUsers || 1) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Pro Monthly</span>
                    <span className="text-sm font-semibold">{Math.floor((stats?.activeSubscriptions || 0) * 0.7)}</span>
                  </div>
                  <Progress value={70} className="bg-green-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Pro Yearly</span>
                    <span className="text-sm font-semibold">{Math.floor((stats?.activeSubscriptions || 0) * 0.3)}</span>
                  </div>
                  <Progress value={30} className="bg-blue-100" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Users
                </span>
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin/users">View All</a>
                </Button>
              </CardTitle>
              <CardDescription>Latest user registrations and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.slice(0, 5).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || "Anonymous"}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscription === "free" ? "secondary" : "default"}>
                          {user.subscription}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => setDeleteDialog({ open: true, userId: user.id, userName: user.name || user.email })}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Stripe Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recent Payments
                </span>
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin/payments">View All</a>
                </Button>
              </CardTitle>
              <CardDescription>Latest Stripe payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.customerName || "Anonymous"}</p>
                          <p className="text-sm text-gray-500">{payment.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={payment.status === 'succeeded' ? 'default' : 
                                 payment.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(payment.created * 1000).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recent Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent PDF Operations
              </span>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/operations">View All</a>
              </Button>
            </CardTitle>
            <CardDescription>Latest PDF processing activities across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operation</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOperations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell>
                      <Badge variant="outline">{operation.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{operation.user.name || "Anonymous"}</p>
                        <p className="text-sm text-gray-500">{operation.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {operation.fileName}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(operation.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
                <a href="/admin/users">
                  <Users className="h-6 w-6" />
                  <span>Manage Users</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
                <a href="/admin/analytics">
                  <TrendingUp className="h-6 w-6" />
                  <span>Analytics</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
                <a href="/admin/payments">
                  <CreditCard className="h-6 w-6" />
                  <span>Payments</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
                <a href="/admin/subscriptions">
                  <RefreshCw className="h-6 w-6" />
                  <span>Subscriptions</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" asChild>
                <a href="/admin/operations">
                  <FileText className="h-6 w-6" />
                  <span>Operations</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user "{deleteDialog.userName}"
              and remove all their data from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.userId) {
                  handleDeleteUser(deleteDialog.userId)
                  setDeleteDialog({ open: false })
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
