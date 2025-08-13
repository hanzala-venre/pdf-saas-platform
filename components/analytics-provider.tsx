"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { event } from "@/lib/gtag"

interface AnalyticsContextType {
  trackEvent: (action: string, category: string, label?: string, value?: number) => void
  trackPDFOperation: (operation: string, fileCount?: number) => void
  trackSubscriptionEvent: (action: string, plan?: string) => void
  trackUserAction: (action: string, label?: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()

  const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    event({ action, category, label, value })

    // Also send user context if available
    if (session?.user) {
      event({
        action: `${action}_with_context`,
        category,
        label: `${label || ""}_${session.user.subscription || "free"}`,
        value,
      })
    }
  }

  const trackPDFOperation = (operation: string, fileCount?: number) => {
    trackEvent("pdf_operation", "tools", operation, fileCount)
  }

  const trackSubscriptionEvent = (action: string, plan?: string) => {
    trackEvent(action, "subscription", plan)
  }

  const trackUserAction = (action: string, label?: string) => {
    trackEvent(action, "user", label)
  }

  return (
    <AnalyticsContext.Provider
      value={{
        trackEvent,
        trackPDFOperation,
        trackSubscriptionEvent,
        trackUserAction,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error("useAnalyticsContext must be used within an AnalyticsProvider")
  }
  return context
}
