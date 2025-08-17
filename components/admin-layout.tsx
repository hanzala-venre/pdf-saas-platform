"use client"

import type React from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, Home, Users, Activity, TrendingUp, Menu, X, Shield, CreditCard, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: RefreshCw },
  { name: "Operations", href: "/admin/operations", icon: Activity },
  { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <Link href="/admin" className="flex items-center gap-2 font-bold text-xl">
                <Shield className="h-8 w-8 text-red-600" />
                <span className="text-red-600">Admin Panel</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-100",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-5 w-5" />
                  Back to App
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:border-r">
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-xl">
            <Shield className="h-8 w-8 text-red-600" />
            <span className="text-red-600">Admin Panel</span>
          </Link>
        </div>
        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-100",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
          <div className="pt-4 border-t">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FileText className="h-5 w-5" />
              Back to App
            </Link>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center gap-4 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || ""} />
                      <AvatarFallback>{session?.user?.name?.charAt(0) || "A"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session?.user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{session?.user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">User Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
