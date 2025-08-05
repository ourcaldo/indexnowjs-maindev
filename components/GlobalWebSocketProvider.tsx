'use client'

import { useEffect, useState } from 'react'
import { useGlobalWebSocket } from '@/hooks/useGlobalWebSocket'

export default function GlobalWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useGlobalWebSocket()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      console.log(`🌐 Global WebSocket status: ${isConnected ? 'Connected' : 'Disconnected'}`)
    }
  }, [isConnected, mounted])

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}