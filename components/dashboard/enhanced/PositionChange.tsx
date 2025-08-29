import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PositionChangeProps {
  change: number | null
  className?: string
}

export const PositionChange = ({ change, className = '' }: PositionChangeProps) => {
  if (change === null) return <span style={{color: '#6C757D'}} className={className}>-</span>
  
  if (change > 0) {
    return (
      <span className={`inline-flex items-center ${className}`} style={{color: '#4BB543'}}>
        <TrendingUp className="w-4 h-4 mr-1" />
        +{change}
      </span>
    )
  } else if (change < 0) {
    return (
      <span className={`inline-flex items-center ${className}`} style={{color: '#E63946'}}>
        <TrendingDown className="w-4 h-4 mr-1" />
        {change}
      </span>
    )
  } else {
    return (
      <span className={`inline-flex items-center ${className}`} style={{color: '#6C757D'}}>
        <Minus className="w-4 h-4 mr-1" />
        0
      </span>
    )
  }
}