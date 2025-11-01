/**
 * TRON WalletConnect 集成
 * 通过 Privy 的 WalletConnect 支持 TRON 移动端钱包
 * 
 * 支持的钱包：
 * - imToken
 * - TokenPocket
 * - Trust Wallet
 * - Klever Wallet
 * - 其他 WalletConnect 兼容的 TRON 钱包
 */

import { TRON_CHAIN_ID } from '../constants/tronConstants';

/**
 * TRON WalletConnect 配置
 */
export const TRON_WALLETCONNECT_CONFIG = {
  // TRON Chain ID for WalletConnect (字符串标识符)
  chainId: TRON_CHAIN_ID, // 'mainnet'
  
  // TRON 网络名称
  chainName: 'TRON',
  
  // RPC URLs
  rpcUrls: [
    'https://rpc.ankr.com/premium-http/tron/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
    'https://api.tronstack.io',
  ],
  
  // Block Explorer URLs
  blockExplorerUrls: [
    'https://tronscan.org',
  ],
  
  // Native Currency
  nativeCurrency: {
    name: 'TRX',
    symbol: 'TRX',
    decimals: 6,
  },
};

/**
 * WalletConnect 支持的 TRON 钱包列表
 */
export const TRON_WALLETCONNECT_WALLETS = {
  imToken: {
    name: 'imToken',
    logo: 'https://token.im/favicon.ico',
    description: '多链钱包，支持 TRON DApp',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/imtoken/id1384798940',
      android: 'https://play.google.com/store/apps/details?id=im.token.app',
    },
  },
  
  tokenPocket: {
    name: 'TokenPocket',
    logo: 'https://www.tokenpocket.pro/favicon.ico',
    description: '多链钱包，原生支持 TRON',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/tokenpocket/id1436028697',
      android: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket',
    },
  },
  
  trustWallet: {
    name: 'Trust Wallet',
    logo: 'https://trustwallet.com/favicon.ico',
    description: 'Binance 官方钱包，支持 TRON',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
      android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
    },
  },
  
  klever: {
    name: 'Klever Wallet',
    logo: 'https://klever.io/favicon.ico',
    description: 'TRON 原生钱包',
    downloadUrl: {
      ios: 'https://apps.apple.com/app/klever-wallet/id1500501888',
      android: 'https://play.google.com/store/apps/details?id=com.klever.wallet',
    },
  },
};

/**
 * 检查是否为 TRON WalletConnect 会话
 */
export const isTronWalletConnect = (chainId?: number | string): boolean => {
  const chainIdStr = String(chainId).toLowerCase();
  return chainIdStr === TRON_CHAIN_ID || chainIdStr === 'mainnet' || chainIdStr === 'nile';
};

/**
 * 格式化 TRON 地址用于显示
 */
export const formatTronAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * 验证 TRON WalletConnect 地址
 */
export const isValidTronWCAddress = (address: string): boolean => {
  // TRON 地址格式：T + 33个字符
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
};

/**
 * 获取 TRON WalletConnect 网络参数
 * 用于在 WalletConnect 中添加/切换 TRON 网络
 */
export const getTronWCNetworkParams = () => ({
  chainId: TRON_CHAIN_ID, // TRON 使用字符串标识符 'mainnet'
  chainName: TRON_WALLETCONNECT_CONFIG.chainName,
  nativeCurrency: TRON_WALLETCONNECT_CONFIG.nativeCurrency,
  rpcUrls: TRON_WALLETCONNECT_CONFIG.rpcUrls,
  blockExplorerUrls: TRON_WALLETCONNECT_CONFIG.blockExplorerUrls,
});

/**
 * TRON WalletConnect 错误处理
 */
export class TronWalletConnectError extends Error {
  code: string;
  
  constructor(message: string, code: string = 'TRON_WC_ERROR') {
    super(message);
    this.name = 'TronWalletConnectError';
    this.code = code;
  }
}

/**
 * TRON WalletConnect 常见错误
 */
export const TRON_WC_ERRORS = {
  WALLET_NOT_FOUND: 'TRON wallet not found. Please install a compatible wallet.',
  CONNECTION_FAILED: 'Failed to connect to TRON wallet.',
  NETWORK_MISMATCH: 'Please switch to TRON network in your wallet.',
  USER_REJECTED: 'User rejected the connection request.',
  UNSUPPORTED_CHAIN: 'This wallet does not support TRON network.',
};

/**
 * 获取 TRON WalletConnect 深链接
 * 用于移动端钱包的深链接打开
 */
export const getTronWalletDeepLink = (
  walletName: keyof typeof TRON_WALLETCONNECT_WALLETS,
  uri: string
): string => {
  const encodedUri = encodeURIComponent(uri);
  
  switch (walletName) {
    case 'imToken':
      return `imtokenv2://wc?uri=${encodedUri}`;
    
    case 'tokenPocket':
      return `tpoutside://wc?uri=${encodedUri}`;
    
    case 'trustWallet':
      return `trust://wc?uri=${encodedUri}`;
    
    case 'klever':
      return `klever://wc?uri=${encodedUri}`;
    
    default:
      return uri;
  }
};

/**
 * TRON WalletConnect 使用示例
 */
export const TRON_WC_USAGE_EXAMPLE = `
// 1. 用户扫描二维码或点击深链接
// 2. 移动端钱包打开并请求连接
// 3. 用户在钱包中确认连接
// 4. 应用接收 TRON 地址和会话

// 通过 Privy 自动处理：
import { useWallets } from '@privy-io/react-auth';

const { wallets } = useWallets();
const tronWallet = wallets.find(w => 
  w.chainType === 'tron' || 
  isTronWalletConnect(w.chainId)
);

if (tronWallet) {
  console.log('TRON Address:', tronWallet.address);
}
`;

export default {
  config: TRON_WALLETCONNECT_CONFIG,
  wallets: TRON_WALLETCONNECT_WALLETS,
  isTronWalletConnect,
  formatTronAddress,
  isValidTronWCAddress,
  getTronWCNetworkParams,
  getTronWalletDeepLink,
  TronWalletConnectError,
  TRON_WC_ERRORS,
};
