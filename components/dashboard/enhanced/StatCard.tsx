import React from 'react'
import { Card } from '../ui'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue,
  className = '' 
}: StatCardProps) => {
  const trendColors = {
    up: '#4BB543',
    down: '#E63946',
    neutral: '#6C757D'
  }

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{color: '#6C757D'}}>{title}</p>
          <p className="text-2xl font-bold mt-2" style={{color: '#1A1A1A'}}>{value}</p>
          {description && (
            <p className="text-xs mt-1" style={{color: '#6C757D'}}>{description}</p>
          )}
          {trend && trendValue && (
            <p className="text-xs mt-2" style={{color: trendColors[trend]}}>
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg" style={{backgroundColor: '#F7F9FC', color: '#3D8BFF'}}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}