'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService, AuthUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

// Global auth state to persist across route changes
let globalAuthState: {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitialized: boolean
  promise: Promise<AuthUser | null> | null
} = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  promise: null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  authChecked: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(globalAuthState.user)
  const [loading, setLoading] = useState(!globalAuthState.isInitialized)
  const [authChecked, setAuthChecked] = useState(globalAuthState.isInitialized)

  // Auth state cache with 5-minute expiration
  const [authCache, setAuthCache] = useState<{
    user: AuthUser | null
    timestamp: number
    isValid: boolean
  } | null>(null)

  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  const isAuthCacheValid = () => {
    if (!authCache) return false
    return Date.now() - authCache.timestamp < CACHE_DURATION
  }

  const updateAuthCache = (userData: AuthUser | null) => {
    setAuthCache({
      user: userData,
      timestamp: Date.now(),
      isValid: true
    })
    
    // Update global state
    globalAuthState.user = userData
    globalAuthState.isAuthenticated = !!userData
    globalAuthState.isInitialized = true
  }

  const invalidateAuthCache = () => {
    setAuthCache(null)
  }

  const checkAuth = async (useCache = true) => {
    try {
      // Use global state if already initialized
      if (globalAuthState.isInitialized && useCache) {
        setUser(globalAuthState.user)
        setLoading(false)
        setAuthChecked(true)
        return globalAuthState.user
      }
      
      // Use cached auth state if valid
      if (useCache && isAuthCacheValid() && authCache) {
        setUser(authCache.user)
        setLoading(false)
        setAuthChecked(true)
        return authCache.user
      }

      // Perform fresh auth check
      const currentUser = await authService.getCurrentUser()
      
      setUser(currentUser)
      updateAuthCache(currentUser)
      
      return currentUser
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
      invalidateAuthCache()
      return null
    } finally {
      setLoading(false)
      setAuthChecked(true)
    }
  }

  const refreshAuth = async () => {
    invalidateAuthCache()
    setLoading(true)
    await checkAuth(false)
  }

  const signOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
      invalidateAuthCache()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Initial auth check - only runs once on app startup
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      // If already initialized globally, just update local state
      if (globalAuthState.isInitialized) {
        if (isMounted) {
          setUser(globalAuthState.user)
          setLoading(false)
          setAuthChecked(true)
        }
        return
      }
      
      // If there's already a promise running, wait for it
      if (globalAuthState.promise) {
        try {
          const result = await globalAuthState.promise
          if (isMounted) {
            setUser(result)
            setLoading(false)
            setAuthChecked(true)
          }
        } catch (error) {
          console.error('Auth promise error:', error)
          if (isMounted) {
            setLoading(false)
            setAuthChecked(true)
          }
        }
        return
      }
      
      // Skip auth check for login page
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        if (isMounted) {
          setLoading(false)
          setAuthChecked(true)
          globalAuthState.isInitialized = true
        }
        return
      }

      // Start the auth check and store the promise
      globalAuthState.promise = checkAuth(false)
      const currentUser = await globalAuthState.promise
      globalAuthState.promise = null
      
      if (!isMounted) return

      // Only redirect to login if we're not on a public route
      if (!currentUser && typeof window !== 'undefined') {
        const publicRoutes = ['/', '/register', '/forgot-password', '/login', '/pricing', '/contact', '/faq']
        const currentPath = window.location.pathname
        
        if (!publicRoutes.includes(currentPath) && !currentPath.startsWith('/backend/admin')) {
          router.push('/login')
        }
      }
    }

    initializeAuth()

    // Set up auth state change listener - only listens for actual auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (supabaseUser) => {
      if (!isMounted) return
      
      // Skip handling for login page
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        return
      }
      
      if (!supabaseUser) {
        setUser(null)
        invalidateAuthCache()
        
        // Only redirect if not on public route
        if (typeof window !== 'undefined') {
          const publicRoutes = ['/', '/register', '/forgot-password', '/login', '/pricing', '/contact', '/faq']
          const currentPath = window.location.pathname
          
          if (!publicRoutes.includes(currentPath) && !currentPath.startsWith('/backend/admin')) {
            router.push('/login')
          }
        }
      } else {
        // Convert Supabase user to AuthUser format
        const authUser: AuthUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: (supabaseUser as any).user_metadata?.full_name,
          emailVerification: (supabaseUser as any).email_confirmed_at ? true : false,
        }
        
        setUser(authUser)
        updateAuthCache(authUser)
        setLoading(false)
        setAuthChecked(true)
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, []) // No router dependency - only run once

  const isAuthenticated = authChecked && !loading && !!user

  const value: AuthContextType = {
    user,
    loading,
    authChecked,
    isAuthenticated,
    signOut,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}