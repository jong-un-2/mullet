# LI.FI 费用收取配置说明

## 问题分析

之前在 XStock 交换后看不到费用收取的原因是：**没有在 LI.FI 请求中配置集成商费用参数**。

## 解决方案

### 1. 配置费用参数

在所有 `getRoutes` 请求中添加了费用配置：

```typescript
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
    // 集成商费用配置
    integrator: 'mullet1',  // 必须与 createConfig 中的 integrator 一致
    fee: 0.0025,            // 0.25% 集成商费用
  },
};
```

### 2. 已修改的文件

- ✅ `/backend/src/mars/lifi/index.ts` - 后端 LiFi 服务
- ✅ `/frontend/src/pages/XFund.tsx` - 前端 XFund 页面（4处）
- ✅ `/frontend/src/pages/XStock.tsx` - 前端 XStock 页面（1处）

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

⚠️ **费用配置必须与 integrator 名称一致**：
- `createConfig({ integrator: 'mullet1' })`
- `options: { integrator: 'mullet1' }`

### 7. 当前配置

- **Integrator**: mullet1
- **API Key**: 17a821dd-2065-4bdb-b3ec-fe45cdca67ee.f004e74e-b922-498e-bab7-6b8ba539335c
- **默认费用**: 0.25% (0.0025)
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
