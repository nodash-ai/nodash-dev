import { z } from 'zod';
import { EndpointDocumentation } from '../openapi-generator.js';
import { ZodToOpenAPIConverter } from '../zod-converter.js';

// Zod schemas for query parameters
export const EventQueryParamsSchema = z.object({
  eventTypes: z.string().optional().describe('Comma-separated list of event types to filter by'),
  eventType: z.string().optional().describe('Single event type to filter by (alternative to eventTypes)'),
  userId: z.string().optional().describe('Filter events for a specific user'),
  startDate: z.string().datetime().optional().describe('Start date for event filtering (ISO 8601 format)'),
  endDate: z.string().datetime().optional().describe('End date for event filtering (ISO 8601 format)'),
  properties: z.string().optional().describe('JSON string of event properties to filter by'),
  sortBy: z.enum(['timestamp', 'eventName', 'userId']).optional().describe('Field to sort results by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (ascending or descending)'),
  limit: z.coerce.number().int().min(1).max(1000).optional().describe('Maximum number of results to return (1-1000)'),
  offset: z.coerce.number().int().min(0).optional().describe('Number of results to skip for pagination'),
  format: z.enum(['json', 'table', 'csv']).optional().describe('Output format for results'),
});

export const UserQueryParamsSchema = z.object({
  userId: z.string().optional().describe('Filter for a specific user'),
  activeSince: z.string().datetime().optional().describe('Filter users active since this date (ISO 8601 format)'),
  activeUntil: z.string().datetime().optional().describe('Filter users active until this date (ISO 8601 format)'),
  properties: z.string().optional().describe('JSON string of user properties to filter by'),
  sortBy: z.enum(['firstSeen', 'lastSeen', 'eventCount', 'sessionCount']).optional().describe('Field to sort results by'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (ascending or descending)'),
  limit: z.coerce.number().int().min(1).max(1000).optional().describe('Maximum number of results to return (1-1000)'),
  offset: z.coerce.number().int().min(0).optional().describe('Number of results to skip for pagination'),
  format: z.enum(['json', 'table', 'csv']).optional().describe('Output format for results'),
});

// Response schemas
export const EventQueryResponseSchema = z.object({
  success: z.boolean().describe('Whether the query was successful'),
  data: z.object({
    events: z.array(z.object({
      eventId: z.string().describe('Unique event identifier'),
      tenantId: z.string().describe('Tenant identifier'),
      eventName: z.string().describe('Event type/name'),
      userId: z.string().optional().describe('User who triggered the event'),
      properties: z.record(z.any()).describe('Event properties and metadata'),
      timestamp: z.string().datetime().describe('When the event occurred'),
      receivedAt: z.string().datetime().describe('When the event was received by the server'),
      sessionId: z.string().optional().describe('Session identifier'),
      deviceId: z.string().optional().describe('Device identifier'),
    })).describe('Array of matching events'),
    totalCount: z.number().describe('Total number of events matching the query'),
    hasMore: z.boolean().describe('Whether there are more results available'),
    pagination: z.object({
      limit: z.number().describe('Current page size limit'),
      offset: z.number().describe('Current offset'),
      nextOffset: z.number().optional().describe('Offset for next page (if hasMore is true)'),
    }).describe('Pagination information'),
    executionTime: z.number().describe('Query execution time in milliseconds'),
  }).describe('Query results and metadata'),
  timestamp: z.string().datetime().describe('Response timestamp'),
  requestId: z.string().uuid().describe('Unique request identifier'),
});

export const UserQueryResponseSchema = z.object({
  success: z.boolean().describe('Whether the query was successful'),
  data: z.object({
    users: z.array(z.object({
      userId: z.string().describe('Unique user identifier'),
      tenantId: z.string().describe('Tenant identifier'),
      properties: z.record(z.any()).describe('User traits and attributes'),
      firstSeen: z.string().datetime().describe('When the user was first identified'),
      lastSeen: z.string().datetime().describe('Most recent user activity'),
      sessionCount: z.number().describe('Total number of user sessions'),
      eventCount: z.number().describe('Total number of events for this user'),
    })).describe('Array of matching users'),
    totalCount: z.number().describe('Total number of users matching the query'),
    hasMore: z.boolean().describe('Whether there are more results available'),
    pagination: z.object({
      limit: z.number().describe('Current page size limit'),
      offset: z.number().describe('Current offset'),
      nextOffset: z.number().optional().describe('Offset for next page (if hasMore is true)'),
    }).describe('Pagination information'),
    executionTime: z.number().describe('Query execution time in milliseconds'),
  }).describe('Query results and metadata'),
  timestamp: z.string().datetime().describe('Response timestamp'),
  requestId: z.string().uuid().describe('Unique request identifier'),
});

export type EventQueryParams = z.infer<typeof EventQueryParamsSchema>;
export type UserQueryParams = z.infer<typeof UserQueryParamsSchema>;
export type EventQueryResponse = z.infer<typeof EventQueryResponseSchema>;
export type UserQueryResponse = z.infer<typeof UserQueryResponseSchema>;

/**
 * Create OpenAPI documentation for the events query endpoint
 */
export function createEventQueryEndpointDocumentation(): EndpointDocumentation {
  const converter = new ZodToOpenAPIConverter({
    includeExamples: true,
    includeDescriptions: true,
  });

  const responseResult = converter.convertSchema(EventQueryResponseSchema);
  const responseSchema = responseResult.schema;

  // Create example response
  const exampleResponse = {
    success: true,
    data: {
      events: [
        {
          eventId: 'evt_1234567890abcdef',
          tenantId: 'tenant_abc123',
          eventName: 'page_view',
          userId: 'user_12345',
          properties: {
            page: '/dashboard',
            title: 'Analytics Dashboard',
            referrer: 'https://google.com',
            utm_source: 'google',
          },
          timestamp: '2024-01-15T10:30:00.000Z',
          receivedAt: '2024-01-15T10:30:00.123Z',
          sessionId: 'session_67890',
          deviceId: 'device_abcdef',
        },
        {
          eventId: 'evt_abcdef1234567890',
          tenantId: 'tenant_abc123',
          eventName: 'button_click',
          userId: 'user_12345',
          properties: {
            button_text: 'Sign Up',
            button_id: 'signup-btn',
            page: '/landing',
          },
          timestamp: '2024-01-15T10:25:00.000Z',
          receivedAt: '2024-01-15T10:25:00.456Z',
          sessionId: 'session_67890',
        },
      ],
      totalCount: 1247,
      hasMore: true,
      pagination: {
        limit: 100,
        offset: 0,
        nextOffset: 100,
      },
      executionTime: 45,
    },
    timestamp: new Date().toISOString(),
    requestId: 'req_query_events_123',
  };

  return {
    path: '/v1/events/query',
    method: 'GET',
    summary: 'Query Events',
    description: `
Query and retrieve analytics events with flexible filtering, sorting, and pagination.

This endpoint allows you to search through tracked events using various filters and retrieve results in different formats. It's essential for analytics dashboards, reporting, and data analysis.

## Filtering Options

### Event Type Filtering
- **eventType**: Filter by a single event type (e.g., "page_view")
- **eventTypes**: Filter by multiple event types (comma-separated: "page_view,button_click")

### User Filtering
- **userId**: Get events for a specific user

### Date Range Filtering
- **startDate**: Events after this timestamp (ISO 8601 format)
- **endDate**: Events before this timestamp (ISO 8601 format)
- Date ranges are inclusive and can be used together or separately

### Property Filtering
- **properties**: JSON object to filter events by specific property values
- Example: \`{"page": "/dashboard", "utm_source": "google"}\`
- Supports nested property matching

## Sorting and Pagination

### Sorting
- **sortBy**: Sort by timestamp (default), eventName, or userId
- **sortOrder**: "asc" (ascending) or "desc" (descending, default)

### Pagination
- **limit**: Number of results per page (1-1000, default: 100)
- **offset**: Number of results to skip (for pagination)
- Use \`hasMore\` and \`nextOffset\` in response for pagination

## Output Formats

- **json**: Structured JSON response (default)
- **table**: Tabular format for display
- **csv**: CSV format for export

## Performance Considerations

- Queries are optimized for recent data
- Large date ranges may have longer execution times
- Use pagination for large result sets
- Property filtering is indexed for common use cases

## Use Cases

### Analytics Dashboards
Query events for specific time periods and event types.

### User Journey Analysis
Track user behavior by filtering events for specific users.

### Funnel Analysis
Query events in sequence to analyze conversion funnels.

### Export and Reporting
Export event data in CSV format for external analysis.
    `.trim(),
    tags: ['Analytics'],
    parameters: [
      {
        name: 'x-tenant-id',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Tenant identifier for multi-tenant isolation',
        example: 'tenant_abc123',
      },
      {
        name: 'eventType',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Single event type to filter by',
        example: 'page_view',
      },
      {
        name: 'eventTypes',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Comma-separated list of event types',
        example: 'page_view,button_click,purchase',
      },
      {
        name: 'userId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter events for a specific user',
        example: 'user_12345',
      },
      {
        name: 'startDate',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'Start date for filtering (ISO 8601)',
        example: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'endDate',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'End date for filtering (ISO 8601)',
        example: '2024-01-31T23:59:59.999Z',
      },
      {
        name: 'properties',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'JSON string of properties to filter by',
        example: '{"page": "/dashboard", "utm_source": "google"}',
      },
      {
        name: 'sortBy',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['timestamp', 'eventName', 'userId'] },
        description: 'Field to sort results by',
        example: 'timestamp',
      },
      {
        name: 'sortOrder',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'] },
        description: 'Sort order',
        example: 'desc',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 1000 },
        description: 'Maximum number of results (1-1000)',
        example: 100,
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 0 },
        description: 'Number of results to skip',
        example: 0,
      },
      {
        name: 'format',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['json', 'table', 'csv'] },
        description: 'Output format',
        example: 'json',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Events retrieved successfully',
        content: {
          'application/json': {
            schema: responseSchema,
            example: exampleResponse,
          },
        },
        headers: {
          'x-request-id': {
            description: 'Unique request identifier',
            schema: { type: 'string', format: 'uuid' },
          },
        },
      },
      {
        statusCode: 400,
        description: 'Invalid query parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Invalid startDate' },
                message: { type: 'string', example: 'startDate must be a valid ISO 8601 date string' },
                statusCode: { type: 'number', example: 400 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
            example: {
              error: 'Invalid startDate',
              message: 'startDate must be a valid ISO 8601 date string',
              statusCode: 400,
              timestamp: new Date().toISOString(),
              requestId: 'req_error123',
            },
          },
        },
      },
      {
        statusCode: 401,
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Unauthorized' },
                message: { type: 'string', example: 'Authentication required' },
                statusCode: { type: 'number', example: 401 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 403,
        description: 'Insufficient permissions or invalid tenant',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Forbidden' },
                message: { type: 'string', example: 'Invalid tenant or insufficient permissions' },
                statusCode: { type: 'number', example: 403 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 429,
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Too Many Requests' },
                message: { type: 'string', example: 'Rate limit exceeded' },
                statusCode: { type: 'number', example: 429 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
                retryAfter: { type: 'number', example: 60 },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 500,
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Internal Server Error' },
                message: { type: 'string', example: 'Failed to process event query' },
                statusCode: { type: 'number', example: 500 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
  };
}

/**
 * Create OpenAPI documentation for the users query endpoint
 */
export function createUserQueryEndpointDocumentation(): EndpointDocumentation {
  const converter = new ZodToOpenAPIConverter({
    includeExamples: true,
    includeDescriptions: true,
  });

  const responseResult = converter.convertSchema(UserQueryResponseSchema);
  const responseSchema = responseResult.schema;

  // Create example response
  const exampleResponse = {
    success: true,
    data: {
      users: [
        {
          userId: 'user_12345',
          tenantId: 'tenant_abc123',
          properties: {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            plan: 'premium',
            company: 'Acme Corp',
            signupDate: '2024-01-10T00:00:00.000Z',
          },
          firstSeen: '2024-01-10T09:15:00.000Z',
          lastSeen: '2024-01-15T14:30:00.000Z',
          sessionCount: 23,
          eventCount: 156,
        },
        {
          userId: 'user_67890',
          tenantId: 'tenant_abc123',
          properties: {
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            plan: 'free',
            signupDate: '2024-01-12T00:00:00.000Z',
          },
          firstSeen: '2024-01-12T11:20:00.000Z',
          lastSeen: '2024-01-15T16:45:00.000Z',
          sessionCount: 8,
          eventCount: 42,
        },
      ],
      totalCount: 1523,
      hasMore: true,
      pagination: {
        limit: 100,
        offset: 0,
        nextOffset: 100,
      },
      executionTime: 28,
    },
    timestamp: new Date().toISOString(),
    requestId: 'req_query_users_456',
  };

  return {
    path: '/v1/users/query',
    method: 'GET',
    summary: 'Query Users',
    description: `
Query and retrieve user profiles with flexible filtering, sorting, and pagination.

This endpoint allows you to search through identified users and their profiles using various filters. It's essential for user analytics, segmentation, and customer insights.

## Filtering Options

### User Filtering
- **userId**: Get a specific user by ID

### Activity Date Filtering
- **activeSince**: Users active since this date (ISO 8601 format)
- **activeUntil**: Users active until this date (ISO 8601 format)
- Date ranges help identify active vs. inactive users

### Property Filtering
- **properties**: JSON object to filter users by specific traits
- Example: \`{"plan": "premium", "company": "Acme Corp"}\`
- Supports nested property matching

## Sorting and Pagination

### Sorting
- **sortBy**: Sort by firstSeen, lastSeen (default), eventCount, or sessionCount
- **sortOrder**: "asc" (ascending) or "desc" (descending, default)

### Pagination
- **limit**: Number of results per page (1-1000, default: 100)
- **offset**: Number of results to skip (for pagination)
- Use \`hasMore\` and \`nextOffset\` in response for pagination

## Output Formats

- **json**: Structured JSON response (default)
- **table**: Tabular format for display
- **csv**: CSV format for export

## User Data Structure

Each user record includes:
- **Basic identification**: userId, tenantId
- **User traits**: All properties set via identify calls
- **Activity metrics**: firstSeen, lastSeen, sessionCount, eventCount
- **Engagement data**: Session and event counts for user segmentation

## Performance Considerations

- Queries are optimized for recent user activity
- Property filtering is indexed for common traits
- Use pagination for large user bases
- Activity date filtering improves query performance

## Use Cases

### User Segmentation
Filter users by plan type, activity level, or custom traits.

### Customer Analytics
Analyze user engagement through session and event counts.

### Cohort Analysis
Query users by signup date or first activity.

### User Export
Export user data in CSV format for external analysis.

### Active User Analysis
Find users active within specific time periods.
    `.trim(),
    tags: ['Analytics'],
    parameters: [
      {
        name: 'x-tenant-id',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Tenant identifier for multi-tenant isolation',
        example: 'tenant_abc123',
      },
      {
        name: 'userId',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter for a specific user',
        example: 'user_12345',
      },
      {
        name: 'activeSince',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'Users active since this date (ISO 8601)',
        example: '2024-01-01T00:00:00.000Z',
      },
      {
        name: 'activeUntil',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
        description: 'Users active until this date (ISO 8601)',
        example: '2024-01-31T23:59:59.999Z',
      },
      {
        name: 'properties',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'JSON string of user properties to filter by',
        example: '{"plan": "premium", "company": "Acme Corp"}',
      },
      {
        name: 'sortBy',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['firstSeen', 'lastSeen', 'eventCount', 'sessionCount'] },
        description: 'Field to sort results by',
        example: 'lastSeen',
      },
      {
        name: 'sortOrder',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'] },
        description: 'Sort order',
        example: 'desc',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 1000 },
        description: 'Maximum number of results (1-1000)',
        example: 100,
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 0 },
        description: 'Number of results to skip',
        example: 0,
      },
      {
        name: 'format',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['json', 'table', 'csv'] },
        description: 'Output format',
        example: 'json',
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: 'Users retrieved successfully',
        content: {
          'application/json': {
            schema: responseSchema,
            example: exampleResponse,
          },
        },
        headers: {
          'x-request-id': {
            description: 'Unique request identifier',
            schema: { type: 'string', format: 'uuid' },
          },
        },
      },
      {
        statusCode: 400,
        description: 'Invalid query parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Invalid activeSince' },
                message: { type: 'string', example: 'activeSince must be a valid ISO 8601 date string' },
                statusCode: { type: 'number', example: 400 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 401,
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Unauthorized' },
                message: { type: 'string', example: 'Authentication required' },
                statusCode: { type: 'number', example: 401 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 403,
        description: 'Insufficient permissions or invalid tenant',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Forbidden' },
                message: { type: 'string', example: 'Invalid tenant or insufficient permissions' },
                statusCode: { type: 'number', example: 403 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 429,
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Too Many Requests' },
                message: { type: 'string', example: 'Rate limit exceeded' },
                statusCode: { type: 'number', example: 429 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
                retryAfter: { type: 'number', example: 60 },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
      {
        statusCode: 500,
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Internal Server Error' },
                message: { type: 'string', example: 'Failed to process user query' },
                statusCode: { type: 'number', example: 500 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
  };
}

