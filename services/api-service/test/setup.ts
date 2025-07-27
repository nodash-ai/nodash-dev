import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Test data directories
const TEST_DATA_DIR = './test-data';
const TEST_EVENTS_DIR = join(TEST_DATA_DIR, 'events');
const TEST_USERS_DIR = join(TEST_DATA_DIR, 'users');
const INTEGRATION_TEST_DATA_DIR = './integration-test-data';

// Test utilities
export class TestUtils {
  static generateTestTenantId(): string {
    return `test-tenant-${randomUUID().slice(0, 8)}`;
  }

  static generateTestUserId(): string {
    return `test-user-${randomUUID().slice(0, 8)}`;
  }

  static generateTestApiKey(): string {
    return `test-api-key-${randomUUID().slice(0, 16)}`;
  }

  static async cleanTestData(directory: string): Promise<void> {
    try {
      await fs.rm(directory, { recursive: true, force: true });
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  static async createTestDirectories(): Promise<void> {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    await fs.mkdir(TEST_EVENTS_DIR, { recursive: true });
    await fs.mkdir(TEST_USERS_DIR, { recursive: true });
    await fs.mkdir(INTEGRATION_TEST_DATA_DIR, { recursive: true });
  }

  static getTestConfig() {
    return {
      tenantId: this.generateTestTenantId(),
      userId: this.generateTestUserId(),
      apiKey: this.generateTestApiKey(),
      baseUrl: 'http://localhost:3001',
      eventsPath: TEST_EVENTS_DIR,
      usersPath: TEST_USERS_DIR,
    };
  }
}

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use random port
  process.env.STORE_EVENTS = 'flatfile';
  process.env.STORE_USERS = 'flatfile';
  process.env.STORE_RATELIMIT = 'memory';
  process.env.EVENTS_PATH = TEST_EVENTS_DIR;
  process.env.USERS_PATH = TEST_USERS_DIR;
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.API_KEY_HEADER = 'x-api-key';
  process.env.JWT_SECRET = 'test-jwt-secret-key';

  // Create test data directories
  await TestUtils.createTestDirectories();
});

// Clean up between tests for isolation
beforeEach(async () => {
  await TestUtils.cleanTestData(TEST_EVENTS_DIR);
  await TestUtils.cleanTestData(TEST_USERS_DIR);
});

afterAll(async () => {
  // Clean up test data
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    await fs.rm(INTEGRATION_TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Export test utilities for use in tests
export {
  TEST_DATA_DIR,
  TEST_EVENTS_DIR,
  TEST_USERS_DIR,
  INTEGRATION_TEST_DATA_DIR,
};
