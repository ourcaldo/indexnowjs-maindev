import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export const Badge = ({ children, variant = 'default' }: BadgeProps) => {
  const variants: { [key: string]: any } = {
    default: { backgroundColor: '#F7F9FC', color: '#6C757D' },
    success: { backgroundColor: '#4BB543', color: '#FFFFFF' },
    warning: { backgroundColor: '#F0A202', color: '#FFFFFF' },
    error: { backgroundColor: '#E63946', color: '#FFFFFF' }
  }
  
  return (
    <span 
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={variants[variant]}
    >
      {children}
    </span>
  )
}