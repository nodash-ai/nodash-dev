import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';

export interface ServerConfig {
  port: number;
  eventsPath: string;
  usersPath: string;
  storeEvents?: string;
  storeUsers?: string;
  storeRatelimit?: string;
}

export class TestServerManager {
  private static instance: TestServerManager;
  private serverProcess: ChildProcess | null = null;
  private isRunning = false;
  private config: ServerConfig | null = null;

  private constructor() {}

  static getInstance(): TestServerManager {
    if (!TestServerManager.instance) {
      TestServerManager.instance = new TestServerManager();
    }
    return TestServerManager.instance;
  }

  async startServer(config: ServerConfig): Promise<string> {
    if (this.isRunning) {
      return `http://localhost:${this.config!.port}`;
    }

    // Clean up any existing test data
    await fs.rm(config.eventsPath, { recursive: true, force: true });
    await fs.rm(config.usersPath, { recursive: true, force: true });

    // Set up environment
    const testEnv = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: config.port.toString(),
      EVENTS_PATH: config.eventsPath,
      USERS_PATH: config.usersPath,
      STORE_EVENTS: config.storeEvents || 'flatfile',
      STORE_USERS: config.storeUsers || 'flatfile',
      STORE_RATELIMIT: config.storeRatelimit || 'memory',
    };

    // Start the server
    this.serverProcess = spawn('npm', ['start'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: testEnv,
    });

    this.config = config;
    this.isRunning = true;

    // Wait for server to be ready
    await this.waitForServer(`http://localhost:${config.port}`);

    return `http://localhost:${config.port}`;
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess && this.isRunning) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isRunning = false;

      // Clean up test data
      if (this.config) {
        await fs.rm(this.config.eventsPath, { recursive: true, force: true });
        await fs.rm(this.config.usersPath, { recursive: true, force: true });
        this.config = null;
      }
    }
  }

  private async waitForServer(baseUrl: string, timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${baseUrl}/v1/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Server did not start within ${timeoutMs}ms`);
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  getServerUrl(): string | null {
    return this.isRunning && this.config ? `http://localhost:${this.config.port}` : null;
  }

  /**
   * Get a default server configuration for integration tests
   */
  static getDefaultConfig(port: number = 13099): ServerConfig {
    return {
      port,
      eventsPath: `./integration-test-data-${port}/events`,
      usersPath: `./integration-test-data-${port}/users`,
      storeEvents: 'flatfile',
      storeUsers: 'flatfile',
      storeRatelimit: 'memory',
    };
  }

  /**
   * Create a shared server instance for multiple test files
   * Use this when tests can share the same server instance
   */
  static async createSharedServer(port: number = 13099): Promise<string> {
    const manager = TestServerManager.getInstance();
    const config = TestServerManager.getDefaultConfig(port);
    return await manager.startServer(config);
  }

  /**
   * Clean up shared server instance
   * Call this in global test teardown
   */
  static async cleanupSharedServer(): Promise<void> {
    const manager = TestServerManager.getInstance();
    await manager.stopServer();
  }
}