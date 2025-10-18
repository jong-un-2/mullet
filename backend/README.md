# Mars Liquid Backend - Serverless DeFi API

Mars Liquid 后端服务是一个基于 Cloudflare Workers 构建的高性能无服务器 API，为 Mars 跨链 DeFi 协议提供完整的后端支持。集成了 DEX 交易、Mars 协议服务、数据库管理、缓存系统和 Substreams 数据索引。

## 🚀 核心功能

### 🌊 Mars 协议服务
- **收益聚合**: 通过 Kamino Earn 和 Jupiter Lend 集成实现自动化收益优化
- **流动性管理**: 跨协议流动性池管理和再平衡
- **跨链桥接**: LI.FI 协议集成，支持跨链资产转移
- **实时数据**: Vault 状态追踪、用户持仓和历史收益数据
- **GraphQL API**: 完整的 Subgraph 查询接口

### � DEX 交易引擎
- **多链支持**: Solana, BSC, Ethereum, Polygon, 等主流区块链
- **实时价格数据**: WebSocket 和 REST API 价格源
- **流动性池管理**: 集中式和去中心化流动性池
- **交易历史分析**: 完整的用户交易记录和数据分析
- **测试网水龙头**: 开发环境测试代币分发

### 📊 数据基础设施
- **Substreams 索引**: 实时区块链数据处理和索引
- **The Graph 集成**: 去中心化数据查询
- **Durable Objects**: 容器化数据处理器
- **历史数据收集**: 自动化 Vault 历史数据采集
- **增量同步**: 高效的数据更新机制

### 🗄️ 数据库服务
- **双数据库架构**: D1 (SQLite) + PostgreSQL (Neon) 支持
- **用户认证**: API Key 认证系统
- **订阅管理**: 分层权限和使用限额
- **MCP 协议**: Model Context Protocol 数据库代理
- **自动迁移**: Drizzle ORM 数据库迁移

### ⚡ 缓存优化
- **多层缓存**: KV 存储 + 内存缓存
- **智能预热**: 定时任务缓存预加载
- **缓存策略**: STATIC, POOLS, PRICE, USER, ANALYTICS, HEALTH, METADATA
- **缓存管理**: 完整的缓存清除和状态监控 API

## 📁 项目结构

```
backend/
├── src/
│   ├── index.ts                    # 主入口和路由配置
│   ├── dex/                        # DEX 交易核心
│   │   ├── routes.ts              # DEX API 路由
│   │   ├── index.ts               # DEX 服务主逻辑
│   │   ├── handlers/              # 交易处理器
│   │   ├── graphql/               # GraphQL 查询
│   │   ├── types/                 # 类型定义
│   │   └── utils/                 # 工具函数
│   ├── mars/                       # Mars 协议服务
│   │   ├── routes.ts              # Mars API 路由
│   │   ├── index.ts               # Mars 核心逻辑
│   │   ├── cache.ts               # Mars 数据缓存
│   │   └── types.ts               # Mars 类型定义
│   ├── database/                   # 数据库层
│   │   ├── routes.ts              # 数据库 API 路由
│   │   ├── schema.ts              # D1 数据库模式
│   │   ├── postgres-schema.ts     # PostgreSQL 模式
│   │   └── postgres.ts            # PostgreSQL 连接
│   ├── cache/                      # 缓存系统
│   │   ├── routes.ts              # 缓存 API 路由
│   │   ├── config.ts              # 缓存配置
│   │   └── warmer.ts              # 缓存预热
│   ├── containers/                 # Durable Objects 容器
│   │   ├── index.ts               # 容器路由
│   │   └── substreams-indexer.ts  # Substreams 索引器
│   ├── services/                   # 核心服务
│   │   ├── substreamsIndexer.ts   # 数据索引服务
│   │   └── vaultHistoricalCollector.ts  # 历史数据收集
│   ├── mcp/                        # MCP 协议支持
│   │   └── routes.ts              # MCP D1 代理
│   └── middleware/                 # 中间件
│
├── container_src/                  # Substreams 容器源码
│   ├── Cargo.toml                 # Rust 项目配置
│   ├── substreams.yaml            # Substreams 配置
│   ├── proto/                     # Protocol Buffers
│   │   └── vault_events.proto    # Vault 事件定义
│   ├── src/                       # Rust 处理器
│   │   ├── lib.rs                # 主处理逻辑
│   │   └── pb/                   # 生成的 Protobuf 代码
│   └── schema.sql                 # 数据库模式
│
├── scripts/                        # 脚本工具
│   ├── init-database.ts           # D1 数据库初始化
│   ├── init-postgres.ts           # PostgreSQL 初始化
│   ├── migrate-postgres.ts        # PostgreSQL 迁移
│   ├── health-check-postgres.ts   # 数据库健康检查
│   ├── cache-manager.sh           # 缓存管理脚本
│   └── clear-cache.ts             # 缓存清除
│
├── test/                           # 测试套件
│   ├── index.spec.ts              # 主服务测试
│   ├── dex.spec.ts                # DEX 功能测试
│   ├── database.spec.ts           # 数据库测试
│   ├── integration.spec.ts        # 集成测试
│   ├── performance.spec.ts        # 性能测试
│   └── security.spec.ts           # 安全测试
│
├── drizzle/                        # 数据库迁移
│   ├── d1/                        # D1 迁移文件
│   └── postgres/                  # PostgreSQL 迁移文件
│
├── docs/                           # 文档
│   ├── mars-dex-api.md           # DEX API 文档
│   ├── api-reference.md          # API 参考
│   ├── implementation-guide.md   # 实现指南
│   └── jupiter-kamino-integration.md  # 集成文档
│
├── wrangler.toml                   # Cloudflare Workers 配置
├── drizzle.config.d1.ts           # D1 ORM 配置
├── drizzle.config.postgres.ts     # PostgreSQL ORM 配置
├── vitest.config.ts               # 测试框架配置
├── tsconfig.json                  # TypeScript 配置
├── Dockerfile                     # Docker 容器配置
├── DATABASE_SETUP.md              # 数据库设置指南
├── SETUP_GUIDE.md                 # 安装指南
└── CACHE_ARCHITECTURE.md          # 缓存架构文档
```

