# Mars Liquid - DeFi Lending Platform

A comprehensive DeFi lending protocol inspired by Jupiter Lend and Kamino Earn, featuring automated yield optimization, collateral management, and cross-chain lending capabilities. Built with React 19, Material-UI v7, and modern Solana/EVM Web3 technologies.

## 🚀 Key Features

### Core DeFi Lending Functionality
- **Lending & Borrowing Protocol**: Collateralized lending with automated LTV management and liquidation protection
- **Yield Optimization**: Jupiter Lend/Kamino Earn inspired automated yield farming strategies
- **Multi-chain Support**: Cross-chain lending across Solana, BSC, and Ethereum networks
- **Collateral Management**: Real-time LTV calculations, risk assessment, and position monitoring
- **Multi-sig Integration**: Squads protocol governance for decentralized treasury management
- **Mars API**: Comprehensive backend API for lending opportunities, transactions, and analytics

### 🎨 Modern Design System
- **Material-UI v7**: Latest Material Design components with enhanced theming capabilities
- **Professional Interface**: Clean, responsive design specifically optimized for DeFi trading
- **Intuitive UX**: Familiar patterns inspired by leading DEX platforms like Uniswap
- **Mobile-First**: Fully responsive design ensuring seamless mobile trading experience

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19**: Latest React with concurrent features and enhanced rendering performance
- **TypeScript**: Full type safety throughout the entire application
- **Material-UI v7**: Modern component library with advanced theming and customization
- **Vite**: Lightning-fast build tool and development server with HMR
- **React Router v7**: Latest routing capabilities with enhanced data loading

### Web3 Integration
- **Solana Integration**: @solana/web3.js v1.98, wallet-adapter for native Solana support
- **Multi-wallet Support**: Phantom, Solflare, Backpack wallets for Solana ecosystem
- **EVM Compatibility**: wagmi v2.12 and viem v2.21 for Ethereum-compatible chains
- **Cross-chain Wallets**: MetaMask, WalletConnect, Trust Wallet, Coinbase Wallet support

### DeFi Lending Protocols
- **Mars API**: Custom lending protocol API at https://mars.jongun2038.win
- **Jupiter Integration**: Jupiter Lend Earn API integration for yield optimization
- **Kamino Protocol**: Kamino Earn inspired strategies and yield calculations
- **Multi-chain Lending**: Solana SPL tokens, ERC-20 tokens, and cross-chain asset support

## 📱 Application Features

### � Lending Page (`/lending`)
- **Deposit & Earn**: Deposit assets to earn yield through automated lending strategies
- **Borrow Against Collateral**: Borrow assets using deposited collateral with dynamic LTV ratios
- **Real-time Interest Rates**: Live APY calculations based on utilization rates
- **Risk Assessment**: Automated liquidation risk monitoring and alerts

### � Positions Page (`/positions`)
- **Mars Positions Dashboard**: Complete overview of all lending and borrowing positions
- **LTV Management**: Real-time loan-to-value ratio tracking and adjustment tools
- **Yield Analytics**: Detailed earnings breakdown from lending activities
- **Position Health**: Liquidation risk indicators and safety margin calculations

### 🌾 Yield Farming (`/earn`)
- **Jupiter Lend Integration**: Automated yield optimization through Jupiter Lend Earn
- **Kamino Strategies**: Multi-protocol yield farming similar to Kamino Earn
- **Risk-Adjusted Returns**: Intelligent routing to best risk-adjusted yield opportunities
- **Compound Interest**: Automatic reinvestment and compounding mechanisms

### 📊 Portfolio Page (`/portfolio`)
- **Multi-chain DeFi Overview**: Unified view of lending positions across Solana, BSC, and Ethereum
- **Mars Protocol Integration**: Real-time tracking of all Mars lending protocol positions
- **Yield Performance**: Historical yield earnings, APY tracking, and performance analytics
- **Risk Management**: Portfolio-wide LTV monitoring and diversification metrics

