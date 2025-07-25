# Nodash Analytics Backend

A scalable, multi-tenant analytics backend built with TypeScript and Express.js. Features adapter-based storage architecture for seamless scaling from flat files to distributed databases.

## Features

- **Multi-tenant Support**: Complete tenant isolation with configurable rate limiting
- **Adapter-based Storage**: Seamlessly switch between storage backends via configuration
- **Event Deduplication**: Exactly-once processing with configurable TTL
- **Rate Limiting**: Sliding window rate limiting per tenant/IP/user
- **Authentication**: JWT tokens and API key authentication
- **Health Monitoring**: Comprehensive health checks for all dependencies
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Comprehensive Testing**: Unit, integration, and E2E test suites with 95%+ coverage
- **Developer Experience**: Advanced tooling with hot reload, debugging, and automated workflows

## Quick Start

### Development Setup

1. **One-command setup** (recommended)
   ```bash
   npm run setup
   ```
   This will install dependencies, run type checking, build the project, and run tests.

2. **Manual setup**
   ```bash
   npm install
   npm run build
   npm run test:fast
   ```

3. **Start development server**
   ```bash
   npm run dev          # Standard development server
   npm run dev:debug    # Development server with debugger
   npm run dev:watch    # Development server with type checking
   ```

4. **Verify installation**
   ```bash
   npm run health       # Check project health
   curl http://localhost:3001/v1/health  # Check API health
   ```

## Development Scripts

### Core Commands
```bash
npm run build         # Build for production
npm run build:verify  # Build with verification
npm run dev           # Start development server
npm run start         # Start production server
npm run typecheck     # Type checking
npm run health        # Project health check
```

### Testing Commands
```bash
npm test              # Run integration tests (primary)
npm run test:all      # Run comprehensive test suite
npm run test:fast     # Run fast tests (typecheck + integration)
npm run test:unit     # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e      # Run end-to-end tests
npm run test:ci       # Run CI test suite
```

### Code Quality
```bash
npm run lint          # Lint TypeScript code
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

### Maintenance
```bash
npm run clean         # Clean build artifacts
npm run clean:all     # Clean all artifacts and caches
npm run deps:check    # Check for outdated dependencies
npm run deps:update   # Update dependencies
```

## API Endpoints

### Track Events
```bash
curl -X POST http://localhost:3001/v1/track \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant1" \
  -H "x-api-key: demo-api-key-tenant1" \
  -d '{
    "event": "user_signup",
    "userId": "user123",
    "properties": {
      "plan": "premium",
      "source": "web"
    }
  }'
```

### Identify Users
```bash
curl -X POST http://localhost:3001/v1/identify \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant1" \
  -H "x-api-key: demo-api-key-tenant1" \
  -d '{
    "userId": "user123",
    "traits": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'
```

### Health Check
```bash
curl http://localhost:3001/v1/health
```

## Configuration

The backend is configured via environment variables. See `.env.example` for all available options.

### Storage Backends

#### Phase 0 (Current)
- **Events**: `flatfile` - JSON lines files partitioned by date
- **Users**: `flatfile` - Individual JSON files per user
- **Rate Limiting**: `memory` - In-memory sliding window
- **Deduplication**: `memory` - In-memory LRU cache

#### Phase 1 (Future)
- **Events**: `clickhouse`, `bigquery`
- **Users**: `postgres`, `dynamodb`
- **Rate Limiting**: `redis`

### Multi-Environment Support

#### Development
```bash
NODE_ENV=development
STORE_EVENTS=flatfile
STORE_USERS=flatfile
RATE_LIMIT_MAX=10000
```

#### Staging
```bash
NODE_ENV=staging
STORE_EVENTS=flatfile
STORE_USERS=flatfile
RATE_LIMIT_MAX=5000
```

#### Production
```bash
NODE_ENV=production
STORE_EVENTS=clickhouse
STORE_USERS=postgres
STORE_RATELIMIT=redis
RATE_LIMIT_MAX=1000
```

## Architecture

### Request Flow
1. **Request Router**: Validates JSON schema and extracts tenant info
2. **Authentication**: Validates JWT tokens or API keys
3. **Rate Limiting**: Enforces per-tenant rate limits
4. **Deduplication**: Checks for duplicate events
5. **Storage**: Persists data via storage adapters
6. **Response**: Returns success/error with request ID

### Storage Architecture
```
┌─────────────────────────────────────┐
│           HTTP Gateway              │
│  ┌─────────────┐ ┌─────────────────┐│
│  │   Router    │ │  Auth/RateLimit ││
│  └─────────────┘ └─────────────────┘│
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│        Storage Abstraction          │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │ Events   │ │  Users   │ │ Rate │ │
│  │ Adapter  │ │ Adapter  │ │Limit │ │
│  └──────────┘ └──────────┘ └──────┘ │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│          Storage Backends           │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │FlatFiles │ │ClickHouse│ │Redis │ │
│  │PostgreSQL│ │ BigQuery │ │Memory│ │
│  └──────────┘ └──────────┘ └──────┘ │
└─────────────────────────────────────┘
```

## Project Structure

```
nodash-dev/
├── src/                          # Source code
│   ├── index.ts                  # Application entry point
│   ├── config/                   # Configuration management
│   ├── adapters/                 # Storage adapters
│   ├── handlers/                 # Request handlers
│   └── utils/                    # Utility functions
├── test/                         # Test suites
│   ├── unit/                     # Unit tests (adapters, config)
│   ├── integration/              # Integration tests (API, workflows)
│   ├── e2e/                      # End-to-end tests
│   └── setup.ts                  # Test utilities and setup
├── scripts/                      # Development scripts
│   ├── build-verifier.js         # Build validation
│   ├── test-runner.js            # Advanced test execution
│   └── dev-utils.js              # Development utilities
├── dist/                         # Built JavaScript (generated)
├── coverage/                     # Test coverage reports (generated)
├── .github/workflows/            # CI/CD pipelines
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.build.json           # Production build config
├── tsconfig.dev.json             # Development config
├── vitest.config.ts              # Base test configuration
├── vitest.unit.config.ts         # Unit test configuration
├── vitest.integration.config.ts  # Integration test configuration
├── vitest.e2e.config.ts          # E2E test configuration
└── package.json                  # Dependencies and scripts
```

## Development Workflow

### 1. Initial Setup
```bash
# Clone and setup
git clone <repository>
cd nodash-dev
npm run setup
```

### 2. Daily Development
```bash
# Start development with type checking
npm run dev:watch

