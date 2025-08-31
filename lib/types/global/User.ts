/**
 * Global user-related type definitions for IndexNow Studio
 */

// Re-export core user types from business layer for global access
export type {
  User,
  UserProfile,
  UserSettings,
  UserQuota,
  UserSubscription,
  TrialEligibility,
  UserRole,
  UserStatus,
  SubscriptionStatus,
  NotificationSettings,
  PrivacySettings,
  SecuritySettings,
  UserQuotaUsage,
  UserQuotaLimits,
  ApiKey,
  EmailVerification,
  TwoFactorAuth,
  UserActivity
} from '../business/UserTypes';

// Additional types not in business layer
export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  compactMode: boolean;
  autoRefresh: boolean;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

// Global user context for application state
export interface UserContext {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  subscription: UserSubscription | null;
  quota: UserQuotaUsage;
  limits: UserQuotaLimits;
  trial: TrialEligibility | null;
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  lastActivity: Date | null;
}

// Session management
export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface GeoLocation {
  country: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// User onboarding and tutorial
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component?: string;
  isCompleted: boolean;
  isOptional: boolean;
  order: number;
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  canSkip: boolean;
}

// User activity and audit
export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// User feedback and support
export interface UserFeedback {
  id: string;
  userId: string;
  type: 'bug' | 'feature' | 'general' | 'compliment' | 'complaint';
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: FileAttachment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface FileAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

// User collaboration
export interface TeamMember {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: string[];
  joinedAt: Date;
  lastActivity?: Date;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  allowMemberInvites: boolean;
  requireOwnerApproval: boolean;
  defaultRole: UserRole;
  maxMembers: number;
}