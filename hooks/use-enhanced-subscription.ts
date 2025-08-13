import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useOneTimePayment } from "./use-one-time-payment"

export interface UserSubscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  isPaidUser: boolean
  isExpired: boolean
  hasWatermarkFreeAccess: boolean // Includes both subscription and one-time access
  accessType: 'subscription' | 'oneTime' | 'free'
}

export function useEnhancedSubscription() {
  const { data: session } = useSession()
  const { hasOneTimeAccess } = useOneTimePayment()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
      // For guests, only check one-time access
      setSubscription({
        plan: "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isPaidUser: false,
        isExpired: false,
        hasWatermarkFreeAccess: hasOneTimeAccess,
        accessType: hasOneTimeAccess ? 'oneTime' : 'free'
      })
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/billing/subscription")
        
        if (!response.ok) {
          throw new Error("Failed to fetch subscription")
        }

        const data = await response.json()
        
        // Calculate if user is paid and if subscription is expired
        const now = new Date()
        const isExpired = data.currentPeriodEnd && now > new Date(data.currentPeriodEnd)
        const effectivePlan = isExpired ? "free" : data.plan
        const isPaidUser = effectivePlan === "monthly" || effectivePlan === "yearly"
        
        // Determine access type and watermark-free status
        let accessType: 'subscription' | 'oneTime' | 'free' = 'free'
        let hasWatermarkFreeAccess = false

        if (isPaidUser) {
          accessType = 'subscription'
          hasWatermarkFreeAccess = true
        } else if (hasOneTimeAccess) {
          accessType = 'oneTime'
          hasWatermarkFreeAccess = true
        }
        
        setSubscription({
          ...data,
          isPaidUser,
          isExpired,
          hasWatermarkFreeAccess,
          accessType
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch subscription")
        // Set default with one-time access consideration
        setSubscription({
          plan: "free",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isPaidUser: false,
          isExpired: false,
          hasWatermarkFreeAccess: hasOneTimeAccess,
          accessType: hasOneTimeAccess ? 'oneTime' : 'free'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [session, hasOneTimeAccess])

  return { 
    subscription, 
    loading, 
    error, 
    refetch: () => {
      setLoading(true)
      setError(null)
    }
  }
}
