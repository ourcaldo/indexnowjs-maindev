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
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      // Calculate which side the cursor is closest to
      const distanceToTop = y
      const distanceToRight = rect.width - x
      const distanceToBottom = rect.height - y
      const distanceToLeft = x
      
      const minDistance = Math.min(distanceToTop, distanceToRight, distanceToBottom, distanceToLeft)
      
      let gradientDirection = ''
      let neonColor = intensity === 'high' ? 'cyan' : intensity === 'medium' ? 'blue' : 'slate'
      
      if (minDistance === distanceToTop) {
        gradientDirection = 'to right'
      } else if (minDistance === distanceToRight) {
        gradientDirection = 'to bottom'
      } else if (minDistance === distanceToBottom) {
        gradientDirection = 'to left'
      } else {
        gradientDirection = 'to top'
      }
      
      // Create glowing border effect
      let borderColor = ''
      let shadowColor = ''
      
      if (intensity === 'high') {
        borderColor = '#22d3ee, #06b6d4, #0891b2'
        shadowColor = '0 0 20px #22d3ee, 0 0 40px #06b6d4'
      } else if (intensity === 'medium') {
        borderColor = '#3b82f6, #1d4ed8, #1e3a8a'
        shadowColor = '0 0 15px #3b82f6, 0 0 30px #1d4ed8'
      } else {
        borderColor = '#64748b, #475569, #334155'
        shadowColor = '0 0 10px #64748b, 0 0 20px #475569'
      }
      
      // Apply the neon effect based on cursor position
      card.style.background = `linear-gradient(${gradientDirection}, transparent, rgba(${intensity === 'high' ? '34, 211, 238' : intensity === 'medium' ? '59, 130, 246' : '100, 116, 139'}, 0.1), transparent)`
      card.style.borderImage = `linear-gradient(${gradientDirection}, ${borderColor}) 1`
      card.style.boxShadow = shadowColor
      card.style.transition = 'all 0.3s ease'
    }

    const handleMouseLeave = () => {
      card.style.background = ''
      card.style.borderImage = ''
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
      className={`relative bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300 ${className}`}
      style={{
        borderWidth: '2px',
        borderStyle: 'solid'
      }}
    >
      {children}
    </div>
  )
}