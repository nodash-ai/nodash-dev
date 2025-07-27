import { Config, StorageType } from '../types/core.js';

export class ConfigLoader {
  static load(): Config {
    const config: Config = {
      // Server configuration
      port: parseInt(process.env.PORT || '3001', 10),
      host: process.env.HOST || '0.0.0.0',
      environment:
        (process.env.NODE_ENV as 'development' | 'staging' | 'production') ||
        'development',

      // Security
      ...(process.env.JWT_SECRET && { jwtSecret: process.env.JWT_SECRET }),
      apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],

      // Storage configuration
      stores: {
        events: (process.env.STORE_EVENTS as StorageType) || 'flatfile',
        users: (process.env.STORE_USERS as StorageType) || 'flatfile',
        rateLimits: (process.env.STORE_RATELIMIT as StorageType) || 'memory',
      },

      // File storage paths
      paths: {
        events: process.env.EVENTS_PATH || './data/events',
        users: process.env.USERS_PATH || './data/users',
      },

      // Database URLs
      urls: {
        ...(process.env.CLICKHOUSE_URL && {
          clickhouse: process.env.CLICKHOUSE_URL,
        }),
        ...(process.env.POSTGRES_URL && { postgres: process.env.POSTGRES_URL }),
        ...(process.env.REDIS_URL && { redis: process.env.REDIS_URL }),
      },

      // Rate limiting
      rateLimits: {
        windowSize: parseInt(process.env.RATE_LIMIT_WINDOW || '3600', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
      },

      // Observability
      observability: {
        enableTracing: process.env.OTEL_ENABLE_TRACING === 'true',
        enableMetrics: process.env.PROMETHEUS_ENABLE === 'true',
        ...(process.env.OTEL_EXPORTER_OTLP_ENDPOINT && {
          otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        }),
        ...(process.env.PROMETHEUS_PORT && {
          prometheusPort: parseInt(process.env.PROMETHEUS_PORT, 10),
        }),
      },
    };

    // Validate configuration
    ConfigLoader.validate(config);

    return config;
  }

  static validate(config: Config): void {
    const errors: string[] = [];

    // Validate port (allow 0 for random port in tests)
    if (config.port < 0 || config.port > 65535) {
      errors.push('Port must be between 0 and 65535');
    }

    // Validate storage types
    const validStorageTypes: StorageType[] = [
      'flatfile',
      'clickhouse',
      'bigquery',
      'postgres',
      'dynamodb',
      'memory',
      'redis',
    ];

    if (!validStorageTypes.includes(config.stores.events)) {
      errors.push(`Invalid events storage type: ${config.stores.events}`);
    }

    if (!validStorageTypes.includes(config.stores.users)) {
      errors.push(`Invalid users storage type: ${config.stores.users}`);
    }

    if (!validStorageTypes.includes(config.stores.rateLimits)) {
      errors.push(
        `Invalid rate limit storage type: ${config.stores.rateLimits}`
      );
    }

    // Validate required URLs based on storage types
    if (config.stores.events === 'clickhouse' && !config.urls.clickhouse) {
      errors.push('CLICKHOUSE_URL is required when STORE_EVENTS=clickhouse');
    }

    if (
      (config.stores.users === 'postgres' ||
        config.stores.events === 'postgres') &&
      !config.urls.postgres
    ) {
      errors.push('POSTGRES_URL is required when using PostgreSQL storage');
    }

    if (config.stores.rateLimits === 'redis' && !config.urls.redis) {
      errors.push('REDIS_URL is required when STORE_RATELIMIT=redis');
    }

    // Validate rate limit configuration
    if (config.rateLimits.windowSize < 1) {
      errors.push('Rate limit window size must be positive');
    }

    if (config.rateLimits.maxRequests < 1) {
      errors.push('Rate limit max requests must be positive');
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production', 'test'];
    if (!validEnvironments.includes(config.environment)) {
      errors.push(
        `Invalid environment: ${config.environment}. Must be one of: ${validEnvironments.join(', ')}`
      );
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  static getEnvironmentDefaults(): Record<string, string> {
    return {
      // Development defaults
      development: JSON.stringify({
        STORE_EVENTS: 'flatfile',
        STORE_USERS: 'flatfile',
        STORE_RATELIMIT: 'memory',
        EVENTS_PATH: './data/dev/events',
        USERS_PATH: './data/dev/users',
        RATE_LIMIT_MAX: '10000',
        CORS_ORIGINS: '*',
      }),

      // Staging defaults
      staging: JSON.stringify({
        STORE_EVENTS: 'flatfile',
        STORE_USERS: 'flatfile',
        STORE_RATELIMIT: 'memory',
        EVENTS_PATH: './data/staging/events',
        USERS_PATH: './data/staging/users',
        RATE_LIMIT_MAX: '5000',
      }),

      // Production defaults (most settings should be explicitly configured)
      production: JSON.stringify({
        STORE_RATELIMIT: 'redis',
        RATE_LIMIT_MAX: '1000',
        CORS_ORIGINS: '', // Must be explicitly set in production
      }),
    };
  }
}
