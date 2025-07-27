import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  TrackRequest,
  IdentifyRequest,
  ValidationResult,
  TenantInfo,
  TrackingEventSchema,
  IdentifyDataSchema,
} from '../types/core.js';

// Request validation schemas
const TrackRequestSchema = z.object({
  event: z.string().min(1),
  properties: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  deviceId: z.string().optional(),
});

const IdentifyRequestSchema = z.object({
  userId: z.string().min(1),
  traits: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
});

export interface RequestRouter {
  validateSchema(request: any, schema: 'track' | 'identify'): ValidationResult;
  attachRequestId(req: Request, res: Response, next: NextFunction): void;
  enforceTenantHeader(req: Request, res: Response, next: NextFunction): void;
  validateTrackRequest(req: Request, res: Response, next: NextFunction): void;
  validateIdentifyRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): void;
}

export class ExpressRequestRouter implements RequestRouter {
  private tenantHeaderName: string;

  constructor(tenantHeaderName: string = 'x-tenant-id') {
    this.tenantHeaderName = tenantHeaderName;
  }

  validateSchema(request: any, schema: 'track' | 'identify'): ValidationResult {
    try {
      let validatedData: any;

      if (schema === 'track') {
        validatedData = TrackRequestSchema.parse(request);
      } else if (schema === 'identify') {
        validatedData = IdentifyRequestSchema.parse(request);
      } else {
        return {
          success: false,
          error: 'Invalid schema type',
        };
      }

      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        return {
          success: false,
          error: `Validation failed: ${errorMessages}`,
        };
      }

      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  attachRequestId(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }

  enforceTenantHeader(req: Request, res: Response, next: NextFunction): void {
    const tenantId = req.headers[this.tenantHeaderName] as string;

    // If tenant info is already set by auth middleware (from API key), skip header check
    if ((req as any).tenantInfo) {
      next();
      return;
    }

    if (!tenantId) {
      res.status(400).json({
        error: 'Missing tenant ID',
        message: `Header '${this.tenantHeaderName}' is required when using manual tenant identification`,
        statusCode: 400,
        timestamp: new Date(),
        requestId: (req as any).requestId,
      });
      return;
    }

    if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid tenant ID',
        message: `Header '${this.tenantHeaderName}' must be a non-empty string`,
        statusCode: 400,
        timestamp: new Date(),
        requestId: (req as any).requestId,
      });
      return;
    }

    // Store tenant info in request for later use
    (req as any).tenantInfo = {
      tenantId: tenantId.trim(),
    } as TenantInfo;

    next();
  }

  validateTrackRequest(req: Request, res: Response, next: NextFunction): void {
    // Extract userId from properties if not provided at top level (for backward compatibility)
    let requestBody = { ...req.body };
    if (!requestBody.userId && requestBody.properties?.userId) {
      requestBody.userId = requestBody.properties.userId;
      // Remove userId from properties to avoid duplication
      const { userId, ...otherProperties } = requestBody.properties;
      requestBody.properties = otherProperties;
    }

    const validation = this.validateSchema(requestBody, 'track');

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid track request',
        message: validation.error,
        statusCode: 400,
        timestamp: new Date(),
        requestId: (req as any).requestId,
      });
      return;
    }

    // Store validated data
    (req as any).validatedBody = validation.data as TrackRequest;
    next();
  }

  validateIdentifyRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const validation = this.validateSchema(req.body, 'identify');

    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid identify request',
        message: validation.error,
        statusCode: 400,
        timestamp: new Date(),
        requestId: (req as any).requestId,
      });
      return;
    }

    // Store validated data
    (req as any).validatedBody = validation.data as IdentifyRequest;
    next();
  }
}

// Extend Express Request interface to include our custom properties
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      tenantInfo?: TenantInfo;
      validatedBody?: TrackRequest | IdentifyRequest;
    }
  }
}
