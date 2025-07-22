import { JWT } from 'google-auth-library';
import { supabaseAdmin } from './supabase';
import { encrypt, decrypt } from './encryption';

interface ServiceAccount {
  id: string;
  encrypted_credentials: string;
  encrypted_access_token?: string | null;
  access_token_expires_at?: string | null;
  is_active: boolean;
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private tokenCache = new Map<string, { token: string; expiresAt: Date }>();

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async getAccessToken(serviceAccountId: string): Promise<string | null> {
    try {
      // Get service account from database
      const { data: serviceAccount, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('*')
        .eq('id', serviceAccountId)
        .eq('is_active', true)
        .single();

      if (error || !serviceAccount) {
        console.error('Service account not found:', error);
        return null;
      }

      // Check if we have a valid cached token in database
      if (serviceAccount.encrypted_access_token && serviceAccount.access_token_expires_at) {
        const expiresAt = new Date(serviceAccount.access_token_expires_at);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (expiresAt.getTime() > now.getTime() + bufferTime) {
          return decrypt(serviceAccount.encrypted_access_token);
        }
      }

      // Generate new access token
      const newToken = await this.generateNewAccessToken(serviceAccount);
      if (newToken) {
        await this.saveAccessToken(serviceAccountId, newToken);
      }

      return newToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  private async generateNewAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
    try {
      const credentials = JSON.parse(decrypt(serviceAccount.encrypted_credentials));
      
      const client = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/indexing']
      });

      await client.authorize();
      return client.credentials.access_token || null;
    } catch (error) {
      console.error('Error generating access token:', error);
      return null;
    }
  }

  private async saveAccessToken(serviceAccountId: string, accessToken: string): Promise<void> {
    try {
      const encryptedToken = encrypt(accessToken);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Google tokens typically last 1 hour

      await supabaseAdmin
        .from('indb_google_service_accounts')
        .update({
          encrypted_access_token: encryptedToken,
          access_token_expires_at: expiresAt.toISOString()
        })
        .eq('id', serviceAccountId);
    } catch (error) {
      console.error('Error saving access token:', error);
    }
  }

  async getAvailableServiceAccount(userId: string): Promise<ServiceAccount | null> {
    try {
      const { data: accounts, error } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('id');

      if (error || !accounts?.length) {
        return null;
      }

      // Simple round-robin selection for now
      // TODO: Implement quota-based selection
      return accounts[0];
    } catch (error) {
      console.error('Error getting available service account:', error);
      return null;
    }
  }
}