### 💳 Wallet Page (`/wallet`)
- **Multi-wallet Support**: Seamless connection with popular wallet providers
- **Network Management**: Easy switching between supported blockchain networks
- **Asset Overview**: Real-time token balances and portfolio valuation
- **Transaction History**: Complete record of all wallet interactions

## 🌐 Supported Networks

| Network | Chain ID | Status | Features | Lending Protocol |
|---------|----------|--------|----------|------------------|
| Solana Mainnet | - | ✅ **Active** | Native SPL token lending, Jupiter integration | ✅ Mars Protocol |
| Solana Devnet | - | ✅ **Active** | Full lending functionality, Test tokens | ✅ Mars Protocol |
| BSC Testnet | 97 | ✅ **Active** | EVM lending, Multi-sig support | ✅ Mars Protocol |
| BSC Mainnet | 56 | 🔄 Ready | Production deployment ready | ✅ Mars Protocol |
| Ethereum Mainnet | 1 | 🔄 Configured | Multi-chain lending support | 🔄 Planned |

### Network Features
- **Solana**: Native SPL token support with Jupiter Lend integration
- **Cross-chain Lending**: Seamless asset bridging and multi-chain positions
- **Real-time Oracle**: Chainlink and Pyth price feeds for accurate valuations
- **Mars API Backend**: Deployed at https://mars.jongun2038.win for all networks

## 🛠️ Development Setup

### Prerequisites
- **Node.js 20+** and npm (required for Vite 7)
- **Git** version control
- **Solana Wallet** (Phantom, Solflare, Backpack) or **EVM Wallet** (MetaMask, WalletConnect) for testing


### Quick Start

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MarsLiquid/dex)


```bash
# Clone the repository
git clone https://github.com/jong-un-1/mars-liquid.git
cd mars-liquid

# Install dependencies (requires Node.js 20+)
npm install

# Start development server
npm run dev

# Mars API backend available at https://mars.jongun2038.win
# Open browser to http://localhost:5173
```

### Environment Configuration
Create a `.env.local` file for custom configurations:
```env
# Mars API Configuration
VITE_MARS_API_URL=https://mars.jongun2038.win

# Solana Configuration
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
VITE_SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com

# Optional: Custom RPC endpoints
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_PROJECT_ID=your_infura_project_id

# Development settings
VITE_NETWORK_ENV=mainnet
VITE_DEBUG_MODE=true
```

### Backend Services (Optional)
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Configure environment
cp wrangler.example.toml wrangler.toml

# Deploy to Cloudflare Workers
npm run deploy
```

## 🔧 Build & Deployment

### Development Commands
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linting and code quality checks
npm run lint
```

### Production Deployment
```bash
# Build optimized production bundle
npm run build

# The dist/ folder contains the production build
# Deploy to your preferred hosting service:
# - Vercel: vercel deploy
# - Netlify: netlify deploy --prod --dir=dist
# - AWS S3: aws s3 sync dist/ s3://your-bucket
```

### Build Optimization Features
- **Tree Shaking**: Automatic dead code elimination
- **Code Splitting**: Dynamic imports for optimal bundle sizes
- **Asset Optimization**: Automatic image and asset compression
- **Modern JS**: ES2020+ target for modern browsers

## 🏗️ Project Structure

```
mars-liquid/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── MainNavigation.tsx    # Main navigation with wallet integration
│   │   ├── WalletConnector.tsx   # Wallet connection component
│   │   ├── pool/                 # Pool-specific components
│   │   └── examples/             # Example implementations
│   ├── pages/               # Main application pages
│   │   ├── Swap.tsx         # Token swapping interface
│   │   ├── Pool.tsx         # Liquidity pool management
│   │   ├── AddLiquidity.tsx # Add liquidity interface
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
    "deployment": "https://mars.jongun2038.win",
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
- Mars API backend with 7 endpoints deployed at https://mars.jongun2038.win
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
