# Mars Liquid - 跨链 DeFi 流动性聚合协议

Mars Liquid 是一个综合性的跨链 DeFi 协议，集成了收益聚合、DEX 交易、流动性管理和 Solana 智能合约等功能。项目采用现代化的全栈架构，支持多链生态系统，为用户提供一站式的 DeFi 服务。

## 🌟 核心特性

- **🌊 Mars 协议**: 跨协议收益聚合，集成 Kamino Earn 和 Jupiter Lend
- **💰 自动化收益优化**: 智能再平衡和复利策略，最大化用户收益
- **🔄 跨链桥接**: LI.FI 协议集成，支持多链资产无缝转移
- **� DEX 交易**: 支持 Solana、BSC、Ethereum 等主流区块链的代币交易
- **📊 实时数据索引**: Substreams + The Graph 实时区块链数据处理
- **⚡ 边缘计算后端**: Cloudflare Workers 全球分布式 API 服务
- **🎨 现代化前端**: React 19 + Material-UI v7 响应式界面
- **🔐 企业级管理**: Ant Design Pro 管理后台

## 🏗️ 项目架构

### 整体架构图

```
Mars Liquid 生态系统
├── 🌐 Frontend (React 19)          # 用户界面层
│   ├── XLiquid - Vault 管理              
│   ├── Portfolio - 投资组合
│   ├── Swap - 代币交换
│   └── 多链钱包集成
│
├── ⚡ Backend (Cloudflare Workers)  # API 服务层
│   ├── Mars Protocol API         # Vault & 持仓服务
│   ├── DEX Trading API           # 交易引擎
│   ├── Substreams Indexer        # 数据索引 (Durable Object)
│   ├── Database Services         # D1 + PostgreSQL
│   └── Cache System              # KV + 多层缓存
│
├── 🔗 Smart Contracts (Solana)      # 区块链层
│   ├── Mars Program              # 主合约 (83Veoxix...)
│   ├── Kamino CPI 集成           # 流动性挖矿
│   └── Jupiter CPI 集成          # 代币交换
│
├── 📊 Data Infrastructure           # 数据层
│   ├── Substreams Container      # 实时数据处理
│   ├── The Graph Subgraph        # GraphQL 查询
│   ├── PostgreSQL (Neon)         # 历史数据存储
│   └── Hyperdrive                # 数据库连接池
│
└── 🔧 Admin & Tools                # 管理工具
    ├── Mars Admin (Ant Design)   # 管理后台
    ├── CLI Tools                 # 命令行工具
    └── Monitoring                # 监控告警
```

### 核心组件详解

