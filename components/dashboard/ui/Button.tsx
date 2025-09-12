import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  onClick, 
  disabled, 
  ...props 
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variants: { [key: string]: string } = {
    default: 'bg-primary text-primary-foreground hover:bg-secondary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-muted/60 border border-border',
    outline: 'bg-transparent text-muted-foreground border border-border hover:bg-muted/50',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted/40'
  }
  
  const sizes: { [key: string]: string } = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  }
  
  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}