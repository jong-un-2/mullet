# Cloudflare Containers - Substreams Indexer

This directory contains the Substreams Indexer implementation using Cloudflare Containers.

## Architecture

```
Worker (Hono)
    ↓
Durable Object (SubstreamsIndexerContainer)
    ↓
Docker Container (Substreams Sink)
    ↓
PostgreSQL (Neon via Hyperdrive)
    ↓
Solana (StreamingFast)
```

## Files

- `index.ts` - Route handlers for indexer management API
- `substreams-indexer.ts` - Container class extending Cloudflare Container
- `README.md` - This file

## Configuration

The container is configured in `wrangler.toml`:

```toml
[[containers]]
class_name = "SubstreamsIndexerContainer"
image = "./container_src/Dockerfile"
max_instances = 5
instance_type = "standard-1"  # 1 vCPU, 2GB memory, 10GB disk
```

## API Endpoints

All endpoints require authentication via `Authorization: Bearer <token>`.

### Start the indexer

```bash
curl -X POST \
  http://localhost:8787/v1/api/indexer/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key"
```

### Stop the indexer

```bash
curl -X POST \
  http://localhost:8787/v1/api/indexer/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key"
```

### Get indexer status

```bash
curl -X GET \
  http://localhost:8787/v1/api/indexer/status \
  -H "Authorization: Bearer test-key"
```

### Health check

```bash
curl -X GET \
  http://localhost:8787/v1/api/indexer/health \
  -H "Authorization: Bearer test-key"
```

### Get Prometheus metrics

```bash
curl -X GET \
  http://localhost:8787/v1/api/indexer/metrics \
  -H "Authorization: Bearer test-key"
```

### Get container logs

```bash
curl -X GET \
  "http://localhost:8787/v1/api/indexer/logs?lines=50" \
  -H "Authorization: Bearer test-key"
```

### Run command in container (debugging)

```bash
curl -X POST \
  http://localhost:8787/v1/api/indexer/command \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-key" \
  -d '{
    "command": "ps aux",
    "cwd": "/app"
  }'
```

## Deployment

1. **Build the container image** (handled by wrangler):
   ```bash
   cd /Users/joung-un/mars-projects/backend/container_src
   docker build -t mars-substreams-indexer:latest .
   ```

2. **Set secrets**:
   ```bash
   wrangler secret put SUBSTREAMS_JWT_TOKEN
   wrangler secret put SUBSTREAMS_ENDPOINT
   ```

3. **Deploy the Worker**:
   ```bash
   wrangler deploy
   ```

4. **Start the indexer**:
   ```bash
   curl -X POST https://your-worker.workers.dev/v1/api/indexer/start \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## Local Development

```bash
# Start local development
wrangler dev

# The container will not run in local dev by default
# To enable containers in local dev:
wrangler dev --remote
```

## Container Instance Types

- `lite`: 0.0625 vCPU, 128MB memory, 1GB disk
- `basic`: 0.125 vCPU, 256MB memory, 2GB disk
- `standard-1`: 1 vCPU, 2GB memory, 10GB disk (current)
- `standard-2`: 2 vCPU, 4GB memory, 10GB disk
- `standard-3`: 4 vCPU, 8GB memory, 10GB disk
- `standard-4`: 8 vCPU, 16GB memory, 10GB disk

## Monitoring

- **Metrics endpoint**: `/v1/api/indexer/metrics` (Prometheus format)
- **Status endpoint**: `/v1/api/indexer/status` (JSON)
- **Health check**: `/v1/api/indexer/health`

## References

- [Cloudflare Containers Docs](https://developers.cloudflare.com/containers/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/#containers)
- [Container Examples](https://developers.cloudflare.com/containers/examples/)