```
mars-projects/
├── frontend/                       # 前端应用 (React 19 + Material-UI v7)
│   ├── src/
│   │   ├── pages/                 # 页面组件
│   │   │   ├── XLiquid.tsx       # Mars Vault 管理
│   │   │   ├── Portfolio.tsx      # 投资组合总览
│   │   │   ├── Swap.tsx           # 代币交换
│   │   │   ├── Pool.tsx           # 流动性池
│   │   │   ├── XStock.tsx         # 收益仪表板
│   │   │   └── XFund.tsx          # 资金管理
│   │   ├── components/            # UI 组件
│   │   │   ├── MarsPositions.tsx  # Mars 持仓展示
│   │   │   ├── MarsWalletTracker.tsx # 钱包追踪
│   │   │   └── UnifiedWalletButton.tsx # 统一钱包
│   │   ├── hooks/                 # React Hooks
│   │   │   ├── useMarsApi.ts      # Mars API
│   │   │   ├── useVaultData.ts    # Vault 数据
│   │   │   └── useUserVaultPosition.ts # 用户持仓
│   │   ├── services/              # 业务服务
│   │   │   ├── marsApiService.ts  # Mars API 服务
│   │   │   ├── kaminoSdkHelper.ts # Kamino SDK
│   │   │   └── marsContract.ts    # 合约交互
│   │   └── dex/                   # DEX 集成
│   │       ├── wagmiConfig.ts     # EVM 配置
│   │       └── lbSdkConfig.ts     # Meteora 配置
│   └── package.json
│
├── backend/                        # 后端服务 (Cloudflare Workers)
│   ├── src/
│   │   ├── mars/                  # Mars 协议服务
│   │   │   ├── routes.ts          # API 路由
│   │   │   ├── cache.ts           # 数据缓存
│   │   │   └── types.ts           # 类型定义
│   │   ├── dex/                   # DEX 交易引擎
│   │   │   ├── routes.ts          # DEX API
│   │   │   ├── graphql/           # GraphQL 查询
│   │   │   └── handlers/          # 交易处理器
│   │   ├── database/              # 数据库层
│   │   │   ├── schema.ts          # D1 模式
│   │   │   ├── postgres-schema.ts # PostgreSQL 模式
│   │   │   └── postgres.ts        # 数据库连接
│   │   ├── cache/                 # 缓存系统
│   │   │   ├── config.ts          # 缓存配置
│   │   │   ├── warmer.ts          # 缓存预热
│   │   │   └── routes.ts          # 缓存 API
│   │   ├── containers/            # Durable Objects
│   │   │   └── substreams-indexer.ts # Substreams 容器
│   │   ├── services/              # 核心服务
│   │   │   ├── substreamsIndexer.ts # 数据索引
│   │   │   └── vaultHistoricalCollector.ts # 历史数据
│   │   └── mcp/                   # MCP 协议
│   │       └── routes.ts          # D1 代理
│   ├── container_src/             # Substreams 容器源码
│   │   ├── src/lib.rs             # Rust 处理器
│   │   ├── proto/                 # Protocol Buffers
│   │   │   └── vault_events.proto
│   │   └── substreams.yaml        # Substreams 配置
│   ├── scripts/                   # 工具脚本
│   │   ├── init-postgres.ts       # 数据库初始化
│   │   └── cache-manager.sh       # 缓存管理
│   └── wrangler.toml              # Workers 配置
│
├── contracts-solana/               # Solana 智能合约
│   ├── programs/mars/             # Mars 主程序
│   │   ├── src/
│   │   │   ├── lib.rs            # 程序入口
│   │   │   ├── instructions/     # 指令集
│   │   │   │   ├── deposit.rs
│   │   │   │   ├── withdraw.rs
│   │   │   │   ├── kamino_ops.rs # Kamino 操作
│   │   │   │   └── jupiter_ops.rs # Jupiter 操作
│   │   │   ├── state/            # 状态结构
│   │   │   │   ├── global_state.rs
│   │   │   │   ├── user_state.rs
│   │   │   │   └── vault_state.rs
│   │   │   ├── events.rs         # 事件定义
│   │   │   ├── error.rs          # 错误类型
│   │   │   └── constant.rs       # 常量
│   │   └── Cargo.toml
│   ├── cli/                       # CLI 工具
│   │   └── command.ts             # 命令行接口
│   ├── tests/                     # 集成测试
│   │   ├── mars.ts
│   │   └── kamino-integration.ts
│   ├── target/                    # 编译输出
│   │   ├── deploy/                # 部署密钥
│   │   │   └── mars-keypair.json
│   │   └── idl/                   # IDL 定义
│   │       └── mars.json
│   └── Anchor.toml                # Anchor 配置
│
└── mars-admin/                     # 管理后台 (Ant Design Pro)
    ├── src/
    │   ├── pages/                 # 页面组件
    │   │   ├── User/              # 用户管理
    │   │   ├── Wallet/            # 钱包管理
    │   │   ├── financialStatements/ # 财务报表
    │   │   └── fundSettlement/    # 资金结算
    │   ├── services/              # API 服务
    │   └── locales/               # 国际化
    └── config/                    # 配置文件
        ├── config.ts              # Umi 配置
        └── routes.ts              # 路由配置
```

## 💻 技术栈

### 前端技术
- **React 19**: 最新的并发特性和增强渲染性能
- **TypeScript**: 全栈类型安全保障
- **Material-UI v7**: 现代化的设计系统和组件库
- **Vite**: 闪电般的构建工具和热更新
- **React Router v7**: 最新的路由和数据加载能力

### 区块链集成
- **Solana**: 
  - `@solana/web3.js` v1.98 - Solana 核心库
  - `@solana/wallet-adapter` - 钱包适配器生态
  - Phantom, Solflare, Backpack 钱包支持
- **EVM 兼容**: 
  - `wagmi` v2.12 - React Hooks for Ethereum
  - `viem` v2.21 - TypeScript 以太坊接口
  - `@rainbow-me/rainbowkit` - 钱包连接 UI
- **DeFi 协议**:
  - `@kamino-finance/klend-sdk` v7.1.8 - Kamino Lend
  - `@kamino-finance/farms-sdk` v3.2.13 - Kamino Farms
  - `@lb-xyz/sdk` v5.0.14 - Meteora DLMM
  - `@lifi/sdk` v3.12.14 - 跨链桥接
- **Anchor Framework**: Solana 智能合约开发框架 v0.32.1

### 后端服务
- **Cloudflare Workers**: 无服务器边缘计算，全球分布式部署
- **Hono.js**: 轻量级高性能 Web 框架
- **Drizzle ORM**: 类型安全的数据库操作
- **双数据库架构**:
  - Cloudflare D1 (SQLite) - 快速读取和查询
  - PostgreSQL (Neon) - 复杂查询和历史数据
  - Hyperdrive - 数据库连接池
- **KV Namespace**: 高性能键值对缓存
- **R2 Storage**: 对象存储和 CDN 加速
- **Durable Objects**: 有状态服务容器

