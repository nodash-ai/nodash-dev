# Nodash Analytics API Service

The Nodash Analytics API Service is a scalable, multi-tenant analytics platform built with Node.js and TypeScript. It provides comprehensive event tracking, user identification, and analytics querying capabilities with flexible storage adapters and robust authentication.

## Architecture

### Service Overview

```
┌─────────────────┐
│   Client SDKs   │
│   CLI Tools     │  ──┐
│   MCP Agents    │    │
└─────────────────┘    │
         │              │
         ▼              │
┌─────────────────┐    │
│ Load Balancer/  │    │
│ API Gateway     │    │
└─────────────────┘    │
         │              │
         ▼              │
┌─────────────────┐    │
│  API Service    │ ◄──┘
│  (This Service) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Storage Layer   │
│ • Events        │
│ • Users         │
│ • Rate Limits   │
└─────────────────┘
```

### Multi-tenant Architecture

```
┌─────────────────┐
│ Tenant A Token  │ ──┐
└─────────────────┘   │
┌─────────────────┐   │    ┌─────────────────┐
│ Tenant B Token  │ ──┼───►│ Authentication  │
└─────────────────┘   │    │ & Authorization │
┌─────────────────┐   │    └─────────────────┘
│ Tenant C Token  │ ──┘             │
└─────────────────┘                 ▼
                           ┌─────────────────┐
                           │ Tenant Context  │
                           │ Extraction      │
                           └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Data Isolation  │
                           │ • Tenant A Data │
                           │ • Tenant B Data │
                           │ • Tenant C Data │
                           └─────────────────┘
```

## API Endpoints

### Health Check

**GET /v1/health**

Check service health and storage adapter status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": [
    {
      "name": "events_storage",
      "status": "pass",
      "message": "Connected to flatfile storage"
    },
    {
      "name": "users_storage", 
      "status": "pass",
      "message": "Connected to flatfile storage"
    },
    {
      "name": "rate_limit_storage",
      "status": "pass",
      "message": "Memory storage operational"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Event Tracking

**POST /v1/track**

Track analytics events with optional user association.

**Headers:**
- `x-tenant-id`: Tenant identifier (required for multi-tenant deployments)
- `x-api-key`: API key for authentication (optional, depends on configuration)
- `Authorization`: JWT token (alternative to API key)

**Request Body:**
```json
{
  "event": "user_signup",
  "properties": {
    "plan": "premium",
    "source": "website",
    "campaign": "summer_2024"
  },
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt_1234567890",
  "message": "Event tracked successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_abcdef123456"
}
```

### User Identification

**POST /v1/identify**

Identify users and associate traits with them.

**Headers:**
- `x-tenant-id`: Tenant identifier (required for multi-tenant deployments)
- `x-api-key`: API key for authentication (optional)
- `Authorization`: JWT token (alternative to API key)

**Request Body:**
```json
{
  "userId": "user-123",
  "traits": {
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "premium",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user-123",
  "message": "User identified successfully",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_abcdef123456"
}
```

### Event Querying

**GET /v1/events/query**

Query events with comprehensive filtering and pagination.

**Headers:**
- `x-tenant-id`: Tenant identifier (required)
- `x-api-key`: API key for authentication
- `Authorization`: JWT token (alternative to API key)

**Query Parameters:**
- `eventTypes`: Comma-separated list of event types
- `userId`: Filter by specific user ID
- `startDate`: Start date in ISO 8601 format
- `endDate`: End date in ISO 8601 format
- `properties`: JSON string of property filters
- `sortBy`: Sort field (timestamp, eventName, userId)
- `sortOrder`: Sort order (asc, desc)
- `limit`: Maximum results (default: 100, max: 1000)
- `offset`: Pagination offset (default: 0)

**Example Request:**
```
GET /v1/events/query?eventTypes=user_signup,purchase&startDate=2024-01-01T00:00:00Z&limit=50&sortBy=timestamp&sortOrder=desc
```

**Response:**
```json
{
  "events": [
    {
      "eventId": "evt_1234567890",
      "tenantId": "tenant1",
      "userId": "user-123",
      "eventName": "user_signup",
      "properties": {
        "plan": "premium",
        "source": "website"
      },
      "timestamp": "2024-01-15T10:30:00.000Z",
      "receivedAt": "2024-01-15T10:30:01.000Z"
    }
  ],
  "totalCount": 1250,
  "hasMore": true,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "nextOffset": 50
  },
  "executionTime": 45
}
```

### User Querying

**GET /v1/users/query**

Query users with activity filters and comprehensive data.

**Headers:**
- `x-tenant-id`: Tenant identifier (required)
- `x-api-key`: API key for authentication
- `Authorization`: JWT token (alternative to API key)

**Query Parameters:**
- `userId`: Filter by specific user ID
- `activeSince`: Filter users active since date (ISO 8601)
- `activeUntil`: Filter users active until date (ISO 8601)
- `properties`: JSON string of property filters
- `sortBy`: Sort field (firstSeen, lastSeen, eventCount, sessionCount)
- `sortOrder`: Sort order (asc, desc)
- `limit`: Maximum results (default: 100, max: 1000)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "users": [
    {
      "userId": "user-123",
      "tenantId": "tenant1",
      "properties": {
        "email": "user@example.com",
        "name": "John Doe",
        "plan": "premium"
      },
      "firstSeen": "2024-01-15T10:30:00.000Z",
      "lastSeen": "2024-01-20T15:45:00.000Z",
      "sessionCount": 25,
      "eventCount": 150
    }
  ],
  "totalCount": 500,
  "hasMore": true,
  "pagination": {
    "limit": 100,
    "offset": 0,
    "nextOffset": 100
  },
  "executionTime": 32
}
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3001 | No |
| `HOST` | Server host | 0.0.0.0 | No |
| `NODE_ENV` | Environment | development | No |
| `JWT_SECRET` | JWT signing secret | - | Yes (if using JWT) |
| `API_KEY_HEADER` | API key header name | x-api-key | No |
| `CORS_ORIGINS` | CORS allowed origins | * | No |

