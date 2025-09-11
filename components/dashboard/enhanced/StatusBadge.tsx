import React from 'react'
import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  icon?: React.ReactNode
}

export const StatusBadge = ({ status, variant, icon }: StatusBadgeProps) => {
  // Auto-determine variant based on status if not provided
  const getVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (variant) return variant
    
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('completed') || lowerStatus.includes('success') || lowerStatus.includes('active')) {
      return 'default'
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('warning')) {
      return 'secondary'
    }
    if (lowerStatus.includes('failed') || lowerStatus.includes('error') || lowerStatus.includes('cancelled')) {
      return 'destructive'
    }
    return 'outline'
  }

  const getBadgeClassName = (determinedVariant: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('completed') || lowerStatus.includes('success') || lowerStatus.includes('active')) {
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
    }
    if (lowerStatus.includes('pending') || lowerStatus.includes('processing') || lowerStatus.includes('warning')) {
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200'
    }
    return ''
  }

  const determinedVariant = getVariant(status)

  return (
    <Badge variant={determinedVariant} className={getBadgeClassName(determinedVariant)}>
      {icon && <span className="mr-1">{icon}</span>}
      {status}
    </Badge>
  )
}