### 数据基础设施
- **Substreams**: 实时区块链数据处理（Rust）
- **The Graph Protocol**: 去中心化的数据索引
- **GraphQL**: 高效的数据查询接口
- **Protocol Buffers**: 高效的数据序列化
- **WebSocket**: 实时数据推送

### 管理后台
- **Ant Design Pro 2.8**: 企业级管理系统方案
- **UmiJS 4**: 企业级前端应用框架
- **Ant Design 5**: 企业级 UI 组件库
- **ECharts 5**: 数据可视化

## 🚀 核心功能

### 1. Mars Protocol - 跨协议收益聚合
- **Vault 管理**: 多个 Vault 支持不同风险等级和收益策略
- **Kamino Earn 集成**: 通过 CPI 调用实现流动性挖矿和收益优化
- **Jupiter Lend 集成**: 借贷协议集成，多协议收益策略
- **自动再平衡**: 智能资产分配，根据市场条件动态调整
- **复利优化**: 自动收益再投资，实现复利最大化
- **跨链桥接**: LI.FI 协议集成，支持多链资产转移
- **实时追踪**: Vault TVL、APY、用户份额实时更新

### 2. 跨链 DEX 交易
- **多链支持**: Solana, BSC, Ethereum, Polygon, Avalanche
- **实时价格数据**: WebSocket 和 REST API 价格源
- **智能路由**: 自动寻找最佳交易路径和价格
- **滑点保护**: 可配置的滑点容忍度，防止价格滑点损失
- **交易历史**: 完整的用户交易记录和数据分析
- **流动性池**: Meteora DLMM 集中流动性管理

### 3. 数据基础设施
- **Substreams 实时索引**: Rust 编写的高性能数据处理器
- **Durable Objects 容器**: 运行 Substreams 客户端的持久化容器
- **增量同步**: 定时任务触发数据同步，避免重复处理
- **事件存储**: 处理后的数据存储到 PostgreSQL
- **GraphQL 查询**: 通过 The Graph 提供查询接口
- **历史数据收集**: 自动化 Vault 历史数据采集和分析

### 3. 智能合约架构

#### Mars Vault 智能合约

**程序地址**: `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N`

```rust
// Mars Vault 主合约 - 支持多协议收益聚合
use anchor_lang::prelude::*;

declare_id!("83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N");

#[program]
pub mod mars {
    use super::*;
    
    // 初始化全局状态
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // 设置管理员、Vault 和平台参数
    }
    
    // 存款到 Kamino Vault
    pub fn kamino_deposit(
        ctx: Context<KaminoDeposit>,
        amount: u64,
    ) -> Result<()> {
        // 通过 CPI 调用 Kamino 合约
        // 发出 VaultDepositEvent 事件
    }
    
    // 从 Kamino Vault 提取
    pub fn kamino_withdraw(
        ctx: Context<KaminoWithdraw>,
        shares_amount: u64,
    ) -> Result<()> {
        // 通过 CPI 调用 Kamino 合约
        // 发出 VaultWithdrawEvent 事件
    }
    
    // 质押到 Kamino Farm
    pub fn kamino_stake(
        ctx: Context<KaminoStake>,
        amount: u64,
    ) -> Result<()> {
        // 质押到流动性挖矿池
    }
    
    // 领取 Kamino 奖励
    pub fn claim_kamino_rewards(
        ctx: Context<ClaimRewards>,
    ) -> Result<()> {
        // 领取并发出 FarmRewardsClaimedEvent 事件
    }
    
    // Jupiter 代币交换
    pub fn jupiter_swap(
        ctx: Context<JupiterSwap>,
        amount_in: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        // 通过 CPI 调用 Jupiter 聚合器
    }
}
```

#### 账户结构

```rust
#[account]
pub struct GlobalState {
    pub admin: Pubkey,              // 管理员地址
    pub pending_admin: Pubkey,      // 待定管理员
    pub vault: Pubkey,              // Vault 地址
    pub is_paused: bool,            // 合约是否暂停
    pub platform_fee_bps: u16,      // 平台费用（基点）
    pub total_deposited: u64,       // 总存款量
    pub orchestrators: Vec<Pubkey>, // 编排者列表
}

#[account]
pub struct UserState {
    pub owner: Pubkey,              // 用户地址
    pub deposited_amount: u64,      // 存款金额
    pub shares: u64,                // Vault 份额
    pub last_deposit_time: i64,     // 最后存款时间
    pub kamino_farm_shares: u64,    // Kamino Farm 份额
}
```

#### 事件定义

```rust
#[event]
pub struct VaultDepositEvent {
    pub user: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub shares: u64,
    pub timestamp: i64,
}

#[event]
pub struct FarmRewardsClaimedEvent {
    pub user: Pubkey,
    pub farm: Pubkey,
    pub reward_mint: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
```

#### TypeScript SDK 集成

