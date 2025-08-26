'use client'

import { useEffect, useRef } from 'react'

interface NeonBorderCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

export default function NeonBorderCard({ children, className = '', intensity = 'medium' }: NeonBorderCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Calculate distances to each border edge
      const distanceToTop = y
      const distanceToRight = rect.width - x
      const distanceToBottom = rect.height - y
      const distanceToLeft = x
      
      // Find which border edge is closest
      const minDistance = Math.min(distanceToTop, distanceToRight, distanceToBottom, distanceToLeft)
      
      // Get neon color based on intensity
      const neonColor = intensity === 'high' ? '#00ff88' : intensity === 'medium' ? '#10b981' : '#059669'
      
      let boxShadow = ''
      
      if (minDistance === distanceToTop) {
        // Top border - create localized glow at cursor X position
        const xPercent = (x / rect.width) * 100
        boxShadow = `inset 0 2px 0 0 transparent, inset ${x - 50}px 2px 100px -90px ${neonColor}`
      } else if (minDistance === distanceToRight) {
        // Right border - create localized glow at cursor Y position
        const yPercent = (y / rect.height) * 100
        boxShadow = `inset -2px ${y - 50}px 100px -90px ${neonColor}`
      } else if (minDistance === distanceToBottom) {
        // Bottom border - create localized glow at cursor X position
        const xPercent = (x / rect.width) * 100
        boxShadow = `inset ${x - 50}px -2px 100px -90px ${neonColor}`
      } else {
        // Left border - create localized glow at cursor Y position
        const yPercent = (y / rect.height) * 100
        boxShadow = `inset 2px ${y - 50}px 100px -90px ${neonColor}`
      }
      
      card.style.boxShadow = `${boxShadow}, 0 0 20px ${neonColor}40`
    }

    const handleMouseLeave = () => {
      card.style.boxShadow = ''
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [intensity])

  return (
    <div
      ref={cardRef}
      className={`bg-white/5 backdrop-blur-sm rounded-3xl border-2 border-white/10 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  )
}