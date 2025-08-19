import { z } from "zod";

// Auth schemas for Supabase integration
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  phoneNumber: z.string().min(3, "Please enter a valid phone number"),
  country: z.string().min(2, "Please select a country"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// IndexNow specific schemas
export const urlSubmissionSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  keyLocation: z.string().url("Key location URL").optional(),
});

export const indexStatusSchema = z.object({
  url: z.string().url(),
  status: z.enum(["pending", "submitted", "indexed", "failed", "skipped"]),
  submittedAt: z.string().datetime(),
  indexedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
});

// Job creation schemas
export const createJobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  type: z.enum(["manual", "sitemap"]),
  schedule_type: z.enum(["one-time", "hourly", "daily", "weekly", "monthly"]).default("one-time"),
  source_data: z.object({
    urls: z.array(z.string().url()).optional(),
    sitemap_url: z.string().url().optional(),
  }),
});

// Service account schemas
export const createServiceAccountSchema = z.object({
  name: z.string().min(1, "Service account name is required"),
  email: z.string().email("Valid email is required"),
  credentials: z.object({}).passthrough(), // JSON credentials
});

// User profile schemas
export const updateUserProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").optional(),
  email_notifications: z.boolean().optional(),
  phone_number: z.string().optional(),
});

export const updateUserSettingsSchema = z.object({
  timeout_duration: z.number().min(1000).max(300000).optional(), // 1s to 5min
  retry_attempts: z.number().min(1).max(10).optional(),
  email_job_completion: z.boolean().optional(),
  email_job_failure: z.boolean().optional(),
  email_quota_alerts: z.boolean().optional(),
  default_schedule: z.enum(['one-time', 'hourly', 'daily', 'weekly', 'monthly']).optional(),
  email_daily_report: z.boolean().optional(),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

// Type exports
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type UrlSubmission = z.infer<typeof urlSubmissionSchema>;
export type IndexStatus = z.infer<typeof indexStatusSchema>;
export type CreateJobRequest = z.infer<typeof createJobSchema>;
export type CreateServiceAccountRequest = z.infer<typeof createServiceAccountSchema>;
export type UpdateUserProfileRequest = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserSettingsRequest = z.infer<typeof updateUserSettingsSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

// User type from Supabase
export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerification?: boolean;
  metadata?: Record<string, any>;
}

// Dashboard stats type
export interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  pending_jobs: number;
  total_urls_indexed: number;
  total_urls_failed: number;
  total_urls_processed: number;
  total_urls_submitted: number;
  success_rate: number;
  quota_usage: number;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
