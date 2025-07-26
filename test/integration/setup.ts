import { beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';

// Integration test data directories
const INTEGRATION_DATA_DIR = './integration-test-data';
const INTEGRATION_EVENTS_DIR = join(INTEGRATION_DATA_DIR, 'events');
const INTEGRATION_USERS_DIR = join(INTEGRATION_DATA_DIR, 'users');

// Shared integration test server
let integrationServerProcess: ChildProcess | null = null;
const INTEGRATION_TEST_PORT = 3001;

export function getIntegrationServerUrl(): string {
  return `http://localhost:${INTEGRATION_TEST_PORT}`;
}

async function startIntegrationServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    integrationServerProcess = spawn('node', ['dist/index.js'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: INTEGRATION_TEST_PORT.toString(),
        STORE_EVENTS: 'flatfile',
        STORE_USERS: 'flatfile',
        STORE_RATELIMIT: 'memory',
        EVENTS_PATH: INTEGRATION_EVENTS_DIR,
        USERS_PATH: INTEGRATION_USERS_DIR,
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_WINDOW: '60',
        API_KEY_HEADER: 'x-api-key',
        CORS_ORIGINS: '*',
      },
    });

    let output = '';

    integrationServerProcess.stdout?.on('data', data => {
      output += data.toString();
      if (output.includes('Nodash Backend running on')) {
        resolve();
      }
    });

    integrationServerProcess.stderr?.on('data', data => {
      console.error('Integration server error:', data.toString());
    });

    integrationServerProcess.on('error', error => {
      reject(error);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (integrationServerProcess && !integrationServerProcess.killed) {
        reject(new Error('Integration test server failed to start within 15 seconds'));
      }
    }, 15000);
  });
}

async function stopIntegrationServer(): Promise<void> {
  if (integrationServerProcess && !integrationServerProcess.killed) {
    integrationServerProcess.kill('SIGTERM');

    // Wait for graceful shutdown
    await new Promise<void>(resolve => {
      integrationServerProcess!.on('exit', () => {
        resolve();
      });

      // Force kill after 5 seconds
      setTimeout(() => {
        if (integrationServerProcess && !integrationServerProcess.killed) {
          integrationServerProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    });
  }
}

beforeAll(async () => {
  // Set integration test environment variables
  process.env.NODE_ENV = 'test';
  process.env.HOST = '127.0.0.1';
  process.env.PORT = INTEGRATION_TEST_PORT.toString();
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

  // Start shared integration server
  await startIntegrationServer();
}, 30000);

afterAll(async () => {
  // Stop integration server
  await stopIntegrationServer();

  // Clean up integration test data with retry
  let retries = 3;
  while (retries > 0) {
    try {
      await fs.rm(INTEGRATION_DATA_DIR, { recursive: true, force: true });
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.warn('Failed to clean up integration test data:', error);
      } else {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}, 10000);
