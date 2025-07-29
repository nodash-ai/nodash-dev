import { expect } from 'vitest';

export const COMMON_TEST_DATA = {
  API_KEY: 'demo-api-key-tenant1',
  TENANT_ID: 'tenant1',
  TEST_USER_ID: 'user123',
  TEST_EVENT_NAME: 'page_view',
  TEST_PROPERTIES: { page: '/home', source: 'test' }
};

export class SharedTestUtilities {
  /**
   * Validate health endpoint response
   */
  static async validateHealthEndpoint(baseUrl: string): Promise<void> {
    const response = await fetch(`${baseUrl}/v1/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.dependencies.eventStore).toBe('healthy');
    expect(data.dependencies.userStore).toBe('healthy');
  }

  /**
   * Track an event and validate the response
   */
  static async trackEventAndValidate(
    baseUrl: string, 
    eventData: {
      event: string;
      userId?: string;
      properties?: Record<string, any>;
    },
    options: {
      apiKey?: string;
      tenantId?: string;
      expectedStatus?: number;
    } = {}
  ): Promise<any> {
    const {
      apiKey = COMMON_TEST_DATA.API_KEY,
      tenantId = COMMON_TEST_DATA.TENANT_ID,
      expectedStatus = 200
    } = options;

    const response = await fetch(`${baseUrl}/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    
    expect(response.status).toBe(expectedStatus);
    
    if (expectedStatus === 200) {
      expect(data.success).toBe(true);
      expect(data.eventId).toBeDefined();
      expect(data.timestamp).toBeDefined();
    }
    
    // Return consistent structure regardless of success/failure
    return {
      success: data.success ?? (expectedStatus === 200),
      ...data
    };
  }

  /**
   * Identify a user and validate the response
   */
  static async identifyUserAndValidate(
    baseUrl: string,
    userData: {
      userId: string;
      traits?: Record<string, any>;
    },
    options: {
      apiKey?: string;
      tenantId?: string;
      expectedStatus?: number;
    } = {}
  ): Promise<any> {
    const {
      apiKey = COMMON_TEST_DATA.API_KEY,
      tenantId = COMMON_TEST_DATA.TENANT_ID,
      expectedStatus = 200
    } = options;

    const response = await fetch(`${baseUrl}/v1/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    expect(response.status).toBe(expectedStatus);
    
    if (expectedStatus === 200) {
      expect(data.success).toBe(true);
      expect(data.userId).toBe(userData.userId);
    }
    
    return data;
  }

  /**
   * Test Bearer token authentication
   */
  static async testBearerAuthentication(
    baseUrl: string,
    token: string,
    expectedStatus: number = 200
  ): Promise<any> {
    const response = await fetch(`${baseUrl}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        event: COMMON_TEST_DATA.TEST_EVENT_NAME,
        userId: COMMON_TEST_DATA.TEST_USER_ID,
        properties: COMMON_TEST_DATA.TEST_PROPERTIES,
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(expectedStatus);
    
    // Handle different response formats
    if (expectedStatus !== 200) {
      return {
        success: false,
        error: data.error || data.message || 'Request failed',
        ...data
      };
    }
    
    return {
      success: data.success ?? true,
      ...data
    };
  }

  /**
   * Test error handling with invalid data
   */
  static async testErrorHandling(
    baseUrl: string,
    endpoint: string,
    invalidData: any,
    expectedStatus: number = 400,
    expectedErrorMessage?: string
  ): Promise<any> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': COMMON_TEST_DATA.TENANT_ID,
        'x-api-key': COMMON_TEST_DATA.API_KEY,
      },
      body: JSON.stringify(invalidData),
    });

    const data = await response.json();
    expect(response.status).toBe(expectedStatus);
    
    if (expectedErrorMessage) {
      expect(data.message || data.error).toContain(expectedErrorMessage);
    }
    
    return data;
  }

  /**
   * Test concurrent requests and validate performance
   */
  static async testConcurrentRequests(
    baseUrl: string,
    requestCount: number = 10,
    maxDurationMs: number = 5000
  ): Promise<{ results: any[]; duration: number }> {
    const startTime = Date.now();
    
    const requests = Array.from({ length: requestCount }, (_, i) =>
      this.trackEventAndValidate(baseUrl, {
        event: `concurrent_test_${i}`,
        userId: `user_${i}`,
        properties: { sequence: i, batch: 'concurrent_test' }
      })
    );

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(maxDurationMs);
    expect(results).toHaveLength(requestCount);
    
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    return { results, duration };
  }

  /**
   * Generate test event data with defaults
   */
  static generateTestEvent(overrides: Partial<{
    event: string;
    userId: string;
    properties: Record<string, any>;
  }> = {}): any {
    return {
      event: COMMON_TEST_DATA.TEST_EVENT_NAME,
      userId: COMMON_TEST_DATA.TEST_USER_ID,
      properties: COMMON_TEST_DATA.TEST_PROPERTIES,
      ...overrides
    };
  }

  /**
   * Generate test user data with defaults
   */
  static generateTestUser(overrides: Partial<{
    userId: string;
    traits: Record<string, any>;
  }> = {}): any {
    return {
      userId: COMMON_TEST_DATA.TEST_USER_ID,
      traits: {
        name: 'Test User',
        email: 'test@example.com',
        plan: 'premium'
      },
      ...overrides
    };
  }

  /**
   * Wait for a specified duration (useful for test timing)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create standard test headers
   */
  static createHeaders(options: {
    contentType?: string;
    apiKey?: string;
    tenantId?: string;
    authorization?: string;
  } = {}): HeadersInit {
    const headers: Record<string, string> = {};
    
    if (options.contentType !== false) {
      headers['Content-Type'] = options.contentType || 'application/json';
    }
    
    if (options.apiKey !== undefined) {
      headers['x-api-key'] = options.apiKey;
    } else {
      headers['x-api-key'] = COMMON_TEST_DATA.API_KEY;
    }
    
    if (options.tenantId !== undefined) {
      headers['x-tenant-id'] = options.tenantId;
    } else {
      headers['x-tenant-id'] = COMMON_TEST_DATA.TENANT_ID;
    }
    
    if (options.authorization) {
      headers['Authorization'] = options.authorization;
    }
    
    return headers;
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedFields: string[] = []): void {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    
    expectedFields.forEach(field => {
      expect(response[field]).toBeDefined();
    });
  }

  /**
   * Test invalid authentication scenarios
   */
  static async testInvalidAuthentication(baseUrl: string): Promise<void> {
    // Test missing API key
    const noKeyResponse = await fetch(`${baseUrl}/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': COMMON_TEST_DATA.TENANT_ID,
      },
      body: JSON.stringify(this.generateTestEvent()),
    });
    expect(noKeyResponse.status).toBe(401);

    // Test invalid API key
    const invalidKeyResponse = await fetch(`${baseUrl}/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': COMMON_TEST_DATA.TENANT_ID,
        'x-api-key': 'invalid-key',
      },
      body: JSON.stringify(this.generateTestEvent()),
    });
    expect(invalidKeyResponse.status).toBe(401);
  }
}