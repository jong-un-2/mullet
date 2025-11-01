# OKX DEX 集成指南

## 概述

本项目集成了 OKX DEX API，用于支持 TRON 钱包用户在 XFund 和 XStock 页面进行跨链桥接和代币交换操作。

## 功能特性

### 1. TRON 跨链桥接
- **TRON → Solana**: 将 TRON 上的代币（如 USDT）桥接到 Solana
- **Solana → TRON**: 将 Solana 上的代币桥接回 TRON（待实现）

### 2. TRON 原生代币交换
- **USDT → TRX**: 当 TRX 余额不足时，自动从 USDT 交换为 TRX 作为手续费
- **智能余额管理**: 自动检测 TRX 余额，低于 20 TRX 时自动补充

### 3. 自动化流程
- 在执行跨链操作前，自动检查并补充 TRX 手续费
- 一键完成桥接和代币交换操作

## 架构设计

```
frontend/src/
├── services/
│   ├── okxDexService.ts        # OKX DEX API 核心服务
│   └── tronService.ts          # TRON 钱包服务（已增强）
├── hooks/
│   └── useOkxDex.ts            # OKX DEX React Hook
├── constants/
│   └── tronConstants.ts        # TRON 常量和工具函数
└── pages/
    ├── XFund.tsx               # 基金页面（集成 OKX DEX）
    └── XStock.tsx              # 股票页面（集成 OKX DEX）
```

## API 配置

### 1. 获取 OKX API 密钥

