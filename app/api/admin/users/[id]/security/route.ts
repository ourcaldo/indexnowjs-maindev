import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminUser = await requireAdminAuth(request)
    const { id: userId } = await params

    // Get user's security information including IPs and devices
    const { data: securityLogs, error: securityError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('ip_address, device_info, location_data, event_type, created_at, success')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (securityError) {
      console.error('Error fetching user security data:', securityError)
      return NextResponse.json(
        { error: 'Failed to fetch user security data' },
        { status: 500 }
      )
    }

    // Process security data
    const ipAddresses = new Set<string>()
    const devices = new Map<string, any>()
    const locations = new Set<string>()
    const loginAttempts = []
    let lastActivity = null
    let firstSeen = null

    for (const log of securityLogs) {
      // Track unique IP addresses
      if (log.ip_address) {
        ipAddresses.add(log.ip_address)
      }

      // Track unique devices
      if (log.device_info) {
        const deviceKey = `${log.device_info.type}-${log.device_info.browser}-${log.device_info.os}`
        if (!devices.has(deviceKey)) {
          devices.set(deviceKey, {
            ...log.device_info,
            firstSeen: log.created_at,
            lastUsed: log.created_at,
            usageCount: 1
          })
        } else {
          const existing = devices.get(deviceKey)
          existing.lastUsed = log.created_at
          existing.usageCount++
        }
      }

      // Track locations
      if (log.location_data) {
        const locationString = [
          log.location_data.city,
          log.location_data.region,
          log.location_data.country
        ].filter(Boolean).join(', ')
        
        if (locationString) {
          locations.add(locationString)
        }
      }

      // Track login attempts
      if (log.event_type === 'login') {
        loginAttempts.push({
          success: log.success,
          timestamp: log.created_at,
          ip_address: log.ip_address,
          device_info: log.device_info
        })
      }

      // Set activity markers
      if (!lastActivity) lastActivity = log.created_at
      firstSeen = log.created_at // Will be the oldest due to reverse order
    }

    // Calculate security metrics
    const totalLoginAttempts = loginAttempts.length
    const failedLoginAttempts = loginAttempts.filter(attempt => !attempt.success).length
    const successfulLogins = loginAttempts.filter(attempt => attempt.success).length
    const securityScore = calculateSecurityScore(
      Array.from(ipAddresses).length,
      devices.size,
      failedLoginAttempts,
      totalLoginAttempts
    )

    // Calculate risk level for logging
    const riskLevel = securityScore >= 80 ? 'low' : securityScore >= 60 ? 'medium' : 'high'

    // Log admin action with enhanced details
    await ActivityLogger.logAdminAction(
      adminUser.id,
      'security_analysis',
      userId,
      `Analyzed security profile for user ${userId} - Risk Level: ${riskLevel}`,
      request,
      { 
        securityAnalysis: true, 
        riskLevel, 
        securityScore: Math.round(securityScore * 100) / 100,
        uniqueIPs: Array.from(ipAddresses).length,
        uniqueDevices: devices.size,
        uniqueLocations: locations.size,
        loginAttempts: totalLoginAttempts,
        failedAttempts: failedLoginAttempts
      }
    )

    return NextResponse.json({
      success: true,
      security: {
        ipAddresses: Array.from(ipAddresses),
        devices: Array.from(devices.values()),
        locations: Array.from(locations),
        loginAttempts: {
          total: totalLoginAttempts,
          successful: successfulLogins,
          failed: failedLoginAttempts,
          recent: loginAttempts.slice(0, 10) // Last 10 attempts
        },
        activity: {
          lastActivity,
          firstSeen,
          totalActivities: securityLogs.length
        },
        securityScore,
        riskLevel: securityScore >= 80 ? 'low' : securityScore >= 60 ? 'medium' : 'high'
      }
    })

  } catch (error: any) {
    console.error('User security API error:', error)
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate security score based on various factors
 */
function calculateSecurityScore(
  uniqueIPs: number,
  uniqueDevices: number,
  failedLogins: number,
  totalLogins: number
): number {
  let score = 100

  // Deduct points for too many unique IPs (potential account sharing or compromise)
  if (uniqueIPs > 10) score -= 20
  else if (uniqueIPs > 5) score -= 10

  // Deduct points for too many unique devices
  if (uniqueDevices > 5) score -= 15
  else if (uniqueDevices > 3) score -= 5

  // Deduct points for failed login attempts
  if (totalLogins > 0) {
    const failureRate = failedLogins / totalLogins
    if (failureRate > 0.3) score -= 30
    else if (failureRate > 0.1) score -= 15
  }

  // Add points for consistent behavior
  if (uniqueIPs <= 2 && uniqueDevices <= 2) score += 10

  return Math.max(0, Math.min(100, score))
}