### Storage Configuration

| Variable | Description | Options | Default |
|----------|-------------|---------|---------|
| `STORE_EVENTS` | Events storage adapter | flatfile, clickhouse, postgres | flatfile |
| `STORE_USERS` | Users storage adapter | flatfile, postgres | flatfile |
| `STORE_RATELIMIT` | Rate limit storage | memory, redis | memory |

### Storage Paths and URLs

| Variable | Description | Example |
|----------|-------------|---------|
| `EVENTS_PATH` | File storage path for events | ./data/events |
| `USERS_PATH` | File storage path for users | ./data/users |
| `CLICKHOUSE_URL` | ClickHouse connection URL | clickhouse://localhost:9000/analytics |
| `POSTGRES_URL` | PostgreSQL connection URL | postgresql://localhost:5432/nodash |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW` | Rate limit window (seconds) | 3600 |
| `RATE_LIMIT_MAX` | Max requests per window | 1000 |

## Authentication and Multi-tenancy

### Authentication Methods

**API Key Authentication:**
```bash
curl -X POST http://localhost:3001/v1/track \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "x-tenant-id: tenant1" \
  -d '{"event": "test_event", "properties": {}}'
```

**JWT Authentication:**
```bash
curl -X POST http://localhost:3001/v1/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "x-tenant-id: tenant1" \
  -d '{"event": "test_event", "properties": {}}'
```

### Multi-tenant Data Isolation

- **Tenant Identification**: Extracted from `x-tenant-id` header
- **Data Segregation**: All data operations are scoped to the authenticated tenant
- **Storage Isolation**: Tenant data is stored separately in all storage adapters
- **Query Isolation**: Queries return only data for the authenticated tenant

### Security Features

- **Helmet.js**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Per-tenant rate limiting with configurable windows
- **Request Validation**: Comprehensive input validation using Zod schemas
- **Error Handling**: Structured error responses without sensitive data leakage

## Storage Adapters

### Flatfile Storage

Default storage adapter using JSON files on disk.

**Configuration:**
```bash
STORE_EVENTS=flatfile
STORE_USERS=flatfile
EVENTS_PATH=./data/events
USERS_PATH=./data/users
```

**Features:**
- Simple setup for development and testing
- Human-readable JSON format
- Automatic file rotation and organization
- Tenant-based directory structure

### ClickHouse Storage

High-performance columnar database for analytics workloads.

**Configuration:**
```bash
STORE_EVENTS=clickhouse
CLICKHOUSE_URL=clickhouse://localhost:9000/analytics
```

**Features:**
- Optimized for analytical queries
- High compression and performance
- Scalable for large event volumes
- SQL-compatible query interface

### PostgreSQL Storage

Relational database storage for structured data.

**Configuration:**
```bash
STORE_USERS=postgres
POSTGRES_URL=postgresql://localhost:5432/nodash
```

**Features:**
- ACID compliance and reliability
- Complex relational queries
- Mature ecosystem and tooling
- Backup and replication support

### Redis Storage

In-memory storage for rate limiting and caching.

**Configuration:**
```bash
STORE_RATELIMIT=redis
REDIS_URL=redis://localhost:6379
```

**Features:**
- High-performance in-memory operations
- Distributed rate limiting
- Automatic expiration and cleanup
- Cluster support for high availability

## Development

### Local Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd nodash-dev/services/api-service
npm install

# Copy environment configuration
cp .env.example .env

# Start in development mode
npm run dev
```

### Building

```bash
# Build TypeScript to JavaScript
npm run build

# Verify build output
npm run build:verify

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:all
```

### Development Scripts

```bash
# Type checking
npm run typecheck

