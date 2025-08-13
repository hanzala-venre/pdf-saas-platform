"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Search, MoreHorizontal, UserX, Download, Filter } from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface User {
  id: string
  name: string | null
  email: string
  subscription: string
  role: string
  createdAt: string
  _count: {
    pdfOperations: number
  }
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionType, setActionType] = useState<"suspend" | "delete" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers()
    }
  }, [session])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, subscriptionFilter])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (subscriptionFilter !== "all") {
      filtered = filtered.filter((user) => user.subscription === subscriptionFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleUserAction = async (action: "suspend" | "delete") => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: action === "delete" ? "DELETE" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: action === "suspend" ? JSON.stringify({ action: "suspend" }) : undefined,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${action === "delete" ? "deleted" : "suspended"} successfully.`,
        })
        fetchUsers()
      } else {
        throw new Error(`Failed to ${action} user`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} user. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setSelectedUser(null)
      setActionType(null)
    }
  }

  const exportUsers = async () => {
    try {
      const response = await fetch("/api/admin/users/export")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "users-export.csv"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export Complete",
        description: "Users data has been exported successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export users data.",
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

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all registered users and their subscriptions</p>
          </div>
          <Button onClick={exportUsers} variant="outline" className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription>Complete list of registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name || "Anonymous"}</p>
                        {user.role === "ADMIN" && (
                          <Badge variant="destructive" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(user.createdAt).toLocaleDateString()} • {user._count.pdfOperations} operations
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        user.subscription === "free"
                          ? "secondary"
                          : user.subscription === "monthly"
                            ? "default"
                            : "default"
                      }
                      className={user.subscription === "yearly" ? "bg-green-600" : ""}
                    >
                      {user.subscription}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>View Operations</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user)
                            setActionType("suspend")
                          }}
                          className="text-orange-600"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Suspend User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user)
                            setActionType("delete")
                          }}
                          className="text-red-600"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Confirmation Dialog */}
        <AlertDialog
          open={!!selectedUser && !!actionType}
          onOpenChange={() => {
            setSelectedUser(null)
            setActionType(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actionType === "delete" ? "Delete User" : "Suspend User"}</AlertDialogTitle>
              <AlertDialogDescription>
                {actionType === "delete"
                  ? `Are you sure you want to permanently delete ${selectedUser?.name || selectedUser?.email}? This action cannot be undone.`
                  : `Are you sure you want to suspend ${selectedUser?.name || selectedUser?.email}? They will no longer be able to access their account.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => actionType && handleUserAction(actionType)}
                className={
                  actionType === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                }
              >
                {actionType === "delete" ? "Delete User" : "Suspend User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
