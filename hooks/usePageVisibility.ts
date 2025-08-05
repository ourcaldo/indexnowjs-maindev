'use client'

import { useState, useEffect } from 'react'

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    // Set initial state
    setIsVisible(!document.hidden)

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}