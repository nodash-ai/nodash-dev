import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

let serverProcess: ChildProcess | null = null;
const TEST_PORT = 3002; // Different from dev port to avoid conflicts

export async function startTestServer(): Promise<void> {
  console.log('🚀 Starting test server for E2E tests...');
  
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['dist/index.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: TEST_PORT.toString(),
        // Use test-specific configurations
        STORE_EVENTS: 'flatfile',
        STORE_USERS: 'flatfile',
        EVENTS_PATH: './e2e-test-data/events',
        USERS_PATH: './e2e-test-data/users',
        JWT_SECRET: 'test-secret-key',
        RATE_LIMIT_MAX: '1000',
        CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001'
      },
      stdio: 'pipe'
    });

    let output = '';
    
    serverProcess.stdout?.on('data', (data) => {
      output += data.toString();
      if (output.includes('Nodash Backend running on')) {
        console.log('✅ Test server started successfully');
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start test server:', error);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(10000).then(() => {
      if (serverProcess && !serverProcess.killed) {
        reject(new Error('Test server failed to start within 10 seconds'));
      }
    });
  });
}

export async function stopTestServer(): Promise<void> {
  if (serverProcess && !serverProcess.killed) {
    console.log('🛑 Stopping test server...');
    serverProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise<void>((resolve) => {
      serverProcess!.on('exit', () => {
        console.log('✅ Test server stopped');
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(5000).then(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
          resolve();
        }
      });
    });
  }
}

export function getTestServerUrl(): string {
  return `http://localhost:${TEST_PORT}`;
}

// Global setup for E2E tests
beforeAll(async () => {
  await startTestServer();
}, 30000);

afterAll(async () => {
  await stopTestServer();
}, 10000);