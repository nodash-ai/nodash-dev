# Fly.io Deployment Guide

## Prerequisites

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Sign up/login to Fly.io: `flyctl auth login`

## Initial Deployment

```bash
# 1. Initialize the app (only once)
flyctl launch

# 2. Create persistent volume for data
flyctl volumes create nodash_data --size 1 --region iad

# 3. Set secrets (replace with your actual keys)
flyctl secrets set JWT_SECRET=your-super-secret-jwt-key

# 4. Deploy
flyctl deploy
```

## Environment Variables

Configure via `fly.toml` or set as secrets:

```bash
# Optional: Set API keys as secrets for security
flyctl secrets set DEMO_API_KEY_TENANT1=your-tenant1-api-key
flyctl secrets set DEMO_API_KEY_TENANT2=your-tenant2-api-key
```

## Scaling

```bash
# Scale up for production
flyctl scale count 2
flyctl scale memory 512

# Scale down for development
flyctl scale count 1
flyctl scale memory 256
```

## Monitoring

```bash
# View logs
flyctl logs

# Check app status
flyctl status

# SSH into the container
flyctl ssh console
```

## Health Checks

The app includes automatic health checks:
- **Endpoint**: `GET /v1/health`
- **Interval**: Every 10 seconds
- **Timeout**: 2 seconds

## Data Persistence

- **Volume**: Persistent data stored in `/app/data/`
- **Size**: 1GB (expandable)
- **Backup**: Use `flyctl volumes list` to manage

## API Usage

After deployment, your API will be available at:
```
https://nodash-backend.fly.dev/v1/health
https://nodash-backend.fly.dev/v1/track
https://nodash-backend.fly.dev/v1/identify
```

## Configuration

The app uses flat file storage by default, perfect for small to medium workloads. For higher scale, modify `fly.toml` to use database URLs for Phase 1 storage backends.