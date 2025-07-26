import {
  AnalyticsEvent,
  UserRecord,
  RateLimitKey,
  InsertResult,
  UpsertResult,
  QueryFilter,
  QueryResult,
  ExportResult,
} from '../types/core.js';

export interface EventAdapter {
  /**
   * Insert a single analytics event
   */
  insert(event: AnalyticsEvent): Promise<InsertResult>;

  /**
   * Insert multiple analytics events in a batch
   */
  insertBatch(events: AnalyticsEvent[]): Promise<InsertResult[]>;

  /**
   * Query events based on filters
   */
  query(filter: QueryFilter): Promise<QueryResult>;

  /**
   * Export events for a time range
   */
  export(startTime: Date, endTime: Date, format: 'json' | 'csv'): Promise<ExportResult>;

  /**
   * Check if the event store is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>;
}

export interface UserAdapter {
  /**
   * Create or update a user record
   */
  upsert(user: UserRecord): Promise<UpsertResult>;

  /**
   * Get a user record by ID
   */
  get(tenantId: string, userId: string): Promise<UserRecord | null>;

  /**
   * Delete a user record (GDPR compliance)
   */
  delete(tenantId: string, userId: string): Promise<boolean>;

  /**
   * Get multiple users by IDs
   */
  getBatch(tenantId: string, userIds: string[]): Promise<UserRecord[]>;

  /**
   * Check if the user store is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>;
}

export interface RateLimitAdapter {
  /**
   * Check if a request is within rate limits
   */
  checkLimit(
    key: RateLimitKey,
    limit: number,
    windowSizeSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }>;

  /**
   * Increment the counter for a rate limit key
   */
  increment(key: RateLimitKey, windowSizeSeconds: number): Promise<void>;

  /**
   * Reset rate limit counters for a key
   */
  reset(key: RateLimitKey): Promise<void>;

  /**
   * Get current counter value for a key
   */
  getCount(key: RateLimitKey, windowSizeSeconds: number): Promise<number>;

  /**
   * Check if the rate limiter is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>;
}

export interface DeduplicationAdapter {
  /**
   * Check if an event has already been processed
   */
  isDuplicate(tenantId: string, eventId: string): Promise<boolean>;

  /**
   * Mark an event as processed
   */
  markProcessed(tenantId: string, eventId: string, ttlSeconds?: number): Promise<void>;

  /**
   * Remove old deduplication records
   */
  cleanup(olderThanSeconds: number): Promise<number>;

  /**
   * Check if the deduplication store is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close connections and cleanup resources
   */
  close(): Promise<void>;
}

export interface StoreSelector {
  /**
   * Get the configured event adapter
   */
  getEventAdapter(): EventAdapter;

  /**
   * Get the configured user adapter
   */
  getUserAdapter(): UserAdapter;

  /**
   * Get the configured rate limit adapter
   */
  getRateLimitAdapter(): RateLimitAdapter;

  /**
   * Get the configured deduplication adapter
   */
  getDeduplicationAdapter(): DeduplicationAdapter;

  /**
   * Initialize all adapters with current configuration
   */
  initialize(): Promise<void>;

  /**
   * Check health of all adapters
   */
  healthCheck(): Promise<{
    eventStore: boolean;
    userStore: boolean;
    rateLimiter: boolean;
    deduplication: boolean;
  }>;

  /**
   * Close all adapter connections
   */
  close(): Promise<void>;
}