## 🛠️ 快速开始

### 环境要求
- **Node.js 20+** 和 npm
- **Cloudflare Workers 账户**
- **Git** 版本控制
- **Rust 1.70+** (用于 Substreams 容器开发)

### 1. 项目初始化

```bash
git clone https://github.com/jong-un-1/mars-liquid.git
cd mars-liquid/backend
npm install
```

### 2. 环境配置

```bash
# 查看配置文件
cat wrangler.toml

# 主要配置项：
# - Cloudflare Account ID
# - D1 数据库连接
# - PostgreSQL (Neon) 数据库 URL
# - Substreams 端点和 JWT Token
# - Solana RPC URL
# - GraphQL Subgraph URL
```

### 3. 数据库设置

```bash
# 生成 D1 数据库迁移
npm run generate:d1

# 生成 PostgreSQL 数据库迁移
npm run generate:postgres

# 应用 D1 数据库迁移
npm run migrate:d1:local        # 本地开发环境
npm run migrate:d1:prod         # 生产环境

# 应用 PostgreSQL 数据库迁移
npm run migrate:postgres

# 初始化数据库数据
npm run db:init                 # D1 初始化
npm run db:init:postgres        # PostgreSQL 初始化

# 数据库健康检查
npm run db:health:postgres

# 打开数据库管理界面
npm run studio:d1              # D1 Studio
npm run studio:d1:local        # 本地 D1 Studio
npm run studio:postgres        # PostgreSQL Studio
```

### 4. 启动开发服务器

```bash
# 启动本地开发服务器（带热重载）
npm run dev
# 服务运行在 http://localhost:8787
```

### 5. 设置 Substreams 容器（可选）

```bash
cd container_src

# 构建 Substreams 模块
./build.sh

# 部署到生产环境
./deploy-production.sh

# 查看容器文档
cat CONTAINER_DEPLOYMENT.md
```

```bash
# Start local development server
npm run dev
# Service runs at http://localhost:8787 by default
```

## 🚀 开发与部署

### 常用命令

```bash
# 开发服务器
npm run dev                  # 启动开发服务器（带热重载）
npm start                    # 同上

# 测试
npm run test                 # 运行所有测试
npm run test:unit           # 单元测试
npm run test:integration    # 集成测试
npm run test:performance    # 性能测试
npm run test:security       # 安全测试
npm run test:coverage       # 生成测试覆盖率报告
npm run test:watch          # 监视模式运行测试

# 数据库管理
npm run studio:d1           # 打开 D1 数据库管理界面
npm run studio:postgres     # 打开 PostgreSQL 管理界面
npm run db:backup           # 备份数据库
npm run db:health:postgres  # PostgreSQL 健康检查

# 缓存管理
npm run cache:status        # 查看缓存状态
npm run cache:clear         # 清除所有缓存
./scripts/cache-manager.sh  # 缓存管理脚本

# 部署
npm run deploy              # 部署到 Cloudflare Workers
npm run development         # 部署到开发环境
npm run migrate:d1:prod    # 生产环境数据库迁移
npm run migrate:postgres    # PostgreSQL 迁移

# 类型生成
npm run cf-typegen          # 生成 Cloudflare Workers 类型定义
```

