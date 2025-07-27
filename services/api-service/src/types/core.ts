import { z } from 'zod';

// Base event schema matching SDK types
export const TrackingEventSchema = z.object({
  event: z.string().min(1),
  properties: z.record(z.any()).optional(),
  timestamp: z.date().optional(),
  userId: z.string().optional(),
});

export const IdentifyDataSchema = z.object({
  userId: z.string().min(1),
  traits: z.record(z.any()).optional(),
  timestamp: z.date().optional(),
});

// Backend-specific extensions
export interface AnalyticsEvent {
  eventId: string; // Deduplication key
  tenantId: string; // Multi-tenancy namespace
  userId?: string; // Optional user association
  eventName: string; // Event type identifier
  properties: Record<string, any>; // Event-specific data
  timestamp: Date; // Event occurrence time
  receivedAt: Date; // Server receipt time
  sessionId?: string; // Session tracking
  deviceId?: string; // Device fingerprint
}

export interface UserRecord {
  userId: string; // Primary identifier
  tenantId: string; // Multi-tenancy namespace
  properties: Record<string, any>; // User attributes
  firstSeen: Date; // Initial identification
  lastSeen: Date; // Most recent activity
  sessionCount: number; // Total sessions
  eventCount: number; // Total events
}

export interface TenantInfo {
  tenantId: string;
  name?: string;
  apiKey?: string;
  rateLimits?: {
    requestsPerHour: number;
    requestsPerMinute: number;
  };
}

export interface RateLimitKey {
  tenantId: string;
  sourceIp: string;
  userId?: string;
}

export interface RateLimitBucket {
  key: RateLimitKey;
  count: number;
  windowStart: Date;
  windowSize: number; // seconds
}

// Validation results
export interface ValidationResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface AuthResult {
  success: boolean;
  tenantInfo?: TenantInfo;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

// Storage operation results
export interface InsertResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export interface UpsertResult {
  success: boolean;
  userId?: string;
  created: boolean;
  error?: string;
}

// Query interfaces
export interface QueryOptions {
  // Filtering
  eventTypes?: string[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  properties?: Record<string, any>;

  // Sorting
  sortBy?: 'timestamp' | 'eventName' | 'userId';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;

  // Output formatting
  format?: 'json' | 'table' | 'csv';
}

export interface UserQueryOptions {
  // Filtering
  userId?: string;
  activeSince?: Date;
  activeUntil?: Date;
  properties?: Record<string, any>;

  // Sorting
  sortBy?: 'firstSeen' | 'lastSeen' | 'eventCount' | 'sessionCount';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  limit?: number;
  offset?: number;

  // Output formatting
  format?: 'json' | 'table' | 'csv';
}

export interface QueryFilter {
  tenantId: string;
  startTime?: Date;
  endTime?: Date;
  eventName?: string;
  eventTypes?: string[];
  userId?: string;
  properties?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserQueryFilter {
  tenantId: string;
  userId?: string;
  activeSince?: Date;
  activeUntil?: Date;
  properties?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  limit: number;
  offset: number;
  nextOffset?: number;
}

export interface QueryResult {
  events: AnalyticsEvent[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}

export interface UserQueryResult {
  users: UserRecord[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}

export interface QueryError {
  error: string;
  message: string;
  code: 'INVALID_FILTER' | 'TIMEOUT' | 'LIMIT_EXCEEDED' | 'STORAGE_ERROR';
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface ExportResult {
  format: 'json' | 'csv';
  data: string;
  recordCount: number;
}

// HTTP API types
export interface TrackRequest {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
}

export interface IdentifyRequest {
  userId: string;
  traits?: Record<string, any>;
  timestamp?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: Date;
  dependencies: {
    eventStore: 'healthy' | 'unhealthy';
    userStore: 'healthy' | 'unhealthy';
    rateLimiter: 'healthy' | 'unhealthy';
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
}

export type StorageType =
  | 'flatfile'
  | 'clickhouse'
  | 'bigquery'
  | 'postgres'
  | 'dynamodb'
  | 'memory'
  | 'redis';

export interface Config {
  // Server configuration
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  // Security
  jwtSecret?: string;
  apiKeyHeader: string;
  corsOrigins: string[];

  // Storage configuration
  stores: {
    events: StorageType;
    users: StorageType;
    rateLimits: StorageType;
  };

  // File storage paths
  paths: {
    events: string;
    users: string;
  };

  // Database URLs
  urls: {
    clickhouse?: string;
    postgres?: string;
    redis?: string;
  };

  // Rate limiting
  rateLimits: {
    windowSize: number; // seconds
    maxRequests: number; // requests per window
  };

  // Observability
  observability: {
    enableTracing: boolean;
    enableMetrics: boolean;
    otelEndpoint?: string;
    prometheusPort?: number;
  };
}