# Code formatting
npm run format
npm run format:check

# Development with debugging
npm run dev:debug

# Health check
npm run health
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t nodash-api-service .

# Run container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  nodash-api-service
```

### Render.com Deployment

The service includes Render.com configuration:

```yaml
# render.yaml
services:
  - type: web
    name: nodash-api-service
    env: node
    buildCommand: npm run render:build
    startCommand: npm run render:start
    envVars:
      - key: NODE_ENV
        value: production
```

### Environment-specific Configuration

**Development:**
```bash
NODE_ENV=development
PORT=3001
STORE_EVENTS=flatfile
STORE_USERS=flatfile
CORS_ORIGINS=*
```

**Staging:**
```bash
NODE_ENV=staging
PORT=3001
STORE_EVENTS=postgres
STORE_USERS=postgres
POSTGRES_URL=postgresql://staging-db:5432/nodash
CORS_ORIGINS=https://staging.example.com
```

**Production:**
```bash
NODE_ENV=production
PORT=3001
STORE_EVENTS=clickhouse
STORE_USERS=postgres
CLICKHOUSE_URL=clickhouse://prod-clickhouse:9000/analytics
POSTGRES_URL=postgresql://prod-db:5432/nodash
CORS_ORIGINS=https://api.example.com
JWT_SECRET=secure-production-secret
```

## Monitoring and Observability

### Health Monitoring

The service provides comprehensive health checks:

```bash
# Check service health
curl http://localhost:3001/v1/health

# Monitor storage adapter status
curl http://localhost:3001/v1/health | jq '.checks'
```

### Logging

Structured logging with request correlation:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "POST /v1/track - 200 (45ms)",
  "requestId": "req_abcdef123456",
  "tenantId": "tenant1",
  "userId": "user-123"
}
```

### Error Handling

Comprehensive error responses with debugging information:

```json
{
  "error": "Validation Error",
  "message": "Event name is required",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_abcdef123456",
  "details": {
    "field": "event",
    "code": "REQUIRED_FIELD_MISSING"
  }
}
```

## API Documentation

### Interactive Documentation

The service provides interactive API documentation:

- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs/json
- **OpenAPI YAML**: http://localhost:3001/api-docs/yaml

### SDK Compatibility

The service maintains compatibility with the Nodash SDK:

- Legacy endpoints without `/v1` prefix
- Automatic tenant derivation from API tokens
- Consistent response formats
- Error handling patterns

## Performance and Scaling

### Performance Characteristics

- **Throughput**: 1000+ requests/second (single instance)
- **Latency**: <50ms average response time
- **Memory**: ~100MB base memory usage
- **Storage**: Configurable adapters for different scales

### Scaling Strategies

**Horizontal Scaling:**
- Stateless design enables multiple instances
- Load balancer distribution
- Shared storage adapters (Redis, PostgreSQL, ClickHouse)

**Vertical Scaling:**
- CPU optimization for request processing
- Memory optimization for large payloads
- Storage optimization for high-volume writes

**Storage Scaling:**
- ClickHouse for high-volume event storage
- PostgreSQL read replicas for user queries
- Redis clustering for distributed rate limiting

## Security

### Security Features

- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Per-tenant rate limiting
- **CORS Protection**: Configurable origin restrictions
- **Security Headers**: Helmet.js security middleware
- **Error Sanitization**: No sensitive data in error responses

### Security Best Practices

1. **Environment Variables**: Store secrets in environment variables
2. **JWT Secrets**: Use strong, unique JWT signing secrets
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Configure appropriate rate limits
5. **Monitoring**: Monitor for suspicious activity patterns

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Port already in use | Another service using port 3001 | Change PORT environment variable |
| Storage connection failed | Invalid storage configuration | Check storage URLs and credentials |
| Authentication errors | Missing or invalid tokens | Verify JWT_SECRET and API keys |
| CORS errors | Incorrect origin configuration | Update CORS_ORIGINS setting |
| High memory usage | Large event payloads | Implement payload size limits |

### Debug Mode

Enable debug logging:

```bash
DEBUG=nodash:* npm run dev
```

### Health Diagnostics

```bash
# Check service health
curl http://localhost:3001/v1/health

# Test event tracking
curl -X POST http://localhost:3001/v1/track \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test" \
  -d '{"event": "test_event", "properties": {}}'

# Test user identification
curl -X POST http://localhost:3001/v1/identify \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test" \
  -d '{"userId": "test-user", "traits": {}}'
```

## Contributing

1. **Code Style**: Follow TypeScript and Prettier conventions
2. **Testing**: Add tests for new features and bug fixes
3. **Documentation**: Update API documentation for changes
4. **Security**: Follow security best practices
5. **Performance**: Consider performance impact of changes

## License

MIT License - see the root repository LICENSE file for details.