### 定时任务 (Cron Jobs)

项目配置了多个定时任务，在 `wrangler.toml` 中定义：

```toml
[triggers]
crons = [
  "*/1 * * * *",    # 每 1 分钟 - 缓存预热 & 容器心跳检测
  "0 */2 * * *",    # 每 2 小时 - Vault 历史数据收集
  "0 2 * * 7"       # 每周日凌晨 2 点 - 每周清理
]
```

定时任务触发的处理逻辑在 `src/index.ts` 的 `scheduled()` 函数中。

## 📡 API 端点概览

### 核心服务

#### 健康检查
- `GET /` — 根端点，服务信息
- `GET /health` — 服务健康状态

### Mars 协议服务 (`/mars` 或 `/v1/api/mars`)

#### Vault 管理
- `GET /api/mars/vaults` — 获取所有 Vault 列表
- `GET /api/mars/vault/:address` — 获取特定 Vault 详情
- `GET /api/mars/vault/:address/state` — 获取 Vault 状态
- `GET /api/mars/vault/:address/historical` — 获取历史数据

#### 用户持仓
- `GET /api/mars/user/:address/positions` — 获取用户持仓
- `GET /api/mars/user/:address/balance` — 获取用户余额
- `GET /api/mars/user/:address/transactions` — 获取交易历史

#### 跨链桥接 (LI.FI)
- `POST /api/mars/lifi/quote` — 获取跨链桥接报价
- `POST /api/mars/lifi/deposit` — 执行跨链存款
- `POST /api/mars/lifi/withdraw` — 执行跨链提款
- `GET /api/mars/lifi/chains` — 获取支持的链列表

### DEX 交易服务 (`/dex`)

#### 基础信息
- `GET /api/dex/health` — DEX 服务健康检查
- `GET /api/dex/tokens` — 支持的代币列表
- `GET /api/dex/pairs` — 交易对信息
- `GET /api/dex/networks` — 支持的区块链网络

#### 价格与市场数据
- `GET /api/dex/price/:tokenA/:tokenB` — 获取代币价格
- `GET /api/dex/stats` — DEX 统计数据
- `GET /api/dex/volume` — 交易量数据

#### 交易功能
- `POST /api/dex/swap` — 执行代币交换
- `GET /api/dex/swaps/:user?` — 查询交换历史
- `POST /api/dex/liquidity` — 添加流动性
- `GET /api/dex/liquidity/:user?` — 查询流动性记录

#### 测试网功能
- `GET /api/dex/faucet/:wallet` — 测试网代币水龙头

### 数据库服务 (`/mcp`)

#### MCP D1 代理
- `ALL /mcp/*` — Model Context Protocol 数据库代理
- 支持 Durable Objects 持久化

### 缓存服务 (`/cache`)

#### 缓存管理
- `GET /cache/status` — 缓存状态查询
- `POST /cache/clear-all` — 清除所有缓存
- `POST /cache/warm` — 手动触发缓存预热
- `GET /cache/stats` — 缓存统计信息

### Substreams 索引服务 (`/indexer`)

#### 容器管理
- `GET /indexer/health` — 索引器健康状态
- `POST /indexer/sync` — 触发数据同步
- `GET /indexer/stats` — 索引统计信息

#### 同步状态
- `GET /api/sync/status` — 获取同步状态
- `POST /api/sync/trigger` — 触发增量同步

