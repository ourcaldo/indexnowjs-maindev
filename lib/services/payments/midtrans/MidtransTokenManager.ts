/**
 * Midtrans Token Manager - Token Management & Caching
 * Handles secure token storage and retrieval for recurring payments
 */

import { supabaseAdmin } from '@/lib/database'

export interface TokenData {
  saved_token_id: string
  expired_at?: string
  masked_card?: string
  card_type?: string
  user_id: string
  transaction_id: string
}

export class MidtransTokenManager {
  
  /**
   * Store saved token from successful transaction
   */
  async storeToken(tokenData: TokenData): Promise<boolean> {
    try {
      // First check if token already exists for this user
      const { data: existingToken } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .select('id')
        .eq('user_id', tokenData.user_id)
        .eq('saved_token_id', tokenData.saved_token_id)
        .single()

      if (existingToken) {
        // Update existing token
        const { error } = await supabaseAdmin
          .from('indb_payment_saved_tokens')
          .update({
            expired_at: tokenData.expired_at,
            masked_card: tokenData.masked_card,
            card_type: tokenData.card_type,
            transaction_id: tokenData.transaction_id,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingToken.id)

        return !error

      } else {
        // Insert new token
        const { error } = await supabaseAdmin
          .from('indb_payment_saved_tokens')
          .insert({
            user_id: tokenData.user_id,
            saved_token_id: tokenData.saved_token_id,
            expired_at: tokenData.expired_at,
            masked_card: tokenData.masked_card,
            card_type: tokenData.card_type,
            transaction_id: tokenData.transaction_id,
            gateway_name: 'midtrans',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        return !error
      }

    } catch (error) {
      console.error('Error storing token:', error)
      return false
    }
  }

  /**
   * Get active token for user
   */
  async getActiveToken(userId: string): Promise<TokenData | null> {
    try {
      const { data: token, error } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('gateway_name', 'midtrans')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !token) {
        return null
      }

      // Check if token is expired
      if (token.expired_at && new Date(token.expired_at) <= new Date()) {
        // Mark token as expired
        await this.deactivateToken(token.id)
        return null
      }

      return {
        saved_token_id: token.saved_token_id,
        expired_at: token.expired_at,
        masked_card: token.masked_card,
        card_type: token.card_type,
        user_id: token.user_id,
        transaction_id: token.transaction_id
      }

    } catch (error) {
      console.error('Error getting active token:', error)
      return null
    }
  }

  /**
   * Get all tokens for user
   */
  async getUserTokens(userId: string): Promise<TokenData[]> {
    try {
      const { data: tokens, error } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('gateway_name', 'midtrans')
        .order('created_at', { ascending: false })

      if (error || !tokens) {
        return []
      }

      return tokens.map(token => ({
        saved_token_id: token.saved_token_id,
        expired_at: token.expired_at,
        masked_card: token.masked_card,
        card_type: token.card_type,
        user_id: token.user_id,
        transaction_id: token.transaction_id
      }))

    } catch (error) {
      console.error('Error getting user tokens:', error)
      return []
    }
  }

  /**
   * Deactivate token
   */
  async deactivateToken(tokenId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenId)

      return !error

    } catch (error) {
      console.error('Error deactivating token:', error)
      return false
    }
  }

  /**
   * Deactivate all tokens for user
   */
  async deactivateUserTokens(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('gateway_name', 'midtrans')

      return !error

    } catch (error) {
      console.error('Error deactivating user tokens:', error)
      return false
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data: expiredTokens, error } = await supabaseAdmin
        .from('indb_payment_saved_tokens')
        .update({ is_active: false })
        .eq('gateway_name', 'midtrans')
        .lt('expired_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('Error cleaning up expired tokens:', error)
        return 0
      }

      return expiredTokens?.length || 0

    } catch (error) {
      console.error('Error cleaning up expired tokens:', error)
      return 0
    }
  }
}