# In another terminal, run tests on changes
npm run test:fast

# Check code quality
npm run lint
npm run format:check
```

### 3. Before Committing
```bash
# Run comprehensive tests
npm run test:all

# Fix any issues
npm run lint:fix
npm run format

# Verify build
npm run build:verify
```

### 4. Debugging
```bash
# Start with debugger
npm run dev:debug

# Check project health
npm run health

# View logs (if configured)
npm run logs
```

## Testing Strategy

Our testing approach prioritizes **integration and end-to-end tests** over unit tests, focusing on real-world scenarios and API behavior.

### Test Types

1. **Integration Tests** (Primary) - `npm run test:integration`
   - Real API endpoint testing
   - Database/file system interactions
   - Multi-tenant scenarios
   - Authentication flows

2. **Unit Tests** (Minimal) - `npm run test:unit`
   - Storage adapter logic
   - Configuration validation
   - Utility functions

3. **End-to-End Tests** - `npm run test:e2e`
   - Complete user workflows
   - Service startup/shutdown
   - Cross-component integration

### Test Execution

```bash
# Fast feedback loop (recommended for development)
npm run test:fast

# Comprehensive testing (before commits)
npm run test:all

# CI pipeline testing
npm run test:ci

# Specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Test Utilities

The test suite includes utilities for:
- Automatic test data cleanup
- Tenant and user ID generation
- Test server management
- File system verification
- Concurrent request testing

## Development

## Deployment

### Render.com (Recommended)
```bash
# 1. Fork this repository to your GitHub account
# 2. Visit https://dashboard.render.com
# 3. Click "New" → "Blueprint" 
# 4. Select this repository
# 5. Render auto-deploys using render.yaml

# See DEPLOY_RENDER.md for complete guide
```

### Fly.io (Alternative)
```bash
# Install Fly CLI and login
flyctl auth login

# Deploy (see deploy.md for full guide)
flyctl launch
flyctl volumes create nodash_data --size 1
flyctl secrets set JWT_SECRET=your-secret
flyctl deploy
```

### Docker
```bash
# Build image
docker build -t nodash-backend .

# Run container
docker run -p 3001:3001 \
  -e STORE_EVENTS=flatfile \
  -e EVENTS_PATH=/data/events \
  -v $(pwd)/data:/data \
  nodash-backend
```

### Environment Variables
All configuration is done via environment variables. Required variables:
- `NODE_ENV` - Environment (development/staging/production)
- `STORE_EVENTS` - Events storage backend
- `STORE_USERS` - Users storage backend

## API Reference

### Authentication
All endpoints (except `/v1/health`) require authentication via:
- **API Key**: `x-api-key: your-api-key`
- **JWT Token**: `Authorization: Bearer your-jwt-token`

### Tenant Isolation
All requests must include tenant identification:
- **Header**: `x-tenant-id: your-tenant-id`

### Rate Limiting
Rate limits are enforced per (tenant, IP, user) combination:
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **Response**: HTTP 429 with `Retry-After` header

### Error Responses
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "requestId": "uuid-request-id"
}
```

## Security

- **HTTPS Only**: TLS 1.3 enforced in production
- **CORS**: Configurable origins
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Strict JSON schema validation
- **Error Handling**: No sensitive data in error responses

## Monitoring

### Health Checks
- **Endpoint**: `GET /v1/health`
- **Dependencies**: Event store, user store, rate limiter
- **Status**: `healthy`, `degraded`, `unhealthy`

### Logging
- **Format**: Structured JSON logs
- **Context**: Request ID, tenant ID, user ID
- **Levels**: ERROR, WARN, INFO, DEBUG

## License

MIT