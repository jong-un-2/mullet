# Mars Liquid - 跨链 DeFi 流动性聚合平台

Mars Liquid 是一个现代化的跨链 DeFi 应用，集成了收益聚合、DEX 交易、流动性管理和借贷功能。基于 React 19、Material-UI v7 和最新的 Solana/EVM Web3 技术构建，为用户提供一站式的 DeFi 服务体验。

## 🚀 核心功能

### 🌊 Mars 协议集成
- **收益聚合**: 通过 Mars API 集成 Kamino Earn 和 Jupiter Lend
- **Vault 管理**: 查看和管理 Vault 持仓
- **跨链桥接**: LI.FI 协议集成，支持跨链资产转移
- **实时数据**: Vault 状态、用户持仓、历史收益追踪
- **自动复利**: 智能收益再投资和优化策略

### 💱 DEX 交易功能
- **代币交换**: 支持 Solana SPL 和 EVM ERC-20 代币
- **流动性管理**: 添加/移除流动性，赚取手续费
- **多链支持**: Solana, BSC, Ethereum, Polygon, Avalanche
- **实时价格**: WebSocket 实时价格推送
- **交易历史**: 完整的交易记录和分析

### 💼 投资组合管理
- **多链资产**: 统一查看 Solana 和 EVM 链上资产
- **持仓追踪**: 实时 Vault 持仓和收益显示
- **风险分析**: LTV 比率、清算风险监控
- **收益统计**: 历史收益、APY 追踪和性能分析
- **Mars Positions**: 专门的 Mars 协议持仓面板

### 🔐 多钱包支持
- **Solana 钱包**: Phantom, Solflare, Backpack
- **EVM 钱包**: MetaMask, WalletConnect, Coinbase Wallet
- **统一界面**: 无缝切换不同钱包和网络
- **网络管理**: 轻松在支持的区块链间切换

### 🎨 现代化设计
- **Material-UI v7**: 最新的 Material Design 组件
- **响应式设计**: 完美适配桌面和移动设备
- **深色模式**: 护眼深色主题
- **流畅动画**: 专业的交互体验

## 🏗️ 技术架构

### 前端技术栈
- **React 19**: 最新的并发特性和增强渲染性能
- **TypeScript**: 全栈类型安全保障
- **Material-UI v7**: 现代化的设计系统和组件库
- **Vite**: 闪电般的构建工具和热更新
- **React Router v7**: 最新的路由和数据加载能力

### Web3 集成
- **Solana 生态**:
  - `@solana/web3.js` v1.98 - Solana 核心库
  - `@solana/wallet-adapter` - 钱包适配器生态
  - Phantom, Solflare, Backpack 钱包支持
  
- **EVM 兼容**:
  - `wagmi` v2.12 - React Hooks for Ethereum
  - `viem` v2.21 - TypeScript 以太坊接口
  - `@rainbow-me/rainbowkit` - 钱包连接 UI
  - MetaMask, WalletConnect, Trust Wallet 支持

### DeFi 协议集成
- **Mars Protocol**: 
  - Mars API (`https://api.marsliquidity.com`)
  - Vault 管理和持仓追踪
  - 跨链桥接（LI.FI）
  
- **Kamino Finance**:
  - `@kamino-finance/klend-sdk` v7.1.8
  - `@kamino-finance/farms-sdk` v3.2.13
  - 收益优化和流动性挖矿
  
- **Jupiter Protocol**:
  - Jupiter Aggregator 集成
  - 最佳价格路由
  
- **Meteora DLMM**:
  - `@lb-xyz/sdk` v5.0.14
  - 集中流动性池管理
  
- **LI.FI Protocol**:
  - `@lifi/sdk` v3.12.14
  - 跨链桥接和资产转移

### 状态管理与数据
- **Zustand**: 轻量级状态管理
- **React Query**: 服务端状态同步
- **WebSocket**: 实时价格推送
- **LocalStorage**: 本地数据持久化

## 📱 应用页面

### 🏊 XLiquid 页面 (`/xliquid`)
- **Mars Vaults 展示**: 查看所有可用的 Vault 及其 APY
- **存款界面**: 存入资产到 Vault 赚取收益
- **提款界面**: 从 Vault 提取资产
- **实时数据**: Vault TVL、APY、用户份额实时更新

