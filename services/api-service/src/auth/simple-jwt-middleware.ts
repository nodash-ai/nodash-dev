import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        provider: string;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      timestamp: new Date().toISOString()
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({ 
      error: 'Authentication not configured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      provider: payload.provider
    };
    next();
  } catch (error) {
    const isExpired = error instanceof jwt.TokenExpiredError;
    return res.status(401).json({ 
      error: isExpired ? 'Token expired' : 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
}

// Optional auth for endpoints that can work with or without authentication
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !process.env.JWT_SECRET) {
    return next(); // Continue without user context
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.user = {
      id: payload.sub,
      email: payload.email,
      provider: payload.provider
    };
  } catch {
    // Invalid token, but continue without user context for optional auth
  }
  
  next();
}