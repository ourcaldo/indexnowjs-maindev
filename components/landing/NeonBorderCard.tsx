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

    // Create the neon line element
    const neonLine = document.createElement('div')
    neonLine.style.position = 'absolute'
    neonLine.style.pointerEvents = 'none'
    neonLine.style.borderRadius = '24px'
    neonLine.style.opacity = '0'
    neonLine.style.transition = 'all 0.1s ease-out'
    neonLine.style.zIndex = '10'
    
    card.style.position = 'relative'
    card.appendChild(neonLine)

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
      
      // Position the neon line on the closest border edge
      if (minDistance === distanceToTop) {
        // Top border
        neonLine.style.top = '0px'
        neonLine.style.left = `${Math.max(0, x - 60)}px`
        neonLine.style.width = '120px'
        neonLine.style.height = '2px'
        neonLine.style.background = `linear-gradient(to right, transparent, ${neonColor}, transparent)`
        neonLine.style.boxShadow = `0 0 20px ${neonColor}`
      } else if (minDistance === distanceToRight) {
        // Right border
        neonLine.style.top = `${Math.max(0, y - 60)}px`
        neonLine.style.right = '0px'
        neonLine.style.width = '2px'
        neonLine.style.height = '120px'
        neonLine.style.background = `linear-gradient(to bottom, transparent, ${neonColor}, transparent)`
        neonLine.style.boxShadow = `0 0 20px ${neonColor}`
      } else if (minDistance === distanceToBottom) {
        // Bottom border
        neonLine.style.bottom = '0px'
        neonLine.style.left = `${Math.max(0, x - 60)}px`
        neonLine.style.width = '120px'
        neonLine.style.height = '2px'
        neonLine.style.background = `linear-gradient(to right, transparent, ${neonColor}, transparent)`
        neonLine.style.boxShadow = `0 0 20px ${neonColor}`
      } else {
        // Left border
        neonLine.style.top = `${Math.max(0, y - 60)}px`
        neonLine.style.left = '0px'
        neonLine.style.width = '2px'
        neonLine.style.height = '120px'
        neonLine.style.background = `linear-gradient(to bottom, transparent, ${neonColor}, transparent)`
        neonLine.style.boxShadow = `0 0 20px ${neonColor}`
      }
      
      // Clear any previous positioning
      neonLine.style.top = neonLine.style.top || 'auto'
      neonLine.style.right = neonLine.style.right || 'auto'
      neonLine.style.bottom = neonLine.style.bottom || 'auto'
      neonLine.style.left = neonLine.style.left || 'auto'
      
      neonLine.style.opacity = '1'
    }

    const handleMouseLeave = () => {
      neonLine.style.opacity = '0'
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
      if (neonLine.parentNode) {
        neonLine.parentNode.removeChild(neonLine)
      }
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