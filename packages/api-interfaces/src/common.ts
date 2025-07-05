/**
 * Common API Interface Definitions
 * Shared types and utilities across all Nodash API services
 */

// Base API configuration
export interface APIConfig {
  token: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Standard API response wrapper
export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
}

// Standard error response
export interface APIError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}

// Request options for all API calls
export interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// Base client interface that all service clients implement
export interface BaseClientInterface {
  /**
   * Make a raw HTTP request
   */
  request<T = any>(options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    data?: any;
    params?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<APIResponse<T>>;

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<APIConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): APIConfig;
}

// Pagination support
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Common filter types
export interface DateRange {
  start: string;
  end: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Service health status
export interface ServiceStatus {
  service: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
}

// Rate limiting info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: string;
}

// Default configurations
export const DEFAULT_CONFIG: Partial<APIConfig> = {
  baseUrl: 'https://api.nodash.ai',
  timeout: 30000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Nodash-SDK/1.0.0'
  }
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const; 