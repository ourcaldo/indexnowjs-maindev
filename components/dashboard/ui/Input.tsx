import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
  className?: string
}

export const Input = ({ placeholder, className = '', value, onChange, ...props }: InputProps) => (
  <input
    className={`flex h-10 w-full rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E0E6ED',
      color: '#1A1A1A',
      '--tw-ring-color': '#3D8BFF'
    } as React.CSSProperties}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    {...props}
  />
)