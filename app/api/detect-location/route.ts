import { NextRequest } from 'next/server'
import { getRequestInfo } from '@/lib/ip-device-utils'
import { findCountryByName } from '@/lib/utils'
import { 
  publicApiRouteWrapper,
  createApiResponse
} from '@/lib/api-middleware'

export const GET = publicApiRouteWrapper(async (request: NextRequest, endpoint: string) => {
  try {
    // Get IP and location information using existing utility
    const requestInfo = await getRequestInfo(request)
    
    return createApiResponse({
      ip: requestInfo.ipAddress,
      country: requestInfo.locationData?.country || null,
      region: requestInfo.locationData?.region || null,
      city: requestInfo.locationData?.city || null,
    })
  } catch (error) {
    // Don't throw errors for location detection, just return empty data
    return createApiResponse({
      ip: null,
      country: null,
      countryCode: null,
      region: null,
      city: null,
    })
  }
})