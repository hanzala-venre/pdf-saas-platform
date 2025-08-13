"use client"

import { useSession as useNextAuthSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

export function useDebouncedSession(delay: number = 1000) {
  const { data: session, status } = useNextAuthSession()
  const [debouncedSession, setDebouncedSession] = useState<any>(session)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedSession(session)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [session, delay])

  return { data: debouncedSession, status }
}
