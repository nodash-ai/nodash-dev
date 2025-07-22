# Nodash Backend Testing Guide

Simple, focused testing for production reliability.

## Test Structure

### Unit Tests (`test/`)
- **Config Tests**: Environment variables and validation
- **Adapter Tests**: Storage adapters (FlatFile event/user adapters)

### Integration Tests (`test/integration/`)
- **API Endpoints**: Full HTTP request/response testing

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run integration tests  
npm run test:integration

# Run CI pipeline
npm run ci
```

## What We Test

### ✅ Core Functionality
- Event storage and retrieval
- User data management
- Configuration loading
- HTTP API endpoints
- Authentication and validation

### ✅ Production Requirements
- Multi-tenant data isolation
- File-based storage reliability
- API error handling
- Health checks

## What We Don't Test

We removed complex test scenarios that add maintenance overhead:
- Performance benchmarks
- Mock-heavy handler tests
- Complex SDK integration tests
- Rate limiting edge cases

## Test Data

- Unit tests use `./test-data/`
- Integration tests use `./integration-test-data/`
- All test data is automatically cleaned up

## Philosophy

Simple, reliable tests that catch real bugs without slowing down development.