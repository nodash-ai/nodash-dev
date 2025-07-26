import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimitAdapter } from '../interfaces/storage.js';
import { AuthResult, RateLimitKey, RateLimitResult, TenantInfo } from '../types/core.js';

export interface AuthRateLimiter {
  validateToken(token: string): Promise<AuthResult>;
  checkRateLimit(key: RateLimitKey): Promise<RateLimitResult>;
  incrementCounter(key: RateLimitKey): Promise<void>;
}

export class JwtAuthRateLimiter implements AuthRateLimiter {
  private jwtSecret: string | undefined;
  private apiKeyHeader: string;
  private rateLimiter: RateLimitAdapter;
  private rateLimitConfig: {
    windowSize: number;
    maxRequests: number;
  };

  // In-memory API key store (in production, this would be in a database)
  private apiKeys = new Map<string, TenantInfo>();

  constructor(
    rateLimiter: RateLimitAdapter,
    jwtSecret?: string,
    apiKeyHeader: string = 'x-api-key',
    rateLimitConfig: { windowSize: number; maxRequests: number } = {
      windowSize: 3600,
      maxRequests: 1000,
    }
  ) {
    this.jwtSecret = jwtSecret;
    this.apiKeyHeader = apiKeyHeader;
    this.rateLimiter = rateLimiter;
    this.rateLimitConfig = rateLimitConfig;

    // Initialize some default API keys for demo purposes
    this.initializeDefaultApiKeys();
  }

  async validateToken(token: string): Promise<AuthResult> {
    try {
      // Handle Bearer tokens
      if (token.startsWith('Bearer ')) {
        const bearerToken = token.substring(7);

        // Try JWT token first if JWT secret is available
        if (this.jwtSecret) {
          try {
            const decoded = jwt.verify(bearerToken, this.jwtSecret) as any;
            return {
              success: true,
              tenantInfo: {
                tenantId: decoded.tenantId || decoded.sub,
                name: decoded.name,
                rateLimits: decoded.rateLimits,
              },
            };
          } catch {
            // JWT validation failed, try as API key
          }
        }

        // Try Bearer token as API key
        const tenantInfo = this.apiKeys.get(bearerToken);
        if (tenantInfo) {
          return {
            success: true,
            tenantInfo,
          };
        }
      }

      // Try token as direct API key (for x-api-key header)
      const tenantInfo = this.apiKeys.get(token);
      if (tenantInfo) {
        return {
          success: true,
          tenantInfo,
        };
      }

      return {
        success: false,
        error: 'Invalid or expired token',
      };
    } catch (error) {
      return {
        success: false,
        error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async checkRateLimit(key: RateLimitKey): Promise<RateLimitResult> {
    try {
      const result = await this.rateLimiter.checkLimit(
        key,
        this.rateLimitConfig.maxRequests,
        this.rateLimitConfig.windowSize
      );

      const rateLimitResult: RateLimitResult = {
        allowed: result.allowed,
        remaining: result.remaining,
      };

      if (!result.allowed) {
        rateLimitResult.retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
      }

      return rateLimitResult;
    } catch (error) {
      // Fail open - allow requests if rate limiter is down
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
      };
    }
  }

  async incrementCounter(key: RateLimitKey): Promise<void> {
    try {
      await this.rateLimiter.increment(key, this.rateLimitConfig.windowSize);
    } catch (error) {
      console.error('Failed to increment rate limit counter:', error);
    }
  }

  // Express middleware factories
  createAuthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const apiKey = req.headers[this.apiKeyHeader] as string;

      const token = authHeader || apiKey;

      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Provide either Authorization header or API key',
          statusCode: 401,
          timestamp: new Date(),
          requestId: req.requestId,
        });
        return;
      }

      const authResult = await this.validateToken(token);

      if (!authResult.success) {
        res.status(401).json({
          error: 'Authentication failed',
          message: authResult.error,
          statusCode: 401,
          timestamp: new Date(),
          requestId: req.requestId,
        });
        return;
      }

      // Update tenant info with authenticated information
      req.tenantInfo = {
        ...req.tenantInfo,
        ...authResult.tenantInfo,
      } as TenantInfo;

      next();
    };
  }

  createRateLimitMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.tenantInfo) {
        next();
        return;
      }

      const validatedBody = req.validatedBody as any;
      const rateLimitKey: RateLimitKey = {
        tenantId: req.tenantInfo.tenantId,
        sourceIp: this.getClientIp(req),
        userId: validatedBody?.userId,
      };

      const rateLimitResult = await this.checkRateLimit(rateLimitKey);

      if (!rateLimitResult.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests',
          statusCode: 429,
          timestamp: new Date(),
          requestId: req.requestId,
          retryAfter: rateLimitResult.retryAfter,
        });

        if (rateLimitResult.retryAfter) {
          res.setHeader('Retry-After', rateLimitResult.retryAfter.toString());
        }

        return;
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.rateLimitConfig.maxRequests);
      if (rateLimitResult.remaining !== undefined) {
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      }

      // Increment counter after successful check
      await this.incrementCounter(rateLimitKey);

      next();
    };
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const connectionRemote = (req as any).connection?.remoteAddress;
    const socketRemote = (req as any).socket?.remoteAddress;

    const ip = forwardedFor || realIp || connectionRemote || socketRemote || '127.0.0.1';
    return ip.split(',')[0].trim();
  }

  private initializeDefaultApiKeys(): void {
    // Demo API keys - in production these would be stored securely in a database
    this.apiKeys.set('demo-api-key-tenant1', {
      tenantId: 'tenant1',
      name: 'Demo Tenant 1',
      rateLimits: {
        requestsPerHour: 1000,
        requestsPerMinute: 100,
      },
    });

    this.apiKeys.set('demo-api-key-tenant2', {
      tenantId: 'tenant2',
      name: 'Demo Tenant 2',
      rateLimits: {
        requestsPerHour: 5000,
        requestsPerMinute: 500,
      },
    });
  }

  // Method to add new API keys (for admin use)
  addApiKey(apiKey: string, tenantInfo: TenantInfo): void {
    this.apiKeys.set(apiKey, tenantInfo);
  }

  // Method to remove API keys (for admin use)
  removeApiKey(apiKey: string): boolean {
    return this.apiKeys.delete(apiKey);
  }
}
