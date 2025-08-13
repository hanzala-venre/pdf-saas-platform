import { useState, useEffect } from 'react'

interface OneTimePaymentData {
  oneTimePaid: boolean
  timestamp: number
  expiresAt: number
}

const ONE_TIME_STORAGE_KEY = 'oneTimeWatermarkRemoval'
const ONE_TIME_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export function useOneTimePayment() {
  const [hasOneTimeAccess, setHasOneTimeAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user has valid one-time access
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(ONE_TIME_STORAGE_KEY)
      if (savedData) {
        const data: OneTimePaymentData = JSON.parse(savedData)
        const now = Date.now()
        
        // Check if the one-time access is still valid (within 24 hours)
        if (data.oneTimePaid && now < data.expiresAt) {
          setHasOneTimeAccess(true)
        } else {
          // Remove expired access
          localStorage.removeItem(ONE_TIME_STORAGE_KEY)
          setHasOneTimeAccess(false)
        }
      }
    } catch (error) {
      console.error('Error loading one-time payment data:', error)
      localStorage.removeItem(ONE_TIME_STORAGE_KEY)
      setHasOneTimeAccess(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const activateOneTimeAccess = () => {
    const now = Date.now()
    const expiresAt = now + ONE_TIME_DURATION
    
    const data: OneTimePaymentData = {
      oneTimePaid: true,
      timestamp: now,
      expiresAt
    }
    
    localStorage.setItem(ONE_TIME_STORAGE_KEY, JSON.stringify(data))
    setHasOneTimeAccess(true)
  }

  const clearOneTimeAccess = () => {
    localStorage.removeItem(ONE_TIME_STORAGE_KEY)
    setHasOneTimeAccess(false)
  }

  const getTimeRemaining = (): number => {
    try {
      const savedData = localStorage.getItem(ONE_TIME_STORAGE_KEY)
      if (savedData) {
        const data: OneTimePaymentData = JSON.parse(savedData)
        return Math.max(0, data.expiresAt - Date.now())
      }
    } catch (error) {
      console.error('Error getting time remaining:', error)
    }
    return 0
  }

  const getTimeRemainingFormatted = (): string => {
    const remaining = getTimeRemaining()
    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return {
    hasOneTimeAccess,
    isLoading,
    activateOneTimeAccess,
    clearOneTimeAccess,
    getTimeRemaining,
    getTimeRemainingFormatted
  }
}
