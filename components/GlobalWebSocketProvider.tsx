'use client'

import { useEffect, useState } from 'react'

export default function GlobalWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering WebSocket logic until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}