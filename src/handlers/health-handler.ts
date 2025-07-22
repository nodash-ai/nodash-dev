import { Request, Response } from 'express';
import { StoreSelector } from '../interfaces/storage.js';
import { HealthResponse } from '../types/core.js';

export class HealthHandler {
  private storeSelector: StoreSelector;
  private startTime: Date;

  constructor(storeSelector: StoreSelector) {
    this.storeSelector = storeSelector;
    this.startTime = new Date();
  }

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const timestamp = new Date();
      const uptime = Math.floor((timestamp.getTime() - this.startTime.getTime()) / 1000);
      
      // Check health of all storage adapters
      const healthChecks = await this.storeSelector.healthCheck();
      
      // Determine overall health status
      const allHealthy = Object.values(healthChecks).every(healthy => healthy);
      const anyUnhealthy = Object.values(healthChecks).some(healthy => !healthy);
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      let httpStatus: number;
      
      if (allHealthy) {
        status = 'healthy';
        httpStatus = 200;
      } else if (anyUnhealthy) {
        status = 'unhealthy';
        httpStatus = 503;
      } else {
        status = 'degraded';
        httpStatus = 200;
      }
      
      const healthResponse: HealthResponse = {
        status,
        version: '1.0.0', // TODO: Get from package.json
        uptime,
        timestamp,
        dependencies: {
          eventStore: healthChecks.eventStore ? 'healthy' : 'unhealthy',
          userStore: healthChecks.userStore ? 'healthy' : 'unhealthy',
          rateLimiter: healthChecks.rateLimiter ? 'healthy' : 'unhealthy',
        },
      };
      
      res.status(httpStatus).json(healthResponse);
      
    } catch (error) {
      console.error('Health check error:', error);
      
      res.status(503).json({
        status: 'unhealthy',
        version: '1.0.0',
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        timestamp: new Date(),
        dependencies: {
          eventStore: 'unhealthy',
          userStore: 'unhealthy',
          rateLimiter: 'unhealthy',
        },
        error: 'Health check failed',
      });
    }
  }
}