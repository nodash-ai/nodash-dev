#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ConfigLoader } from './config/config-loader.js';
import { AdapterStoreSelector } from './adapters/store-selector.js';
import { ExpressRequestRouter } from './middleware/request-router.js';
import { JwtAuthRateLimiter } from './middleware/auth-rate-limiter.js';
import { TrackHandler } from './handlers/track-handler.js';
import { IdentifyHandler } from './handlers/identify-handler.js';
import { HealthHandler } from './handlers/health-handler.js';
import { QueryHandler } from './handlers/query-handler.js';
import { QueryService } from './services/query-service.js';

class NodashBackend {
  private app: express.Application;
  private config: any;
  private storeSelector: AdapterStoreSelector;
  private server: any;

  constructor() {
    this.app = express();
    this.config = ConfigLoader.load();
    this.storeSelector = new AdapterStoreSelector(this.config);
  }

  async initialize(): Promise<void> {
    console.log('🚀 Starting Nodash Analytics Backend...');
    console.log(`🌍 Environment: ${this.config.environment}`);
    console.log(`🔧 Configuration loaded successfully`);

    // Initialize storage adapters
    await this.storeSelector.initialize();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();

    console.log('✅ Backend initialization complete');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP for API server
      })
    );

    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      const timestamp = new Date().toISOString();

      console.log(`[${timestamp}] ${req.method} ${req.url} - Start`);

      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
      });

      next();
    });
  }

  private setupRoutes(): void {
    const router = new ExpressRequestRouter('x-tenant-id');
    const authRateLimiter = new JwtAuthRateLimiter(
      this.storeSelector.getRateLimitAdapter(),
      this.config.jwtSecret,
      this.config.apiKeyHeader,
      this.config.rateLimits
    );

    // Handlers
    const trackHandler = new TrackHandler(this.storeSelector);
    const identifyHandler = new IdentifyHandler(this.storeSelector);
    const healthHandler = new HealthHandler(this.storeSelector);
    const queryService = new QueryService(this.storeSelector);
    const queryHandler = new QueryHandler(queryService);

    // Middleware pipeline
    const authMiddleware = authRateLimiter.createAuthMiddleware();
    const rateLimitMiddleware = authRateLimiter.createRateLimitMiddleware();

    // Health endpoint (no auth required)
    this.app.get('/v1/health', router.attachRequestId.bind(router), (req, res) =>
      healthHandler.handle(req, res)
    );

    // Track endpoint
    this.app.post(
      '/v1/track',
      router.attachRequestId.bind(router),
      router.enforceTenantHeader.bind(router),
      authMiddleware,
      rateLimitMiddleware,
      router.validateTrackRequest.bind(router),
      (req, res) => trackHandler.handle(req, res)
    );

    // Identify endpoint
    this.app.post(
      '/v1/identify',
      router.attachRequestId.bind(router),
      router.enforceTenantHeader.bind(router),
      authMiddleware,
      rateLimitMiddleware,
      router.validateIdentifyRequest.bind(router),
      (req, res) => identifyHandler.handle(req, res)
    );

    // Query endpoints
    this.app.get(
      '/v1/events/query',
      router.attachRequestId.bind(router),
      router.enforceTenantHeader.bind(router),
      authMiddleware,
      rateLimitMiddleware,
      (req, res) => queryHandler.handleEventQuery(req, res)
    );

    this.app.get(
      '/v1/users/query',
      router.attachRequestId.bind(router),
      router.enforceTenantHeader.bind(router),
      authMiddleware,
      rateLimitMiddleware,
      (req, res) => queryHandler.handleUserQuery(req, res)
    );

    // SDK compatibility routes (without /v1 prefix)
    this.app.get('/health', (req, res) => healthHandler.handle(req, res));

    this.app.post(
      '/track',
      router.attachRequestId.bind(router),
      authMiddleware,
      router.enforceTenantHeader.bind(router),
      rateLimitMiddleware,
      router.validateTrackRequest.bind(router),
      (req, res) => trackHandler.handle(req, res)
    );

    this.app.post(
      '/identify',
      router.attachRequestId.bind(router),
      authMiddleware,
      router.enforceTenantHeader.bind(router),
      rateLimitMiddleware,
      router.validateIdentifyRequest.bind(router),
      (req, res) => identifyHandler.handle(req, res)
    );

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Nodash Analytics Backend',
        version: '1.0.0',
        environment: this.config.environment,
        endpoints: {
          health: '/v1/health',
          track: 'POST /v1/track',
          identify: 'POST /v1/identify',
          queryEvents: 'GET /v1/events/query',
          queryUsers: 'GET /v1/users/query',
        },
        documentation: 'https://docs.nodash.ai',
        timestamp: new Date(),
      });
    });
  }

  private setupErrorHandling(): void {
    // JSON parsing error handler
    this.app.use((error: any, req: any, res: any, next: any) => {
      if (error instanceof SyntaxError && (error as any).type === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid JSON in request body',
          statusCode: 400,
          timestamp: new Date(),
          requestId: req.requestId,
        });
      }
      next(error);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        statusCode: 404,
        timestamp: new Date(),
      });
    });

    // Global error handler
    this.app.use((error: any, req: any, res: any, next: any) => {
      console.error('Unhandled error:', error);

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date(),
        requestId: req.requestId,
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, () => {
        console.log(`✅ Nodash Backend running on http://${this.config.host}:${this.config.port}`);
        console.log(
          `📊 Data storage: Events=${this.config.stores.events}, Users=${this.config.stores.users}`
        );
        console.log(`🔗 Health check: http://${this.config.host}:${this.config.port}/v1/health`);
        console.log(
          `📝 Track events: POST http://${this.config.host}:${this.config.port}/v1/track`
        );
        console.log(
          `👥 Identify users: POST http://${this.config.host}:${this.config.port}/v1/identify`
        );
        console.log('');
        console.log('🎯 Server ready to receive requests!');
        resolve();
      });

      this.server.on('error', (error: any) => {
        console.error('Server startup error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    console.log('🔚 Shutting down Nodash Backend...');

    return new Promise(resolve => {
      if (this.server) {
        this.server.close(async () => {
          await this.storeSelector.close();
          console.log('✅ Backend shutdown complete');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Start the server
async function main() {
  const backend = new NodashBackend();

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
    try {
      await backend.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });

  try {
    await backend.initialize();
    await backend.start();
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default NodashBackend;