### 📊 Portfolio 页面 (`/portfolio`)
- **Mars Positions**: 完整的 Mars 协议持仓总览
- **多链资产**: Solana、BSC、Ethereum 资产统一展示
- **收益追踪**: 历史收益、APY 变化和性能分析
- **风险指标**: LTV 比率、清算风险、安全边际计算

### 💱 Swap 页面 (`/swap`)
- **代币交换**: 支持 Solana SPL 和 EVM ERC-20 代币
- **智能路由**: 自动寻找最佳交易路径
- **实时价格**: WebSocket 实时价格更新
- **滑点保护**: 可配置的滑点容忍度

### 🏊 Pool 页面 (`/pool`)
- **流动性池**: 查看所有可用的流动性池
- **添加流动性**: 提供流动性赚取交易手续费
- **移除流动性**: 提取流动性和累积的手续费
- **池统计**: TVL、交易量、手续费收入

### 💳 Wallet 页面 (`/wallet`)
- **多钱包管理**: 连接和切换 Solana/EVM 钱包
- **资产余额**: 实时查看所有代币余额
- **网络切换**: 轻松在不同区块链间切换
- **交易历史**: 完整的钱包交易记录

### 📈 XStock 页面 (`/xstock`)
- **收益仪表板**: 总览所有投资和收益
- **APY 比较**: 不同 Vault 和协议的收益对比
- **历史数据**: 收益历史图表和趋势分析

### 🎯 XFund 页面 (`/xfund`)
- **资金管理**: 专业的资金配置界面
- **策略选择**: 不同风险等级的投资策略
- **自动再平衡**: 智能资产分配优化

## 🌐 支持的网络

| 网络 | Chain ID | 状态 | 功能特性 | RPC 端点 |
|------|----------|------|----------|----------|
| **Solana Mainnet** | - | ✅ **生产环境** | Mars 协议、Jupiter、Kamino | Helius RPC |
| **Solana Devnet** | - | ✅ **测试环境** | 完整功能、测试代币 | Public RPC |
| **BSC Mainnet** | 56 | ✅ **生产环境** | DEX 交易、跨链桥接 | BSC RPC |
| **BSC Testnet** | 97 | ✅ **测试环境** | 完整 DEX 功能 | BSC Testnet RPC |
| **Ethereum Mainnet** | 1 | 🔄 **准备中** | L1 流动性、高级 DeFi | Alchemy/Infura |
| **Polygon** | 137 | 🔄 **规划中** | 低费用交易 | Polygon RPC |
| **Avalanche** | 43114 | 🔄 **规划中** | 高性能交易 | Avalanche RPC |

### 网络特性
- **Solana**: 原生 SPL 代币、Mars 协议、Jupiter 聚合器、Kamino Earn
- **跨链桥接**: LI.FI 协议支持所有主流链间资产转移
- **实时预言机**: Pyth (Solana) 和 Chainlink (EVM) 价格数据
- **Mars API**: 所有网络统一的后端 API (`https://api.marsliquidity.com`)

## 🛠️ 开发环境设置

### 环境要求
- **Node.js 20.19+** 或 **22.12+** (支持最新的 ES 特性)
- **npm 9.0+** 或 **yarn 1.22+**
- **Git** 版本控制
- **Solana 钱包** (Phantom, Solflare, Backpack) 或 **EVM 钱包** (MetaMask) 用于测试

### 快速开始

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jong-un-1/mars-liquid)

```bash
# 克隆项目
git clone https://github.com/jong-un-1/mars-liquid.git
cd mars-liquid/frontend

# 安装依赖（需要 Node.js 20+）
npm install

# 启动开发服务器
npm run dev

# 应用将在 http://localhost:5173 打开
# Mars API 后端: https://api.marsliquidity.com
```

### 环境配置

创建 `.env` 文件进行自定义配置：

```env
# Mars API 配置
VITE_MARS_API_URL=https://api.marsliquidity.com

# Solana 配置
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-api-key
VITE_SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_CLUSTER=mainnet-beta

# EVM RPC 配置（可选）
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_PROJECT_ID=your_infura_project_id
VITE_BSC_RPC_URL=https://bsc-dataseed1.binance.org

# 开发设置
VITE_NETWORK_ENV=mainnet
VITE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true

# Privy 配置（钱包连接）
VITE_PRIVY_APP_ID=your_privy_app_id
```

