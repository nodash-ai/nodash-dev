import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { exchangeApiKeyForJWT } from '../../../src/auth/token-exchange.js';

describe('Token Exchange - API Key to JWT', () => {
  let app: express.Application;
  const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long-for-security';

  beforeAll(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = JWT_SECRET;

    // Create test app
    app = express();
    app.use(express.json());
    app.post('/auth/token', exchangeApiKeyForJWT);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('should exchange valid API key for JWT token', async () => {
    const response = await request(app)
      .post('/auth/token')
      .set('x-api-key', 'demo-api-key-12345')
      .expect(200);

    expect(response.body.token).toBeTruthy();
    expect(response.body.type).toBe('Bearer');
    expect(response.body.expiresIn).toBe('24h');
    expect(response.body.message).toContain('Authorization: Bearer');
  });

  it('should reject requests without API key', async () => {
    const response = await request(app)
      .post('/auth/token')
      .expect(400);

    expect(response.body.error).toBe('API key required');
    expect(response.body.message).toBe('Provide x-api-key header');
  });

  it('should reject invalid API keys', async () => {
    const response = await request(app)
      .post('/auth/token')
      .set('x-api-key', 'short')
      .expect(401);

    expect(response.body.error).toBe('Invalid API key');
  });
});