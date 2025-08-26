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
      
      // Calculate the angle around the border where cursor is closest
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const angle = Math.atan2(y - centerY, x - centerX)
      
      // Convert angle to percentage around border (0-100%)
      const borderPosition = ((angle + Math.PI) / (2 * Math.PI)) * 100
      
      // Create green/cyan neon colors based on intensity like qoder
      let neonColor1, neonColor2, shadowIntensity
      
      if (intensity === 'high') {
        neonColor1 = '#00ff88' // Bright green-cyan
        neonColor2 = '#00d4aa' // Cyan
        shadowIntensity = '0 0 25px #00ff88, 0 0 50px #00d4aa'
      } else if (intensity === 'medium') {
        neonColor1 = '#10b981' // Emerald
        neonColor2 = '#06b6d4' // Cyan
        shadowIntensity = '0 0 20px #10b981, 0 0 40px #06b6d4'
      } else {
        neonColor1 = '#059669' // Darker green
        neonColor2 = '#0891b2' // Darker cyan
        shadowIntensity = '0 0 15px #059669, 0 0 30px #0891b2'
      }
      
      // Create conic gradient that follows cursor around the border
      const gradient = `conic-gradient(from ${borderPosition}deg, transparent 0deg, ${neonColor1} ${borderPosition}deg, ${neonColor2} ${borderPosition + 5}deg, transparent ${borderPosition + 20}deg, transparent 360deg)`
      
      // Apply the neon border effect
      card.style.background = `${gradient}, linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`
      card.style.backgroundSize = '2px 2px, 100% 100%'
      card.style.backgroundRepeat = 'no-repeat'
      card.style.backgroundPosition = 'border-box'
      card.style.border = '2px solid transparent'
      card.style.backgroundClip = 'padding-box, border-box'
      card.style.boxShadow = shadowIntensity
      card.style.transition = 'all 0.1s ease-out'
    }

    const handleMouseLeave = () => {
      card.style.background = ''
      card.style.backgroundSize = ''
      card.style.backgroundRepeat = ''
      card.style.backgroundPosition = ''
      card.style.backgroundClip = ''
      card.style.border = '2px solid rgba(255,255,255,0.1)'
      card.style.boxShadow = ''
      card.style.transition = 'all 0.3s ease'
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
      className={`relative bg-white/5 backdrop-blur-sm rounded-3xl transition-all duration-300 ${className}`}
      style={{
        border: '2px solid rgba(255,255,255,0.1)'
      }}
    >
      {children}
    </div>
  )
}