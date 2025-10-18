# Mars Platform 完整 API 文档

## 📖 目录

1. [概览](#概览)
2. [Mars Liquid API - Solana DeFi 聚合](#mars-liquid-api)
3. [DEX Analytics API - 多链交易分析](#dex-analytics-api)
4. [Platform Fee Management - 平台费用管理](#platform-fee-management)

---

## 概览

Mars Platform 提供三大核心 API 服务：

1. **Mars Liquid API** - Solana 链上的 DeFi 收益聚合服务
2. **DEX Analytics API** - 多链 DEX 数据分析和流动性管理
3. **Platform Fee Management** - Solana 智能合约的平台费用管理

---

# Mars Liquid API

## 🚀 API 概览

Mars Liquid 是一个 Solana DeFi 聚合收益平台，通过整合 Jupiter Lend 和 Kamino Earn，为用户提供最优的资产分配策略。

**基础 URL:** `https://api.marsliquidity.com`

## 📋 API 端点

### 1. 健康检查

**端点:** `GET /v1/api/mars/health`

检查系统健康状态和各服务连接情况。

```bash
curl "https://api.marsliquidity.com/v1/api/mars/health"
```

**响应示例:**
```json
{
  "status": "healthy",
  "services": {
    "jupiter": true,
    "kamino": true,
    "cache": true,
    "database": true
  },
  "metrics": {
    "totalTVL": 0,
    "activeUsers": 0,
    "avgAPY": 8.5,
    "systemLoad": 0.3
  },
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

### 2. 获取投资机会

**端点:** `GET /v1/api/mars/opportunities`

获取所有可用的 DeFi 投资机会（Jupiter Lend + Kamino）。

```bash
curl "https://api.marsliquidity.com/v1/api/mars/opportunities"
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "jupiter-9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
      "protocol": "jupiter",
      "asset": "USDC",
      "apy": 6.77,
      "tvl": 366496702129550,
      "available": true,
      "riskLevel": "low",
      "liquidityDepth": 36649670212955,
      "withdrawalTime": 0.5,
      "fees": {
        "deposit": 0,
        "withdraw": 0,
        "management": 0
      }
    }
  ],
  "timestamp": "2025-09-24T08:41:47.732Z"
}
```

### 3. 用户仓位查询

**端点:** `GET /v1/api/mars/positions/{userAddress}`

获取指定用户的所有 DeFi 仓位。

```bash
curl "https://api.marsliquidity.com/v1/api/mars/positions/A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6"
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "jupiter": {
      "protocol": "jupiter",
      "totalPositions": 1,
      "totalValue": 1284498,
      "avgAPY": 6.83,
      "positions": [
        {
          "id": "jupiter-9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D",
          "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
          "protocol": "jupiter",
          "asset": "USDC",
          "amount": 1284498,
          "shares": 1,
          "entryAPY": 6.83,
          "currentValue": 1284498,
          "unrealizedGain": 0,
          "depositTime": "2025-09-24T08:55:41.521Z",
          "lastUpdate": "2025-09-24T08:55:41.521Z"
        }
      ]
    },
    "summary": {
      "totalProtocols": 1,
      "totalPositions": 1,
      "totalValue": 1284498,
      "avgAPY": 6.83
    }
  },
  "timestamp": "2025-09-24T08:55:41.521Z"
}
```

### 4. 创建存款交易

**端点:** `POST /v1/api/mars/transactions/deposit`

创建存款交易，返回优化的资产分配策略和交易预览。

```bash
curl -X POST "https://api.marsliquidity.com/v1/api/mars/transactions/deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
    "asset": "USDC",
    "amount": 10,
    "riskProfile": "moderate"
  }'
```

### 5. 创建取款交易

**端点:** `POST /v1/api/mars/transactions/withdraw`

创建取款交易，返回取款预览和费用估算。

```bash
curl -X POST "https://api.marsliquidity.com/v1/api/mars/transactions/withdraw" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "A7iVLhNhLNaH4q8SZAZVceLUVowisGncQ9gwHVZKc8j6",
    "asset": "USDC",
    "amount": 1
  }'
