/**
 * Types barrel export for IndexNow Studio
 * Centralized type definitions
 */

// Core types
export type {
  ApiRequest, AuthenticatedRequest, RateLimitInfo, RateLimitConfig,
  HealthCheckResult, SystemHealth, UploadResult, SearchOptions, FilterOption,
  BulkOperation, BulkOperationResult, AuditLog, ExportOptions, ImportResult
} from './core/ApiTypes';

export type {
  AppConfig, FeatureFlags, SecurityConfig, MonitoringConfig
} from './core/ConfigTypes';

export type {
  DatabaseConnection as DbConnection, QueryOptions as DbQueryOptions, 
  QueryResult as DbQueryResult, TableSchema, ColumnDefinition, IndexDefinition
} from './core/DatabaseTypes';

// Business types
export type {
  IndexingJob, JobSubmission, JobProgress, ServiceAccount, ServiceAccountQuota,
  CreateJobRequest, UpdateJobRequest, ProcessJobRequest, BulkUrlRequest,
  SitemapParseRequest, SitemapParseResponse, JobMonitoring, JobAlert
} from './business/IndexingTypes';

export type {
  RankKeyword, RankHistory, RankTrackingDomain, CreateKeywordRequest,
  UpdateKeywordRequest, RankCheckRequest, RankCheckResult, KeywordAnalytics,
  DomainAnalytics, Competitor, CompetitorAnalysis
} from './business/RankTrackingTypes';

export type {
  User, UserProfile, UserSettings, UserQuota, UserSubscription, TrialEligibility,
  CreateUserRequest, UpdateUserRequest, ChangePasswordRequest, ApiKey,
  EmailVerification, TwoFactorAuth
} from './business/UserTypes';

export type {
  Package, Order, Transaction as PaymentTransaction, CustomerInfo, PaymentResponse,
  Subscription, Invoice, PromoCode, PaymentGateway, Refund, PaymentAnalytics
} from './business/PaymentTypes';

// External service types
export type {
  GoogleServiceAccount, GoogleIndexingRequest as GoogleIndexRequest,
  GoogleIndexingResponse as GoogleIndexResponse
} from './external/GoogleApiTypes';

export type {
  EmailConfig as EmailServiceConfig, EmailRecipient, EmailOptions
} from './external/EmailTypes';

export type {
  MidtransConfig, PaymentGatewayResponse
} from './external/PaymentGatewayTypes';

// Common types
export type {
  ID, UUID, Timestamp, Status, Priority, BaseEntity, AuditableEntity,
  PaginationParams, PaginationMeta, PaginatedResult, SortParam, FilterParam,
  SearchParams, SearchResult, DateRange, FileInfo, Notification, Tag, Comment,
  Metric, Setting, Config, HealthStatus, Webhook, Task, CacheEntry, CacheStats
} from './common/CommonTypes';

export type {
  AppError
} from './common/ErrorTypes';

export type {
  ApiResponse as Response, PaginatedResponse as PaginatedRes
} from './common/ResponseTypes';