# Mars Vaults Substreams - Cloudflare Container 部署指南

## 📦 概述

这个配置将 Mars Vaults Substreams 索引器部署为 Cloudflare Container，实现：

- ✅ **自动扩展**: Cloudflare 自动管理容器实例
- ✅ **全球分布**: 边缘计算，低延迟
- ✅ **持久化**: 数据写入 Neon PostgreSQL (通过 Hyperdrive)
- ✅ **可管理**: 通过 API 控制启动/停止/状态

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Worker API    │────────▶│ Durable Object   │           │
│  │  (Hono)        │         │ SubstreamsIndexer│           │
│  └────────────────┘         └─────────┬────────┘           │
│                                        │                     │
│                            ┌───────────▼──────────┐         │
│                            │  Container Instance   │         │
│                            │  (Rust + Sink)       │         │
│                            └───────────┬──────────┘         │
└────────────────────────────────────────┼──────────────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │   Neon PostgreSQL             │
                         │   (via Hyperdrive)            │
                         └───────────────────────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │   Solana Mainnet              │
                         │   (StreamingFast)             │
                         └───────────────────────────────┘
```

## 🚀 部署步骤

### 1. 构建并推送 Docker 镜像

```bash
cd /Users/joung-un/mars-projects/backend

# 构建镜像
docker build -t mars-substreams-indexer:latest .

# 测试镜像（可选）
docker run --env-file container_src/.env.substreams \
  mars-substreams-indexer:latest
```

### 2. 配置 Cloudflare Secrets

```bash
# 设置 Substreams JWT Token
wrangler secret put SUBSTREAMS_JWT_TOKEN
# 输入你的 StreamingFast JWT token

# 设置 Substreams Endpoint（可选，有默认值）
wrangler secret put SUBSTREAMS_ENDPOINT
# 输入: mainnet.sol.streamingfast.io:443
```

### 3. 部署到 Cloudflare

```bash
# 部署 Worker 和 Container
wrangler deploy

# 查看部署状态
wrangler tail
```

### 4. 启动索引器

部署完成后，通过 API 启动索引器：

```bash
# 启动索引器
curl -X POST https://YOUR-WORKER.workers.dev/api/indexer/start

# 检查状态
curl https://YOUR-WORKER.workers.dev/api/indexer/status

# 查看健康状态
curl https://YOUR-WORKER.workers.dev/api/indexer/health
```

## 📡 API 端点

### POST /api/indexer/start
启动 Substreams 索引器

**响应示例:**
```json
{
  "success": true,
  "message": "Indexer started successfully",
  "status": {
    "running": true,
    "startedAt": 1704153600000,
    "lastBlock": 370500100,
    "totalBlocks": 100
  }
}
```

### POST /api/indexer/stop
停止 Substreams 索引器

**响应示例:**
```json
{
  "success": true,
  "message": "Indexer stopped successfully"
}
```

### GET /api/indexer/status
获取索引器状态

**响应示例:**
```json
{
  "running": true,
  "startedAt": 1704153600000,
  "lastBlock": 370500500,
  "totalBlocks": 500,
  "uptime": 3600000,
  "uptimeFormatted": "1h 0m",
  "errors": []
}
```

### GET /api/indexer/health
健康检查

**响应示例:**
```json
{
  "healthy": true,
  "status": {
    "running": true,
    "uptime": 3600000
  }
}
```

### GET /api/indexer/metrics
Prometheus 格式的指标

**响应示例:**
```
# HELP substreams_indexer_running Whether the indexer is running
# TYPE substreams_indexer_running gauge
substreams_indexer_running 1

# HELP substreams_indexer_uptime_seconds Indexer uptime in seconds
# TYPE substreams_indexer_uptime_seconds gauge
substreams_indexer_uptime_seconds 3600

# HELP substreams_indexer_last_block Last indexed block number
# TYPE substreams_indexer_last_block gauge
substreams_indexer_last_block 370500500
```

## 🔧 配置选项

### Container 配置 (wrangler.toml)

```toml
[[containers]]
class_name = "SubstreamsIndexer"
image = "./Dockerfile"
instances = 1  # 容器实例数量

