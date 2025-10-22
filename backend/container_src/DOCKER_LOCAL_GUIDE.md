# Mars Substreams Indexer - Docker 本地运行指南

## 📋 概述

这个指南将帮助你在本地使用 Docker 运行 Mars Substreams Indexer，用于索引 Solana 区块链上的 Mars Vault 事件。

## 🔧 前置要求

- **Docker Desktop** (macOS/Windows) 或 **Docker Engine** (Linux)
- **8GB+ RAM** 可用内存
- **稳定的网络连接** (用于连接 StreamingFast 和 Neon PostgreSQL)

## 🚀 快速开始

### 1. 构建 Docker 镜像

```bash
cd /Users/joung-un/mars-projects/backend

# 使用 container_src 作为构建上下文
docker build -t mars-substreams-indexer:local -f Dockerfile ./container_src
```

**构建时间**: 约 1-2 分钟（首次构建可能需要更长时间）

### 2. 运行容器

```bash
docker run -d \
  --name mars-substreams-indexer \
  -p 9102:9102 \
  --restart unless-stopped \
  registry.cloudflare.com/mars-substreams-indexer:e4093f77
```

**参数说明**:
- `-d`: 后台运行（detached mode）
- `--name`: 容器名称
- `-p 9102:9102`: 端口映射（健康检查端点）
- `--restart unless-stopped`: 自动重启策略

### 3. 验证运行状态

```bash
# 查看容器状态
docker ps | grep mars-substreams

# 查看实时日志
docker logs -f mars-substreams-indexer

# 测试健康检查端点
curl http://localhost:9102
```

**预期输出**:
```json
{
  "status": "healthy",
  "service": "mars-substreams-indexer",
  "timestamp": "2025-10-22T03:28:32+00:00"
}
```

## 📊 日志查看

### 实时日志流

```bash
# 跟踪最新日志
docker logs -f mars-substreams-indexer

# 查看最近 50 行日志
docker logs --tail 50 mars-substreams-indexer

# 查看最近 5 分钟的日志
docker logs --since 5m mars-substreams-indexer
```

### 日志格式示例

```json
{
  "severity": "INFO",
  "timestamp": "2025-10-22T03:28:37Z",
  "logger": "sink-sql",
  "message": "session initialized with remote endpoint",
  "max_parallel_workers": 5,
  "resolved_start_block": 374969838,
  "trace_id": "db3cf628dcb18471801276333189aabb"
}
```

### 关键日志信息

- **区块处理进度**: `last_block: "#374969877"`
- **处理速度**: `data_msg_rate: "2.375 msg/s"`
- **实时状态**: `live: true` (已追上最新区块)
- **数据库连接**: `connecting to db`

## 🔄 容器管理

### 停止容器

```bash
docker stop mars-substreams-indexer
```

### 启动已停止的容器

```bash
docker start mars-substreams-indexer
```

### 重启容器

```bash
docker restart mars-substreams-indexer
```

### 删除容器

```bash
# 停止并删除
docker rm -f mars-substreams-indexer

# 删除镜像
docker rmi registry.cloudflare.com/mars-substreams-indexer:e4093f77
```

## 🐛 调试和故障排查

### 进入容器内部

```bash
docker exec -it mars-substreams-indexer /bin/bash
```

**容器内部目录结构**:
```
/app/
├── .env.substreams          # 环境变量配置
├── start-container.sh       # 启动脚本
├── substreams.yaml          # Substreams 配置
├── schema.sql               # 数据库 schema
├── logs/                    # 日志目录
│   └── substreams-sink.log
└── proto/                   # Protobuf 定义
```

### 查看容器资源使用

```bash
docker stats mars-substreams-indexer
```

**输出示例**:
```
CONTAINER ID   NAME                      CPU %     MEM USAGE / LIMIT     NET I/O
484fe2bb2039   mars-substreams-indexer   15.23%    57.2MiB / 7.76GiB     2.3MB / 850kB
```

### 检查容器配置

```bash
docker inspect mars-substreams-indexer
```

## ⚙️ 环境变量配置