> 📋 **完整 API 文档**: 查看 [docs/mars-dex-api.md](./docs/mars-dex-api.md) 获取详细的 API 使用说明

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker                           │
│                   (Hono Framework)                           │
├──────────────────────────────────────────────────────────────┤
│  ├── Mars Protocol Routes (/mars)                           │
│  │   ├── Vault Management                                   │
│  │   ├── User Positions                                     │
│  │   └── LI.FI Cross-chain Bridge                          │
│  ├── DEX Routes (/dex)                                      │
│  │   ├── Token Swap Engine                                 │
│  │   ├── Liquidity Management                              │
│  │   └── GraphQL Queries                                   │
│  ├── Database Routes (/mcp)                                │
│  │   └── MCP D1 Agent (Durable Object)                    │
│  ├── Cache Routes (/cache)                                 │
│  │   ├── Multi-layer Caching                              │
│  │   └── Cache Warming                                     │
│  └── Indexer Routes (/indexer)                            │
│      └── Substreams Container (Durable Object)            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare 服务生态系统                          │
├──────────────────────────────────────────────────────────────┤
│  ├── D1 Database (SQLite - 关系型数据库)                    │
│  ├── PostgreSQL (Neon - 通过 Hyperdrive 连接)               │
│  ├── KV Namespace (键值对存储 - 缓存层)                     │
│  ├── R2 Bucket (对象存储 - 文件存储)                        │
│  └── Durable Objects (状态容器 - MCP & Substreams)         │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                 外部服务与区块链网络                          │
├──────────────────────────────────────────────────────────────┤
│  ├── The Graph Network (GraphQL Subgraph)                   │
│  ├── Substreams Endpoint (StreamingFast)                    │
│  ├── Solana RPC (Mainnet/Devnet)                           │
│  ├── EVM Networks (BSC, Ethereum, Polygon, etc.)           │
│  ├── LI.FI Protocol (跨链桥接)                              │
│  ├── Jupiter Lend API (收益优化)                            │
│  └── Kamino Earn API (流动性挖矿)                           │
└──────────────────────────────────────────────────────────────┘
```

### 技术栈
- **运行时**: Cloudflare Workers (V8 引擎)
- **Web 框架**: Hono.js (轻量级高性能)
- **数据库**: 
  - Drizzle ORM + Cloudflare D1 (SQLite)
  - Drizzle ORM + Neon PostgreSQL (Hyperdrive)
- **缓存**: Cloudflare KV Namespace
- **存储**: Cloudflare R2
- **状态管理**: Durable Objects
- **数据索引**: Substreams + The Graph
- **测试**: Vitest
- **类型安全**: TypeScript + Zod

### 架构特点
- **边缘计算**: 全球 300+ 数据中心，低延迟响应
- **无服务器**: 自动扩展，按需付费
- **双数据库**: D1 (快速读取) + PostgreSQL (复杂查询)
- **多层缓存**: KV + 内存缓存，智能失效策略
- **实时同步**: Substreams 实时区块链数据处理
- **容器化**: Durable Objects 提供有状态服务

## 🛡️ 安全性

- **API Key 认证**: 所有 API 请求需要 `x-api-key` 或 `Authorization` 头
- **分层权限**: 支持不同订阅级别的权限控制
- **速率限制**: 防止 API 滥用和 DDoS 攻击
- **输入验证**: 严格的 Zod Schema 验证
- **SQL 注入防护**: Drizzle ORM 类型安全查询
- **CORS 配置**: 跨域资源共享控制
- **HTTPS 强制**: 所有连接强制使用 HTTPS
- **环境隔离**: 开发/生产环境完全隔离
- **Cloudflare 防护**: WAF、DDoS 防护、Bot 管理

## 📊 数据流处理

### Substreams 实时数据索引

项目使用 Substreams 技术实时处理区块链数据：

1. **Substreams 模块** (`container_src/`): Rust 编写的数据处理器
2. **Durable Object 容器**: 运行 Substreams 客户端的持久化容器
3. **增量同步**: 定时任务触发数据同步，避免重复处理
4. **事件存储**: 处理后的数据存储到 PostgreSQL
5. **GraphQL 查询**: 通过 The Graph 提供查询接口

### 缓存架构

多层缓存策略确保最佳性能：

- **STATIC**: 静态配置数据 (24小时)
- **POOLS**: 流动性池数据 (5分钟)
- **PRICE**: 价格数据 (1分钟)
- **USER**: 用户数据 (10分钟)
- **ANALYTICS**: 分析数据 (30分钟)
- **HEALTH**: 健康检查 (2分钟)
- **METADATA**: 元数据 (1小时)

详细缓存架构请参考 [CACHE_ARCHITECTURE.md](./CACHE_ARCHITECTURE.md)

## 🔧 配置说明

### 环境变量 (wrangler.toml)

```toml
[vars]
# 基础配置
NODE_ENV = "production"

# GraphQL 配置
SUBGRAPH_URL = "your-subgraph-url"

# Substreams 配置
SUBSTREAMS_ENDPOINT = "https://mainnet.sol.streamingfast.io:443"

# Solana 配置
SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"
SOLANA_CLUSTER = "mainnet-beta"

# PostgreSQL 配置
NEON_DATABASE_URL = "postgres://..."
```

### Secrets (需要通过 wrangler secret 设置)

```bash
# 设置 API Key
wrangler secret put KEY

# 设置 Subgraph 认证 Token
wrangler secret put SUBGRAPH_AUTH_TOKEN

