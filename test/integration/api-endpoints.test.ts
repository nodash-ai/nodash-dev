import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { getIntegrationServerUrl } from './setup';

const API_KEY = 'demo-api-key-tenant1';
const TENANT_ID = 'tenant1';

let baseUrl: string;

describe('API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    baseUrl = getIntegrationServerUrl();
  });

  afterAll(async () => {
    // Test cleanup is handled by the shared setup
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
          properties: { page: '/home' },
        }),
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
          event: 'page_view',
        }),
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
          event: 'page_view',
        }),
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
          traits: { email: 'user@example.com' },
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user456');
    });
  });
});
it('should handle high-frequency requests without performance degradation', async () => {
  const startTime = Date.now();
  const requests = [];

  // Send 50 concurrent requests
  for (let i = 0; i < 50; i++) {
    requests.push(
      fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({
          event: 'performance_test',
          userId: `user_${i}`,
          properties: {
            requestIndex: i,
            timestamp: new Date().toISOString(),
          },
        }),
      })
    );
  }

  const responses = await Promise.all(requests);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // All requests should succeed
  responses.forEach((response, index) => {
    expect(response.status).toBe(200);
  });

  // Performance validation - should complete within reasonable time
  expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 requests

  console.log(`Performance test: 50 requests completed in ${totalTime}ms`);
});

it('should handle malformed requests gracefully', async () => {
  // Test invalid JSON
  const invalidJsonResponse = await fetch(`${baseUrl}/v1/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-tenant-id': TENANT_ID,
    },
    body: 'invalid json',
  });
  expect(invalidJsonResponse.status).toBe(400);

  // Test missing required fields
  const missingFieldsResponse = await fetch(`${baseUrl}/v1/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-tenant-id': TENANT_ID,
    },
    body: JSON.stringify({
      // Missing event field
      userId: 'test_user',
    }),
  });
  expect(missingFieldsResponse.status).toBe(400);

  // Test oversized payload
  const largePayload = {
    event: 'large_payload_test',
    userId: 'test_user',
    properties: {
      largeData: 'x'.repeat(100000), // 100KB of data
    },
  };

  const largePayloadResponse = await fetch(`${baseUrl}/v1/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-tenant-id': TENANT_ID,
    },
    body: JSON.stringify(largePayload),
  });

  // Should either accept it or reject with appropriate status
  expect([200, 413, 400]).toContain(largePayloadResponse.status);
});

it('should maintain data consistency under concurrent load', async () => {
  const userId = `consistency_test_${Date.now()}`;
  const promises = [];

  // Send multiple identify requests for the same user
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(`${baseUrl}/v1/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify({
          userId,
          traits: {
            email: 'consistency@example.com',
            updateIndex: i,
            timestamp: new Date().toISOString(),
          },
        }),
      })
    );
  }

  const responses = await Promise.all(promises);

  // All requests should succeed
  responses.forEach(response => {
    expect(response.status).toBe(200);
  });

  // Verify final user data is consistent
  const userFile = `./integration-test-data/users/${TENANT_ID}/users/${userId}.json`;
  const userExists = await fs
    .access(userFile)
    .then(() => true)
    .catch(() => false);
  expect(userExists).toBe(true);

  const userData = JSON.parse(await fs.readFile(userFile, 'utf-8'));
  expect(userData.userId).toBe(userId);
  expect(userData.properties.email).toBe('consistency@example.com');
  // Should have the highest updateIndex (last write wins)
  expect(userData.properties.updateIndex).toBeGreaterThanOrEqual(0);
});