[containers.config]
memory_mb = 512      # 内存限制
cpu_limit = 1.0      # CPU 限制

[containers.env]
RUST_LOG = "info"            # 日志级别
START_BLOCK = "370500000"    # 起始区块
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SUBSTREAMS_ENDPOINT` | StreamingFast 端点 | `mainnet.sol.streamingfast.io:443` |
| `SUBSTREAMS_JWT_TOKEN` | 认证 Token | (必需) |
| `DATABASE_URL` | PostgreSQL 连接串 | (自动从 Hyperdrive) |
| `START_BLOCK` | 起始区块号 | `370500000` |
| `RUST_LOG` | 日志级别 | `info` |

## 📊 监控和日志

### 查看实时日志

```bash
# 查看 Worker 日志
wrangler tail

# 过滤错误日志
wrangler tail --status error

# 查看特定请求
wrangler tail --search "indexer"
```

### Grafana 监控

1. 配置 Prometheus 数据源
2. 添加指标端点: `https://YOUR-WORKER.workers.dev/api/indexer/metrics`
3. 导入 dashboard

### 关键指标

- `substreams_indexer_running` - 运行状态
- `substreams_indexer_uptime_seconds` - 运行时间
- `substreams_indexer_last_block` - 最新区块
- `substreams_indexer_total_blocks` - 总处理区块数
- `substreams_indexer_errors_total` - 错误数量

## 🛠️ 故障排查

### 容器无法启动

```bash
# 检查构建日志
wrangler deploy --dry-run

# 本地测试 Docker 镜像
docker run -it --rm mars-substreams-indexer:latest /bin/bash
```

### 数据库连接失败

```bash
# 测试 Hyperdrive 连接
wrangler hyperdrive get mars-neon-db

# 检查 PostgreSQL 状态
psql $DATABASE_URL -c "SELECT 1"
```

### 索引器停止

```bash
# 查看错误日志
curl https://YOUR-WORKER.workers.dev/api/indexer/status

# 重启索引器
curl -X POST https://YOUR-WORKER.workers.dev/api/indexer/stop
curl -X POST https://YOUR-WORKER.workers.dev/api/indexer/start
```

## 💰 成本估算

### Cloudflare Workers

- **免费额度**: 100,000 请求/天
- **付费计划**: $5/月 + $0.50/百万请求

### Cloudflare Containers (Beta)

- 当前处于 Beta 阶段，定价尚未公布
- 预计与 Workers 类似的定价模型

### Neon PostgreSQL

- **免费额度**: 512 MB 存储
- **Pro 计划**: $19/月起

### StreamingFast

- **免费额度**: 2 并发 + 5 并行作业
- **付费计划**: 根据使用量

### 总计估算

- 开发环境: **$0/月** (免费额度)
- 生产环境: **$25-50/月** (小规模)

## 📝 更新和维护

### 更新 Substreams 包

```bash
cd /Users/joung-un/mars-projects/backend/container_src

# 重新构建 WASM
cargo build --target wasm32-unknown-unknown --release

# 重新打包
substreams pack substreams-graph.yaml

# 复制新包
cp mars-vaults-substreams-graph-v1.0.0.spkg ../

# 重新构建 Docker 镜像
docker build -t mars-substreams-indexer:latest ..

# 重新部署
cd ..
wrangler deploy
```

### 数据库迁移

```bash
# 创建备份
pg_dump $DATABASE_URL > backup.sql

# 运行迁移
psql $DATABASE_URL < migration.sql

# 验证
psql $DATABASE_URL -c "SELECT COUNT(*) FROM vault_deposits"
```

## 🔗 相关资源

- [Cloudflare Containers 文档](https://developers.cloudflare.com/containers/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Substreams 文档](https://substreams.streamingfast.io/)
- [Neon PostgreSQL](https://neon.tech/)

## 🆘 获取帮助

- Cloudflare Discord: https://discord.gg/cloudflaredev
- StreamingFast Discord: https://discord.gg/jZwqxJAvRs
- GitHub Issues: https://github.com/YOUR-ORG/mars-projects/issues