# 设置 Substreams JWT Token
wrangler secret put SUBSTREAMS_JWT_TOKEN
```

## 📚 相关文档

### 核心文档
- 📖 [设置指南](./SETUP_GUIDE.md) - 详细的安装和配置步骤
- 📖 [数据库设置](./DATABASE_SETUP.md) - 数据库初始化和迁移
- 📖 [缓存架构](./CACHE_ARCHITECTURE.md) - 缓存系统设计和使用

### API 文档
- 📖 [Mars DEX API](./docs/mars-dex-api.md) - DEX 交易 API 完整文档
- 📖 [API 参考](./docs/api-reference.md) - 所有 API 端点参考
- 📖 [实现指南](./docs/implementation-guide.md) - 集成实现指南
- 📖 [Jupiter & Kamino 集成](./docs/jupiter-kamino-integration.md) - 协议集成说明

### 开发文档
- 📖 [测试文档](./test/README.md) - 测试套件说明
- 📖 [容器部署](./container_src/CONTAINER_DEPLOYMENT.md) - Substreams 容器部署
- 📖 [容器 README](./container_src/README.md) - Substreams 开发指南

### 数据库文档
- 📖 [缓存 README](./src/cache/README.md) - 缓存系统详解
- 📖 [数据库 README](./src/database/README.md) - 数据库架构说明
- 📖 [Mars README](./src/mars/README.md) - Mars 协议服务
- 📖 [容器 README](./src/containers/README.md) - Durable Objects 说明

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定测试套件
npm run test:unit           # 单元测试
npm run test:integration    # 集成测试
npm run test:performance    # 性能测试
npm run test:security       # 安全测试

# 监视模式
npm run test:watch          # 自动重新运行测试

# 生成覆盖率报告
npm run test:coverage       # 生成覆盖率报告
npm run coverage:open       # 在浏览器中查看覆盖率
```

### 测试覆盖范围

- ✅ **单元测试**: 核心功能和工具函数
- ✅ **集成测试**: API 端点和数据流
- ✅ **性能测试**: 响应时间和吞吐量
- ✅ **安全测试**: 认证、授权和输入验证

详细测试文档请查看 [test/README.md](./test/README.md)

## 🚀 部署

### 部署到 Cloudflare Workers

```bash
# 部署到生产环境
npm run deploy

# 部署到开发环境
npm run development

# 部署前迁移数据库
npm run migrate:d1:prod      # D1 数据库
npm run migrate:postgres     # PostgreSQL 数据库
```

### 部署检查清单

- [ ] 更新 `wrangler.toml` 配置
- [ ] 设置所有必需的 Secrets
- [ ] 运行数据库迁移
- [ ] 验证环境变量
- [ ] 运行测试套件
- [ ] 检查 Subgraph 部署状态
- [ ] 验证 Substreams 容器运行
- [ ] 测试 API 端点
- [ ] 监控日志和错误

### 生产环境监控

部署后，通过以下方式监控服务：

1. **Cloudflare Dashboard**: 查看请求量、错误率、延迟
2. **Workers Logs**: 实时日志流
3. **API 健康检查**: `GET /health` 和 `GET /api/sync/status`
4. **缓存状态**: `GET /cache/status`
5. **数据库健康**: `npm run db:health:postgres`

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 代码规范

1. **TypeScript 标准**: 遵循 ESLint 和 TypeScript 严格模式
2. **测试要求**: 新功能必须包含测试用例
3. **文档更新**: 重要变更需要更新相关文档
4. **代码审查**: 安全相关的变更需要额外审查

### 提交流程

```bash
# 1. Fork 项目并克隆
git clone https://github.com/your-username/mars-liquid.git
cd mars-liquid/backend

# 2. 创建功能分支
git checkout -b feature/your-feature-name

# 3. 进行修改并测试
npm run test

# 4. 提交更改
git commit -m "feat: add your feature"

# 5. 推送并创建 Pull Request
git push origin feature/your-feature-name
```

## 🔗 相关链接

- **主项目**: [Mars Liquid](https://github.com/jong-un-1/mars-liquid)
- **前端项目**: [../frontend](../frontend)
- **智能合约**: [../contracts-solana](../contracts-solana)
- **管理后台**: [../mars-admin](../mars-admin)
- **生产环境**: [https://api.marsliquidity.com](https://api.marsliquidity.com)

## 📞 支持与反馈

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/jong-un-1/mars-liquid/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- 📧 **邮件联系**: support@mars-liquid.finance

## 📄 许可证

本项目采用 [MIT License](../LICENSE) 开源协议。

---

**开发团队**: Mars Liquid Protocol Team  
**项目版本**: 2.0.0  
**最后更新**: 2025年10月

**Mars Liquid Backend** - 为 DeFi 提供强大的后端支持 🚀
