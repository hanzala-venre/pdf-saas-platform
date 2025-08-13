"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={15 * 60} // Refetch session every 15 minutes (reduced frequency)
      refetchOnWindowFocus={false} // Disable refetch on window focus to prevent loops
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </SessionProvider>
  )
}