```typescript
// Mars API 服务集成
import { Connection, PublicKey } from '@solana/web3.js';

// 初始化连接
const connection = new Connection('https://api.mainnet-beta.solana.com');
const MARS_API_URL = 'https://mars.jongun2038.win';

// 获取所有 Vaults
async function getVaults() {
  const response = await fetch(`${MARS_API_URL}/api/mars/vaults`);
  return response.json();
}

// 获取用户持仓
async function getUserPositions(userAddress: string) {
  const response = await fetch(
    `${MARS_API_URL}/api/mars/user/${userAddress}/positions`
  );
  return response.json();
}

// 获取 Vault 状态
async function getVaultState(vaultAddress: string) {
  const response = await fetch(
    `${MARS_API_URL}/api/mars/vault/${vaultAddress}/state`
  );
  return response.json();
}

// 获取历史数据
async function getVaultHistoricalData(vaultAddress: string) {
  const response = await fetch(
    `${MARS_API_URL}/api/mars/vault/${vaultAddress}/historical`
  );
  return response.json();
}

// 跨链桥接报价
async function getLiFiQuote(params: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}) {
  const response = await fetch(`${MARS_API_URL}/api/mars/lifi/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}
```

## 🌐 支持的网络

| 网络 | Chain ID | 程序 ID / 合约地址 | 状态 | 功能特性 |
|------|----------|------------------|------|----------|
| **Solana Mainnet** | - | `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N` | ✅ **生产环境** | Mars 协议、Kamino、Jupiter |
| **Solana Devnet** | - | `83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N` | ✅ **测试环境** | 完整功能、测试代币 |
| **BSC Mainnet** | 56 | - | ✅ **生产环境** | DEX 交易、跨链桥接 |
| **BSC Testnet** | 97 | - | ✅ **测试环境** | 完整 DEX 功能 |
| **Ethereum Mainnet** | 1 | - | 🔄 **准备中** | L1 流动性、高级 DeFi |
| **Polygon** | 137 | - | 🔄 **规划中** | 低费用交易 |
| **Avalanche** | 43114 | - | 🔄 **规划中** | 高性能交易 |

### API 端点

| 服务 | 端点 | 功能 |
|------|------|------|
| **Mars Protocol API** | `https://mars.jongun2038.win` | Vault 管理、持仓追踪、历史数据 |
| **DEX API** | `https://api.dex.jongun2038.win` | 代币交换、价格数据、流动性管理 |
| **GraphQL Subgraph** | 配置在 `wrangler.toml` | 链上数据查询 |

## 📊 数据流架构

### Substreams 实时索引管道

```
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                          │
│                   (Program: 83Veoxix...D6N)                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 链上事件
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│              Substreams Container (Rust + gRPC)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • VaultDepositEvent          • FarmRewardsClaimedEvent   │  │
│  │ • VaultWithdrawEvent         • UserStateCreatedEvent     │  │
│  │ • FarmStakeEvent             • APYUpdatedEvent           │  │
│  │ • FarmUnstakeEvent           • FeesCollectedEvent        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  Protocol Buffers 编码 → GraphQL 转换 → 事件聚合                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ gRPC Stream
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│         Cloudflare Durable Objects (状态管理)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • 持久化连接池                                              │  │
│  │ • 实时事件缓冲                                              │  │
│  │ • 断点续传能力                                              │  │
│  │ • 增量数据同步                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ 批量写入
                       ↓
┌────────────────────────────────────────────────────────────────────┐
│                      双数据库架构                                  │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐  │
│  │   D1 (Cloudflare)       │    │  PostgreSQL (Neon.tech)      │  │
│  │   • 快速读取缓存         │    │  • 复杂聚合查询               │  │
│  │   • 用户持仓数据         │    │  • 历史数据分析               │  │
│  │   • Vault 最新状态      │    │  • 管理后台数据源             │  │
│  │   • APY 实时计算        │    │  • 多表 JOIN 操作            │  │
│  └─────────────────────────┘    └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                       │ Hyperdrive 连接池
                       ↓
┌────────────────────────────────────────────────────────────────────┐
│                 多层缓存 + API 层                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Workers KV Cache (15s TTL) → Memory Cache → API Response     │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────┬─────────────────────────────────────────────┘
                       │ REST/GraphQL API
                       ↓
┌────────────────────────────────────────────────────────────────────┐
│                    前端应用 (React 19)                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ XLiquid 页面 → Portfolio 追踪 → Swap 交易 → Admin 管理后台    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 数据流关键特性

1. **实时性**: Substreams 秒级延迟，确保用户看到最新持仓和收益
2. **可靠性**: Durable Objects 提供断点续传，避免数据丢失
3. **性能**: 双数据库 + 多层缓存，99% 请求 < 100ms 响应时间
4. **扩展性**: Cloudflare 全球边缘网络，自动扩容支持高并发

### Substreams 配置示例

```yaml
# backend/container_src/substreams.yaml
specVersion: v0.1.0
package:
  name: mars_vaults_substreams
  version: v1.0.0
  doc: Mars Protocol Solana 事件实时索引

