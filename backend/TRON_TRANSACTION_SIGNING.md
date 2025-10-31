# TRON Transaction Signing via Backend

## 问题背景

Privy 将 TRON 归类为 **Tier 2 链**，这意味着：

1. ✅ 支持创建 TRON embedded wallets (需要服务端 SDK)
2. ❌ **不支持客户端 `delegatedActions`** - TRON 不在 `chainType: 'solana' | 'ethereum'` 列表中
3. ❌ **不支持客户端 `raw_sign`** - 需要有效的 session keys，但 TRON 无法建立 session

### 为什么客户端 raw_sign 失败？

当你在前端调用：
```typescript
fetch('https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign', {
  headers: {
    'Authorization': `Bearer ${accessToken}`, // ← 用户的 access token
  },
  body: JSON.stringify({
    chain_type: 'tron',
    data: txID,
    public_key: publicKey,
  }),
})
```

Privy 返回错误：
```json
{
  "error": "No valid user session keys available"
}
```

**原因**：
- TRON 作为 Tier 2 链，不支持客户端的 session key delegation
- 用户的 `accessToken` 没有签署 TRON 交易的权限
- 必须使用服务端的 `PRIVY_APP_SECRET` 来签署

---

## 解决方案：服务端签名

### 架构流程

```
┌─────────────┐                  ┌─────────────┐                  ┌──────────────┐
│  Frontend   │                  │   Backend   │                  │    Privy     │
│  (Client)   │                  │  (Server)   │                  │  Auth API    │
└──────┬──────┘                  └──────┬──────┘                  └──────┬───────┘
       │                                │                                │
       │ 1. Build transaction           │                                │
       │    (TronWeb)                   │                                │
       │                                │                                │
       │ 2. POST /api/tron-transaction/sign                             │
       │    { walletId, txHash, publicKey }                             │
       ├───────────────────────────────>│                                │
       │                                │                                │
       │                                │ 3. POST /api/v1/wallets/{id}/raw_sign
       │                                │    Authorization: Bearer {APP_SECRET}
       │                                ├───────────────────────────────>│
       │                                │                                │
       │                                │ 4. { signature: "..." }        │
       │                                │<───────────────────────────────┤
       │                                │                                │
       │ 5. { signature: "..." }        │                                │
       │<───────────────────────────────┤                                │
       │                                │                                │
       │ 6. Attach signature &          │                                │
       │    broadcast to TronGrid       │                                │
       │                                │                                │
```

### 代码实现

#### 1. Backend API: `/api/tron-transaction/sign`

文件：`/backend/src/routes/tron-transaction.ts`

```typescript
import { Hono } from 'hono';
import { PrivyClient } from '@privy-io/server-auth';

const app = new Hono();

app.post('/sign', async (c) => {
  const privy = new PrivyClient(
    c.env.PRIVY_APP_ID,
    c.env.PRIVY_APP_SECRET  // ← 服务端 secret，有完整权限
  );

  const { walletId, transactionHash, publicKey } = await c.req.json();

  // 使用 APP_SECRET 调用 Privy API
  const signResponse = await fetch(
    `https://auth.privy.io/api/v1/wallets/${walletId}/raw_sign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.PRIVY_APP_SECRET}`,  // ← 关键！
        'privy-app-id': c.env.PRIVY_APP_ID,
      },
      body: JSON.stringify({
        chain_type: 'tron',
        data: transactionHash,
        public_key: publicKey,
      }),
    }
  );

  const signData = await signResponse.json();
  return c.json({ signature: signData.signature });
});

