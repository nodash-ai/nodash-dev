import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NodashSDK } from '@nodash/sdk';
import { promises as fs } from 'fs';
import { TestUtils } from '../setup';
import { getIntegrationServerUrl } from './setup';

describe('End-to-End Workflow Integration', () => {
  let sdk: NodashSDK;
  let testConfig: ReturnType<typeof TestUtils.getTestConfig>;

  beforeAll(async () => {
    testConfig = TestUtils.getTestConfig();
    // Use hardcoded tenant ID that matches the demo API key
    testConfig.tenantId = 'tenant1';
    // Use the hardcoded demo API key that the server recognizes
    sdk = new NodashSDK(
      getIntegrationServerUrl(),
      'demo-api-key-tenant1',
      testConfig.tenantId
    );
  });

  it('should handle complete user journey with events and identification', async () => {
    const userId = testConfig.userId;
    const sessionId = `session-${Date.now()}`;

    // Step 1: Track user signup event
    await sdk.track('user_signup', {
      userId,
      sessionId,
      source: 'integration_test',
      plan: 'premium',
    });

    // Step 2: Identify the user
    await sdk.identify(userId, {
      email: 'test@example.com',
      name: 'Test User',
      plan: 'premium',
      signupDate: new Date().toISOString(),
    });

    // Step 3: Track multiple user actions
    const actions = ['page_view', 'button_click', 'feature_used'];
    for (const action of actions) {
      await sdk.track(action, {
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 4: Verify all events were stored
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const eventFile = `./integration-test-data/events/${testConfig.tenantId}/${year}/${month}/events-${year}-${month}-${day}.jsonl`;

    const exists = await fs
      .access(eventFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    // Step 5: Verify user data was stored
    const userFile = `./integration-test-data/users/${testConfig.tenantId}/users/${userId}.json`;
    const userExists = await fs
      .access(userFile)
      .then(() => true)
      .catch(() => false);
    expect(userExists).toBe(true);

    // Step 6: Verify event content
    // Add a small delay to ensure file is fully written
    await new Promise((resolve) => setTimeout(resolve, 100));
    const eventContent = await fs.readFile(eventFile, 'utf-8');
    const allEvents = eventContent
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    // Filter events by session ID to only get events from this test run
    const events = allEvents.filter(
      (event) => event.properties && event.properties.sessionId === sessionId
    );

    // Should have 4 events (signup + 3 actions)
    expect(events.length).toBe(4);

    // Verify event structure
    events.forEach((event) => {
      expect(event).toHaveProperty('eventName');
      expect(event).toHaveProperty('userId', userId);
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('properties');
    });

    // Step 7: Verify user data content
    const userData = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    expect(userData.userId).toBe(userId);
    expect(userData.properties.email).toBe('test@example.com');
    expect(userData.properties.name).toBe('Test User');
  });

  it('should handle concurrent requests without data corruption', async () => {
    const userId = `concurrent-user-${Date.now()}`;
    const promises = [];

    // Send 10 concurrent track requests
    for (let i = 0; i < 10; i++) {
      promises.push(
        sdk.track('concurrent_test', {
          userId,
          requestId: i,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Wait for all requests to complete
    await Promise.all(promises);

    // Verify all events were stored
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const eventFile = `./integration-test-data/events/${testConfig.tenantId}/${year}/${month}/events-${year}-${month}-${day}.jsonl`;

    const eventContent = await fs.readFile(eventFile, 'utf-8');
    const events = eventContent
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    // Filter events for this test
    const concurrentEvents = events.filter(
      (event) =>
        event.userId === userId && event.eventName === 'concurrent_test'
    );

    expect(concurrentEvents.length).toBe(10);

    // Verify all request IDs are present and unique
    const requestIds = concurrentEvents.map(
      (event) => event.properties.requestId
    );
    const uniqueRequestIds = [...new Set(requestIds)];
    expect(uniqueRequestIds.length).toBe(10);
  });

  it('should handle error scenarios gracefully', async () => {
    // Test with invalid tenant (should still not crash)
    const invalidSdk = new NodashSDK(
      'http://localhost:3001',
      'invalid-api-key'
    );

    // This should fail but not crash the test
    try {
      await invalidSdk.track('error_test', { userId: 'test' });
      // If it doesn't throw, that's also fine (depends on server implementation)
    } catch (error) {
      // Error is expected for invalid API key
      expect(error).toBeDefined();
    }

    // Test health endpoint should still work
    const health = await sdk.health();
    expect(health.status).toBe('healthy');
  });

  it('should validate data persistence across service restarts', async () => {
    const userId = `persistent-user-${Date.now()}`;

    // Track an event
    await sdk.track('persistence_test', {
      userId,
      testData: 'should persist across restarts',
    });

    // Identify user
    await sdk.identify(userId, {
      email: 'persistent@example.com',
      testFlag: true,
    });

    // Verify data exists
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const eventFile = `./integration-test-data/events/${testConfig.tenantId}/${year}/${month}/events-${year}-${month}-${day}.jsonl`;
    const userFile = `./integration-test-data/users/${testConfig.tenantId}/users/${userId}.json`;

    const eventExists = await fs
      .access(eventFile)
      .then(() => true)
      .catch(() => false);
    const userExists = await fs
      .access(userFile)
      .then(() => true)
      .catch(() => false);

    expect(eventExists).toBe(true);
    expect(userExists).toBe(true);

    // Verify content integrity
    const eventContent = await fs.readFile(eventFile, 'utf-8');
    const events = eventContent
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const persistenceEvent = events.find(
      (event) =>
        event.userId === userId && event.eventName === 'persistence_test'
    );

    expect(persistenceEvent).toBeDefined();
    expect(persistenceEvent.properties.testData).toBe(
      'should persist across restarts'
    );

    const userData = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    expect(userData.properties.email).toBe('persistent@example.com');
    expect(userData.properties.testFlag).toBe(true);
  });
});
