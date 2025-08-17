import { useSubscription } from "./use-subscription"
import { useOneTimePayment } from "./use-one-time-payment"
import { PDFToolAPI } from "@/lib/pdf-tool-access"

export interface PDFToolAccess {
  subscription: any
  subscriptionLoading: boolean
  hasOneTimeAccess: boolean
  hasWatermarkFreeAccess: boolean
  accessType: 'subscription' | 'oneTime' | 'free' | 'admin'
  creditsRemaining: number
  apiClient: PDFToolAPI
  consumeCredit: () => boolean
  purchaseId?: string
  isAdmin: boolean
}

/**
 * Combined hook for PDF tools that provides all access-related information
 */
export function usePDFToolAccess(): PDFToolAccess {
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { 
    hasOneTimeAccess, 
    creditsRemaining, 
    consumeOneTimeCredit, 
    getCreditsStatus,
    markCreditAsConsumed
  } = useOneTimePayment()

  // Determine if user has watermark-free access
  const isAdmin = subscription?.isAdmin ?? false
  const hasWatermarkFreeAccess = (subscription?.isPaidUser || hasOneTimeAccess || isAdmin) ?? false

  // Determine access type
  let accessType: 'subscription' | 'oneTime' | 'free' | 'admin' = 'free'
  if (isAdmin) {
    accessType = 'admin'
  } else if (subscription?.isPaidUser) {
    accessType = 'subscription'
  } else if (hasOneTimeAccess) {
    accessType = 'oneTime'
  }

  // Get purchase ID for one-time access
  const { purchaseId } = getCreditsStatus()

  // Create API client with automatic credit management
  const apiClient = new PDFToolAPI(hasOneTimeAccess, purchaseId, markCreditAsConsumed)

  return {
    subscription,
    subscriptionLoading,
    hasOneTimeAccess,
    hasWatermarkFreeAccess,
    accessType,
    creditsRemaining,
    apiClient,
    consumeCredit: consumeOneTimeCredit,
    purchaseId,
    isAdmin
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
