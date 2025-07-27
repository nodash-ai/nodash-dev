import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NodashSDK } from '@nodash/sdk';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const TEST_PORT = 13099;
const API_KEY = 'demo-api-key-tenant1';

describe('SDK Core Integration', () => {
  let serverProcess: any;
  let baseUrl: string;
  let sdk: NodashSDK;

  beforeAll(async () => {
    // Clean and setup test environment
    await fs.rm('./integration-test-data', { recursive: true, force: true });

    process.env.NODE_ENV = 'test';
    process.env.PORT = TEST_PORT.toString();
    process.env.EVENTS_PATH = './integration-test-data/events';
    process.env.USERS_PATH = './integration-test-data/users';
    process.env.STORE_EVENTS = 'flatfile';
    process.env.STORE_USERS = 'flatfile';
    process.env.STORE_RATELIMIT = 'memory';

    baseUrl = `http://localhost:${TEST_PORT}`;
    sdk = new NodashSDK(baseUrl, API_KEY);

    // Start server
    serverProcess = spawn('npm', ['start'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env },
    });

    // Wait for server startup
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
    await fs.rm('./integration-test-data', { recursive: true, force: true });
  });

  it('should authenticate and check health', async () => {
    const health = await sdk.health();
    expect(health.status).toBe('healthy');
    expect(health.dependencies.eventStore).toBe('healthy');
    expect(health.dependencies.userStore).toBe('healthy');
  });

  it('should track events via SDK', async () => {
    await sdk.track('sdk_test_event', {
      userId: 'test_user',
      source: 'integration_test',
    });

    // Verify event was stored (check for any event file in the tenant directory)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const eventFile = `./integration-test-data/events/tenant1/${year}/${month}/events-${year}-${month}-${day}.jsonl`;

    const exists = await fs
      .access(eventFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('should identify users via SDK', async () => {
    await sdk.identify('test_user', {
      email: 'test@example.com',
      name: 'Test User',
    });

    // Verify user was stored
    const userFile =
      './integration-test-data/users/tenant1/users/test_user.json';
    const exists = await fs
      .access(userFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(userFile, 'utf8');
    const user = JSON.parse(content);
    expect(user.properties.email).toBe('test@example.com');
  });

  it('should handle Bearer token authentication', async () => {
    const response = await fetch(`${baseUrl}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        event: 'direct_api_test',
        properties: { source: 'direct' },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should work without x-tenant-id header', async () => {
    // SDK doesn't send tenant headers - tenant is extracted from API key
    const response = await fetch(`${baseUrl}/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        userId: 'headerless_user',
        traits: { test: true },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
