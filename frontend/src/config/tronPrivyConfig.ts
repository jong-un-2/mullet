/**
 * TRON 链的 Privy WalletConnect 配置
 * 
 * 说明：
 * 1. Privy 原生支持 EVM 和 Solana 链
 * 2. TRON (TVM) 需要通过 WalletConnect 集成
 * 3. 此配置定义了 TRON 作为自定义链的参数
 * 
 * WalletConnect 支持的 TRON 钱包：
 * - imToken (iOS/Android)
 * - TokenPocket (iOS/Android)
 * - Trust Wallet (iOS/Android)
 * - Klever Wallet (iOS/Android)
 */

import { TRON_CHAIN_ID } from '../constants/tronConstants';

/**
 * TRON 链配置（用于 WalletConnect）
 */
export const TRON_CUSTOM_CHAIN = {
  // Chain ID - TRON Mainnet (CAIP-2 标准)
  id: TRON_CHAIN_ID, // 'mainnet'
  
  // 链名称
  name: 'TRON',
  
  // 网络类型
  network: 'tron-mainnet',
  
  // 原生代币
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6,
  },
  
  // RPC 节点
  rpcUrls: {
    default: {
      http: ['https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3'],
      webSocket: ['wss://rpc.ankr.com/premium-ws/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3'],
    },
    public: {
      http: [
        'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
        'https://api.tronstack.io',
        'https://rpc.ankr.com/http/tron',
      ],
    },
  },
  
  // 区块浏览器
  blockExplorers: {
    default: {
      name: 'TronScan',
      url: 'https://tronscan.org',
    },
  },
  
  // 测试网标记
  testnet: false,
};

/**
 * TRON Nile 测试网配置
 */
export const TRON_NILE_TESTNET = {
  id: 'nile', // Nile Testnet Chain ID
  name: 'TRON Nile Testnet',
  network: 'tron-nile',
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://nile.trongrid.io'],
    },
    public: {
      http: ['https://nile.trongrid.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Nile TronScan',
      url: 'https://nile.tronscan.org',
    },
  },
  testnet: true,
};

/**
 * WalletConnect 项目配置
 * 
 * 使用方法：
 * 1. 访问 https://cloud.walletconnect.com
 * 2. 创建新项目
 * 3. 获取 Project ID
 * 4. 设置环境变量 VITE_WALLETCONNECT_PROJECT_ID
 */
export const WALLETCONNECT_CONFIG = {
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
  
  // 元数据
  metadata: {
    name: 'Mars Liquid',
    description: 'Multi-chain DeFi Platform',
    url: 'https://mars-liquid.com',
    icons: ['https://mars-liquid.com/mars-logo.svg'],
  },
  
  // 支持的链（包括 TRON）
  chains: [
    `tron:${TRON_CHAIN_ID}`, // TRON Mainnet (tron:mainnet)
  ],
  
  // 可选的链
  optionalChains: [
    'tron:nile', // TRON Nile Testnet
  ],
};

/**
 * TRON WalletConnect 钱包推荐列表
 * 显示顺序和优先级
 */
export const TRON_RECOMMENDED_WALLETS = [
  {
    id: 'imtoken',
    name: 'imToken',
    platforms: ['ios', 'android'],
    priority: 1,
    description: '专业的多链钱包，完美支持 TRON',
  },
  {
    id: 'tokenpocket',
    name: 'TokenPocket',
    platforms: ['ios', 'android', 'chrome'],
    priority: 2,
    description: 'TRON 生态主流钱包',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    platforms: ['ios', 'android'],
    priority: 3,
    description: 'Binance 官方钱包',
  },
  {
    id: 'klever',
    name: 'Klever',
    platforms: ['ios', 'android'],
    priority: 4,
    description: 'TRON 原生钱包',
  },
];

/**
 * 检查 WalletConnect 是否已配置
 */
export const isWalletConnectConfigured = (): boolean => {
  return !!WALLETCONNECT_CONFIG.projectId && WALLETCONNECT_CONFIG.projectId !== '';
};

/**
 * 获取 TRON WalletConnect 配置错误提示
 */
export const getWalletConnectSetupInstructions = (): string => {
  if (isWalletConnectConfigured()) {
    return 'WalletConnect is configured ✅';
  }
  
  return `
⚠️ WalletConnect 未配置

配置步骤：
1. 访问 https://cloud.walletconnect.com
2. 注册/登录账号
3. 创建新项目 "Mars Liquid"
4. 复制 Project ID
5. 在 .env 文件中设置：
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id
6. 重启开发服务器

配置完成后，用户可以通过 WalletConnect 连接 TRON 移动端钱包。
  `.trim();
};

/**
 * TRON 链类型标识
 * 用于在 Privy 钱包列表中识别 TRON 钱包
 */
export const TRON_CHAIN_TYPE = 'tron' as const;

/**
 * 判断是否为 TRON 链
 */
export const isTronChain = (chainId?: number | string): boolean => {
  if (!chainId) return false;
  
  const chainIdStr = String(chainId).toLowerCase();
  
  return chainIdStr === TRON_CHAIN_ID || 
         chainIdStr === 'nile' || 
         chainIdStr === 'mainnet';
};

/**
 * 导出配置供 Privy 使用
 */
export default {
  customChain: TRON_CUSTOM_CHAIN,
  testnet: TRON_NILE_TESTNET,
  walletConnect: WALLETCONNECT_CONFIG,
  recommendedWallets: TRON_RECOMMENDED_WALLETS,
  isConfigured: isWalletConnectConfigured,
  getSetupInstructions: getWalletConnectSetupInstructions,
  isTronChain,
};