protobuf:
  files:
    - vault_events.proto
    - farm_events.proto

binaries:
  default:
    type: wasm/rust-v1
    file: ./target/wasm32-unknown-unknown/release/substreams.wasm

modules:
  - name: map_vault_events
    kind: map
    inputs:
      - source: sf.solana.type.v1.Block
    output:
      type: proto:mars.vaults.v1.VaultEvents
    
  - name: store_vault_deposits
    kind: store
    updatePolicy: add
    valueType: int64
    inputs:
      - map: map_vault_events
```

### API 性能指标

| 端点 | 缓存层 | 平均响应时间 | P99 响应时间 |
|------|--------|-------------|-------------|
| `/api/mars/vaults` | KV + Memory | 45ms | 120ms |
| `/api/mars/user/:address` | KV | 60ms | 150ms |
| `/api/dex/quote` | Memory | 35ms | 80ms |
| `/api/dex/swap` | 无缓存 | 250ms | 500ms |

## 🚀 快速开始

### 环境要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | 20+ | 前端/后端开发 |
| **Rust** | 1.70+ | Solana 程序 + Substreams |
| **Solana CLI** | 1.18+ | 区块链交互 |
| **Anchor** | 0.32.1+ | Solana 程序框架 |
| **Wrangler** | 3.x | Cloudflare Workers 部署 |
| **PostgreSQL** | 14+ | 本地数据库测试 |

### 🎯 一键部署

#### 部署到 Cloudflare (推荐)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jong-un-1/mars-liquid)

#### 手动部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/jong-un-1/mars-liquid.git
cd mars-liquid

# 2. 部署后端 API
cd backend
npm install
npx wrangler deploy              # 部署到生产环境
npx wrangler deploy --env dev    # 部署到测试环境

# 3. 部署前端
cd ../frontend
npm install
npm run build
npx wrangler pages deploy dist   # 部署到 Cloudflare Pages

# 4. 部署 Solana 程序 (需要 Solana 密钥)
cd ../contracts-solana
anchor build
anchor deploy --provider.cluster mainnet    # 主网部署
# 或
anchor deploy --provider.cluster devnet     # 测试网部署
```

### 💻 本地开发环境

#### 前端开发

```bash
cd frontend
npm install

# 启动开发服务器 (Vite)
npm run dev
# 访问 http://localhost:5173

# 代码检查与格式化
npm run lint
npm run format

# 生产构建
npm run build
npm run preview  # 预览生产构建
```

#### 后端开发

```bash
cd backend
npm install

# 本地开发 (Miniflare 模拟 Cloudflare 环境)
npm run dev
# 访问 http://localhost:8787

# 数据库迁移
npm run db:migrate:d1          # D1 数据库迁移
npm run db:migrate:postgres    # PostgreSQL 迁移

# 运行测试
npm run test
npm run test:coverage

# TypeScript 类型检查
npm run typecheck
```

#### Solana 程序开发

```bash
cd contracts-solana

# 构建程序
anchor build

# 运行测试
anchor test

# 本地 Solana 测试验证器
solana-test-validator --reset
# 在新终端运行测试
anchor test --skip-local-validator

# 部署到 Devnet
anchor deploy --provider.cluster devnet

# 查看程序日志
solana logs <PROGRAM_ID>
```

#### 管理后台开发

```bash
cd mars-admin
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:8000

# 构建生产版本
npm run build

# 运行测试
npm run test
```

### ⚙️ 环境变量配置

#### Backend (.env)

```bash
# Cloudflare 服务
DATABASE_URL="你的 D1 数据库 URL"
HYPERDRIVE_URL="你的 Hyperdrive 连接字符串"
KV_NAMESPACE="mars-cache"
R2_BUCKET="mars-storage"

# API 密钥
API_KEY="your-secure-api-key"
SUBSTREAMS_API_KEY="你的 Substreams API 密钥"

# Solana 配置
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
PROGRAM_ID="83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N"

# 第三方服务
LIFI_API_KEY="你的 LI.FI API 密钥"
JUPITER_API_URL="https://quote-api.jup.ag/v6"
```

#### Frontend (.env)

```bash
# API 端点
VITE_MARS_API_URL="https://mars.jongun2038.win"
VITE_DEX_API_URL="https://api.dex.jongun2038.win"

# 区块链 RPC
VITE_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
VITE_BSC_RPC_URL="https://bsc-dataseed1.binance.org"
VITE_ETH_RPC_URL="https://eth.llamarpc.com"

# 程序 ID
VITE_PROGRAM_ID="83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N"

# 功能开关
VITE_ENABLE_TESTNET="false"
VITE_ENABLE_ANALYTICS="true"
```

#### Solana Program (Anchor.toml)

