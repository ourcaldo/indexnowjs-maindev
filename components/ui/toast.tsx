"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = React.createContext<{
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
} | null>(null)

interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.duration || 5000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const contextValue = React.useMemo(() => ({
    toasts,
    addToast,
    removeToast
  }), [toasts, addToast, removeToast])

  return (
    <ToastProvider.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-lg border p-4 shadow-lg transition-all duration-300",
              "max-w-sm w-full",
              {
                "bg-white border-[#4BB543] text-[#1A1A1A]": toast.type === 'success',
                "bg-white border-[#E63946] text-[#1A1A1A]": toast.type === 'error',
                "bg-white border-[#F0A202] text-[#1A1A1A]": toast.type === 'warning',
                "bg-white border-[#3D8BFF] text-[#1A1A1A]": toast.type === 'info' || !toast.type,
              }
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {toast.title && (
                  <div className="font-semibold text-sm mb-1">{toast.title}</div>
                )}
                {toast.description && (
                  <div className="text-sm text-[#6C757D]">{toast.description}</div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-[#6C757D] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastProvider.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastProvider)
  if (!context) {
    throw new Error('useToast must be used within a ToastContainer')
  }
  return context
}

export { ToastContainer as Toaster }