```

### 6. 资产分配优化

**端点:** `POST /v1/api/mars/optimize`

获取资产分配优化建议。

### 7. 取款预览

**端点:** `POST /v1/api/mars/withdraw/preview`

获取取款交易的预览信息和费用估算。

## 🔧 Mars Liquid - 支持的资产

- **USDC**: USD Coin
- **USDT**: Tether USD  
- **SOL**: Solana
- **BONK**: Bonk

## 🛡️ 风险等级

- **conservative**: 保守型（低风险，稳定收益）
- **moderate**: 平衡型（中等风险，平衡收益）
- **aggressive**: 激进型（高风险，高收益）

---

# DEX Analytics API

## 🚀 API 概览

提供多链 DEX 数据分析、流动性池管理、用户仓位查询等功能。

**基础 URL:** `https://api.marsliquidity.com`

**认证方式:** 所有请求需要在 header 中添加 `x-api-key: test-key`

## 📋 支持的区块链

- **BSC** (Binance Smart Chain): `bsc`
- **Ethereum**: `ethereum`
- 其他链陆续支持中...

## 🔑 API 端点

### 1. 获取每日交易所分析数据

**端点:** `GET /v1/api/dex/analytics/{chain}`

获取指定链上的 DEX 交易统计数据。

**参数:**
- `chain`: 链名称（如 `bsc`, `ethereum`）
- `startTime`: 开始时间戳（Unix timestamp）
- `endTime`: 结束时间戳（Unix timestamp）
- `version`: DEX 版本（可选，默认 `all`）

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/analytics/bsc?startTime=1672531200&endTime=1704067200&version=all" \
  -H "x-api-key: test-key" | jq
```

### 2. 按链获取池列表

**端点:** `GET /v1/api/dex/pools/{chain}`

获取指定链上的流动性池列表。

**参数:**
- `pageSize`: 每页数量（默认 10）
- `pageNum`: 页码（默认 1）
- `orderBy`: 排序字段（如 `volume`, `tvl`, `apy`）

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc?pageSize=10&pageNum=1&orderBy=volume" \
  -H "x-api-key: test-key" | jq
```

### 3. 获取指定池详情

**端点:** `GET /v1/api/dex/pools/{chain}/{poolAddress}`

获取特定流动性池的详细信息。

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/0xe785e0899e7acd50a55f6b517f1f9c46574c9d7c" \
  -H "x-api-key: test-key" | jq
```

### 4. 按代币搜索池子

**端点:** `GET /v1/api/dex/pools/{chain}/search`

搜索包含指定代币的所有流动性池。

**参数:**
- `token1`: 第一个代币（符号或地址）
- `token2`: 第二个代币（符号或地址）（可选）
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20，最大 50）

```bash
# 搜索包含 WBNB 的所有池子
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/search?token1=WBNB&page=1&limit=20" \
  -H "x-api-key: test-key" | jq

# 搜索 WBNB-USDT 交易对
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/search?token1=WBNB&token2=USDT&page=1&limit=10" \
  -H "x-api-key: test-key" | jq

# 使用代币地址搜索
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/search?token1=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c&page=1&limit=20" \
  -H "x-api-key: test-key" | jq
```

### 5. 获取池的 Bins 数据

**端点:** `GET /v1/api/dex/pools/{chain}/{poolAddress}/bins`

获取流动性池的价格区间（bins）数据。

**参数:**
- `activeId`: 指定中心 bin ID（可选，默认使用池当前 active ID）
- `range`: 获取指定 ID 前后多少个 bins（默认 50，范围 0-200）
- `limit`: 最大返回 bins 数量（默认 100，范围 1-1000）

```bash
# 获取池子的所有 bins（前100个）
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins" \
  -H "x-api-key: test-key" | jq

