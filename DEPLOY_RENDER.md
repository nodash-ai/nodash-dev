# Render.com Deployment Guide

Complete guide for deploying the Nodash Analytics Backend to Render.com.

## Quick Start

### Option 1: Blueprint Deployment (Recommended)

1. Fork this repository to your GitHub account
2. Visit [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub account and select this repository
5. Render will automatically detect `render.yaml` and deploy the service

### Option 2: Manual Web Service

1. Visit [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure settings as outlined below

## Configuration

### Build & Deploy Settings

```yaml
# Automatically configured via render.yaml
Build Command: npm ci && npm run build
Start Command: npm start
Environment: Node
Node Version: 20
```

### Environment Variables

#### Required

- `NODE_ENV`: `production`
- `PORT`: `10000` (automatically set by Render)
- `JWT_SECRET`: Generate secure value in Render dashboard

#### Storage Configuration

- `STORE_EVENTS`: `flatfile` (default)
- `STORE_USERS`: `flatfile` (default)
- `STORE_RATELIMIT`: `memory` (default)
- `STORE_DEDUPLICATION`: `memory` (default)

#### Storage Paths

- `EVENTS_PATH`: `./data/events`
- `USERS_PATH`: `./data/users`

#### Rate Limiting

- `RATE_LIMIT_MAX`: `1000` (requests per window)
- `RATE_LIMIT_WINDOW`: `3600` (seconds)
- `DEDUPLICATION_TTL`: `3600` (seconds)

#### Security & CORS

- `CORS_ORIGINS`: `*` (configure for production)
- `API_KEY_HEADER`: `x-api-key` (default)

#### Demo API Keys (Optional)

- `DEMO_API_KEY_TENANT1`: `demo-api-key-tenant1`
- `DEMO_API_KEY_TENANT2`: `demo-api-key-tenant2`

## Persistent Storage

### Disk Configuration

The service includes a **1GB persistent disk** mounted at `/opt/render/project/src/data` for:

- Event storage (partitioned by date)
- User profiles (JSON files)
- Application logs

### Data Structure

```
/opt/render/project/src/data/
├── events/
│   └── tenant1/
│       └── 2025/
│           └── 01/
│               └── events-2025-01-25.jsonl
└── users/
    └── tenant1/
        └── users/
            └── user123.json
```

## Health Checks

Render automatically monitors your service via:

- **Endpoint**: `GET /v1/health`
- **Expected Response**: `200 OK` with JSON health status
- **Automatic Restart**: Service restarts if health checks fail

### Health Check Response

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-01-25T10:00:00.000Z",
  "dependencies": {
    "eventStore": "healthy",
    "userStore": "healthy",
    "rateLimiter": "healthy"
  }
}
```

## API Endpoints

After deployment, your service will be available at:

```
https://your-service-name.onrender.com/v1/health
https://your-service-name.onrender.com/v1/track
https://your-service-name.onrender.com/v1/identify
```

### Example Usage

```bash
# Health check
curl https://your-service-name.onrender.com/v1/health

# Track event
curl -X POST https://your-service-name.onrender.com/v1/track \
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

# Identify user
curl -X POST https://your-service-name.onrender.com/v1/identify \
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

## Deployment Process

### 1. Automatic Deployment

- **Trigger**: Push to `main` branch
- **Build Time**: ~2-3 minutes
- **Zero Downtime**: Rolling deployments

### 2. Build Process

```bash
1. npm ci              # Install dependencies
2. npm run build       # TypeScript compilation
3. npm start           # Start production server
```

### 3. Deployment Verification

```bash
# Check service status
curl https://your-service-name.onrender.com/v1/health

# Verify response time (should be < 200ms)
time curl https://your-service-name.onrender.com/v1/health
```

## Scaling & Performance

### Render Plans

- **Starter**: $7/month, 512MB RAM, shared CPU
- **Standard**: $25/month, 2GB RAM, dedicated CPU
- **Pro**: $85/month, 8GB RAM, dedicated CPU

### Performance Tuning

```bash
# Environment variables for production optimization
NODE_OPTIONS=--max-old-space-size=1024
UV_THREADPOOL_SIZE=128
```

### Auto-scaling

Render automatically handles:

- Traffic spikes
- Memory management
- Process restarts
- Load balancing

## Monitoring & Logging

### Built-in Monitoring

- **Uptime**: 99.9% SLA
- **Response Time**: Real-time metrics
- **Error Rates**: Automatic alerts
- **Resource Usage**: CPU/Memory graphs

### Log Access

```bash
# View logs via Render dashboard
# Or use Render CLI
render logs --service your-service-name --tail
```

### Custom Metrics

The service includes structured logging:

```json
{
  "timestamp": "2025-01-25T10:00:00.000Z",
  "level": "info",
  "message": "Event tracked successfully",
  "tenantId": "tenant1",
  "userId": "user123",
  "event": "user_signup"
}
```

## Security

### HTTPS by Default

- **Certificate**: Automatic SSL/TLS
- **Redirect**: HTTP → HTTPS
- **HSTS**: Enabled

### Environment Security

- **Secrets**: Encrypted environment variables
- **API Keys**: Never logged or exposed
- **CORS**: Configurable origins

### Network Security

- **IP Whitelisting**: Available on Pro plans
- **Rate Limiting**: Built-in protection
- **DDoS Protection**: Automatic mitigation

## Troubleshooting

### Common Issues

**Service won't start:**

```bash
# Check build logs in Render dashboard
# Verify environment variables are set
# Ensure Node.js version compatibility
```

**Health checks failing:**

```bash
# Check /v1/health endpoint manually
curl https://your-service-name.onrender.com/v1/health

# Verify port configuration (should be 10000)
# Check storage permissions
```

**Performance issues:**

```bash
# Upgrade to higher tier plan
# Enable persistent disk caching
# Optimize rate limiting settings
```

### Debug Mode

Enable detailed logging:

```bash
# Set in Render environment variables
DEBUG=*
LOG_LEVEL=debug
```

### Support Resources

- [Render Documentation](https://render.com/docs)
- [Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

## Cost Optimization

### Development

- Use **Starter** plan ($7/month)
- Set `NODE_ENV=development`
- Reduce `RATE_LIMIT_MAX` to save resources

### Production

- Use **Standard** plan ($25/month) or higher
- Configure proper `CORS_ORIGINS`
- Set up monitoring and alerts
- Enable persistent disk for data retention

### Multi-Environment Setup

```bash
# Staging environment
CORS_ORIGINS=https://staging.yourapp.com
RATE_LIMIT_MAX=5000

# Production environment
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
RATE_LIMIT_MAX=10000
```

## Next Steps

After successful deployment:

1. **Configure Custom Domain** (optional)
   - Add your domain in Render dashboard
   - Update DNS records
   - SSL certificate auto-generated

2. **Set Up Monitoring**
   - Configure alerts for downtime
   - Set up log aggregation
   - Monitor API usage patterns

3. **Production Hardening**
   - Review CORS origins
   - Implement proper API key management
   - Set up backup strategies

4. **Integration Testing**
   - Test with SDK: `npm install @nodash/sdk`
   - Verify CLI connectivity: `nodash init --url https://your-service-name.onrender.com`
   - Run load tests to validate performance
