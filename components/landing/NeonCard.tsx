'use client'

import { useState, useRef } from 'react'

interface NeonCardProps {
  children: React.ReactNode
  className?: string
  intensity?: 'low' | 'medium' | 'high'
}

export default function NeonCard({ children, className = '', intensity = 'medium' }: NeonCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePosition({ x, y })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const getGlowIntensity = () => {
    switch (intensity) {
      case 'low':
        return {
          spotlight: 'rgba(59, 130, 246, 0.08)',
          border: 'from-blue-500/10 via-cyan-400/10 to-blue-500/10',
          bg: 'bg-black/60'
        }
      case 'high':
        return {
          spotlight: 'rgba(59, 130, 246, 0.25)',
          border: 'from-blue-500/30 via-cyan-400/30 to-blue-500/30',
          bg: 'bg-black/95'
        }
      default:
        return {
          spotlight: 'rgba(59, 130, 246, 0.15)',
          border: 'from-blue-500/20 via-cyan-400/20 to-blue-500/20',
          bg: 'bg-black/80'
        }
    }
  }

  const { spotlight, border, bg } = getGlowIntensity()

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden group cursor-pointer ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic spotlight that follows cursor */}
      <div
        className={`absolute pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          left: mousePosition.x - 120,
          top: mousePosition.y - 120,
          width: '240px',
          height: '240px',
          background: `radial-gradient(circle, ${spotlight} 0%, ${spotlight.replace('0.15', '0.05')} 50%, transparent 100%)`,
          borderRadius: '50%',
          filter: 'blur(30px)',
        }}
      />
      
      {/* Enhanced neon border that follows cursor direction */}
      <div
        className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
          isHovered 
            ? `bg-gradient-to-r ${border} p-[1px]` 
            : 'bg-white/5 p-[1px]'
        }`}
      >
        {/* Directional glow effect based on cursor position */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `conic-gradient(from ${Math.atan2(
                mousePosition.y - (cardRef.current?.offsetHeight || 0) / 2,
                mousePosition.x - (cardRef.current?.offsetWidth || 0) / 2
              )}rad, rgba(59, 130, 246, 0.3) 0deg, rgba(6, 182, 212, 0.3) 90deg, rgba(59, 130, 246, 0.3) 180deg, rgba(6, 182, 212, 0.3) 270deg, rgba(59, 130, 246, 0.3) 360deg)`,
              opacity: 0.6,
              filter: 'blur(2px)',
            }}
          />
        )}
        
        <div className={`w-full h-full ${bg} backdrop-blur-sm rounded-2xl relative z-10`}>
          {children}
        </div>
      </div>
    </div>
  )
}