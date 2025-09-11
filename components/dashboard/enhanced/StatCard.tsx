import React from 'react'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info'
}

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue,
  variant = 'default',
  className = '' 
}: StatCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5'
      case 'success':
        return 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-25'
      case 'warning':
        return 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-25'
      case 'info':
        return 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-25'
      default:
        return 'border-border bg-card'
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-accent/10 text-accent'
      case 'success':
        return 'bg-emerald-100 text-emerald-600'
      case 'warning':
        return 'bg-amber-100 text-amber-600'
      case 'info':
        return 'bg-blue-100 text-blue-600'
      default:
        return 'bg-muted text-accent'
    }
  }

  return (
    <Card className={`relative overflow-hidden p-6 ${getVariantStyles()} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-2 text-foreground">{value}</p>
          {description && (
            <p className="text-xs mt-1 text-muted-foreground">{description}</p>
          )}
          {trend && trendValue && (
            <p className={`text-xs mt-2 ${
              trend === 'up' ? 'text-emerald-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${getIconStyles()}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}