import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card = ({ children, className = '' }: CardProps) => (
  <div 
    className={`p-6 rounded-lg ${className}`} 
    style={{backgroundColor: '#FFFFFF', border: '1px solid #E0E6ED'}}
  >
    {children}
  </div>
)