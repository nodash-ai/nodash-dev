/**
 * Monitoring API Interface Definitions
 * These interfaces define the contract between the Nodash SDK and Monitoring Server
 */

// Core monitoring data structures
export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  unit?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  enabled: boolean;
}

// API Request/Response types
export interface CreateMetricRequest {
  metrics: MetricData[];
}

export interface QueryMetricsParams {
  metric_name?: string;
  start_time?: string;
  end_time?: string;
  tags?: Record<string, string>;
  limit?: number;
}

export interface CreateAlertRequest {
  rule: Omit<AlertRule, 'id'>;
}

// Monitoring Client Interface
export interface MonitoringClientInterface {
  /**
   * Get system health status
   */
  getHealth(): Promise<HealthCheckResponse>;

  /**
   * Send metrics data
   */
  sendMetrics(request: CreateMetricRequest): Promise<{ success: boolean; processed: number }>;

  /**
   * Query metrics data
   */
  queryMetrics(params?: QueryMetricsParams): Promise<MetricData[]>;

  /**
   * Create alert rule
   */
  createAlert(request: CreateAlertRequest): Promise<{ success: boolean; id: string }>;

  /**
   * List alert rules
   */
  listAlerts(): Promise<AlertRule[]>;

  /**
   * Delete alert rule
   */
  deleteAlert(id: string): Promise<{ success: boolean }>;
}

// API Endpoints mapping
export const MONITORING_ENDPOINTS = {
  HEALTH: '/health',
  METRICS: '/metrics',
  ALERTS: '/alerts'
} as const; 