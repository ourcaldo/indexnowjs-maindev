import React from 'react'
import { Badge } from '../ui'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  icon?: React.ReactNode
}

export const StatusBadge = ({ status, variant, icon }: StatusBadgeProps) => {
  // Auto-determine variant based on status if not provided
  const getVariant = (status: string) => {
    if (variant) return variant
    
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('completed') || lowerStatus.includes('success') || lowerStatus.includes('active')) {
      return 'success'
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('warning')) {
      return 'warning'
    }
    if (lowerStatus.includes('failed') || lowerStatus.includes('error') || lowerStatus.includes('cancelled')) {
      return 'error'
    }
    return 'default'
  }

  return (
    <Badge variant={getVariant(status)}>
      {icon && <span className="mr-1">{icon}</span>}
      {status}
    </Badge>
  )
}