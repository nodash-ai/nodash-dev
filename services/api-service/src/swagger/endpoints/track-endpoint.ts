import { z } from 'zod';
import { EndpointDocumentation } from '../openapi-generator.js';
import { ZodToOpenAPIConverter } from '../zod-converter.js';

// Zod schema for track request (matching the one in request-router.ts)
export const TrackRequestSchema = z.object({
  event: z.string().min(1).describe('Event name or type (e.g., "page_view", "button_click")'),
  properties: z.record(z.any()).optional().describe('Additional event properties and metadata'),
  timestamp: z.string().datetime().optional().describe('Event timestamp in ISO 8601 format (defaults to current time)'),
  userId: z.string().optional().describe('User identifier associated with this event'),
  sessionId: z.string().optional().describe('Session identifier for grouping related events'),
  deviceId: z.string().optional().describe('Device identifier for cross-session tracking'),
});

// Zod schema for track response
export const TrackResponseSchema = z.object({
  success: z.boolean().describe('Whether the event was successfully tracked'),
  eventId: z.string().uuid().describe('Unique identifier for the tracked event'),
  timestamp: z.string().datetime().describe('Server timestamp when the event was processed'),
  requestId: z.string().uuid().describe('Unique identifier for this API request'),
  message: z.string().optional().describe('Additional message (e.g., for duplicate events)'),
});

export type TrackRequest = z.infer<typeof TrackRequestSchema>;
export type TrackResponse = z.infer<typeof TrackResponseSchema>;

/**
 * Create OpenAPI documentation for the track endpoint
 */
export function createTrackEndpointDocumentation(): EndpointDocumentation {
  const converter = new ZodToOpenAPIConverter();
  const trackRequestSchema = converter.convertSchema(TrackRequestSchema).schema;
  const trackResponseSchema = converter.convertSchema(TrackResponseSchema).schema;

  // Create realistic examples
  const trackRequestExample = {
    event: 'page_view',
    properties: {
      page: '/dashboard',
      title: 'Analytics Dashboard',
      referrer: 'https://google.com',
      utm_source: 'google',
      utm_medium: 'organic',
      browser: 'Chrome',
      os: 'macOS',
    },
    userId: 'user_12345',
    sessionId: 'session_67890',
    deviceId: 'device_abcdef',
    timestamp: new Date().toISOString(),
  };

  const trackResponseExample = {
    success: true,
    eventId: 'evt_1234567890abcdef',
    timestamp: new Date().toISOString(),
    requestId: 'req_abcdef123456',
  };



  return {
    path: '/v1/track',
    method: 'POST',
    summary: 'Track Event',
    description: 'Track user events and interactions for analytics processing. Events are processed asynchronously and made available for querying and analysis.',
    tags: ['Events'],
    parameters: [
      {
        name: 'x-tenant-id',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Tenant identifier for multi-tenant isolation',
        example: 'tenant_abc123',
      },
    ],
    requestBody: {
      description: 'Event data to track',
      required: true,
      content: {
        'application/json': {
          schema: trackRequestSchema,
          example: trackRequestExample,
        },
      },
    },
    responses: [
      {
        statusCode: 200,
        description: 'Event successfully tracked',
        content: {
          'application/json': {
            schema: trackResponseSchema,
            example: trackResponseExample,
          },
        },
      },
      {
        statusCode: 400,
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' },
                statusCode: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
  };
}