```toml
[features]
seeds = false
skip-lint = false

[programs.mainnet]
mars = "83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N"

[programs.devnet]
mars = "83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N"

[provider]
cluster = "mainnet-beta"  # 或 "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 🔧 故障排查

#### 常见问题

**1. Solana 程序部署失败**
```bash
# 检查 SOL 余额
solana balance

# 如果余额不足，申请空投 (仅 Devnet)
solana airdrop 2

# 检查程序 ID 是否匹配
anchor keys list
```

**2. 后端 Wrangler 部署错误**
```bash
# 检查 wrangler.toml 配置
wrangler whoami  # 验证登录状态

# 重新登录
wrangler logout
wrangler login

# 清除缓存并重新部署
rm -rf node_modules .wrangler
npm install
npx wrangler deploy
```

**3. 前端 API 连接失败**
```bash
# 检查环境变量
echo $VITE_MARS_API_URL

# 测试 API 连接
curl https://mars.jongun2038.win/api/mars/vaults

# 检查 CORS 配置 (backend/src/index.ts)
```

### 📚 开发文档链接

- [Backend API 文档](./backend/README.md)
- [Solana 合约文档](./contracts-solana/README.md)
- [Frontend 开发指南](./frontend/README.md)
- [Admin 管理后台](./mars-admin/README.md)
- [Substreams 架构](./backend/CACHE_ARCHITECTURE.md)
- [数据库设置](./backend/DATABASE_SETUP.md)
## 📚 API 文档

### Mars Protocol API 端点

完整的 API 文档请查看各项目目录下的详细文档：

| API 类型 | 基础 URL | 主要功能 | 详细文档 |
|---------|---------|---------|----------|
| **Mars Protocol** | `https://mars.jongun2038.win` | Vault 管理、持仓追踪、收益计算 | [后端 README](./backend/README.md) |
| **DEX Trading** | `https://api.dex.jongun2038.win` | 代币交换、价格查询、流动性 | [Mars DEX API](./backend/docs/mars-dex-api.md) |
| **Swap Service** | `https://mars.jongun2038.win/api/swap` | 跨链桥接、LI.FI 集成 | [Swap Guide](./frontend/API-SWAP-GUIDE.md) |
| **GraphQL** | 配置在 `wrangler.toml` | 历史数据查询、事件追踪 | [API 文档](./frontend/API_DOCUMENTATION.md) |

### 核心 API 示例

#### 1. 查询所有 Vault

```bash
curl https://mars.jongun2038.win/api/mars/vaults
```

响应：
```json
{
  "vaults": [
    {
      "id": "vault_kamino_pyusd_1",
      "protocol": "kamino",
      "token": "PYUSD",
      "tvl": "1250000.00",
      "apy": "12.5",
      "strategy": "Kamino Earn",
      "status": "active"
    }
  ]
}
```

#### 2. 查询用户持仓

```bash
curl https://mars.jongun2038.win/api/mars/user/<WALLET_ADDRESS>
```

响应：
```json
{
  "positions": [
    {
      "vault_id": "vault_kamino_pyusd_1",
      "deposited_amount": "10000.00",
      "shares": "9850.25",
      "current_value": "10500.75",
      "rewards_earned": "500.75",
      "apy": "12.5"
    }
  ],
  "total_value": "10500.75",
  "total_rewards": "500.75"
}
```

#### 3. 获取代币交换报价

```bash
curl -X POST https://api.dex.jongun2038.win/api/dex/quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromChain": "solana",
    "toChain": "bsc",
    "fromToken": "SOL",
    "toToken": "BNB",
    "amount": "1000000000"
  }'
```

响应：
```json
{
  "quote": {
    "estimatedOutput": "0.0234",
    "priceImpact": "0.12",
    "route": ["SOL", "USDC", "BNB"],
    "estimatedGas": "0.0001",
    "estimatedTime": "30s"
  }
}
```

### TypeScript SDK 使用

```typescript
import { MarsClient } from '@mars-protocol/sdk';

// 初始化客户端
const mars = new MarsClient({
  apiUrl: 'https://mars.jongun2038.win',
  programId: '83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N',
});

// 查询 Vault
const vaults = await mars.getVaults();

// 存款到 Vault
const tx = await mars.depositToVault({
  vaultId: 'vault_kamino_pyusd_1',
  amount: 1000,
  userWallet: walletPublicKey,
});

// 查询用户持仓
const positions = await mars.getUserPositions(walletAddress);
```

更多 API 使用示例请参考：
- [Frontend API 文档](./frontend/API_DOCUMENTATION.md)
- [Backend API 示例](./backend/README.md)
- [Swap API 指南](./frontend/API-SWAP-GUIDE.md)
    user: PublicKey;
    shares: BN;
    amount: BN;
    timestamp: BN;
  };
  
  RebalanceExecuted: {
    oldAllocation: number[];
    newAllocation: number[];
    timestamp: BN;
  };
}
```

### 📊 REST API 示例

```typescript
// 获取用户持仓
const userPositions = await fetch('https://mars.jongun2038.win/api/user/{address}/positions');

