'use client'

import { useEffect, useRef } from 'react'
import { useGlobalQuotaManager } from './useGlobalQuotaManager'
import { usePageVisibility } from './usePageVisibility'

interface UseSmartQuotaFetchOptions {
  /** Only fetch when this component is visible/mounted */
  fetchOnMount?: boolean
  /** Component name for debugging */
  componentName?: string
}

export function useSmartQuotaFetch(options: UseSmartQuotaFetchOptions = {}) {
  const { fetchOnMount = true, componentName = 'Unknown' } = options
  const { quotaInfo, refreshQuota } = useGlobalQuotaManager()
  const isPageVisible = usePageVisibility()
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Only fetch once on mount when page is visible and we haven't fetched yet
    if (fetchOnMount && isPageVisible && !hasFetchedRef.current && !quotaInfo) {
      console.log(`📊 [${componentName}] Fetching quota data on mount`)
      refreshQuota()
      hasFetchedRef.current = true
    }
  }, [fetchOnMount, isPageVisible, quotaInfo, refreshQuota, componentName])

  // Reset fetch flag when quota data is cleared (e.g., logout)
  useEffect(() => {
    if (!quotaInfo) {
      hasFetchedRef.current = false
    }
  }, [quotaInfo])

  return {
    quotaInfo,
    refreshQuota,
    isPageVisible
  }
}