import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export interface UserSubscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  isPaidUser: boolean
  isExpired: boolean
}

export function useSubscription() {
  const { data: session } = useSession()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) {
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
        
        setSubscription({
          ...data,
          isPaidUser,
          isExpired
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch subscription")
        // Set default free plan on error
        setSubscription({
          plan: "free",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isPaidUser: false,
          isExpired: false
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [session])

  return { subscription, loading, error, refetch: () => {
    if (session) {
      setLoading(true)
      setError(null)
    }
  }}
}
