import { QueryClient } from '@tanstack/react-query'

// Create a new QueryClient instance with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 5 minutes - data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time of 10 minutes - data stays in cache for 10 minutes after being unused
      gcTime: 10 * 60 * 1000, 
      // Retry failed requests 1 time (instead of default 3)
      retry: 1,
      // Don't refetch on window focus for better UX
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations 1 time
      retry: 1,
    },
  },
})

// Helper function for API requests
export const apiRequest = async (url: string, options?: RequestInit) => {
  // Construct full API URL using environment variable
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url.replace('/api', '') : `/${url}`}`
  
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP Error: ${response.status}`)
  }

  return response.json()
}

export default queryClient