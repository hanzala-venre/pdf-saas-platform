"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, AlertTriangle } from "lucide-react"

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession()
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  // Check if user is admin
  const isAdmin = (session as any)?.user?.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-800">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page. Admin privileges are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              If you believe this is an error, please contact the system administrator.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Current user: {session?.user?.email}</p>
              <p className="text-xs text-gray-500">Role: {(session as any)?.user?.role || 'USER'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is admin, render children
  return <>{children}</>
}

export function AdminBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
      <Shield className="h-3 w-3" />
      Admin
    </div>
  )
}