### 后端服务配置（可选）

如果需要本地运行后端：

```bash
# 进入后端目录
cd ../backend

# 安装后端依赖
npm install

# 配置环境
# 参考 backend/README.md 进行配置

# 部署到 Cloudflare Workers
npm run deploy
```

## 🔧 构建与部署

### 开发命令

```bash
# 启动开发服务器（带热重载）
npm run dev

# 构建生产版本
npm run build

# 本地预览生产构建
npm run preview

# 代码检查和格式化
npm run lint

# 版本管理
npm run version:patch      # 补丁版本 (1.0.0 -> 1.0.1)
npm run version:minor      # 次要版本 (1.0.0 -> 1.1.0)
npm run version:major      # 主要版本 (1.0.0 -> 2.0.0)
```

### 生产部署

#### Cloudflare Pages 部署

```bash
# 构建优化的生产包
npm run build

# 部署到 Cloudflare Pages
npm run deploy

# 或使用 wrangler 直接部署
npx wrangler pages deploy dist --project-name mars
```

#### 其他平台部署

```bash
# Vercel 部署
npm run build
vercel deploy --prod

# Netlify 部署
npm run build
netlify deploy --prod --dir=dist

# AWS S3 + CloudFront 部署
npm run build
aws s3 sync dist/ s3://your-bucket
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 构建优化特性

- ✅ **Tree Shaking**: 自动消除未使用的代码
- ✅ **Code Splitting**: 动态导入优化包大小
- ✅ **Asset Optimization**: 自动图片和资源压缩
- ✅ **Modern JS**: ES2020+ 目标，支持现代浏览器
- ✅ **Lazy Loading**: 路由级代码分割
- ✅ **Gzip/Brotli**: 自动压缩输出文件

## 🏗️ 项目结构

```
frontend/
├── src/
│   ├── components/              # 可复用 UI 组件
│   │   ├── MainNavigation.tsx   # 主导航（带钱包集成）
│   │   ├── WalletConnector.tsx  # 钱包连接组件
│   │   ├── MarsPositions.tsx    # Mars 持仓展示
│   │   ├── MarsWalletTracker.tsx # Mars 钱包追踪
│   │   ├── UnifiedWalletButton.tsx # 统一钱包按钮
│   │   ├── NetworkStatus.tsx    # 网络状态显示
│   │   ├── TransactionProgress.tsx # 交易进度
│   │   ├── pool/                # 流动性池组件
│   │   └── examples/            # 示例实现
│   │
│   ├── pages/                   # 主要应用页面
│   │   ├── XLiquid.tsx          # Mars Vault 管理
│   │   ├── Portfolio.tsx        # 投资组合总览
│   │   ├── Swap.tsx             # 代币交换界面
│   │   ├── Pool.tsx             # 流动性池管理
│   │   ├── AddLiquidity.tsx     # 添加流动性
│   │   ├── Wallet.tsx           # 钱包管理
│   │   ├── XStock.tsx           # 收益仪表板
│   │   └── XFund.tsx            # 资金管理
│   │
│   ├── hooks/                   # React Hooks
│   │   ├── useMarsApi.ts        # Mars API 集成
│   │   ├── useMarsContract.ts   # Mars 合约交互
│   │   ├── useMarsData.ts       # Mars 数据获取
│   │   ├── useVaultData.ts      # Vault 数据
│   │   ├── useUserVaultPosition.ts # 用户持仓
│   │   ├── useVaultHistoricalData.ts # 历史数据
│   │   ├── useSolanaBalance.ts  # Solana 余额
│   │   └── useMarsWalletConnection.ts # 钱包连接
│   │
│   ├── services/                # 业务逻辑服务
│   │   ├── marsApiService.ts    # Mars API 服务
│   │   ├── marsContract.ts      # 合约交互
│   │   ├── kaminoSdkHelper.ts   # Kamino SDK
│   │   ├── balanceService.ts    # 余额查询
│   │   └── ...
│   │
│   ├── dex/                     # DEX 集成
│   │   ├── dexConfig.ts         # DEX 配置
│   │   ├── tokenConfig.ts       # 代币配置
│   │   ├── networkTokens.ts     # 网络代币列表
│   │   ├── wagmiConfig.ts       # Wagmi 配置
│   │   ├── viemClient.ts        # Viem 客户端
│   │   ├── lbSdkConfig.ts       # Meteora SDK
│   │   ├── hooks/               # DEX Hooks
│   │   ├── services/            # DEX 服务
│   │   ├── utils/               # DEX 工具
│   │   └── abis/                # 合约 ABI
│   │
│   ├── config/                  # 配置文件
│   │   ├── api.ts               # API 配置
│   │   ├── networkConfig.ts     # 网络配置
│   │   ├── privyConfig.ts       # Privy 配置
│   │   └── solanaWalletConfig.tsx # Solana 钱包配置
│   │
│   ├── stores/                  # 状态管理
│   │   └── ...                  # Zustand stores
│   │
│   ├── utils/                   # 工具函数
│   │   └── ...
│   │
│   ├── idl/                     # Solana 程序 IDL
│   │   └── mars.json            # Mars 程序 IDL
│   │
│   ├── assets/                  # 静态资源
│   │   └── ...
│   │
│   ├── main.tsx                 # 应用入口
│   ├── theme.ts                 # MUI 主题配置
│   └── index.css                # 全局样式
│
├── public/                      # 公共资源
│   └── _redirects               # Cloudflare Pages 重定向
│
├── .github/                     # GitHub 配置
│   ├── workflows/               # CI/CD 工作流
│   ├── copilot-instructions.md  # Copilot 指令
│   └── chatmodes/               # 聊天模式
│
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── eslint.config.js             # ESLint 配置
├── package.json                 # 项目依赖
├── API_DOCUMENTATION.md         # API 文档
└── README.md                    # 项目说明
```

## 🔌 核心集成

### Mars Protocol API

```typescript
import { useMarsApi } from '@/hooks/useMarsApi';

