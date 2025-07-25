# Nodash Backend Testing Guide

Comprehensive testing strategy focused on integration patterns and real-world scenarios.

## Overview

Our testing approach prioritizes **integration and end-to-end tests** over unit tests, focusing on real API behavior, multi-tenant scenarios, and production-like conditions.

## Test Architecture

### Unit Tests (`test/adapters/`, `test/config/`)
**Purpose**: Test individual components in isolation
- **Adapter Tests** (34 tests): Storage adapters (FlatFile event/user adapters)
- **Config Tests** (9 tests): Environment variables and validation
- **Focus**: Fast, isolated testing of core business logic

### Integration Tests (`test/integration/`)
**Purpose**: Test complete API workflows with real HTTP requests
- **API Endpoints** (8 tests): Full HTTP request/response cycles
- **Workflow Integration** (4 tests): Complete user journeys and data persistence
- **Authentication** (11 tests): Bearer token and API key authentication flows
- **SDK Integration** (5 tests): Real SDK usage against live server

### End-to-End Tests (`test/e2e/`)
**Purpose**: Test complete system behavior in production-like environment
- **Health Checks** (2 tests): Service startup, CORS configuration
- **Real Server**: Tests run against actual service instance

## Running Tests

### Quick Commands
```bash
# Fast development feedback (typecheck + integration)
npm run test:fast

# Run specific test types
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only  
npm run test:e2e          # End-to-end tests only

# Comprehensive testing
npm run test:all          # All test types + build verification
npm run test:ci           # CI-optimized test execution
```

### Advanced Test Execution
```bash
# Use test runner with specific modes
node scripts/test-runner.js fast  # Quick feedback
node scripts/test-runner.js all   # Comprehensive
node scripts/test-runner.js ci    # CI pipeline

# Build verification (includes syntax validation)
npm run build:verify
```

## Test Features & Scenarios

### ✅ Core Functionality Testing
- **Event Storage**: Real file system persistence with date partitioning
- **User Management**: JSON-based user profile storage and retrieval
- **Configuration**: Environment-based configuration loading and validation
- **API Endpoints**: Complete HTTP request/response validation
- **Authentication**: Multi-method auth (JWT, API keys) with real tokens

### ✅ Production Scenarios
- **Multi-tenant Isolation**: Complete data separation between tenants
- **Concurrent Requests**: 50+ concurrent requests with performance validation
- **Error Handling**: Graceful degradation and proper error responses
- **Data Persistence**: File system reliability across service restarts
- **CORS Configuration**: Cross-origin request handling
- **Health Monitoring**: Dependency status and system health reporting

### ✅ Real-world Integration
- **SDK Integration**: Tests use actual `@nodash/sdk` package
- **Complete Workflows**: User signup → identification → event tracking → verification
- **Concurrent Operations**: Race condition and data corruption prevention
- **Error Recovery**: Invalid credentials, network failures, malformed requests

## Test Data Management

### Automatic Cleanup
```bash
# Unit tests
./test-data/                    # Cleaned after each test run

# Integration tests  
./integration-test-data/        # Cleaned between test suites

# E2E tests
./e2e-test-data/               # Isolated test environment
```

### Data Structure
```
test-data/
├── events/tenant1/2025/01/events-2025-01-25.jsonl
├── users/tenant1/users/user123.json
└── ...

integration-test-data/
├── events/tenant1/2025/01/events-2025-01-25.jsonl  
├── users/tenant1/users/user456.json
└── ...
```

## Test Configuration

### Vitest Configurations
- **`vitest.config.ts`**: Base configuration for integration tests
- **`vitest.unit.config.ts`**: Unit test configuration  
- **`vitest.integration.config.ts`**: Integration test setup
- **`vitest.e2e.config.ts`**: End-to-end test configuration

### Environment Variables
```bash
# Test environment settings
NODE_ENV=test
STORE_EVENTS=flatfile
STORE_USERS=flatfile
EVENTS_PATH=./integration-test-data/events
USERS_PATH=./integration-test-data/users
JWT_SECRET=test-secret-key
RATE_LIMIT_MAX=1000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Writing New Tests

### Integration Test Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { getIntegrationServerUrl } from './setup';

describe('Feature Integration Tests', () => {
  it('should handle complete workflow', async () => {
    const baseUrl = getIntegrationServerUrl();
    
    // 1. Setup test data
    const testData = { /* ... */ };
    
    // 2. Make API requests
    const response = await fetch(`${baseUrl}/v1/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'tenant1',
        'x-api-key': 'demo-api-key-tenant1'
      },
      body: JSON.stringify(testData)
    });
    
    // 3. Assert response
    expect(response.status).toBe(200);
    
    // 4. Verify side effects (file system, etc.)
    // Check that data was persisted correctly
  });
});
```

### SDK Integration Pattern
```typescript
import { NodashSDK } from '@nodash/sdk';

describe('SDK Integration', () => {
  let sdk: NodashSDK;
  
  beforeAll(() => {
    sdk = new NodashSDK(getIntegrationServerUrl(), 'demo-api-key-tenant1');
  });
  
  it('should track events through SDK', async () => {
    await sdk.track('test_event', { userId: 'test123' });
    
    // Verify event was stored in file system
    // Check event structure and content
  });
});
```

## Performance & Reliability

### Performance Benchmarks
- **High-frequency requests**: 50 requests in <150ms
- **Concurrent operations**: 10 parallel requests without corruption
- **Memory usage**: Monitored during long test runs
- **Startup time**: Service ready in <3 seconds

### Reliability Features
- **Test isolation**: Each test gets fresh data directories
- **Cleanup automation**: No manual cleanup required
- **Error categorization**: Clear distinction between test and system errors
- **Retry logic**: Flaky network operations automatically retried

## Troubleshooting

### Common Issues

**Tests hanging or timing out:**
```bash
# Check for hanging processes
ps aux | grep node

# Clean test data
rm -rf test-data integration-test-data e2e-test-data

# Rebuild and retest
npm run clean && npm run build && npm run test:fast
```

**File permission errors:**
```bash
# Fix permissions
chmod -R u+w test-data integration-test-data e2e-test-data
```

**Port conflicts:**
```bash
# Kill processes using test ports
lsof -ti:3001,3002 | xargs kill -9
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:integration

# Run single test file
npx vitest run test/integration/specific-test.test.ts
```

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- **Pull requests**: Fast test suite (typecheck + integration)
- **Main branch**: Comprehensive test suite (all tests + build verification)
- **Matrix testing**: Node.js 20, 22 on Ubuntu, Windows, macOS

### Test Reports
- **Coverage reports**: Generated in `coverage/` directory
- **Test artifacts**: Uploaded for failed builds
- **Performance metrics**: Tracked across builds

## Philosophy

**Integration-first testing** that catches real bugs in production-like conditions while maintaining fast development feedback loops. We prefer fewer, more comprehensive tests over many isolated unit tests.