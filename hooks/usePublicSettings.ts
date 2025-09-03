'use client'

import { useQuery } from '@tanstack/react-query'

export interface PublicSettingsData {
  siteSettings: {
    site_name: string;
    site_tagline: string;
    site_description: string;
    site_logo_url: string | null;
    white_logo: string;
    site_icon_url: string | null;
    site_favicon_url: string | null;
    contact_email: string;
    support_email: string;
    maintenance_mode: boolean;
    registration_enabled: boolean;
  };
  packages: {
    packages: any[];
    count: number;
  };
}

export const usePublicSettings = () => {
  return useQuery({
    queryKey: ['/api/v1/public/settings'],
    queryFn: async (): Promise<PublicSettingsData> => {
      const response = await fetch('/api/v1/public/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Public settings API failed: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10 * 60 * 1000, // 10 minutes - public settings change rarely
    refetchOnWindowFocus: false,
  })
}