容器内部使用的环境变量（来自 `.env.substreams`）：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `SUBSTREAMS_ENDPOINT` | StreamingFast 端点 | `mainnet.sol.streamingfast.io:443` |
| `SUBSTREAMS_API_TOKEN` | JWT 认证 token | `eyJhbGci...` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host/db` |
| `START_BLOCK` | 起始区块 | `373471279` |
| `OUTPUT_MODULE` | 输出模块名 | `map_vault_events` |
| `RUST_LOG` | 日志级别 | `debug` |

## 📈 性能监控

### 关键性能指标

从日志中可以监控以下指标：

```json
{
  "block_count": 150,
  "Processing Time": "22.43秒",
  "Total Wait Duration": "34.09秒",
  "Total Duration": "56.52秒",
  "average_block_processing": "149.5ms",
  "data_msg_rate": "2.4 msg/s"
}
```

### 优化建议

1. **增加内存**: 如果处理速度慢，考虑增加 Docker 可用内存
2. **网络延迟**: 确保良好的网络连接到 StreamingFast 和 Neon
3. **并发 workers**: 默认 5 个并行 workers（由 FREE tier 限制）

## 🔐 安全注意事项

⚠️ **重要**: `.env.substreams` 包含敏感信息（数据库密码、API token）

- 不要将此文件提交到 Git
- 容器内文件权限设置为 `600`（仅 owner 可读写）
- 定期轮换 API tokens
- 使用只读数据库用户（如果可能）

## 🌐 网络架构

```
┌─────────────────────────────────────────────────┐
│  Docker Container                               │
│  ┌───────────────────────────────────────┐     │
│  │  Mars Substreams Indexer              │     │
│  │  - Port 9102 (Health Check)           │     │
│  │  - substreams-sink-sql (Main Process) │     │
│  └───────────────┬───────────────────────┘     │
└──────────────────┼───────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌─────────┐ ┌────────┐ ┌──────────┐
   │StreamingFast│ │ Neon   │ │localhost:│
   │  Solana  │ │Postgres│ │   9102   │
   │Mainnet   │ │Database│ │  (HTTP)  │
   └─────────┘ └────────┘ └──────────┘
```

## 📝 常见问题 (FAQ)

### Q: 容器启动后立即退出？

**A**: 检查环境变量和数据库连接：

```bash
docker logs mars-substreams-indexer
```

常见原因：
- `DATABASE_URL` 不正确
- `SUBSTREAMS_API_TOKEN` 过期或无效
- 网络无法访问 StreamingFast 或 Neon

### Q: 容器占用太多内存？

**A**: 调整 Docker Desktop 内存限制：

1. Docker Desktop → Settings → Resources
2. 增加 Memory limit
3. 重启 Docker Desktop

### Q: 如何更新到新版本？

**A**: 

```bash
# 停止并删除旧容器
docker stop mars-substreams-indexer
docker rm mars-substreams-indexer

# 拉取新镜像
docker pull registry.cloudflare.com/mars-substreams-indexer:latest

# 重新运行
docker run -d --name mars-substreams-indexer ...
```

### Q: 容器和本地进程可以同时运行吗？

**A**: **不建议**。两个进程会重复处理相同的区块并可能导致数据库冲突。建议只运行其中一个：

```bash
# 停止本地进程
kill <PID>

# 或停止容器
docker stop mars-substreams-indexer
```

### Q: 如何查看处理到哪个区块了？

**A**: 

```bash
# 实时日志中查找 "last_block"
docker logs -f mars-substreams-indexer | grep last_block

# 或查询数据库
psql $DATABASE_URL -c "SELECT MAX(block_number) FROM cursor;"
```

## 🔗 相关资源

- [Cloudflare Containers 文档](https://developers.cloudflare.com/containers/)
- [StreamingFast Substreams](https://substreams.streamingfast.io/)
- [Neon PostgreSQL](https://neon.tech/)
- [Docker 官方文档](https://docs.docker.com/)

## 📞 支持

如果遇到问题：

1. 查看容器日志: `docker logs mars-substreams-indexer`
2. 检查健康状态: `curl http://localhost:9102`
3. 验证数据库连接: `docker exec mars-substreams-indexer psql $DATABASE_URL -c "SELECT 1"`

---

**最后更新**: 2025-10-22  
**版本**: 1.0.0  
**维护者**: Mars Team
