// TypeScript types for Supabase database tables
// Generated from the database schema

export interface Database {
  public: {
    Tables: {
      indb_auth_user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone_number: string | null
          role: 'user' | 'admin' | 'super_admin'
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone_number?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone_number?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      indb_auth_user_settings: {
        Row: {
          id: string
          user_id: string
          timeout_duration: number
          retry_attempts: number
          email_job_completion: boolean
          email_job_failure: boolean
          email_quota_alerts: boolean
          default_schedule: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timeout_duration?: number
          retry_attempts?: number
          email_job_completion?: boolean
          email_job_failure?: boolean
          email_quota_alerts?: boolean
          default_schedule?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timeout_duration?: number
          retry_attempts?: number
          email_job_completion?: boolean
          email_job_failure?: boolean
          email_quota_alerts?: boolean
          default_schedule?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          email_daily_report?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      indb_google_service_accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          encrypted_credentials: string
          is_active: boolean
          daily_quota_limit: number
          minute_quota_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          encrypted_credentials: string
          is_active?: boolean
          daily_quota_limit?: number
          minute_quota_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          encrypted_credentials?: string
          is_active?: boolean
          daily_quota_limit?: number
          minute_quota_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      indb_google_quota_usage: {
        Row: {
          id: string
          service_account_id: string
          date: string
          requests_made: number
          requests_successful: number
          requests_failed: number
          last_request_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_account_id: string
          date: string
          requests_made?: number
          requests_successful?: number
          requests_failed?: number
          last_request_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_account_id?: string
          date?: string
          requests_made?: number
          requests_successful?: number
          requests_failed?: number
          last_request_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_indexing_jobs: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'manual' | 'sitemap'
          status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression: string | null
          source_data: any // JSONB
          total_urls: number
          processed_urls: number
          successful_urls: number
          failed_urls: number
          progress_percentage: number
          started_at: string | null
          completed_at: string | null
          next_run_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'manual' | 'sitemap'
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression?: string | null
          source_data?: any
          total_urls?: number
          processed_urls?: number
          successful_urls?: number
          failed_urls?: number
          progress_percentage?: number
          started_at?: string | null
          completed_at?: string | null
          next_run_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'manual' | 'sitemap'
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
          schedule_type?: 'one-time' | 'hourly' | 'daily' | 'weekly' | 'monthly'
          cron_expression?: string | null
          source_data?: any
          total_urls?: number
          processed_urls?: number
          successful_urls?: number
          failed_urls?: number
          progress_percentage?: number
          started_at?: string | null
          completed_at?: string | null
          next_run_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      indb_indexing_url_submissions: {
        Row: {
          id: string
          job_id: string
          service_account_id: string | null
          url: string
          status: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at: string | null
          indexed_at: string | null
          response_data: any // JSONB
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          service_account_id?: string | null
          url: string
          status?: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at?: string | null
          indexed_at?: string | null
          response_data?: any
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          service_account_id?: string | null
          url?: string
          status?: 'pending' | 'submitted' | 'indexed' | 'failed' | 'skipped'
          submitted_at?: string | null
          indexed_at?: string | null
          response_data?: any
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      indb_notifications_dashboard: {
        Row: {
          id: string
          user_id: string
          type: 'info' | 'success' | 'warning' | 'error'
          title: string
          message: string
          is_read: boolean
          action_url: string | null
          metadata: any // JSONB
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'info' | 'success' | 'warning' | 'error'
          title: string
          message: string
          is_read?: boolean
          action_url?: string | null
          metadata?: any
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          title?: string
          message?: string
          is_read?: boolean
          action_url?: string | null
          metadata?: any
          expires_at?: string | null
          created_at?: string
        }
      }
      indb_analytics_daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          total_jobs: number
          completed_jobs: number
          failed_jobs: number
          total_urls_submitted: number
          total_urls_indexed: number
          total_urls_failed: number
          quota_usage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_jobs?: number
          completed_jobs?: number
          failed_jobs?: number
          total_urls_submitted?: number
          total_urls_indexed?: number
          total_urls_failed?: number
          quota_usage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_jobs?: number
          completed_jobs?: number
          failed_jobs?: number
          total_urls_submitted?: number
          total_urls_indexed?: number
          total_urls_failed?: number
          quota_usage?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type UserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Row']
export type UserSettings = Database['public']['Tables']['indb_auth_user_settings']['Row']
export type ServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Row']
export type IndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Row']
export type UrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Row']
export type DashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Row']
export type DailyStats = Database['public']['Tables']['indb_analytics_daily_stats']['Row']

// Insert types
export type InsertUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Insert']
export type InsertUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Insert']
export type InsertServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Insert']
export type InsertIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Insert']
export type InsertUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Insert']
export type InsertDashboardNotification = Database['public']['Tables']['indb_notifications_dashboard']['Insert']

// Update types
export type UpdateUserProfile = Database['public']['Tables']['indb_auth_user_profiles']['Update']
export type UpdateUserSettings = Database['public']['Tables']['indb_auth_user_settings']['Update']
export type UpdateServiceAccount = Database['public']['Tables']['indb_google_service_accounts']['Update']
export type UpdateIndexingJob = Database['public']['Tables']['indb_indexing_jobs']['Update']
export type UpdateUrlSubmission = Database['public']['Tables']['indb_indexing_url_submissions']['Update']