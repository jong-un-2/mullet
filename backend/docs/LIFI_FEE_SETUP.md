# LI.FI 费用收取配置说明

## 问题分析

之前在 XStock 交换后看不到费用收取的原因是：**没有在 LI.FI 请求中配置集成商费用参数**。

## 解决方案

### 1. 配置费用参数（推荐方式）

根据 [LI.FI SDK 文档](https://docs.li.fi/sdk/monetize-sdk)，推荐使用**全局费用配置**：

```typescript
// 推荐：在 createConfig 中全局配置费用
createConfig({
  integrator: 'mullet1',
  apiKey: 'your-api-key',
  routeOptions: {
    fee: 0.0025, // 0.25% 集成商费用，自动应用到所有请求
  },
});

// 请求路由时无需重复配置费用
const routeRequest: RoutesRequest = {
  fromChainId: ...,
  toChainId: ...,
  fromTokenAddress: ...,
  toTokenAddress: ...,
  fromAmount: ...,
  fromAddress: ...,
  toAddress: ...,
  options: {
    slippage: 0.03,
    order: 'FASTEST',
    // 费用已在 createConfig 中全局配置，无需在此重复
  },
};
```

### 2. 备选方式：每个请求单独配置

如果需要为不同请求设置不同费用，可以在请求中覆盖：

```typescript
const routeRequest: RoutesRequest = {
  // ... 其他参数
  options: {
    integrator: 'mullet1',  // 必须与 createConfig 中的 integrator 一致
    fee: 0.005,             // 为此请求设置 0.5% 费用（覆盖全局配置）
  },
};
```

### 2. 已修改的文件

**使用全局费用配置（推荐方式）**：

- ✅ `/backend/src/mars/lifi/index.ts` - 后端 LiFi 服务
  - `createConfig` 中配置 `routeOptions.fee`
- ✅ `/frontend/src/pages/XFund.tsx` - 前端 XFund 页面（2处）
  - 存款流程中的 `createConfig`
  - 提款流程中的 `createConfig`
- ✅ `/frontend/src/pages/XStock.tsx` - 前端 XStock 页面（1处）
  - `createConfig` 中配置 `routeOptions.fee`

所有 `RoutesRequest` 中的 `options` 已简化，不再重复配置费用。

### 3. 费用收取方式

根据 [LI.FI 文档](https://docs.li.fi/introduction/integrating-lifi/monetizing-integration)：

#### Solana 链
- ✅ **费用直接发送到费用钱包**
- ✅ **无需手动领取**

#### EVM 链（Ethereum、Polygon、Base 等）
- 📦 费用收集在 LI.FI 费用收集合约中
- 🔑 需要使用指定的费用收集钱包领取
- 🌐 领取方式：访问 [LI.FI Portal](https://portal.li.fi/)

### 4. 费用提取

**方式一：使用 LI.FI Portal（推荐）**
1. 访问 https://portal.li.fi/
2. 连接您的费用收集钱包
3. 查看并提取各链上的累积费用

**方式二：使用 API**
```bash
GET /v1/integrators/{integratorId}/withdraw/{chainId}
```

详见：https://docs.li.fi/api-reference/introduction

### 5. 费用钱包配置

1. 访问 https://portal.li.fi/
2. 使用您的 integrator ID: `mullet1`
3. 设置费用收集钱包地址
4. 不同链可以设置不同的钱包地址

### 6. 重要提示

⚠️ **只有指定的费用收集钱包才能领取费用**

⚠️ **费用钱包更新后，只有更新后产生的费用可以用新钱包领取**

⚠️ **Solana 链的费用会直接发送，无需领取**

⚠️ **费用配置最佳实践**：
- **推荐**：使用 `createConfig({ routeOptions: { fee: 0.0025 } })` 全局配置
- **备选**：在每个请求的 `options` 中单独配置（用于不同请求需要不同费用的情况）
- **必须一致**：`integrator` 名称必须在所有地方保持一致

### 7. 当前配置

- **Integrator**: mullet1
- **API Key**: 17a821dd-2065-4bdb-b3ec-fe45cdca67ee.f004e74e-b922-498e-bab7-6b8ba539335c
- **默认费用**: 0.25% (0.0025) - 通过 `routeOptions.fee` 全局配置
- **配置方式**: 全局配置（LI.FI SDK 推荐方式）
- **最大费用**: < 100%
- **LI.FI 分成**: 根据使用情况和交易量

## 测试验证

1. 执行一次 XStock 购买
2. 检查交易详情中的费用信息
3. 访问 https://portal.li.fi/ 查看累积费用
4. （Solana）检查费用钱包余额
5. （EVM）使用 Portal 提取费用

## Portal 设置步骤

### 1️⃣ 访问并连接钱包
- 打开 https://portal.li.fi/
- 点击 "Connect Wallet"
- 授权连接您的钱包

### 2️⃣ 创建 Integrator 账户
- 在 Portal 中设置 Integrator ID: `mullet1`
- 这个 ID 必须与代码中的完全一致

### 3️⃣ 配置费用收集钱包
**Solana 链**
- 设置您的 Solana 钱包地址
- 费用会自动发送到这个地址

**EVM 链**（需要为每条链单独设置）
- Ethereum Mainnet
- Polygon
- Base
- Arbitrum
- Optimism
- 其他支持的 EVM 链

### 4️⃣ 验证配置
确认以下信息正确：
- ✅ Integrator ID: `mullet1`
- ✅ 费用比例: 0.25% (0.0025)
- ✅ API Key: 17a821dd-2065-4bdb-b3ec-fe45cdca67ee.f004e74e-b922-498e-bab7-6b8ba539335c
- ✅ 费用收集钱包已设置

## 参考文档

- [LI.FI 费用配置指南](https://docs.li.fi/introduction/integrating-lifi/monetizing-integration)
- [费用提取 FAQ](https://docs.li.fi/guides/fees-monetization/faq)
- [LI.FI Portal](https://portal.li.fi/)
- [LI.FI API 文档](https://docs.li.fi/api-reference/introduction)