export default app;
```

#### 2. Frontend: 调用后端签名

文件：`/frontend/src/services/privyTronService.ts`

```typescript
export async function buildAndSignTrc20Transaction(
  walletId: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  tokenContract: string,
  _accessToken: string, // 不再使用
  publicKey: string
): Promise<string> {
  const tronWebInstance = getTronWeb();

  // 1. 构建交易
  const transaction = await tronWebInstance.transactionBuilder.triggerSmartContract(
    tokenContract,
    'transfer(address,uint256)',
    {},
    [
      { type: 'address', value: toAddress },
      { type: 'uint256', value: amount }
    ],
    fromAddress
  );

  const txObject = transaction.transaction;
  const txID = txObject.txID;

  // 2. 调用后端签名（而不是直接调用 Privy）
  const backendUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:8787';
  const signResponse = await fetch(
    `${backendUrl}/api/tron-transaction/sign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletId,
        transactionHash: txID,
        publicKey,
      }),
    }
  );

  const signData = await signResponse.json();
  
  // 3. 转换签名格式（64字节 -> 65字节）
  const signature65 = convertPrivySignatureToTron(
    signData.signature,
    txID,
    publicKey
  );

  // 4. 附加签名
  txObject.signature = [signature65];

  // 5. 返回已签名交易
  return JSON.stringify(txObject);
}
```

---

## 配置步骤

### 1. 后端环境变量

确保 `wrangler.toml` 包含：

```toml
[vars]
PRIVY_APP_ID = "your-privy-app-id"
# 注意：TRONGRID_API_KEY 也需要添加
TRONGRID_API_KEY = "7bcda08c-dc0e-4aec-9645-d153d5ea258d"
```

### 2. 设置 Privy App Secret (重要！)

```bash
# 本地开发
cd backend
echo "your-privy-app-secret" | npx wrangler secret put PRIVY_APP_SECRET --env development

# 生产环境
echo "your-privy-app-secret" | npx wrangler secret put PRIVY_APP_SECRET
```

**如何获取 PRIVY_APP_SECRET**：
1. 访问 https://dashboard.privy.io
2. 选择你的 app
3. Settings → API Keys → App Secret

### 3. 前端环境变量

确保 `/frontend/.env` 包含：

```bash
VITE_API_ENDPOINT=http://localhost:8787  # 本地开发
# 或者
VITE_API_ENDPOINT=https://your-backend.workers.dev  # 生产环境
```

### 4. 部署后端

```bash
cd backend
npm run deploy
```

---

## 测试

### 1. 本地测试

```bash
# Terminal 1: 启动后端
cd backend
npm run dev

# Terminal 2: 启动前端
cd frontend
npm run dev
```

### 2. 测试签名流程

在前端执行 TRC20 转账：

```typescript
import { buildAndSignTrc20Transaction } from './services/privyTronService';

const signedTx = await buildAndSignTrc20Transaction(
  walletId,
  'TYourFromAddress...',
  'TYourToAddress...',
  1000000,  // 1 USDT (6 decimals)
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',  // USDT contract
  '', // accessToken not used
  publicKey
);

// 广播交易
const tronWeb = getTronWeb();
const result = await tronWeb.trx.sendRawTransaction(JSON.parse(signedTx));
console.log('Transaction ID:', result.txid);
```

---

## 常见问题

### Q1: 为什么不能在前端直接签名？

**A**: TRON 是 Privy 的 Tier 2 链，不支持客户端的 `delegatedActions` 或 session keys。只有 Ethereum 和 Solana 支持客户端签名。

### Q2: 这样安全吗？

**A**: **是的**，因为：
- 后端使用 `PRIVY_APP_SECRET`，它存储在 Cloudflare Workers 的 secrets 中（加密存储）
- 前端只传递交易数据（`txID`, `publicKey`, `walletId`），不传递私钥
- Privy 的 API 验证 `walletId` 是否属于你的 app
- 交易在链上广播前可以被审查（TronGrid API）

### Q3: 能否直接导出私钥在前端签名？

**A**: **强烈不推荐**！这会：
- 违反 Privy 的安全模型
- 失去 Privy 的 policy enforcement 和 audit logs
- 用户私钥暴露在前端，极易被盗

### Q4: 如何限制后端的签名权限？

**A**: 可以添加验证逻辑：

```typescript
app.post('/sign', async (c) => {
  // 1. 验证用户身份（可选）
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const accessToken = authHeader.substring(7);
    const claims = await privy.verifyAuthToken(accessToken);
    // 检查 claims.userId 是否匹配 walletId 的所有者
  }

  // 2. 验证交易金额（防止大额转账）
  // 3. 验证目标地址（黑名单检查）
  // 4. 记录所有签名请求到审计日志

  // ...继续签名
});
```

---

## 相关文档

- [Privy TRON Wallet Setup](./PRIVY_TRON_SETUP.md)
- [Privy Tier 2 Chains Documentation](https://docs.privy.io/guide/react/wallets/embedded/tier-2)
- [TronWeb Documentation](https://developers.tron.network/docs/tronweb)

---

## Changelog

- **2024-01-XX**: 创建文档，实现服务端签名架构
- **2024-01-XX**: 添加 broadcast endpoint 和完整测试流程
