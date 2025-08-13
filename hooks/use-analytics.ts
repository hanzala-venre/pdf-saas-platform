"use client"

import { event } from "@/lib/gtag"
import { useSession } from "next-auth/react"

export function useAnalytics() {
  const { data: session } = useSession()

  const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    event({ action, category, label, value })
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

  const trackPageView = (pageName: string) => {
    trackEvent("page_view", "navigation", pageName)
  }

  return {
    trackEvent,
    trackPDFOperation,
    trackSubscriptionEvent,
    trackUserAction,
    trackPageView,
  }
}
