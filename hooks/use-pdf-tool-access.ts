import { useSubscription } from "./use-subscription"
import { useOneTimePayment } from "./use-one-time-payment"

export interface PDFToolAccess {
  subscription: any
  subscriptionLoading: boolean
  hasOneTimeAccess: boolean
  hasWatermarkFreeAccess: boolean
  accessType: 'subscription' | 'oneTime' | 'free'
}

/**
 * Combined hook for PDF tools that provides all access-related information
 */
export function usePDFToolAccess(): PDFToolAccess {
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { hasOneTimeAccess } = useOneTimePayment()

  // Determine if user has watermark-free access
  const hasWatermarkFreeAccess = (subscription?.isPaidUser || hasOneTimeAccess) ?? false

  // Determine access type
  let accessType: 'subscription' | 'oneTime' | 'free' = 'free'
  if (subscription?.isPaidUser) {
    accessType = 'subscription'
  } else if (hasOneTimeAccess) {
    accessType = 'oneTime'
  }

  return {
    subscription,
    subscriptionLoading,
    hasOneTimeAccess,
    hasWatermarkFreeAccess,
    accessType
  }
}

/**
 * Helper function to create headers for PDF API calls
 */
export function createPDFApiHeaders(hasOneTimeAccess: boolean): HeadersInit {
  const headers: HeadersInit = {}
  if (hasOneTimeAccess) {
    headers['x-one-time-access'] = 'true'
  }
  return headers
}
