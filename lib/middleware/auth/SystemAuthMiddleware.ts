/**
 * System Authentication Middleware
 * Restricts access to system-level operations like SeRanking API calls
 * Only allows authenticated admin users and internal system processes
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../database/supabase';

export interface SystemAuthContext {
  isAuthorized: boolean;
  userId?: string;
  userRole?: string;
  isSystemRequest: boolean;
  error?: string;
}

/**
 * Verify system-level authorization for sensitive operations
 * This should be used for SeRanking integration endpoints that consume API quota
 */
export async function verifySystemAuthorization(request: NextRequest): Promise<SystemAuthContext> {
  try {
    // Check for system API key in headers (for internal system processes)
    const systemApiKey = request.headers.get('X-System-API-Key');
    const expectedSystemKey = process.env.SYSTEM_API_KEY;
    
    if (systemApiKey && expectedSystemKey && systemApiKey === expectedSystemKey) {
      return {
        isAuthorized: true,
        isSystemRequest: true,
        userId: 'system'
      };
    }

    // Check for user authentication via Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthorized: false,
        isSystemRequest: false,
        error: 'No valid authorization token provided'
      };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return {
        isAuthorized: false,
        isSystemRequest: false,
        error: 'Invalid or expired token'
      };
    }

    // For now, only allow system API key access to SeRanking endpoints
    // TODO: Implement proper user role checking when indb_profiles table is available
    return {
      isAuthorized: false,
      isSystemRequest: false,
      userId: user.id,
      userRole: 'user',
      error: 'SeRanking API access restricted to system processes only'
    };

  } catch (error) {
    console.error('System authorization error:', error);
    return {
      isAuthorized: false,
      isSystemRequest: false,
      error: 'Authorization verification failed'
    };
  }
}

/**
 * Middleware wrapper for system endpoints
 */
export function withSystemAuth<T extends any[]>(
  handler: (request: NextRequest, authContext: SystemAuthContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authContext = await verifySystemAuthorization(request);
    
    if (!authContext.isAuthorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'unauthorized',
          message: authContext.error || 'Access denied - system authorization required'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, authContext, ...args);
  };
}