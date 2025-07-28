import { z } from 'zod';
import { EndpointDocumentation } from '../openapi-generator.js';
import { ZodToOpenAPIConverter } from '../zod-converter.js';

// Zod schema for health response
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('Overall system health status'),
  version: z.string().describe('API version'),
  uptime: z.number().int().min(0).describe('Server uptime in seconds'),
  timestamp: z.date().describe('Current server timestamp'),
  dependencies: z.object({
    eventStore: z.enum(['healthy', 'unhealthy']).describe('Event storage system health'),
    userStore: z.enum(['healthy', 'unhealthy']).describe('User storage system health'),
    rateLimiter: z.enum(['healthy', 'unhealthy']).describe('Rate limiting system health'),
  }).describe('Health status of system dependencies'),
  error: z.string().optional().describe('Error message if health check failed'),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Create OpenAPI documentation for the health endpoint
 */
export function createHealthEndpointDocumentation(): EndpointDocumentation {
  const converter = new ZodToOpenAPIConverter();
  const healthResponseSchema = converter.convertSchema(HealthResponseSchema).schema;

  // Create example responses
  const healthyExample = {
    status: 'healthy',
    version: '1.0.0',
    uptime: 3600,
    timestamp: new Date().toISOString(),
    dependencies: {
      eventStore: 'healthy',
      userStore: 'healthy',
      rateLimiter: 'healthy',
    },
  };



  const unhealthyExample = {
    status: 'unhealthy',
    version: '1.0.0',
    uptime: 1800,
    timestamp: new Date().toISOString(),
    dependencies: {
      eventStore: 'unhealthy',
      userStore: 'unhealthy',
      rateLimiter: 'unhealthy',
    },
    error: 'Multiple system dependencies are unavailable',
  };

  return {
    path: '/v1/health',
    method: 'GET',
    summary: 'Health Check',
    description: 'Check the health status of the Nodash Analytics API and its dependencies.',
    tags: ['System'],
    responses: [
      {
        statusCode: 200,
        description: 'System is healthy or degraded but functional',
        content: {
          'application/json': {
            schema: healthResponseSchema,
            example: healthyExample,
          },
        },
      },
      {
        statusCode: 503,
        description: 'System is unhealthy - one or more critical dependencies are unavailable',
        content: {
          'application/json': {
            schema: healthResponseSchema,
            example: unhealthyExample,
          },
        },
      },
    ],
  };
}



