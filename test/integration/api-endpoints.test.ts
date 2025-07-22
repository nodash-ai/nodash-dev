import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const API_KEY = 'demo-api-key-tenant1';
const TENANT_ID = 'tenant1';
const TEST_PORT = 13001;

let serverProcess: any;
let baseUrl: string;

describe('API Endpoints Integration Tests', () => {
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

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/v1/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.dependencies.eventStore).toBe('healthy');
      expect(data.dependencies.userStore).toBe('healthy');
    });
  });

  describe('Track Endpoint', () => {
    it('should track events successfully', async () => {
      const response = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          event: 'page_view',
          userId: 'user123',
          properties: { page: '/home' }
        })
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBeDefined();
    });

    it('should reject requests without tenant ID', async () => {
      const response = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          event: 'page_view'
        })
      });
      
      expect(response.status).toBe(400);
    });

    it('should reject requests with invalid API key', async () => {
      const response = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': 'invalid-key',
        },
        body: JSON.stringify({
          event: 'page_view'
        })
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe('Identify Endpoint', () => {
    it('should identify users successfully', async () => {
      const response = await fetch(`${baseUrl}/v1/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId: 'user456',
          traits: { email: 'user@example.com' }
        })
      });
      
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user456');
    });
  });
});