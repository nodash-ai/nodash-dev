import { beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

// Integration test data directories
const INTEGRATION_DATA_DIR = './integration-test-data';
const INTEGRATION_EVENTS_DIR = join(INTEGRATION_DATA_DIR, 'events');
const INTEGRATION_USERS_DIR = join(INTEGRATION_DATA_DIR, 'users');

beforeAll(async () => {
  // Set integration test environment variables
  process.env.NODE_ENV = 'test';
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0'; // Use random port for integration tests
  process.env.STORE_EVENTS = 'flatfile';
  process.env.STORE_USERS = 'flatfile';
  process.env.STORE_RATELIMIT = 'memory';
  process.env.EVENTS_PATH = INTEGRATION_EVENTS_DIR;
  process.env.USERS_PATH = INTEGRATION_USERS_DIR;
  process.env.RATE_LIMIT_MAX = '100';
  process.env.RATE_LIMIT_WINDOW = '60';
  process.env.API_KEY_HEADER = 'x-api-key';
  process.env.CORS_ORIGINS = '*';
  
  // Create integration test data directories
  await fs.mkdir(INTEGRATION_DATA_DIR, { recursive: true });
  await fs.mkdir(INTEGRATION_EVENTS_DIR, { recursive: true });
  await fs.mkdir(INTEGRATION_USERS_DIR, { recursive: true });
});

afterAll(async () => {
  // Clean up integration test data
  try {
    await fs.rm(INTEGRATION_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});