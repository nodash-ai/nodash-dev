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

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Check health**
   ```bash
   curl http://localhost:3001/v1/health
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

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run lint` - Lint TypeScript code
- `npm run typecheck` - Type check without building

### Testing
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Run specific test file
npx vitest track-handler.test.ts
```

## Deployment

### Fly.io (Recommended)
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