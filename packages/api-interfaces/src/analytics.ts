/**
 * Analytics API Interface Definitions
 * These interfaces define the contract between the Nodash SDK and Analytics Server
 */

// Core event data structures
export interface EventData {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  source?: string;
}

export interface EventSchema {
  properties: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface SchemaDefinition {
  event_name: string;
  properties: Record<string, any>;
  description?: string;
}

export interface TrackEventRequest {
  event_name: string;
  data?: Record<string, any>;
}

export interface BatchEventRequest {
  events: EventData[];
}

export interface BatchEventResponse {
  success: boolean;
  processed: number;
  timestamp: string;
}

export interface QueryEventsParams {
  event_name?: string;
  limit?: number;
}

// Analytics Client Interface
export interface AnalyticsClientInterface {
  /**
   * Get current events schema
   */
  getSchema(): Promise<Record<string, EventSchema>>;

  /**
   * Set event definition/schema
   */
  setEventDefinition(definition: SchemaDefinition): Promise<{ success: boolean; event_name: string }>;

  /**
   * Query events data
   */
  queryEvents(params?: QueryEventsParams): Promise<EventData[]>;

  /**
   * Track a single event (for testing)
   */
  trackEvent(request: TrackEventRequest): Promise<{ success: boolean }>;

  /**
   * Send batch of events (primary method used by SDK)
   */
  batchEvents(request: BatchEventRequest): Promise<BatchEventResponse>;
}

// API Endpoints mapping
export const ANALYTICS_ENDPOINTS = {
  SCHEMA: '/events/schema',
  DATA: '/events/data', 
  TRACK: '/events/track',
  BATCH: '/events/batch'
} as const; 