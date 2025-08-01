import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../../../src/auth/simple-jwt-middleware.js';

describe('Simple JWT Protection - Product Requirements', () => {
  let app: express.Application;
  const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long-for-security';

  beforeAll(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = JWT_SECRET;

    // Create test app that mimics the real API
    app = express();
    app.use(express.json());

    // Mock track handler
    const trackHandler = (req: any, res: any) => {
      res.json({
        message: 'Event tracked successfully',
        user: req.user,
        timestamp: new Date().toISOString()
      });
    };

    // Mock identify handler  
    const identifyHandler = (req: any, res: any) => {
      res.json({
        message: 'User identified successfully',
        user: req.user,
        timestamp: new Date().toISOString()
      });
    };

    // Protected routes - THE ACTUAL PRODUCT REQUIREMENT
    app.post('/track', requireAuth, trackHandler);
    app.post('/identify', requireAuth, identifyHandler);

    // Public route for comparison
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
  });

  // THE ONLY TEST THAT MATTERS FOR THE PRODUCT
  it('should protect /track endpoint with JWT authentication', async () => {
    // Without token -> 401
    const response1 = await request(app)
      .post('/track')
      .send({ event: 'test_event' })
      .expect(401);

    expect(response1.body.error).toBe('Authentication required');

    // With valid token -> 200
    const validToken = jwt.sign(
      { sub: 'user-123', email: 'test@example.com', provider: 'test' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response2 = await request(app)
      .post('/track')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ event: 'test_event' })
      .expect(200);

    expect(response2.body.message).toBe('Event tracked successfully');
    expect(response2.body.user.id).toBe('user-123');
  });

  it('should protect /identify endpoint with JWT authentication', async () => {
    // Without token -> 401
    const response1 = await request(app)
      .post('/identify')
      .send({ userId: 'user-123' })
      .expect(401);

    expect(response1.body.error).toBe('Authentication required');

    // With valid token -> 200
    const validToken = jwt.sign(
      { sub: 'user-456', email: 'test2@example.com', provider: 'test' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response2 = await request(app)
      .post('/identify')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ userId: 'user-456' })
      .expect(200);

    expect(response2.body.message).toBe('User identified successfully');
    expect(response2.body.user.id).toBe('user-456');
  });

  it('should reject expired JWT tokens', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-789', email: 'expired@example.com', provider: 'test' },
      JWT_SECRET,
      { expiresIn: '1ms' }
    );

    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    const response = await request(app)
      .post('/track')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({ event: 'test_event' })
      .expect(401);

    expect(response.body.error).toBe('Token expired');
  });

  it('should reject invalid JWT tokens', async () => {
    const response = await request(app)
      .post('/track')
      .set('Authorization', 'Bearer invalid-token')
      .send({ event: 'test_event' })
      .expect(401);

    expect(response.body.error).toBe('Invalid token');
  });

  it('should allow access to public endpoints without authentication', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });
});