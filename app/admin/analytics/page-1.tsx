"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign, 
  Eye, 
  MousePointer, 
  Clock, 
  Target,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Calendar
} from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Line, LineChart, Bar, BarChart, Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { UserAnalytics, OperationAnalytics } from "@/types/admin"
import type { Session } from "next-auth"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff']

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession()
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null)
  const [operationAnalytics, setOperationAnalytics] = useState<OperationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const { toast } = useToast()

  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchAnalytics()
    }
  }, [adminSession, timeRange])

  const fetchAnalytics = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`)
      const data = await response.json()

      if (response.ok) {
        setUserAnalytics(data.userAnalytics)
        setOperationAnalytics(data.operationAnalytics)
      } else {
        throw new Error(data.error || "Failed to fetch analytics")
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
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
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Advanced Analytics
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={fetchAnalytics} 
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAnalytics?.totalUsers || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +{userAnalytics?.newUsersThisMonth || 0} this month
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userAnalytics?.activeUsers || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Eye className="h-3 w-3 mr-1" />
                {userAnalytics?.totalUsers ? Math.round((userAnalytics.activeUsers / userAnalytics.totalUsers) * 100) : 0}% of total users
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDF Operations</CardTitle>
              <FileText className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operationAnalytics?.totalOperations || 0}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Target className="h-3 w-3 mr-1 text-green-500" />
                {operationAnalytics?.successRate || 0}% success rate
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operationAnalytics?.averageProcessingTime || 0}s</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <MousePointer className="h-3 w-3 mr-1" />
                Processing performance
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Growth Over Time
            </CardTitle>
            <CardDescription>Daily user registration and cumulative growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={userAnalytics?.userGrowthData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                  name="Total Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#82ca9d" 
                  strokeWidth={2} 
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Operations Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operations by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Operations by Type
              </CardTitle>
              <CardDescription>Distribution of PDF processing operations</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={operationAnalytics?.operationsByType || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(operationAnalytics?.operationsByType || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Operation Success Rate Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Success Rate Trend
              </CardTitle>
              <CardDescription>Operation success rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={operationAnalytics?.operationsOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Success Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Subscription Distribution
            </CardTitle>
            <CardDescription>User distribution across subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userAnalytics?.subscriptionDistribution?.map((plan, index) => (
                <div key={plan.plan} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{plan.plan}</span>
                    <span>{plan.count} users ({plan.percentage}%)</span>
                  </div>
                  <Progress 
                    value={plan.percentage} 
                    className="h-2"
                    style={{
                      ['--progress-background' as any]: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              )) || <p className="text-gray-500">No subscription data available</p>}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userAnalytics?.newUsersToday || 0}</div>
              <p className="text-sm text-gray-600">New Users Today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userAnalytics?.newUsersThisWeek || 0}</div>
              <p className="text-sm text-gray-600">New Users This Week</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{operationAnalytics?.operationsToday || 0}</div>
              <p className="text-sm text-gray-600">Operations Today</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{operationAnalytics?.operationsThisWeek || 0}</div>
              <p className="text-sm text-gray-600">Operations This Week</p>
            </CardContent>
          </Card>
        </div>

        {/* Operations Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Type Details</CardTitle>
            <CardDescription>Detailed breakdown of PDF processing operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Operation Type</th>
                    <th className="text-right p-2">Total Count</th>
                    <th className="text-right p-2">Percentage</th>
                    <th className="text-right p-2">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {operationAnalytics?.operationsByType?.map((operation) => (
                    <tr key={operation.type} className="border-b">
                      <td className="p-2 font-medium">{operation.type}</td>
                      <td className="p-2 text-right">{operation.count.toLocaleString()}</td>
                      <td className="p-2 text-right">{operation.percentage}%</td>
                      <td className="p-2 text-right">
                        <Badge variant={operation.percentage > 95 ? "default" : operation.percentage > 80 ? "secondary" : "destructive"}>
                          {operation.percentage}%
                        </Badge>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-gray-500">
                        No operation data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
