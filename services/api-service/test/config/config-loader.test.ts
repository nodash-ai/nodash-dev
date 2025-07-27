import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../../src/config/config-loader.js';

describe('ConfigLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should load default configuration', () => {
      // Clear environment variables
      delete process.env.PORT;
      delete process.env.HOST;
      delete process.env.NODE_ENV;

      const config = ConfigLoader.load();

      expect(config.port).toBe(3001);
      expect(config.host).toBe('0.0.0.0');
      expect(config.environment).toBe('development');
      expect(config.stores.events).toBe('flatfile');
      expect(config.stores.users).toBe('flatfile');
      expect(config.stores.rateLimits).toBe('memory');
    });

    it('should load configuration from environment variables', () => {
      process.env.PORT = '8080';
      process.env.HOST = '127.0.0.1';
      process.env.NODE_ENV = 'production';
      process.env.STORE_EVENTS = 'clickhouse';
      process.env.STORE_USERS = 'postgres';
      process.env.STORE_RATELIMIT = 'redis';
      process.env.JWT_SECRET = 'test-secret';
      process.env.API_KEY_HEADER = 'x-custom-key';
      process.env.CLICKHOUSE_URL = 'clickhouse://localhost:9000/test';
      process.env.POSTGRES_URL = 'postgresql://localhost:5432/test';
      process.env.REDIS_URL = 'redis://localhost:6379';

      const config = ConfigLoader.load();

      expect(config.port).toBe(8080);
      expect(config.host).toBe('127.0.0.1');
      expect(config.environment).toBe('production');
      expect(config.stores.events).toBe('clickhouse');
      expect(config.stores.users).toBe('postgres');
      expect(config.stores.rateLimits).toBe('redis');
      expect(config.jwtSecret).toBe('test-secret');
      expect(config.apiKeyHeader).toBe('x-custom-key');
    });

    it('should parse CORS origins correctly', () => {
      process.env.CORS_ORIGINS =
        'https://app.example.com,https://admin.example.com';

      const config = ConfigLoader.load();

      expect(config.corsOrigins).toEqual([
        'https://app.example.com',
        'https://admin.example.com',
      ]);
    });

    it('should handle rate limit configuration', () => {
      process.env.RATE_LIMIT_WINDOW = '1800';
      process.env.RATE_LIMIT_MAX = '500';

      const config = ConfigLoader.load();

      expect(config.rateLimits.windowSize).toBe(1800);
      expect(config.rateLimits.maxRequests).toBe(500);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = {
        port: 3001,
        host: '0.0.0.0',
        environment: 'development' as const,
        jwtSecret: 'secret',
        apiKeyHeader: 'x-api-key',
        corsOrigins: ['*'],
        stores: {
          events: 'flatfile' as const,
          users: 'flatfile' as const,
          rateLimits: 'memory' as const,
        },
        paths: {
          events: './data/events',
          users: './data/users',
        },
        urls: {},
        rateLimits: {
          windowSize: 3600,
          maxRequests: 1000,
        },
        observability: {
          enableTracing: false,
          enableMetrics: false,
        },
      };

      expect(() => ConfigLoader.validate(config)).not.toThrow();
    });

    it('should throw error for invalid port', () => {
      const config = {
        port: 70000, // Invalid port
        host: '0.0.0.0',
        environment: 'development' as const,
        apiKeyHeader: 'x-api-key',
        corsOrigins: ['*'],
        stores: {
          events: 'flatfile' as const,
          users: 'flatfile' as const,
          rateLimits: 'memory' as const,
        },
        paths: {
          events: './data/events',
          users: './data/users',
        },
        urls: {},
        rateLimits: {
          windowSize: 3600,
          maxRequests: 1000,
        },
        observability: {
          enableTracing: false,
          enableMetrics: false,
        },
      };

      expect(() => ConfigLoader.validate(config)).toThrow(
        'Port must be between 0 and 65535'
      );
    });

    it('should throw error for invalid storage type', () => {
      const config = {
        port: 3001,
        host: '0.0.0.0',
        environment: 'development' as const,
        apiKeyHeader: 'x-api-key',
        corsOrigins: ['*'],
        stores: {
          events: 'invalid' as any,
          users: 'flatfile' as const,
          rateLimits: 'memory' as const,
        },
        paths: {
          events: './data/events',
          users: './data/users',
        },
        urls: {},
        rateLimits: {
          windowSize: 3600,
          maxRequests: 1000,
        },
        observability: {
          enableTracing: false,
          enableMetrics: false,
        },
      };

      expect(() => ConfigLoader.validate(config)).toThrow(
        'Invalid events storage type: invalid'
      );
    });

    it('should throw error for missing required URLs', () => {
      const config = {
        port: 3001,
        host: '0.0.0.0',
        environment: 'development' as const,
        apiKeyHeader: 'x-api-key',
        corsOrigins: ['*'],
        stores: {
          events: 'clickhouse' as const,
          users: 'flatfile' as const,
          rateLimits: 'memory' as const,
        },
        paths: {
          events: './data/events',
          users: './data/users',
        },
        urls: {}, // Missing clickhouse URL
        rateLimits: {
          windowSize: 3600,
          maxRequests: 1000,
        },
        observability: {
          enableTracing: false,
          enableMetrics: false,
        },
      };

      expect(() => ConfigLoader.validate(config)).toThrow(
        'CLICKHOUSE_URL is required when STORE_EVENTS=clickhouse'
      );
    });

    it('should throw error for invalid environment', () => {
      const config = {
        port: 3001,
        host: '0.0.0.0',
        environment: 'invalid' as any,
        apiKeyHeader: 'x-api-key',
        corsOrigins: ['*'],
        stores: {
          events: 'flatfile' as const,
          users: 'flatfile' as const,
          rateLimits: 'memory' as const,
        },
        paths: {
          events: './data/events',
          users: './data/users',
        },
        urls: {},
        rateLimits: {
          windowSize: 3600,
          maxRequests: 1000,
        },
        observability: {
          enableTracing: false,
          enableMetrics: false,
        },
      };

      expect(() => ConfigLoader.validate(config)).toThrow(
        'Invalid environment: invalid'
      );
    });
  });
});
