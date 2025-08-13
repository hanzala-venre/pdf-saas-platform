import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.nextauth.token

    // Admin routes require ADMIN role
    if (pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    // This function will run only if the user is authenticated
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Admin routes need special handling
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token && token.role === "ADMIN"
        }
        
        // Allow access to tools for everyone (logged in or not)
        if (req.nextUrl.pathname.startsWith("/tools")) {
          return true
        }
        
        // Require authentication for dashboard, settings, and billing
        if (
          req.nextUrl.pathname.startsWith("/dashboard") ||
          req.nextUrl.pathname.startsWith("/settings") ||
          req.nextUrl.pathname.startsWith("/billing")
        ) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/tools/:path*", "/settings/:path*", "/billing/:path*", "/admin/:path*"],
}
