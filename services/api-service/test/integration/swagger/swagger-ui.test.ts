import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createDefaultSwaggerConfig } from '../../../src/swagger/swagger-config.js';

describe('Swagger UI Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    const swaggerConfig = createDefaultSwaggerConfig('development');
    const middleware = swaggerConfig.createSwaggerMiddleware();

    app.use('/api-docs', middleware.serve);
    app.get('/api-docs/', middleware.setup);
    app.get('/api-docs/json', middleware.jsonSpec);
    app.get('/api-docs/yaml', middleware.yamlSpec);
  });

  it('should serve Swagger UI HTML', async () => {
    const response = await request(app).get('/api-docs/').expect(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON specification', async () => {
    const response = await request(app).get('/api-docs/json').expect(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    const spec = response.body;
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Nodash Analytics API');
    expect(spec.paths['/v1/health']).toBeDefined();
    expect(spec.paths['/v1/track']).toBeDefined();
    expect(spec.paths['/v1/identify']).toBeDefined();
    expect(spec.paths['/v1/events/query']).toBeDefined();
    expect(spec.paths['/v1/users/query']).toBeDefined();
  });

  it('should serve OpenAPI YAML specification', async () => {
    const response = await request(app).get('/api-docs/yaml').expect(200);
    expect(response.headers['content-type']).toContain('application/x-yaml');
    expect(response.text).toContain('openapi:');
  });
});