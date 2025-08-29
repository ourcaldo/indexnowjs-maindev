import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export const Select = ({ children, value, onValueChange, placeholder, className = '', ...props }: SelectProps) => (
  <select 
    className={`flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A'
    }}
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
)