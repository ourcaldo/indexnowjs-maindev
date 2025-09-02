'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'

interface SiteSettings {
  site_name: string
  site_description: string
  site_logo_url: string
  contact_email: string
}

export function usePageData() {
  const [user, setUser] = useState<any>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    checkAuthStatus()
    loadSiteSettings()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    }
  }

  const loadSiteSettings = async () => {
    try {
      const response = await fetch('/api/v1/public/site-settings')
      const data = await response.json()
      setSiteSettings(data)
    } catch (error) {
      console.error('Failed to load site settings:', error)
    }
  }

  const handleAuthAction = () => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/login'
    }
  }

  const handleGetStarted = () => {
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/register'
    }
  }

  return {
    user,
    siteSettings,
    handleAuthAction,
    handleGetStarted
  }
}