function VaultDashboard() {
  const { vaults, loading, error } = useMarsApi();
  
  return (
    <div>
      {vaults.map(vault => (
        <VaultCard key={vault.address} vault={vault} />
      ))}
    </div>
  );
}
```

### Solana 钱包连接

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function WalletButton() {
  const { publicKey, connected } = useWallet();
  
  return <WalletMultiButton />;
}
```

### EVM 钱包连接

```typescript
import { useAccount, useConnect } from 'wagmi';

function EvmWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect MetaMask
    </button>
  );
}
```

### Kamino SDK 使用

```typescript
import { useKaminoVault } from '@/hooks/useKaminoVault';

function KaminoDeposit() {
  const { deposit, loading } = useKaminoVault();
  
  const handleDeposit = async (amount: number) => {
    await deposit(amount);
  };
  
  return <DepositForm onSubmit={handleDeposit} />;
}
```

## 📚 相关文档

- 📖 [API 文档](./API_DOCUMENTATION.md) - 完整的 API 使用说明
- 📖 [后端 API](../backend/docs/mars-dex-api.md) - 后端 API 参考
- 📖 [智能合约](../contracts-solana/README.md) - Solana 智能合约
- 📖 [部署指南](../backend/SETUP_GUIDE.md) - 完整部署指南

## 🛡️ 安全性

### 钱包安全
- ✅ 不存储私钥，所有签名在钱包中完成
- ✅ 交易前显示完整的交易详情
- ✅ 支持硬件钱包（Ledger）
- ✅ 网络切换确认提示

### 智能合约安全
- ✅ 审计过的合约地址硬编码
- ✅ 交易参数验证
- ✅ 滑点保护
- ✅ 前端交易模拟

### 数据安全
- ✅ HTTPS 强制加密
- ✅ API 请求签名验证
- ✅ 本地数据加密存储
- ✅ XSS/CSRF 防护

## 🧪 测试

### 运行测试

```bash
# 运行单元测试
npm run test

# 运行测试覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e
```

### 测试脚本

```bash
# 测试钱包余额
node test-wallet-balance.js

# 调试价格数据
node debug-price.js
```

## 🤝 贡献指南

### 开发流程

