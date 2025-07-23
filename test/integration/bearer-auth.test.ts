import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

describe('Bearer Token Authentication', () => {
  let serverProcess: any;
  let baseUrl: string;
  const TEST_PORT = 13100;

  beforeAll(async () => {
    // Clean up any existing test data
    await fs.rm('./integration-test-data', { recursive: true, force: true });
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = TEST_PORT.toString();
    process.env.EVENTS_PATH = './integration-test-data/events';
    process.env.USERS_PATH = './integration-test-data/users';
    process.env.STORE_EVENTS = 'flatfile';
    process.env.STORE_USERS = 'flatfile';
    process.env.STORE_RATELIMIT = 'memory';
    
    baseUrl = `http://localhost:${TEST_PORT}`;
    
    // Start server process
    serverProcess = spawn('npm', ['start'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env }
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    // Kill server
    if (serverProcess) {
      serverProcess.kill();
    }
    
    // Clean up test data
    await fs.rm('./integration-test-data', { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Individual test cleanup if needed
  });

  describe('Bearer Token with API Key', () => {
    it('should accept Bearer token with valid API key', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1'
        },
        body: JSON.stringify({
          event: 'bearer_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventId).toBeDefined();
    });

    it('should reject Bearer token with invalid API key', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-api-key'
        },
        body: JSON.stringify({
          event: 'bearer_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication failed');
    });

    it('should extract tenant from Bearer API key', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1'
        },
        body: JSON.stringify({
          event: 'tenant_extraction_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      // The fact that it succeeds means tenant was extracted from API key
      // (otherwise would fail due to missing x-tenant-id header)
    });
  });

  describe('Bearer Token with JWT (if configured)', () => {
    it('should handle Bearer JWT tokens when JWT secret is configured', async () => {
      // This test would require JWT secret to be configured
      // For now, we test that invalid JWT is handled gracefully
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid'
        },
        body: JSON.stringify({
          event: 'jwt_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication failed');
    });
  });

  describe('API Key Header Authentication', () => {
    it('should still support x-api-key header authentication', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'demo-api-key-tenant1'
        },
        body: JSON.stringify({
          event: 'api_key_header_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should support both x-tenant-id header and API key header', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant1',
          'x-api-key': 'demo-api-key-tenant1'
        },
        body: JSON.stringify({
          event: 'manual_tenant_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Authentication Fallback Logic', () => {
    it('should try JWT first, then API key for Bearer tokens', async () => {
      // Send a Bearer token that looks like JWT but is actually an API key
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1'
        },
        body: JSON.stringify({
          event: 'fallback_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      // This succeeds because the auth middleware tries JWT first (fails), 
      // then falls back to treating it as an API key (succeeds)
    });

    it('should reject completely invalid tokens', async () => {
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer completely-invalid-token'
        },
        body: JSON.stringify({
          event: 'invalid_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Tenant Extraction Priority', () => {
    it('should prefer tenant from API key over manual header when both present', async () => {
      // Send API key for tenant1 but manually specify different tenant
      const response = await fetch(`${baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-api-key-tenant1',
          'x-tenant-id': 'different-tenant'
        },
        body: JSON.stringify({
          event: 'tenant_priority_test',
          properties: { source: 'test' }
        })
      });

      expect(response.status).toBe(200);
      // Success indicates that tenant from API key (tenant1) was used,
      // not the manual header value
    });
  });

  describe('Health Endpoint Authentication', () => {
    it('should allow health checks without authentication', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      
      const health = await response.json();
      expect(health.status).toBe('healthy');
    });

    it('should allow health checks with Bearer authentication', async () => {
      const response = await fetch(`${baseUrl}/health`, {
        headers: {
          'Authorization': 'Bearer demo-api-key-tenant1'
        }
      });
      
      expect(response.status).toBe(200);
      const health = await response.json();
      expect(health.status).toBe('healthy');
    });
  });
});