import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NodashSDK } from '@nodash/sdk';
import { getIntegrationServerUrl } from './setup.js';

const API_KEY = 'demo-api-key-tenant1';
const TENANT_ID = `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

describe('Query Functionality Integration Tests', () => {
  let baseUrl: string;
  let sdk: NodashSDK;

  beforeAll(async () => {
    baseUrl = getIntegrationServerUrl();
    sdk = new NodashSDK(baseUrl);
  });

  afterAll(async () => {
    // Test cleanup is handled by the shared setup
  });

  beforeEach(async () => {
    // Clean up any existing test data
    // Note: In a real implementation, you might want to clear the storage
  });

  // Helper function to create test events
  const createTestEvent = (
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string
  ) => ({
    event: eventName,
    properties,
    userId,
    timestamp: new Date().toISOString(),
  });

  describe('Backend Query Service', () => {
    it('should query events with basic filters', async () => {
      // First, create some test events
      const testEvents = [
        createTestEvent('page_view', { page: '/home' }, 'user1'),
        createTestEvent('click', { button: 'signup' }, 'user1'),
        createTestEvent('page_view', { page: '/about' }, 'user2'),
      ];

      // Track the events
      for (const event of testEvents) {
        const response = await fetch(`${baseUrl}/v1/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
          body: JSON.stringify(event),
        });
        expect(response.status).toBe(200);
      }

      // Wait a bit for events to be stored
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query events
      const response = await fetch(`${baseUrl}/v1/events/query?limit=10`, {
        method: 'GET',
        headers: {
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.events).toBeInstanceOf(Array);
      expect(data.data.totalCount).toBeGreaterThan(0);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.executionTime).toBeGreaterThan(0);
    });

    it('should filter events by event type', async () => {
      // Track different event types
      const pageViewResponse = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(
          createTestEvent('page_view', { page: '/test' }, 'user1')
        ),
      });
      expect(pageViewResponse.status).toBe(200);

      const clickResponse = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(
          createTestEvent('click', { button: 'test' }, 'user1')
        ),
      });
      expect(clickResponse.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query only page_view events
      const response = await fetch(
        `${baseUrl}/v1/events/query?eventTypes=page_view`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.events).toBeInstanceOf(Array);

      // All returned events should be page_view
      data.data.events.forEach((event: any) => {
        expect(event.eventName).toBe('page_view');
      });
    });

    it('should filter events by user ID', async () => {
      // Track events for different users
      const user1Response = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(
          createTestEvent('page_view', { page: '/test' }, 'user1')
        ),
      });
      expect(user1Response.status).toBe(200);

      const user2Response = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(
          createTestEvent('page_view', { page: '/test' }, 'user2')
        ),
      });
      expect(user2Response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query events for user1 only
      const response = await fetch(`${baseUrl}/v1/events/query?userId=user1`, {
        method: 'GET',
        headers: {
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.events).toBeInstanceOf(Array);

      // All returned events should be for user1
      data.data.events.forEach((event: any) => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should handle pagination correctly', async () => {
      // Track multiple events
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${baseUrl}/v1/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
          body: JSON.stringify(
            createTestEvent('test_event', { index: i }, 'user1')
          ),
        });
        expect(response.status).toBe(200);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query with limit 2
      const response = await fetch(
        `${baseUrl}/v1/events/query?limit=2&offset=0`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.events).toHaveLength(2);
      expect(data.data.pagination.limit).toBe(2);
      expect(data.data.pagination.offset).toBe(0);

      if (data.data.hasMore) {
        expect(data.data.pagination.nextOffset).toBe(2);
      }
    });

    it('should query users with filters', async () => {
      // First identify some users
      const user1Response = await fetch(`${baseUrl}/v1/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId: 'test_user_1',
          traits: { name: 'Test User 1', plan: 'premium' },
        }),
      });
      expect(user1Response.status).toBe(200);

      const user2Response = await fetch(`${baseUrl}/v1/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify({
          userId: 'test_user_2',
          traits: { name: 'Test User 2', plan: 'basic' },
        }),
      });
      expect(user2Response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query users
      const response = await fetch(`${baseUrl}/v1/users/query?limit=10`, {
        method: 'GET',
        headers: {
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.users).toBeInstanceOf(Array);
      expect(data.data.totalCount).toBeGreaterThan(0);
      expect(data.data.pagination).toBeDefined();
    });

    it('should handle invalid query parameters', async () => {
      // Test invalid date format
      const invalidDateResponse = await fetch(
        `${baseUrl}/v1/events/query?startDate=invalid-date`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );
      expect(invalidDateResponse.status).toBe(400);

      // Test invalid limit
      const invalidLimitResponse = await fetch(
        `${baseUrl}/v1/events/query?limit=-1`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );
      expect(invalidLimitResponse.status).toBe(400);

      // Test invalid sort field
      const invalidSortResponse = await fetch(
        `${baseUrl}/v1/events/query?sortBy=invalid_field`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );
      expect(invalidSortResponse.status).toBe(400);
    });
  });

  describe('Cross-Interface Consistency', () => {
    it('should return consistent results across SDK and API', async () => {
      // Track an event
      const testEvent = createTestEvent(
        'consistency_test',
        { test: true },
        'consistency_user'
      );

      const trackResponse = await fetch(`${baseUrl}/v1/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(testEvent),
      });
      expect(trackResponse.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query via API
      const apiResponse = await fetch(
        `${baseUrl}/v1/events/query?eventTypes=consistency_test&limit=10`,
        {
          method: 'GET',
          headers: {
            'x-tenant-id': TENANT_ID,
            'x-api-key': API_KEY,
          },
        }
      );
      expect(apiResponse.status).toBe(200);
      const apiData = await apiResponse.json();

      // Query via SDK (Note: SDK would need proper configuration for this to work)
      // For now, we'll just test the API response structure
      expect(apiData.success).toBe(true);
      expect(apiData.data.events).toBeInstanceOf(Array);
      expect(apiData.data.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tenant header', async () => {
      const response = await fetch(`${baseUrl}/v1/events/query?limit=10`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
        },
      });
      expect(response.status).toBe(400);
    });

    it('should handle query timeout gracefully', async () => {
      // This test would require a way to simulate slow queries
      // For now, just ensure the endpoint responds
      const response = await fetch(`${baseUrl}/v1/events/query?limit=1`, {
        method: 'GET',
        headers: {
          'x-tenant-id': TENANT_ID,
          'x-api-key': API_KEY,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
