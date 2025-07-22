import { beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

// Test data directories
const TEST_DATA_DIR = './test-data';
const TEST_EVENTS_DIR = join(TEST_DATA_DIR, 'events');
const TEST_USERS_DIR = join(TEST_DATA_DIR, 'users');

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
  
  // Create test data directories
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  await fs.mkdir(TEST_EVENTS_DIR, { recursive: true });
  await fs.mkdir(TEST_USERS_DIR, { recursive: true });
});

afterAll(async () => {
  // Clean up test data
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});