# 获取指定 active ID 周围的 bins（range=20）
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins?activeId=8391210&range=20&limit=50" \
  -H "x-api-key: test-key" | jq

# 只获取当前 active bin
curl -X GET "https://api.marsliquidity.com/v1/api/dex/pools/bsc/0x904ede072667c4bc3d7e6919b4a0a442559295c8/bins?range=0&limit=1" \
  -H "x-api-key: test-key" | jq
```

**返回数据包含:**
- 池子基本信息（名称、active ID、bin step、代币信息）
- bins 数组，每个 bin 包含：
  - `binId`: bin 的 ID
  - `isActive`: 是否为当前 active bin
  - `priceX` / `priceY`: bin 的价格
  - `reserveX` / `reserveY`: bin 中的流动性
  - `liquidityUsd`: 以 USD 计价的流动性
  - `liquidityProviderCount`: 流动性提供者数量

### 6. 获取用户 Bin IDs

**端点:** `GET /v1/api/dex/user/bin-ids/{userAddress}/{chain}/{poolAddress}`

获取用户在特定池子中的 bin 仓位。

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/user/bin-ids/0xE0A051f87bb78f38172F633449121475a193fC1A/bsc/0xa871c952b96ad832ef4b12f1b96b5244a4106090" \
  -H "x-api-key: test-key" | jq
```

### 7. 获取用户池 IDs

**端点:** `GET /v1/api/dex/user/pool-ids/{userAddress}/{chain}`

获取用户参与的所有流动性池。

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/user/pool-ids/0xE0A051f87bb78f38172F633449121475a193fC1A/bsc?pageSize=20&pageNum=1" \
  -H "x-api-key: test-key" | jq
```

### 8. 池用户余额查询

**端点:** `GET /v1/api/dex/user/pool-user-balances`

查询用户在特定池子中的余额。

**参数:**
- `chainId`: 链 ID（如 BSC Testnet: 97）
- `lpAddress`: 用户地址
- `poolAddress`: 池子地址

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/user/pool-user-balances?chainId=97&lpAddress=0xE0A051f87bb78f38172F633449121475a193fC1A&poolAddress=0x406ca3b0acd27b8060c84902d2b0cab6f5ad898d" \
  -H "x-api-key: test-key" | jq
```

### 9. 获取用户费用收益

**端点:** `GET /v1/api/dex/user/fees-earned/{chain}/{userAddress}/{poolAddress}`

查询用户从流动性池中赚取的费用。

```bash
curl -X GET "https://api.marsliquidity.com/v1/api/dex/user/fees-earned/bsc/0xE0A051f87bb78f38172F633449121475a193fC1A/0x406ca3b0acd27b8060c84902d2b0cab6f5ad898d" \
  -H "x-api-key: test-key" | jq
```

---

# Platform Fee Management

## 🚀 API 概览

平台费用管理系统用于 Solana 智能合约的安全费用收取机制。通过 `platform_fee_wallet` 验证，确保平台费用只能流向已认证的钱包地址。

## 📋 前端集成 - Claim Rewards

### 新增账户参数

前端调用 `claim_farm_rewards` 时需要传入 **`platform_fee_ata`** 账户。

### 修改内容

#### 1. 获取平台费用钱包

从链上 `GlobalState` 账户读取平台费用钱包地址。

```typescript
async function getPlatformFeeWallet(
  connection: Connection,
  globalStatePda: PublicKey
): Promise<PublicKey> {
  const accountInfo = await connection.getAccountInfo(globalStatePda);
  
  // GlobalState 布局: 8 + 32 + 33 + 2 + 2 + 32 + 1 + 8 = 118 bytes
  const offset = 118;
  const platformFeeWalletBytes = accountInfo.data.slice(offset, offset + 32);
  return new PublicKey(platformFeeWalletBytes);
}
```

#### 2. 获取平台费用 ATA

