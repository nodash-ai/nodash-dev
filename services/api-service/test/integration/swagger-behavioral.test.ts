import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

/**
 * Swagger Behavioral Tests
 * 
 * Focus: Test real user workflows and behaviors, not implementation details
 * Value: Protect against breaking changes that affect user experience
 * Coverage: Essential Swagger functionality that users depend on
 */
describe('Swagger UI Integration', () => {
  let serverProcess: any;
  let baseUrl: string;
  const TEST_PORT = 13300;

  beforeAll(async () => {
    // Clean setup for isolated testing
    await fs.rm('./integration-test-data-swagger', { recursive: true, force: true });

    // Start real server instance (component-level testing)
    process.env.NODE_ENV = 'test';
    process.env.PORT = TEST_PORT.toString();
    process.env.EVENTS_PATH = './integration-test-data-swagger/events';
    process.env.USERS_PATH = './integration-test-data-swagger/users';
    process.env.STORE_EVENTS = 'flatfile';
    process.env.STORE_USERS = 'flatfile';
    process.env.STORE_RATELIMIT = 'memory';

    baseUrl = `http://localhost:${TEST_PORT}`;

    serverProcess = spawn('npm', ['start'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env },
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    await fs.rm('./integration-test-data-swagger', { recursive: true, force: true });
  });

  describe('Documentation Accessibility', () => {
    it('should serve Swagger UI for API exploration', async () => {
      // USER BEHAVIOR: Developer visits /api-docs/ to explore API
      const response = await fetch(`${baseUrl}/api-docs/`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      // Verify it's actually Swagger UI (not just any HTML)
      const html = await response.text();
      expect(html).toContain('swagger-ui');
      expect(html).toContain('Nodash Analytics API');
    });

    it('should provide machine-readable API specification', async () => {
      // USER BEHAVIOR: Tools/clients fetch OpenAPI spec for code generation
      const response = await fetch(`${baseUrl}/api-docs/json`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const spec = await response.json();
      
      // Basic spec validity (protects against broken spec generation)
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
      
      // Verify essential endpoints are documented (regression protection)
      expect(spec.paths['/v1/track']).toBeDefined();
      expect(spec.paths['/v1/identify']).toBeDefined();
      expect(spec.paths['/v1/health']).toBeDefined();
    });
  });

  describe('Authentication Integration', () => {
    it('should support Bearer token authentication through Swagger UI', async () => {
      // USER BEHAVIOR: Developer uses Swagger UI "Authorize" button with Bearer token
      // This tests the complete auth flow that users experience
      
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1',
        },
        body: JSON.stringify({
          event: 'swagger_ui_bearer_test',
          properties: { source: 'swagger_ui' }
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventId).toBeDefined();
    });

    it('should support API key authentication through Swagger UI', async () => {
      // USER BEHAVIOR: Developer uses Swagger UI "Authorize" button with API key
      
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key-tenant1',
        },
        body: JSON.stringify({
          event: 'swagger_ui_apikey_test',
          properties: { source: 'swagger_ui' }
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject invalid authentication in Swagger UI workflows', async () => {
      // USER BEHAVIOR: Developer uses invalid credentials and expects clear error
      
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          event: 'test_event',
          properties: {}
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.message).toBeDefined();
    });
  });

  describe('API Documentation Completeness', () => {
    it('should document authentication options for protected endpoints', async () => {
      // USER BEHAVIOR: Developer looks at API spec to understand auth requirements
      
      const response = await fetch(`${baseUrl}/api-docs/json`);
      const spec = await response.json();
      
      // Verify auth schemes are defined (regression protection)  
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.apiKey).toBeDefined();
      
      // Verify protected endpoints have auth requirements
      const trackEndpoint = spec.paths['/v1/track'].post;
      expect(trackEndpoint.security).toBeDefined();
      expect(trackEndpoint.security.length).toBeGreaterThan(0);
      
      // Verify both auth methods are available
      const hasBearer = trackEndpoint.security.some((s: any) => s.bearerAuth !== undefined);
      const hasApiKey = trackEndpoint.security.some((s: any) => s.apiKey !== undefined);
      expect(hasBearer).toBe(true);
      expect(hasApiKey).toBe(true);
    });

    it('should not require authentication for public endpoints', async () => {
      // USER BEHAVIOR: Developer expects public endpoints to work without auth
      
      const healthResponse = await fetch(`${baseUrl}/health`);
      expect(healthResponse.status).toBe(200);
      
      // Verify health endpoint is documented as public
      const specResponse = await fetch(`${baseUrl}/api-docs/json`);
      const spec = await specResponse.json();
      const healthEndpoint = spec.paths['/v1/health'].get;
      expect(healthEndpoint.security).toBeUndefined();
    });
  });

  describe('End-to-End Swagger Workflow', () => {
    it('should support complete developer workflow: discover → authenticate → test', async () => {
      // USER BEHAVIOR: Complete workflow a developer would experience
      
      // 1. Discover API through Swagger UI
      const docsResponse = await fetch(`${baseUrl}/api-docs/`);
      expect(docsResponse.status).toBe(200);
      
      // 2. Get API specification for understanding
      const specResponse = await fetch(`${baseUrl}/api-docs/json`);
      expect(specResponse.status).toBe(200);
      const spec = await specResponse.json();
      expect(spec.paths['/v1/track']).toBeDefined();
      
      // 3. Authenticate and test API call (via Swagger UI "Try it out")
      const trackResponse = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1',
        },
        body: JSON.stringify({
          event: 'complete_workflow_test',
          properties: { workflow: 'swagger_discovery' }
        }),
      });
      
      expect(trackResponse.status).toBe(200);
      const trackData = await trackResponse.json();
      expect(trackData.success).toBe(true);
      
      // 4. Verify different authentication method also works
      const identifyResponse = await fetch(`${baseUrl}/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key-tenant1',
        },
        body: JSON.stringify({
          userId: 'swagger-workflow-user',
          traits: { discoveredVia: 'swagger_ui' }
        }),
      });
      
      expect(identifyResponse.status).toBe(200);
      const identifyData = await identifyResponse.json();
      expect(identifyData.success).toBe(true);
    });
  });
});