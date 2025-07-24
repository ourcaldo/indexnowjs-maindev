import { supabaseAdmin } from './supabase';
import { EncryptionService } from './encryption';
import { JWT } from 'google-auth-library';

export interface ServiceAccount {
  id: string;
  name: string;
  email: string;
  encrypted_credentials: string;
  daily_quota_limit: number;
  minute_quota_limit: number;
  encrypted_access_token?: string;
  access_token_expires_at?: string;
}

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Google Authentication Service
 * 
 * Handles the complete Google API authentication workflow:
 * 1. Decrypt service account credentials from database
 * 2. Generate JWT tokens using service account private key
 * 3. Exchange JWT for access tokens with Google's token endpoint
 * 4. Cache encrypted access tokens in database with expiration
 * 5. Manage token refresh and quota tracking
 */
export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private static readonly INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
  private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Get a valid access token for Google API calls
   * First checks cached token in database, then generates new one if needed
   */
  async getAccessToken(serviceAccountId: string): Promise<string | null> {
    try {
      console.log(`🔑 Getting access token for service account: ${serviceAccountId}`);
      
      // Get service account from database
      const { data: serviceAccount, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('*')
        .eq('id', serviceAccountId)
        .single();

      if (error || !serviceAccount) {
        console.error('Service account not found:', error);
        return null;
      }

      // Service account validation (debug logging removed)

      // Check if we have a valid cached token
      const cachedToken = await this.getCachedAccessToken(serviceAccount);
      if (cachedToken) {
        console.log('✅ Using cached access token');
        return cachedToken;
      }

      // Generate new access token
      console.log('🔄 Generating new access token');
      const newToken = await this.generateNewAccessToken(serviceAccount);
      
      if (newToken) {
        // Cache the new token in database
        await this.cacheAccessToken(serviceAccountId, newToken);
        console.log('✅ New access token generated and cached');
        return newToken.access_token;
      }

      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get available service account for a user
   */
  async getAvailableServiceAccount(userId: string): Promise<ServiceAccount | null> {
    try {
      const { data: accounts, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error || !accounts?.length) {
        console.log('No active service accounts found for user:', userId);
        return null;
      }

      return accounts[0];
    } catch (error) {
      console.error('Error getting service account:', error);
      return null;
    }
  }

  /**
   * Check if we have a valid cached access token
   */
  private async getCachedAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
    try {
      if (!serviceAccount.encrypted_access_token || !serviceAccount.access_token_expires_at) {
        return null;
      }

      const expiresAt = new Date(serviceAccount.access_token_expires_at).getTime();
      const now = Date.now();
      
      // Check if token is still valid (with buffer)
      if (expiresAt <= now + GoogleAuthService.TOKEN_EXPIRY_BUFFER) {
        console.log('Cached token expired or expiring soon');
        return null;
      }

      // Decrypt and return cached token
      const accessToken = EncryptionService.decrypt(serviceAccount.encrypted_access_token);
      return accessToken;
    } catch (error) {
      console.error('Error checking cached token:', error);
      return null;
    }
  }

  /**
   * Generate new access token using service account credentials
   */
  private async generateNewAccessToken(serviceAccount: ServiceAccount): Promise<{ access_token: string; expires_in: number } | null> {
    try {
      // Generate new access token process
      
      // Check if credentials are empty 
      if (!serviceAccount.encrypted_credentials || serviceAccount.encrypted_credentials.trim() === '') {
        console.log('⚠️ Service account has no encrypted credentials. Skipping...');
        return null;
      }

      // Decrypt service account credentials
      let credentialsJson: string;
      try {
        credentialsJson = EncryptionService.decrypt(serviceAccount.encrypted_credentials);
      } catch (decryptError) {
        throw decryptError;
      }

      // Parse JSON credentials
      let credentials: ServiceAccountCredentials;
      try {
        credentials = JSON.parse(credentialsJson);
      } catch (parseError) {
        throw parseError;
      }

      // Create JWT client
      const jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [GoogleAuthService.INDEXING_SCOPE]
      });

      // Get access token from Google
      const tokenResponse = await jwtClient.authorize();
      
      if (!tokenResponse.access_token) {
        throw new Error('No access token received from Google');
      }
      
      return {
        access_token: tokenResponse.access_token,
        expires_in: 3600 // Google tokens typically expire in 1 hour
      };
      
    } catch (error) {
      console.error('Error generating access token:', error);
      return null;
    }
  }

  /**
   * Cache encrypted access token in database
   */
  private async cacheAccessToken(serviceAccountId: string, tokenData: { access_token: string; expires_in: number }): Promise<void> {
    try {
      // Encrypt access token
      const encryptedToken = EncryptionService.encrypt(tokenData.access_token);
      
      // Calculate expiration time (with some buffer)
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000) - GoogleAuthService.TOKEN_EXPIRY_BUFFER);

      // Update service account with cached token
      const { error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .update({
          encrypted_access_token: encryptedToken,
          access_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceAccountId);

      if (error) {
        console.error('Error caching access token:', error);
      } else {
        console.log('✅ Access token cached in database');
      }
    } catch (error) {
      console.error('Error caching access token:', error);
    }
  }

  /**
   * Validate service account credentials format
   */
  static validateServiceAccountCredentials(credentialsJson: string): boolean {
    try {
      const credentials = JSON.parse(credentialsJson);
      const requiredFields = [
        'type', 'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri'
      ];
      
      return requiredFields.every(field => credentials[field]);
    } catch (error) {
      return false;
    }
  }
}