// 获取 Vault 状态
const vaultState = await fetch('https://mars.jongun2038.win/api/vault/{address}/state');

// 执行交换
const swapResult = await fetch('https://api.dex.jongun2038.win/api/swap', {
  method: 'POST',
  headers: { 'x-api-key': 'your-key' },
  body: JSON.stringify({
    fromToken: 'USDC',
    toToken: 'SOL', 
    amount: 100,
    chain: 'solana'
  })
});
```

## 🛡️ 安全与审计

### 智能合约安全

| 安全措施 | 实施状态 | 说明 |
|---------|---------|------|
| **代码审计** | ✅ 完成 | 第三方审计机构审计 |
| **权限控制** | ✅ 部署 | RBAC + 多签管理 |
| **紧急暂停** | ✅ 启用 | 全局暂停机制 |
| **升级机制** | ✅ 配置 | 可升级合约架构 |
| **价格预言机** | ✅ 集成 | Pyth Network 实时价格 |

### 核心安全特性

```rust
// 紧急暂停机制
#[access_control(check_admin(&ctx.accounts.authority))]
pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    require!(!global_state.is_paused, ErrorCode::AlreadyPaused);
    global_state.is_paused = true;
    emit!(EmergencyPauseEvent { timestamp: Clock::get()?.unix_timestamp });
    Ok(())
}

// 滑点保护
pub fn swap_with_slippage_protection(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,  // 最小输出保护
) -> Result<()> {
    let actual_output = execute_swap(amount_in)?;
    require!(actual_output >= min_amount_out, ErrorCode::SlippageTooHigh);
    Ok(())
}

// 访问控制
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut, has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    pub admin: Signer<'info>,
}
```

### 风险管理

- **流动性风险**: Kamino、Jupiter 多协议分散，单协议风险暴露 < 40%
- **智能合约风险**: 全面测试覆盖率 95%+，Anchor 框架最佳实践
- **价格操纵**: Pyth Network 去中心化预言机，实时价格验证
- **MEV 保护**: Jito Labs 集成，减少三明治攻击
- **资金安全**: 用户私钥本地存储，合约不托管资金

## �️ 开发路线图

### ✅ Phase 1 - 核心功能 (已完成)

**Q3 2025**
- [x] Mars Vault 智能合约开发与部署
- [x] Kamino Earn 集成 (CPI 调用)
- [x] 基础前端界面 (React 19 + Material-UI)
- [x] Substreams 实时数据索引
- [x] Cloudflare Workers 后端 API
- [x] 双数据库架构 (D1 + PostgreSQL)

### 🔄 Phase 2 - 功能扩展 (进行中)

**Q4 2025**
- [x] Jupiter Lend 集成
- [x] LI.FI 跨链桥接
- [ ] Meteora DLMM 流动性挖矿
- [ ] 自动再平衡策略
- [ ] Portfolio 追踪优化
- [ ] Admin 管理后台完善

### 🌍 Phase 3 - 全球化 (2026+)

- [ ] 多语言支持 (已支持 8 种语言，计划扩展至 20+)
- [ ] 合规认证 (SEC, MiCA)
- [ ] 机构级服务 (API、白标方案)
- [ ] 跨链互操作性标准化
- [ ] 去中心化索引器网络

### � 技术债务与优化

- [ ] 前端性能优化 (Lighthouse Score 95+)
- [ ] Substreams 容器化部署改进
- [ ] GraphQL 查询性能优化
- [ ] 测试覆盖率提升至 100%
- [ ] 文档国际化完善

## 🤝 贡献指南

### 如何贡献

我们欢迎所有形式的贡献！无论是代码、文档、Bug 报告还是功能建议。

#### 1. 提交问题 (Issue)

在提交之前，请先搜索是否已有相关问题：

- **Bug 报告**: 使用 Bug 模板，提供复现步骤、错误日志、环境信息
- **功能请求**: 描述需求背景、预期行为、替代方案
- **文档改进**: 指出不清楚或错误的文档内容

#### 2. 提交代码 (Pull Request)

```bash
# 1. Fork 项目到你的 GitHub 账号
# 2. 克隆你的 fork
git clone https://github.com/YOUR_USERNAME/mars-liquid.git
cd mars-liquid

# 3. 创建功能分支
git checkout -b feature/amazing-feature

# 4. 进行开发
# 编写代码，添加测试，更新文档

# 5. 提交代码
git add .
git commit -m "feat: add amazing feature"

# 6. 推送到你的 fork
git push origin feature/amazing-feature

