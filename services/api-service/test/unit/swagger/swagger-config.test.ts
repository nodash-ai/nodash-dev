import { describe, it, expect } from 'vitest';
import { createDefaultSwaggerConfig } from '../../../src/swagger/swagger-config.js';

describe('SwaggerConfiguration', () => {
  it('should create swagger configuration with all endpoints', () => {
    const config = createDefaultSwaggerConfig('development');
    const spec = config.generateSpecification();
    
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Nodash Analytics API');
    expect(spec.paths['/v1/health']).toBeDefined();
    expect(spec.paths['/v1/track']).toBeDefined();
    expect(spec.paths['/v1/identify']).toBeDefined();
    expect(spec.paths['/v1/events/query']).toBeDefined();
    expect(spec.paths['/v1/users/query']).toBeDefined();
  });

  it('should create swagger middleware', () => {
    const config = createDefaultSwaggerConfig();
    const middleware = config.createSwaggerMiddleware();
    
    expect(middleware.serve).toBeDefined();
    expect(middleware.setup).toBeDefined();
    expect(middleware.jsonSpec).toBeDefined();
    expect(middleware.yamlSpec).toBeDefined();
  });
});