"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Search, Filter, Download, RefreshCw, ExternalLink } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StripePayment } from "@/types/admin"
import type { Session } from "next-auth"

export default function AdminPaymentsPage() {
  const { data: session, status } = useSession()
  const [payments, setPayments] = useState<StripePayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<StripePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [hasMore, setHasMore] = useState(false)
  const { toast } = useToast()

  const adminSession = session as Session | null

  useEffect(() => {
    if (adminSession?.user?.role === "ADMIN") {
      fetchPayments()
    }
  }, [adminSession])

  useEffect(() => {
    filterPayments()
  }, [payments, searchTerm, statusFilter])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/admin/stripe/payments?limit=100")
      const data = await response.json()
      
      if (response.ok) {
        setPayments(data.payments)
        setHasMore(data.hasMore)
      } else {
        throw new Error(data.error || "Failed to fetch payments")
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      toast({
        title: "Error",
        description: "Failed to load payments.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter)
    }

    setFilteredPayments(filtered)
  }

  const exportPayments = () => {
    const csvContent = [
      ["Payment ID", "Customer Email", "Customer Name", "Amount", "Currency", "Status", "Description", "Date"].join(","),
      ...filteredPayments.map(payment => [
        payment.id,
        payment.customerEmail,
        payment.customerName || "N/A",
        payment.amount,
        payment.currency,
        payment.status,
        payment.description,
        new Date(payment.created * 1000).toISOString()
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stripe-payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'secondary'
      case 'canceled':
        return 'secondary'
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

  const totalAmount = filteredPayments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0)

  const successfulPayments = filteredPayments.filter(p => p.status === 'succeeded').length
  const failedPayments = filteredPayments.filter(p => p.status === 'failed').length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-green-600" />
              Payment Management
            </h1>
            <p className="text-gray-600 mt-1">Monitor and manage all Stripe payment transactions</p>
          </div>
          <Button onClick={fetchPayments} className="bg-green-600 hover:bg-green-700">
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
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold">{filteredPayments.length}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {payments.length}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{successfulPayments}</p>
                </div>
                <Badge variant="default">
                  {payments.length > 0 ? Math.round((successfulPayments / payments.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{failedPayments}</p>
                </div>
                <Badge variant="destructive">
                  {payments.length > 0 ? Math.round((failedPayments / payments.length) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer email, name, or payment ID..."
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
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={exportPayments} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
              {hasMore && " (showing first 100)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.id.slice(0, 20)}...
                      </TableCell>
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
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.description}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created * 1000).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          asChild
                        >
                          <a 
                            href={`https://dashboard.stripe.com/payments/${payment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredPayments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No payments found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