计算平台费用钱包对应奖励代币的 ATA 地址。

```typescript
async function getPlatformFeeAta(
  connection: Connection,
  globalStatePda: PublicKey,
  rewardMint: PublicKey,
  tokenProgram: PublicKey
): Promise<PublicKey> {
  const platformFeeWallet = await getPlatformFeeWallet(connection, globalStatePda);
  
  return getAssociatedTokenAddressSync(
    rewardMint,
    platformFeeWallet,
    false,
    tokenProgram
  );
}
```

#### 3. 更新指令调用

```typescript
// 获取平台费用 ATA
const platformFeeAta = await getPlatformFeeAta(
  connection,
  globalStatePda,
  rewardMint,
  tokenProgram
);

// 创建指令时传入
const claimIx = createMarsClaimFarmRewardsInstruction({
  user: userPublicKey,
  // ... 其他账户
  userRewardAta: userAta,
  platformFeeAta: platformFeeAta,  // ✅ 新增
  farmAuthority: farmAuthority,
  // ...
}, rewardIndex);
```

## 🔧 CLI 命令

### 更新平台费用钱包

```bash
# 主网
yarn script update-platform-fee-wallet \
  -w 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin \
  -e mainnet-beta \
  -k ~/.config/solana/mars-admin.json

# 开发网
yarn script update-platform-fee-wallet \
  -w YOUR_DEVNET_WALLET \
  -e devnet
```

### 创建平台费用 ATA

```bash
# 为每种奖励代币创建平台费用 ATA
spl-token create-account <REWARD_TOKEN_MINT> \
  --owner <PLATFORM_FEE_WALLET>

# 批量创建（使用脚本）
export PLATFORM_FEE_WALLET=YOUR_WALLET_ADDRESS
./create-platform-fee-atas.sh
```

### 更新 Vault 平台费率

```bash
yarn script update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 2500 \
  -e mainnet-beta
```

## ⚠️ 重要注意事项

### 1. 平台费用 ATA 必须预先创建

前端**不会自动创建**平台费用 ATA，这些账户应该由管理员提前创建。

### 2. 账户验证

链上程序会验证：
- ✅ `platform_fee_ata` 的所有者必须是 `global_state.platform_fee_wallet`
- ❌ 如果验证失败，交易会被拒绝并返回 `InvalidPlatformFeeAccount` 错误

### 3. GlobalState 数据布局

```
Offset | Size | Field
-------|------|------------------
0      | 8    | Discriminator
8      | 32   | admin
40     | 33   | pending_admin (Option<Pubkey>)
73     | 2    | rebalance_threshold
75     | 2    | cross_chain_fee_bps
77     | 32   | base_mint
109    | 1    | frozen
110    | 8    | max_order_amount
118    | 32   | platform_fee_wallet  ← 这里
```

## 🧪 测试清单

### 前端测试

- [ ] 能正确从 GlobalState 读取 platform_fee_wallet
- [ ] 能正确计算各种奖励代币的 platform_fee_ata
- [ ] 指令包含正确数量的账户（17个）
- [ ] 账户顺序正确
- [ ] 支持 SPL Token 和 Token-2022

### 集成测试

- [ ] 用户领取奖励成功
- [ ] 平台费用正确扣除
- [ ] 平台费用 ATA 余额增加
- [ ] 用户 ATA 余额正确（奖励 - 平台费）

---

## 📊 统一响应格式

所有 API 响应遵循统一格式：

**成功响应:**
```json
{
  "success": true,
  "data": { /* 响应数据 */ },
  "timestamp": "2025-10-17T08:41:47.732Z"
}
```

