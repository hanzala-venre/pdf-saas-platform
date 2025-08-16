import { useState, useEffect } from 'react'

interface OneTimePaymentData {
  oneTimePaid: boolean
  timestamp: number
  creditsRemaining: number
  purchaseId: string // Unique ID for each purchase to prevent conflicts
}

const ONE_TIME_STORAGE_KEY = 'oneTimeWatermarkRemoval'
const ONE_TIME_CREDITS = 1 // Single use only

export function useOneTimePayment() {
  const [hasOneTimeAccess, setHasOneTimeAccess] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user has valid one-time access
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }
    
    try {
      const savedData = localStorage.getItem(ONE_TIME_STORAGE_KEY)
      if (savedData) {
        const data: OneTimePaymentData = JSON.parse(savedData)
        
        // Check if the user has remaining credits
        if (data.oneTimePaid && data.creditsRemaining > 0) {
          setHasOneTimeAccess(true)
          setCreditsRemaining(data.creditsRemaining)
        } else {
          // Remove used up credits
          localStorage.removeItem(ONE_TIME_STORAGE_KEY)
          setHasOneTimeAccess(false)
          setCreditsRemaining(0)
        }
      }
    } catch (error) {
      console.error('Error loading one-time payment data:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ONE_TIME_STORAGE_KEY)
      }
      setHasOneTimeAccess(false)
      setCreditsRemaining(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const activateOneTimeAccess = (purchaseId?: string) => {
    if (typeof window === 'undefined') return
    
    const now = Date.now()
    const id = purchaseId || `purchase_${now}_${Math.random().toString(36).substr(2, 9)}`
    
    const data: OneTimePaymentData = {
      oneTimePaid: true,
      timestamp: now,
      creditsRemaining: ONE_TIME_CREDITS,
      purchaseId: id
    }
    
    localStorage.setItem(ONE_TIME_STORAGE_KEY, JSON.stringify(data))
    setHasOneTimeAccess(true)
    setCreditsRemaining(ONE_TIME_CREDITS)
  }

  const consumeOneTimeCredit = (): boolean => {
    if (typeof window === 'undefined') return false
    
    try {
      const savedData = localStorage.getItem(ONE_TIME_STORAGE_KEY)
      if (savedData) {
        const data: OneTimePaymentData = JSON.parse(savedData)
        
        if (data.oneTimePaid && data.creditsRemaining > 0) {
          // Consume one credit
          const updatedData = {
            ...data,
            creditsRemaining: data.creditsRemaining - 1
          }
          
          if (updatedData.creditsRemaining > 0) {
            localStorage.setItem(ONE_TIME_STORAGE_KEY, JSON.stringify(updatedData))
            setCreditsRemaining(updatedData.creditsRemaining)
          } else {
            // No credits left, remove access
            localStorage.removeItem(ONE_TIME_STORAGE_KEY)
            setHasOneTimeAccess(false)
            setCreditsRemaining(0)
          }
          
          return true
        }
      }
    } catch (error) {
      console.error('Error consuming one-time credit:', error)
    }
    return false
  }

  const clearOneTimeAccess = () => {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(ONE_TIME_STORAGE_KEY)
    setHasOneTimeAccess(false)
    setCreditsRemaining(0)
  }

  const getCreditsStatus = (): { hasCredits: boolean; remaining: number; purchaseId?: string } => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        return { hasCredits: false, remaining: 0 }
      }
      
      const savedData = localStorage.getItem(ONE_TIME_STORAGE_KEY)
      if (savedData) {
        const data: OneTimePaymentData = JSON.parse(savedData)
        return {
          hasCredits: data.creditsRemaining > 0,
          remaining: data.creditsRemaining,
          purchaseId: data.purchaseId
        }
      }
    } catch (error) {
      console.error('Error getting credits status:', error)
    }
    return {
      hasCredits: false,
      remaining: 0
    }
  }

  const markCreditAsConsumed = () => {
    if (typeof window === 'undefined') return
    
    // This is called when server confirms credit consumption
    localStorage.removeItem(ONE_TIME_STORAGE_KEY)
    setHasOneTimeAccess(false)
    setCreditsRemaining(0)
  }

  return {
    hasOneTimeAccess,
    creditsRemaining,
    isLoading,
    activateOneTimeAccess,
    consumeOneTimeCredit,
    clearOneTimeAccess,
    getCreditsStatus,
    markCreditAsConsumed,
    // Legacy methods for backward compatibility
    getTimeRemaining: () => 0,
    getTimeRemainingFormatted: () => creditsRemaining > 0 ? '1 use remaining' : 'No uses remaining'
  }
}
