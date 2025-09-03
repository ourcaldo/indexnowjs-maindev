import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/database'

export interface DashboardData {
  user: {
    profile: any;
    quota: any;
    settings: any;
    trial: any;
  };
  billing: any;
  indexing: {
    serviceAccounts: number;
  };
  rankTracking: {
    usage: any;
    domains: any[];
    recentKeywords: any[];
  };
  notifications: any[];
}

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['/api/v1/dashboard'],
    queryFn: async (): Promise<DashboardData> => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch('/api/v1/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Dashboard API failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}