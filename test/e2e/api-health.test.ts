import { describe, it, expect } from 'vitest';
import { getTestServerUrl } from './setup';

describe('E2E: API Health', () => {
  it('should return healthy status', async () => {
    const response = await fetch(`${getTestServerUrl()}/v1/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('dependencies');
    expect(data.dependencies).toHaveProperty('eventStore');
    expect(data.dependencies).toHaveProperty('userStore');
    expect(data.dependencies).toHaveProperty('rateLimiter');
  });

  it('should handle CORS properly', async () => {
    const response = await fetch(`${getTestServerUrl()}/v1/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
  });
});