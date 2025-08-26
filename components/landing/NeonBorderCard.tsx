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
      
      // Get neon color
      const neonColor = intensity === 'high' ? '#00ff88' : intensity === 'medium' ? '#10b981' : '#059669'
      
      // Calculate mouse position as percentages around the perimeter
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const angle = Math.atan2(y - centerY, x - centerX)
      
      // Convert to degrees and normalize to 0-360
      let degrees = (angle * 180 / Math.PI + 360) % 360
      
      // Create conic gradient that follows the mouse around the border
      const gradient = `conic-gradient(from ${degrees}deg, transparent, ${neonColor} 2%, transparent 4%)`
      
      // Apply as border using mask technique
      card.style.background = `${gradient} border-box`
      card.style.border = '2px solid transparent'
      card.style.backgroundClip = 'padding-box'
      card.style.WebkitMask = 'linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)'
      card.style.WebkitMaskComposite = 'subtract'
      card.style.maskComposite = 'subtract'
      card.style.boxShadow = `0 0 20px ${neonColor}60`
    }

    const handleMouseLeave = () => {
      card.style.background = ''
      card.style.border = '2px solid rgba(255,255,255,0.1)'
      card.style.backgroundClip = ''
      card.style.WebkitMask = ''
      card.style.WebkitMaskComposite = ''
      card.style.maskComposite = ''
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