```bash
# 1. Fork 项目
git clone https://github.com/your-username/mars-liquid.git
cd mars-liquid/frontend

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 开发和测试
npm run dev
npm run lint

# 4. 提交更改
git commit -m "feat: add your feature"

# 5. 推送并创建 Pull Request
git push origin feature/your-feature
```

### 代码规范

- **TypeScript**: 严格类型检查
- **ESLint**: 遵循项目 ESLint 配置
- **Prettier**: 自动代码格式化
- **Commit**: 使用语义化提交消息（feat, fix, docs, etc.）
- **测试**: 新功能需要包含测试用例

## 📞 支持与反馈

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/jong-un-1/mars-liquid/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- 📧 **邮件联系**: support@mars-liquid.finance
- 💬 **Discord**: [Mars Liquid Community](https://discord.gg/mars-liquid)

## 🔗 相关链接

- **官方网站**: [mars-liquid.finance](https://mars-liquid.finance)
- **应用程序**: [app.mars-liquid.finance](https://app.mars-liquid.finance)
- **Mars API**: [api.marsliquidity.com](https://api.marsliquidity.com)
- **GitHub**: [github.com/jong-un-1/mars-liquid](https://github.com/jong-un-1/mars-liquid)
- **主项目 README**: [../README.md](../README.md)
- **后端项目**: [../backend](../backend)
- **智能合约**: [../contracts-solana](../contracts-solana)
- **管理后台**: [../mars-admin](../mars-admin)

## 📄 许可证

本项目采用 [MIT License](../LICENSE) 开源协议。

---

**开发团队**: Mars Liquid Protocol Team  
**项目版本**: 1.0.0  
**React 版本**: 19  
**Material-UI 版本**: 7  
**最后更新**: 2025年10月

**Mars Liquid Frontend** - 现代化的跨链 DeFi 平台 🚀
│   │   ├── Portfolio.tsx    # Portfolio dashboard
│   │   └── Wallet.tsx       # Wallet connection and overview
│   ├── dex/                 # DEX core functionality
│   │   ├── hooks/           # Custom React hooks for DEX operations
│   │   ├── services/        # API services and price feeds
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript type definitions
│   │   ├── abis/            # Smart contract ABIs
│   │   └── config files     # Network and token configurations
│   └── assets/              # Static assets and images
├── backend/                 # Cloudflare Workers backend
│   ├── src/                 # Backend source code
│   ├── test/                # Backend tests
│   └── config files         # Worker configurations
└── public/                  # Public static files
```

### Key Directories
- **`src/dex/hooks/`**: Custom hooks for DEX operations (swapping, liquidity, etc.)
- **`src/dex/services/`**: Price feeds, API integrations, and external services
- **`src/components/pool/`**: Specialized components for liquidity management
- **`backend/`**: Optional serverless backend for enhanced features

## 🔐 Security & Performance Features

### Security Implementation
- ✅ **Wallet Security**: Industry-standard secure connection protocols
- ✅ **Slippage Protection**: Configurable tolerance levels with smart defaults
- ✅ **Price Impact Analysis**: Real-time impact calculations and warnings
- ✅ **Transaction Monitoring**: Complete transaction lifecycle tracking
- ✅ **Input Validation**: Comprehensive sanitization and validation
- ✅ **Error Handling**: Graceful error recovery and user feedback
- ✅ **Smart Contract Safety**: Extensive testing and validation of contract interactions

### Performance Optimizations
- **React 19**: Concurrent rendering and automatic batching for smooth UX
- **Dynamic Liquidity Market Maker Protocol**: Efficient concentrated liquidity with gas optimizations
- **Advanced Caching**: Intelligent caching for Web3 calls and price data
- **Bundle Optimization**: Tree shaking, code splitting, and modern JS features
- **Real-time Updates**: WebSocket connections for live price feeds
- **Responsive Design**: Optimized for all device sizes and screen resolutions

### Technology Stack Summary
```json
{
  "frontend": {
    "framework": "React 19.1.0",
    "ui": "Material-UI 7.3.2", 
    "solana": "@solana/web3.js 1.98.4 + @solana/wallet-adapter",
    "evm": "wagmi 2.12.29 + viem 2.21.54",
    "routing": "React Router 7.6.2",
    "build": "Vite 7.1.7"
  },
  "defi": {
    "protocol": "Mars API + Jupiter Lend + Kamino Earn",
    "wallets": "Phantom + Solflare + MetaMask + WalletConnect",
    "lending": "SPL Tokens + ERC-20 + Cross-chain bridges"
  },
  "backend": {
    "api": "Cloudflare Workers + D1 Database",
    "deployment": "https://api.marsliquidity.com",
    "caching": "Redis + KV Storage"
  }
}
```

## 🤝 Contributing

We welcome contributions from the DeFi community! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information.

### Development Workflow
1. **Fork** the repository on GitHub
2. **Clone** your fork: `git clone https://github.com/your-username/mars-liquid.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Develop** your feature with proper testing
5. **Test** thoroughly on BSC Testnet
6. **Commit** with clear messages: `git commit -m 'feat: add amazing feature'`
7. **Push** to your branch: `git push origin feature/amazing-feature`
8. **Open** a Pull Request with detailed description

### Contribution Guidelines
- Follow TypeScript best practices and maintain type safety
- Write comprehensive tests for new features
- Ensure all existing tests pass
- Update documentation for any API changes
- Test on multiple wallet providers and networks

### Areas for Contribution
- 🔧 **Protocol Integration**: Additional DEX protocol support
- 🎨 **UI/UX Improvements**: Enhanced user interface components
- 📊 **Analytics**: Advanced portfolio and trading analytics
- 🌐 **Multi-chain**: Additional blockchain network support
- 🧪 **Testing**: Improved test coverage and testing utilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Disclaimers

**Financial Risk Warning**:
- This is experimental DeFi software under active development
- **Use at your own risk**, especially on mainnet networks
- **Always test thoroughly** on testnets before mainnet usage
- DeFi trading involves significant financial risk - **only invest what you can afford to lose**
- **No warranty or guarantee** is provided for any financial outcomes

**Development Status**:
- Currently optimized for BSC Testnet with active development
- BSC Mainnet and Ethereum support are configured but require additional testing
- Smart contract interactions should be thoroughly tested before production use

---

## 🙏 Acknowledgments

- **[Jupiter Lend](https://jup.ag/lend/earn)** - Inspiration for automated yield optimization strategies
- **[Kamino Earn](https://kamino.finance/)** - Advanced DeFi yield farming protocols
- **[Solana](https://solana.com/)** - High-performance blockchain for DeFi applications
- **[Material-UI](https://mui.com/)** - Comprehensive React component library
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Serverless backend infrastructure

---

**Built with ❤️ for the DeFi community**

*Mars Liquid - Comprehensive DeFi lending platform with automated yield optimization*

## 🚀 Getting Started Quickly

1. **Connect Wallet**: Use Phantom (Solana) or MetaMask (EVM) to connect your wallet
2. **Choose Network**: Switch between Solana, BSC Testnet, or other supported networks
3. **Deposit Assets**: Start earning yield by depositing supported tokens
4. **Borrow Safely**: Use deposited assets as collateral for borrowing with automatic LTV management
5. **Monitor Portfolio**: Track your lending positions and yield earnings in real-time
6. **Optimize Yield**: Leverage Jupiter Lend and Kamino Earn integrations for maximum returns

For detailed documentation and API references, visit our [Documentation](docs/) directory.

## 📊 Current Development Status

### ✅ Completed Features
- Multi-wallet integration (Phantom, Solflare, MetaMask, WalletConnect, etc.)
- Mars API backend with 7 endpoints deployed at https://api.marsliquidity.com
- DeFi lending protocol with LTV management and yield optimization
- Portfolio dashboard with Mars positions tracking
- Multi-network support (Solana, BSC Testnet, BSC Mainnet, Ethereum)
- Jupiter Lend and Kamino Earn integration for yield strategies

### 🔄 In Progress
- Solana program development for native lending protocol
- Advanced yield farming strategies and auto-compounding
- Cross-chain asset bridging and position management
- Comprehensive DeFi analytics and risk assessment tools

### 🎯 Roadmap
- Squads multi-sig integration for governance
- Layer 2 network support (Arbitrum, Polygon, Solana L2s)
- Advanced liquidation protection mechanisms
- Governance token and DAO for protocol management
- Institutional lending features and compliance tools