1. 访问 [OKX Web3](https://www.okx.com/web3)
2. 注册/登录账户
3. 进入 API 管理页面
4. 创建新的 API 密钥（DEX Aggregator 权限）
5. 保存以下信息：
   - API Key
   - API Secret
   - Passphrase

### 2. 配置环境变量

在 `frontend/.env` 文件中添加：

```bash
# OKX DEX API Configuration
VITE_OKX_API_KEY=your_okx_api_key_here
VITE_OKX_API_SECRET=your_okx_api_secret_here
VITE_OKX_PASSPHRASE=your_okx_passphrase_here
```

## 使用示例

### 1. 在 XFund 页面中使用

```typescript
import { useOkxDex } from '../hooks/useOkxDex';
import { TRON_TOKENS } from '../constants/tronConstants';

function XFund() {
  const {
    isLoading,
    status,
    error,
    txHash,
    bridgeToSolana,
    ensureTrxBalance,
    swapUsdtToTrx,
  } = useOkxDex();

  // 示例 1: 检查并补充 TRX 余额
  const handleCheckTrxBalance = async () => {
    const success = await ensureTrxBalance();
    if (success) {
      console.log('TRX 余额充足');
    }
  };

  // 示例 2: USDT → TRX 交换
  const handleSwapToTrx = async () => {
    try {
      await swapUsdtToTrx(20); // 交换 20 TRX
      console.log('交换成功:', txHash);
    } catch (err) {
      console.error('交换失败:', err);
    }
  };

  // 示例 3: TRON USDT → Solana USDC 跨链桥接
  const handleBridge = async () => {
    try {
      const txHash = await bridgeToSolana(
        TRON_TOKENS.USDT,                                    // TRON USDT
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',      // Solana USDC
        '100000000'                                          // 100 USDT (6 decimals)
      );
      console.log('桥接成功:', txHash);
    } catch (err) {
      console.error('桥接失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCheckTrxBalance}>
        检查 TRX 余额
      </button>
      <button onClick={handleSwapToTrx} disabled={isLoading}>
        交换 TRX
      </button>
      <button onClick={handleBridge} disabled={isLoading}>
        桥接到 Solana
      </button>
      {status && <p>状态: {status}</p>}
      {error && <p>错误: {error}</p>}
    </div>
  );
}
```

### 2. 在 XStock 页面中使用

```typescript
import { useOkxDex } from '../hooks/useOkxDex';
import { usePrivy } from '@privy-io/react-auth';

function XStock() {
  const { user } = usePrivy();
  const { bridgeToSolana, status } = useOkxDex();

  // 检测主钱包是否为 TRON
  const isTronPrimaryWallet = user?.linkedAccounts?.[0]?.walletClientType === 'privy';

  // 存款到 Vault 时，如果是 TRON 钱包，使用 OKX DEX 桥接
  const handleDeposit = async (amount: string) => {
    if (isTronPrimaryWallet) {
      console.log('使用 OKX DEX 桥接 TRON → Solana');
      await bridgeToSolana(
        TRON_TOKENS.USDT,
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount
      );
    } else {
      // 使用 LI.FI 进行 EVM/Solana 桥接
      console.log('使用 LI.FI 进行桥接');
    }
  };

  return (
    <div>
      {isTronPrimaryWallet && (
        <Alert severity="info">
          检测到 TRON 钱包，将使用 OKX DEX 进行跨链操作
        </Alert>
      )}
      <button onClick={() => handleDeposit('100000000')}>
        存款 100 USDT
      </button>
    </div>
  );
}
```

## 交易状态说明

useOkxDex Hook 提供以下状态：

| 状态 | 说明 |
|------|------|
| `idle` | 空闲状态 |
| `checking-balance` | 正在检查 TRX 余额 |
| `refilling-trx` | 正在补充 TRX |
| `getting-quote` | 正在获取报价 |
| `swapping` | 正在执行代币交换 |
| `bridging` | 正在执行跨链桥接 |
| `confirming` | 正在确认交易 |
| `success` | 操作成功 |
| `error` | 操作失败 |

## 支持的网络和代币

### TRON 支持的代币

| 代币 | 合约地址 | 小数位数 |
|------|----------|----------|
| TRX | (原生代币) | 6 |
| USDT | TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t | 6 |
| USDC | TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8 | 6 |
| USDD | TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn | 18 |

### Solana 支持的代币

| 代币 | 合约地址 | 小数位数 |
|------|----------|----------|
| SOL | (原生代币) | 9 |
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 6 |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | 6 |

## 错误处理

```typescript
const { bridgeToSolana, error } = useOkxDex();

try {
  await bridgeToSolana(...);
} catch (err) {
  if (err.message.includes('TRX 余额不足')) {
    // 提示用户充值 TRX
    console.log('请充值 TRX 作为手续费');
  } else if (err.message.includes('报价失败')) {
    // OKX DEX API 错误
    console.log('获取报价失败，请稍后重试');
  } else {
    // 其他错误
    console.error('未知错误:', err);
  }
}
```

## 自动 TRX 补充逻辑

当 TRX 余额低于 20 时，系统会自动：

1. 检测当前 TRX 余额
2. 如果 < 20 TRX，计算需要的 USDT 数量
3. 调用 OKX DEX API 获取 USDT → TRX 交换报价
4. 执行交换交易（每次补充 20 TRX）
5. 等待交易确认

**注意事项：**
- 确保 TRON 钱包有足够的 USDT 余额用于交换
- 交换过程大约需要 3-5 秒完成
- 如果 USDT 余额不足，交易会失败

## API 文档参考

- [OKX DEX Aggregator API](https://www.okx.com/web3/build/docs/waas/dex-aggregator-api)
- [TRON Developer Hub](https://developers.tron.network/)
- [TronWeb Documentation](https://tronweb.network/)

## 常见问题

### 1. 为什么需要 20 TRX？

TRON 网络上的智能合约交互和代币转账都需要消耗 TRX 作为手续费（Energy/Bandwidth）。20 TRX 可以保证多次交易的顺利进行。

### 2. 跨链需要多长时间？

- **TRON → Solana**: 通常 5-10 分钟完成
- **确认时间**: TRON 约 3 秒，Solana 约 400ms

### 3. 支持哪些交易对？

目前支持：
- TRON USDT ↔ Solana USDC
- TRON USDT → TRX (原生交换)

更多交易对根据 OKX DEX 支持情况持续添加。

### 4. 交易失败怎么办？

1. 检查 TRX 余额是否充足
2. 确认网络连接正常
3. 查看浏览器控制台错误信息
4. 联系技术支持

## 开发计划

- [x] TRON → Solana 跨链桥接
- [x] USDT → TRX 自动交换
- [x] TRX 余额智能管理
- [ ] Solana → TRON 跨链桥接
- [ ] 更多代币对支持
- [ ] 交易历史记录
- [ ] 手续费估算显示

## 安全建议

1. **API 密钥安全**: 
   - 不要在前端代码中硬编码 API 密钥
   - 使用环境变量管理敏感信息
   - 定期轮换 API 密钥

2. **交易确认**:
   - 在执行大额交易前，先测试小额交易
   - 始终验证目标地址正确性
   - 保存交易哈希用于追踪

3. **余额管理**:
   - 保持足够的 TRX 用于手续费
   - 定期检查钱包余额
   - 设置余额预警

## 支持

如有问题或建议，请联系：
- GitHub Issues: [项目地址]
- Email: support@marsliquidity.com
- Discord: [社区链接]