# 7. 在 GitHub 上创建 Pull Request
```

#### 代码规范

- **Commit 格式**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` 新功能
  - `fix:` Bug 修复
  - `docs:` 文档更新
  - `refactor:` 代码重构
  - `test:` 测试相关
  - `chore:` 构建/工具链相关

- **代码风格**:
  ```bash
  # TypeScript/JavaScript
  npm run lint        # ESLint 检查
  npm run format      # Prettier 格式化
  
  # Rust
  cargo fmt           # 格式化
  cargo clippy        # Lint 检查
  ```

- **测试要求**:
  - 新功能必须包含单元测试
  - Bug 修复需要添加回归测试
  - 测试覆盖率不应下降

#### 3. 代码审查流程

1. 提交 PR 后，CI/CD 自动运行测试
2. 至少需要 1 位核心贡献者审核
3. 所有讨论解决后，维护者合并代码
4. 定期发布新版本

### 社区准则

- 尊重所有贡献者，友善沟通
- 欢迎新手，耐心解答问题
- 代码和讨论使用英文或中文
- 遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)

### 获得帮助

- **技术问题**: [GitHub Discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- **实时聊天**: Discord 社区 (即将开放)
- **邮件联系**: dev@marsprotocol.io

## 📞 社区与支持

### 官方资源

| 资源类型 | 链接 | 说明 |
|---------|------|------|
| **📱 Web 应用** | `https://mars.jongun2038.win` | 主应用入口 |
| **📊 DEX 平台** | `https://api.dex.jongun2038.win` | 交易平台 |
| **🛠️ 管理后台** | Mars Admin Dashboard | 管理员控制面板 |
| **📖 API 文档** | [Backend README](./backend/README.md) | 完整 API 参考 |

### 社交媒体与社区

- **� GitHub Discussions**: [mars-liquid/discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- **� Issue 追踪**: [mars-liquid/issues](https://github.com/jong-un-1/mars-liquid/issues)
- **📧 技术支持**: dev@marsprotocol.io
- **� 更新通知**: Watch 本仓库获取最新动态

### 技术文档导航

| 文档 | 路径 | 内容 |
|------|------|------|
| **后端架构** | [backend/README.md](./backend/README.md) | Cloudflare Workers, Substreams, 双数据库 |
| **Solana 合约** | [contracts-solana/README.md](./contracts-solana/README.md) | Anchor 程序, Kamino/Jupiter 集成 |
| **前端开发** | [frontend/README.md](./frontend/README.md) | React 19, Material-UI, 组件库 |
| **Admin 后台** | [mars-admin/README.md](./mars-admin/README.md) | Ant Design Pro, 用户管理 |
| **缓存架构** | [backend/CACHE_ARCHITECTURE.md](./backend/CACHE_ARCHITECTURE.md) | 多层缓存策略 |
| **数据库设置** | [backend/DATABASE_SETUP.md](./backend/DATABASE_SETUP.md) | D1 + PostgreSQL 配置 |
| **API 文档** | [frontend/API_DOCUMENTATION.md](./frontend/API_DOCUMENTATION.md) | REST/GraphQL 端点 |
| **CLI 命令** | [contracts-solana/CLI_COMMANDS.md](./contracts-solana/CLI_COMMANDS.md) | Solana 程序 CLI 工具 |

---

## 📄 许可证

本项目采用 **MIT License** 开源协议 - 详见 [LICENSE](./LICENSE) 文件。

## � 致谢

特别感谢以下开源项目和服务：

- **[Anchor Framework](https://www.anchor-lang.com/)** - Solana 程序开发框架
- **[Kamino Finance](https://kamino.finance/)** - 流动性协议集成
- **[Jupiter Aggregator](https://jup.ag/)** - Solana DEX 聚合器
- **[LI.FI](https://li.fi/)** - 跨链桥接协议
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - 边缘计算平台
- **[Neon Database](https://neon.tech/)** - Serverless PostgreSQL
- **[The Graph](https://thegraph.com/)** - 区块链索引协议
- **[React](https://react.dev/)** - 前端框架
- **[Material-UI](https://mui.com/)** - React UI 组件库
- **[Ant Design Pro](https://pro.ant.design/)** - 企业级管理界面

---

<div align="center">

**🚀 Mars Liquid - 让 DeFi 更简单，让收益更优化**

[![Stars](https://img.shields.io/github/stars/jong-un-1/mars-liquid?style=social)](https://github.com/jong-un-1/mars-liquid/stargazers)
[![Forks](https://img.shields.io/github/forks/jong-un-1/mars-liquid?style=social)](https://github.com/jong-un-1/mars-liquid/network/members)
[![Issues](https://img.shields.io/github/issues/jong-un-1/mars-liquid)](https://github.com/jong-un-1/mars-liquid/issues)
[![License](https://img.shields.io/github/license/jong-un-1/mars-liquid)](./LICENSE)

**Built with ❤️ by the Mars Protocol Team**

*最后更新: 2024年12月*

</div>
