# Mars V8 Substreams<a href="https://www.streamingfast.io/">

	<img width="100%" src="https://github.com/streamingfast/substreams/blob/develop/docs/assets/substreams-banner.png" alt="StreamingFast Substreams Banner" />

🚀 **实时索引 Mars V8 Solana Vault 事件到 PostgreSQL**</a>



[![Status](https://img.shields.io/badge/status-production--ready-green)]() [![WASM](https://img.shields.io/badge/WASM-196KB-blue)]() [![Tests](https://img.shields.io/badge/tests-passing-success)]()# Substreams



## ✨ 功能特性Substreams is a powerful blockchain indexing technology, developed for The Graph Network.



- ⚡ **实时索引** - 捕获所有 Mars Vault 事件（存款、取款、Swap、再平衡）Substreams enables developers to write Rust modules, composing data streams alongside the community, and provides extremely high performance indexing by virtue of parallelization, in a streaming-first fashion.

- 🔗 **Kamino 集成** - 支持 Kamino Finance V2（Vault、Staking）

- 💱 **Jupiter 集成** - 跟踪 Jupiter Aggregator SwapSubstreams has all the benefits of StreamingFast Firehose, like low-cost caching and archiving of blockchain data, high throughput processing, and cursor-based reorgs handling.

- 💾 **PostgreSQL Sink** - 直接写入 Neon Database + Hyperdrive 缓存

- 📊 **生产就绪** - 所有测试通过，可立即部署## Documentation



## 🏗️ 架构Full documentation for installing, running and working with Substreams is available at: https://substreams.streamingfast.io.



```## Contributing

Solana Mainnet (370M+ blocks)

        ↓**Please first refer to the general

StreamingFast Firehose[StreamingFast contribution guide](https://github.com/streamingfast/streamingfast/blob/master/CONTRIBUTING.md)**,

        ↓if you wish to contribute to this code base.

Substreams WASM (196KB)

        ↓

PostgreSQL Sink## License

        ↓

Neon PostgreSQL (via Hyperdrive)[Apache 2.0](LICENSE)

        ↓
Cloudflare Worker API
        ↓
Frontend
```

## 📊 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 合约平台 | Solana | Mainnet |
| Substreams | StreamingFast | 1.16.6 |
| 数据库 | Neon PostgreSQL | Latest |
| 缓存 | Cloudflare Hyperdrive | Latest |
| 语言 | Rust | 1.75+ |
| WASM 大小 | 优化构建 | 196KB |

## 🚀 快速开始

### 前置要求

```bash
# 1. Rust 工具链
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Substreams CLI (已安装 v1.16.6)
substreams --version

# 3. Protocol Buffers (已安装 v25.1)
protoc --version
```

### 一键部署

```bash
# 1. 进入目录
cd /Users/joung-un/mars-projects/substreams

# 2. 环境已配置（.env.substreams 已就绪）

# 3. 运行测试
./test-quick.sh

# 4. 启动部署
./quick-start.sh
```

## 📦 Program IDs

| 项目 | Program ID |
|------|-----------|
| **Mars V8** | `9A2JwsP3yrP4TPAoRa2kqmBWwtfKfT73syPqSaSCLPXJ` |
| **Kamino V2** | `KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd` |
| **Jupiter** | `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` |

## 🗄️ 数据库 Schema

### 核心表结构

```sql
-- 1. Vault 存款记录
CREATE TABLE mars_vault_deposits (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  user_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  shares BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL
);

-- 2. Vault 取款记录
CREATE TABLE mars_vault_withdrawals (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  user_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  shares BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL
);

-- 3. Swap 交易记录
CREATE TABLE mars_vault_swaps (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount_in BIGINT NOT NULL,
  amount_out BIGINT NOT NULL,
  slot BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL
);

-- 4. 再平衡事件
CREATE TABLE mars_vault_rebalances (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  strategy TEXT NOT NULL,
  slot BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  signature TEXT NOT NULL
);

-- 5. Vault 状态快照
CREATE TABLE mars_vault_states (
  vault_address TEXT PRIMARY KEY,
  total_shares BIGINT NOT NULL,
  total_assets BIGINT NOT NULL,
  last_update_slot BIGINT NOT NULL,
  last_update_time TIMESTAMPTZ NOT NULL
);

-- 6. 用户持仓
CREATE TABLE mars_user_positions (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  user_address TEXT NOT NULL,
  shares BIGINT NOT NULL,
  last_update_slot BIGINT NOT NULL,
  last_update_time TIMESTAMPTZ NOT NULL,
  UNIQUE(vault_address, user_address)
);
```

## 🧪 测试验证

```bash
# 快速测试（2分钟）
./test-quick.sh

# 测试结果：
✓ WASM 编译成功 (196K)
✓ map_blocks 模块正常
✓ map_vault_events 模块正常
✓ db_out 模块正常
```

## 🚀 部署方式

### 方式 1: 直接运行 (推荐测试)

```bash
# 下载 substreams-sink-postgres
curl -L https://github.com/streamingfast/substreams-sink-postgres/releases/latest/download/substreams-sink-postgres_darwin_arm64.tar.gz | tar -xzf -
chmod +x substreams-sink-postgres
sudo mv substreams-sink-postgres /usr/local/bin/

# 加载环境变量
source .env.substreams

# 运行 Sink
substreams-sink-postgres run \
  "$SUBSTREAMS_SINK_POSTGRES_DSN" \
  mainnet.sol.streamingfast.io:443 \
  substreams.yaml \
  db_out \
  --api-token "$SUBSTREAMS_JWT_TOKEN" \
  --start-block 370000000 \
  --final-blocks-only=false \
  --flush-interval=1s
```

### 方式 2: Docker 部署 (推荐生产)

```bash
# 使用部署脚本
./deploy-production.sh docker

# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 方式 3: Systemd 服务 (长期运行)

```bash
./deploy-production.sh systemd

# 管理服务
sudo systemctl start mars-substreams-sink
sudo systemctl status mars-substreams-sink
sudo journalctl -u mars-substreams-sink -f
```

## 📊 监控查询

```sql
-- 查看最新同步区块
SELECT MAX(slot) as latest_block FROM mars_vault_deposits;

-- 统计每小时事件数
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as events
FROM mars_vault_deposits
GROUP BY hour
ORDER BY hour DESC
LIMIT 24;

-- 查看 Vault TVL
SELECT 
  vault_address,
  total_assets,
  total_shares,
  last_update_time
FROM mars_vault_states
ORDER BY total_assets DESC;

-- 用户持仓排行
SELECT 
  user_address,
  COUNT(DISTINCT vault_address) as vaults_count,
  SUM(shares) as total_shares
FROM mars_user_positions
GROUP BY user_address
ORDER BY total_shares DESC
LIMIT 10;
```

## ⚙️ 配置信息

### 环境变量 (.env.substreams)

```bash
# StreamingFast JWT Token
SUBSTREAMS_JWT_TOKEN=eyJhbGc...

# Substreams Endpoint
SUBSTREAMS_ENDPOINT=mainnet.sol.streamingfast.io:443

# PostgreSQL DSN (Neon + Hyperdrive)
SUBSTREAMS_SINK_POSTGRES_DSN=postgres://mars_owner:***@ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech/mars?sslmode=require

# 起始区块 (Mars V8 部署)
SUBSTREAMS_START_BLOCK=370000000

# 性能调优
SUBSTREAMS_FLUSH_INTERVAL=1s
SUBSTREAMS_BATCH_SIZE=100
SUBSTREAMS_FINAL_BLOCKS_ONLY=false
```

### FREE Tier 限制

- **并发请求**: 2
- **并行任务**: 5
- **并行 Worker**: 5
- **Token 有效期**: 2025-11-01
- **预计同步速度**: 1000-2000 blocks/s

## 🔧 故障排除

### 认证错误

```bash
# 检查 Token
echo $SUBSTREAMS_JWT_TOKEN

# 重新加载环境
source .env.substreams
```

### 连接超时

```bash
# 设置代理
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890

# 测试连接
curl -v https://mainnet.sol.streamingfast.io
```

### 数据库连接失败

```bash
# 测试 PostgreSQL
psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "SELECT 1;"

# 检查表
psql "$SUBSTREAMS_SINK_POSTGRES_DSN" -c "\dt mars_*"
```

## 📁 项目结构

```
substreams/
├── README.md                          # 本文档
├── substreams.yaml              # 生产配置（已测试）
├── proto/vault_events.proto           # Protobuf 定义
├── src/lib.rs                         # Rust 实现（734 行）
├── Cargo.toml                         # Rust 依赖
├── build.sh                           # 构建脚本
├── test-quick.sh                      # 快速测试
├── quick-start.sh                     # 一键部署
├── deploy-production.sh               # 生产部署（支持 4 种方式）
└── .env.substreams                    # 环境配置（已就绪）
```

## 🎯 性能指标

| 指标 | 值 | 说明 |
|------|---|------|
| WASM 大小 | 196KB | 高度优化 |
| 起始区块 | 370,000,000 | Mars V8 部署 |
| 支持指令 | 11 个 | 完整覆盖 |
| 数据库表 | 6 张 | 核心业务 |
| 测试模块 | 4 个 | 全部通过 |
| 同步延迟 | <1s | 实时模式 |
| 历史同步 | 1000-2000 blocks/s | FREE Tier |

## 📚 相关资源

- [StreamingFast 文档](https://substreams.streamingfast.io/)
- [Substreams 教程](https://docs.substreams.dev/)
- [Mars Protocol](https://github.com/jong-un-1/mars)
- [Neon Database](https://neon.tech/)
- [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/)

## 🔒 安全注意事项

1. **API Key 保护**
   - ✅ `.env.substreams` 已添加到 `.gitignore`
   - ✅ 使用环境变量管理敏感信息
   - ⚠️ Token 将在 2025-11-01 过期，需提前续期

2. **数据库安全**
   - ✅ 使用 SSL 连接 (`sslmode=require`)
   - ✅ Hyperdrive 连接池优化
   - ⚠️ 定期备份数据库

3. **监控和告警**
   - 监控同步状态
   - 跟踪错误率
   - 检查 Token 使用量

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**状态**: 🟢 生产就绪  
**最后测试**: 2025-10-02  
**版本**: v1.0.0  
**下一步**: 选择部署方式并启动同步

```bash
# 快速部署命令
./quick-start.sh
```
