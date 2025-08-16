import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl
    const token = request.nextauth.token

    // Redirect authenticated users away from auth pages
    if (token && (pathname.startsWith("/auth/signin") || pathname.startsWith("/auth/signup"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

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
        const { pathname } = req.nextUrl
        
        // Allow auth pages for non-authenticated users
        if (pathname.startsWith("/auth/")) {
          return true
        }
        
        // Admin routes need special handling
        if (pathname.startsWith("/admin")) {
          return !!token && token.role === "ADMIN"
        }
        
        // Allow access to tools for everyone (logged in or not)
        if (pathname.startsWith("/tools")) {
          return true
        }
        
        // Require authentication for dashboard, settings, and billing
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/settings") ||
          pathname.startsWith("/billing")
        ) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/tools/:path*", "/settings/:path*", "/billing/:path*", "/admin/:path*", "/auth/:path*"],
}