**错误响应:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": "2025-10-17T08:41:47.732Z"
}
```

## 🚨 常见错误代码

### Mars Liquid API

- `FETCH_OPPORTUNITIES_ERROR`: 获取投资机会失败
- `FETCH_POSITIONS_ERROR`: 获取用户仓位失败
- `DEPOSIT_TRANSACTION_ERROR`: 创建存款交易失败
- `WITHDRAW_TRANSACTION_ERROR`: 创建取款交易失败
- `VALIDATION_ERROR`: 请求参数验证失败

### Platform Fee Management

- `InvalidPlatformFeeAccount`: 平台费用账户验证失败
- `OnlyAdmin`: 只有管理员可以执行此操作
- `InvalidParameter`: 无效的参数值

---

## 💡 集成示例

### JavaScript/TypeScript - Mars Liquid

```typescript
const MARS_API_BASE = 'https://api.marsliquidity.com';

// 获取投资机会
async function getOpportunities() {
  const response = await fetch(`${MARS_API_BASE}/v1/api/mars/opportunities`);
  return response.json();
}

// 创建存款交易
async function createDeposit(userAddress: string, asset: string, amount: number) {
  const response = await fetch(`${MARS_API_BASE}/v1/api/mars/transactions/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress,
      asset,
      amount,
      riskProfile: 'moderate'
    })
  });
  return response.json();
}
```

### JavaScript/TypeScript - DEX Analytics

```typescript
const DEX_API_BASE = 'https://api.marsliquidity.com';
const API_KEY = 'test-key';

// 获取池列表
async function getPools(chain: string, page: number = 1) {
  const response = await fetch(
    `${DEX_API_BASE}/v1/api/dex/pools/${chain}?pageSize=20&pageNum=${page}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return response.json();
}

// 搜索代币池
async function searchPools(chain: string, token1: string, token2?: string) {
  const params = new URLSearchParams({ token1 });
  if (token2) params.append('token2', token2);
  
  const response = await fetch(
    `${DEX_API_BASE}/v1/api/dex/pools/${chain}/search?${params}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return response.json();
}
```

### JavaScript/TypeScript - Platform Fee Claim Rewards

```typescript
import { createClaimRewardsTransaction } from './services/marsContract';

// 领取奖励
async function handleClaimRewards() {
  try {
    // 1. 创建交易（自动包含 platform_fee_ata）
    const transaction = await createClaimRewardsTransaction(
      wallet.publicKey,
      connection,
      kaminoHelper
    );
    
    if (!transaction) {
      console.log('没有可领取的奖励');
      return;
    }
    
    // 2. 发送交易
    const signature = await wallet.sendTransaction(transaction, connection);
    
    // 3. 确认交易
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('✅ 奖励领取成功！', signature);
    
  } catch (error) {
    if (error.message.includes('InvalidPlatformFeeAccount')) {
      console.error('❌ 平台费用账户验证失败，请联系管理员');
    } else {
      console.error('❌ 领取奖励失败:', error);
    }
  }
}
```

---

## 📈 性能优化

### Mars Liquid API
- 所有数据都有缓存机制，减少外部 API 调用
- 健康检查响应时间 < 1秒
- 投资机会数据缓存 5分钟
- 用户仓位数据缓存 1分钟

### DEX Analytics API
- 池数据缓存 10分钟
- 用户仓位数据缓存 5分钟
- Bins 数据缓存 2分钟

---

## 🔒 安全性

- 所有 Mars Liquid 交易都返回未签名状态，需要用户钱包签名
- DEX Analytics API 需要 API Key 认证
- Platform Fee 通过链上验证确保安全
- 敏感操作需要用户主动确认

---

## 📚 相关文档

- [Mars Liquid 使用指南](https://api.marsliquidity.com)
- [DEX Analytics Dashboard](https://api.marsliquidity.com)
- [Platform Fee Wallet Guide](./PLATFORM_FEE_WALLET_GUIDE.md)
- [Solana 合约文档](../contracts-solana/README.md)

---

**最后更新:** 2025年10月17日  
**API 版本:** v1.0.0  
**维护团队:** Mars Development Team  
**技术支持:** support@marsliquidity.com
