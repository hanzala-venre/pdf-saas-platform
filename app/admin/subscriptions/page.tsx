"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search, X, ExternalLink, AlertTriangle } from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StripeSubscription } from "@/types/admin"
import type { Session } from "next-auth"

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession()
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<StripeSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; subscription?: StripeSubscription }>({ open: false })
  const { toast } = useToast()

  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchSubscriptions()
    }
  }, [adminSession])

  useEffect(() => {
    filterSubscriptions()
  }, [subscriptions, searchTerm, statusFilter])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/admin/stripe/subscriptions?limit=100")
      const data = await response.json()
      
      if (response.ok) {
        setSubscriptions(data.subscriptions)
      } else {
        throw new Error(data.error || "Failed to fetch subscriptions")
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
      toast({
        title: "Error",
        description: "Failed to load subscriptions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterSubscriptions = () => {
    let filtered = subscriptions

    if (searchTerm) {
      filtered = filtered.filter(
        (subscription) =>
          subscription.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subscription.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subscription.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((subscription) => subscription.status === statusFilter)
    }

    setFilteredSubscriptions(filtered)
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch("/api/admin/stripe/subscriptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
          cancelAtPeriodEnd: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Subscription will be canceled at the end of the current period.",
        })
        fetchSubscriptions() // Refresh data
      } else {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel subscription")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'canceled':
        return 'secondary'
      case 'incomplete':
        return 'destructive'
      case 'incomplete_expired':
        return 'destructive'
      case 'past_due':
        return 'destructive'
      case 'unpaid':
        return 'destructive'
      default:
        return 'secondary'
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

  const activeSubscriptions = filteredSubscriptions.filter(s => s.status === 'active').length
  const canceledSubscriptions = filteredSubscriptions.filter(s => s.status === 'canceled').length
  const totalMRR = filteredSubscriptions
    .filter(s => s.status === 'active' && s.interval === 'month')
    .reduce((sum, s) => sum + s.planAmount, 0) / 100

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <RefreshCw className="h-8 w-8 text-purple-600" />
              Subscription Management
            </h1>
            <p className="text-gray-600 mt-1">Monitor and manage all active subscriptions</p>
          </div>
          <Button onClick={fetchSubscriptions} className="bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Subscriptions</p>
                  <p className="text-2xl font-bold">{filteredSubscriptions.length}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeSubscriptions}</p>
                </div>
                <Badge variant="default">
                  {filteredSubscriptions.length > 0 ? Math.round((activeSubscriptions / filteredSubscriptions.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Canceled</p>
                  <p className="text-2xl font-bold text-red-600">{canceledSubscriptions}</p>
                </div>
                <Badge variant="secondary">
                  {filteredSubscriptions.length > 0 ? Math.round((canceledSubscriptions / filteredSubscriptions.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monthly MRR</p>
                  <p className="text-2xl font-bold">${totalMRR.toFixed(2)}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  MRR
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer email, name, or subscription ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Period</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-mono text-sm">
                        {subscription.id.slice(0, 20)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{subscription.customerName || "Anonymous"}</p>
                          <p className="text-sm text-gray-500">{subscription.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{subscription.planName}</p>
                          <p className="text-sm text-gray-500">
                            ${subscription.planAmount / 100}/{subscription.interval}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(subscription.status)}>
                            {subscription.status}
                          </Badge>
                          {subscription.cancelAtPeriodEnd && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(subscription.currentPeriodStart * 1000).toLocaleDateString()}</p>
                          <p className="text-gray-500">to {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(subscription.created * 1000).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://dashboard.stripe.com/subscriptions/${subscription.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View in Stripe
                              </a>
                            </DropdownMenuItem>
                            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                              <DropdownMenuItem
                                onClick={() => setCancelDialog({ open: true, subscription })}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel Subscription
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredSubscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No subscriptions found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription for "{cancelDialog.subscription?.customerEmail}"? 
              The subscription will remain active until the end of the current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelDialog.subscription) {
                  handleCancelSubscription(cancelDialog.subscription.id)
                  setCancelDialog({ open: false })
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
