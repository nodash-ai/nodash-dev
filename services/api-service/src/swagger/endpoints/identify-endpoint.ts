import { z } from 'zod';
import { EndpointDocumentation } from '../openapi-generator.js';
import { ZodToOpenAPIConverter } from '../zod-converter.js';

// Zod schema for identify request (matching the one in request-router.ts)
export const IdentifyRequestSchema = z.object({
  userId: z.string().min(1).describe('Unique identifier for the user'),
  traits: z.record(z.any()).optional().describe('User attributes and properties to store or update'),
  timestamp: z.string().datetime().optional().describe('Timestamp when the identification occurred (defaults to current time)'),
});

// Zod schema for identify response
export const IdentifyResponseSchema = z.object({
  success: z.boolean().describe('Whether the user was successfully identified'),
  userId: z.string().describe('The user identifier that was processed'),
  created: z.boolean().describe('Whether this was a new user (true) or existing user update (false)'),
  timestamp: z.string().datetime().describe('Server timestamp when the identification was processed'),
  requestId: z.string().uuid().describe('Unique identifier for this API request'),
});

export type IdentifyRequest = z.infer<typeof IdentifyRequestSchema>;
export type IdentifyResponse = z.infer<typeof IdentifyResponseSchema>;

/**
 * Create OpenAPI documentation for the identify endpoint
 */
export function createIdentifyEndpointDocumentation(): EndpointDocumentation {
  const converter = new ZodToOpenAPIConverter();
  const identifyRequestSchema = converter.convertSchema(IdentifyRequestSchema).schema;
  const identifyResponseSchema = converter.convertSchema(IdentifyResponseSchema).schema;

  // Create realistic examples
  const identifyRequestExample = {
    userId: 'user_12345',
    traits: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      plan: 'premium',
      company: 'Acme Corp',
      role: 'developer',
      signupDate: '2024-01-15',
      preferences: {
        newsletter: true,
        notifications: false,
      },
    },
    timestamp: new Date().toISOString(),
  };

  const identifyResponseExample = {
    success: true,
    userId: 'user_12345',
    created: false,
    timestamp: new Date().toISOString(),
    requestId: 'req_abcdef123456',
  };

  const newUserResponseExample = {
    success: true,
    userId: 'user_67890',
    created: true,
    timestamp: new Date().toISOString(),
    requestId: 'req_123456abcdef',
  };

  return {
    path: '/v1/identify',
    method: 'POST',
    summary: 'Identify User',
    description: `
Identify and update user profiles with traits and attributes.

This endpoint allows you to create new user profiles or update existing ones with user attributes (traits). It's essential for building comprehensive user profiles and enabling personalized analytics.

## User Identification

The identify endpoint:
- **Creates new users** when a userId is encountered for the first time
- **Updates existing users** by merging new traits with existing ones
- **Tracks user activity** by updating last seen timestamps
- **Manages sessions** by detecting session boundaries (30+ minutes of inactivity)

## Traits and Properties

Traits are key-value pairs that describe user attributes:
- **Personal information**: name, email, age, location
- **Account details**: plan type, signup date, preferences
- **Business context**: company, role, department
- **Custom attributes**: any domain-specific user properties

Traits are merged with existing user data, so you can update specific attributes without affecting others.

## Session Management

The system automatically manages user sessions:
- **New sessions** are created when 30+ minutes have passed since last activity
- **Session count** is incremented for new sessions
- **Event count** tracks total user activity across all sessions

## Data Persistence

User data is stored persistently and includes:
- **First seen**: When the user was first identified
- **Last seen**: Most recent identification timestamp
- **Session count**: Total number of user sessions
- **Event count**: Total number of events tracked for this user
- **Traits**: All user attributes merged over time

## Deduplication

Multiple identify calls for the same user are handled gracefully:
- New traits are merged with existing ones
- Timestamps are updated to reflect latest activity
- Session logic determines if a new session should be created

## Use Cases

### User Registration
Capture user details when they sign up for your service.

### Profile Updates
Update user information when they modify their profile.

### Progressive Profiling
Gradually build user profiles as you learn more about them.

### Account Changes
Track changes in user status, plan upgrades, etc.
    `.trim(),
    tags: ['Users'],
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
      description: 'User identification data',
      required: true,
      content: {
        'application/json': {
          schema: identifyRequestSchema,
          example: identifyRequestExample,
        },
      },
    },
    responses: [
      {
        statusCode: 200,
        description: 'User successfully identified and profile updated',
        content: {
          'application/json': {
            schema: identifyResponseSchema,
            example: identifyResponseExample,
          },
        },
        headers: {
          'x-request-id': {
            description: 'Unique request identifier',
            schema: { type: 'string', format: 'uuid' },
          },
          'x-ratelimit-limit': {
            description: 'Request limit per time window',
            schema: { type: 'integer' },
          },
          'x-ratelimit-remaining': {
            description: 'Remaining requests in current window',
            schema: { type: 'integer' },
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
                error: { type: 'string', example: 'Invalid identify request' },
                message: { type: 'string', example: 'Validation failed: userId: String must contain at least 1 character(s)' },
                statusCode: { type: 'number', example: 400 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
            example: {
              error: 'Invalid identify request',
              message: 'Validation failed: userId: String must contain at least 1 character(s)',
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
            example: {
              error: 'Unauthorized',
              message: 'Authentication required',
              statusCode: 401,
              timestamp: new Date().toISOString(),
              requestId: 'req_auth_error',
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
            example: {
              error: 'Forbidden',
              message: 'Invalid tenant or insufficient permissions',
              statusCode: 403,
              timestamp: new Date().toISOString(),
              requestId: 'req_forbidden_error',
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
            example: {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded',
              statusCode: 429,
              timestamp: new Date().toISOString(),
              requestId: 'req_rate_limit_error',
              retryAfter: 60,
            },
          },
        },
        headers: {
          'retry-after': {
            description: 'Number of seconds to wait before retrying',
            schema: { type: 'integer' },
          },
          'x-ratelimit-limit': {
            description: 'Request limit per time window',
            schema: { type: 'integer' },
          },
          'x-ratelimit-remaining': {
            description: 'Remaining requests in current window',
            schema: { type: 'integer' },
          },
          'x-ratelimit-reset': {
            description: 'Time when rate limit resets (Unix timestamp)',
            schema: { type: 'integer' },
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
                message: { type: 'string', example: 'Failed to process identify request' },
                statusCode: { type: 'number', example: 500 },
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string', format: 'uuid' },
              },
              required: ['error', 'message', 'statusCode', 'timestamp'],
            },
            example: {
              error: 'Internal Server Error',
              message: 'Failed to process identify request',
              statusCode: 500,
              timestamp: new Date().toISOString(),
              requestId: 'req_server_error',
            },
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }, { apiKey: [] }],
  };
}

