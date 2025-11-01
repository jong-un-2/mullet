/**
 * TRON 常量定义
 * 
 * 支持功能：
 * 1. TRON 钱包集成（Privy）
 * 2. TRON 跨链桥接（OKX DEX）
 * 3. TRON 原生代币交换
 */

// TRON Chain ID (WalletConnect CAIP-2 标准使用字符串标识符)
export const TRON_CHAIN_ID = 'mainnet';

// TRON Nile Testnet Chain ID
export const TRON_NILE_CHAIN_ID = 'nile';

// TRON 代币地址（Mainnet）
export const TRON_TOKENS = {
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', // USDC TRC20
  TRX: '', // Native TRX (原生代币，无合约地址)
  USDD: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', // USDD Decentralized USD
  BTT: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4', // BitTorrent
  JST: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9', // JUST
} as const;

// TRON 代币小数位数
export const TRON_TOKEN_DECIMALS = {
  TRX: 6,
  USDT: 6,
  USDC: 6,
  USDD: 18,
  BTT: 18,
  JST: 18,
} as const;

// TRON 最小余额要求（用于手续费）
export const MIN_TRX_FOR_FEES = 20; // 最少保留 20 TRX 作为手续费

// TRON 交易确认时间（秒）
export const TRON_CONFIRMATION_TIME = 3; // 约 3 秒出块

// TRON 区块浏览器
export const TRON_EXPLORER = {
  mainnet: 'https://tronscan.org',
  nile: 'https://nile.tronscan.org',
} as const;

/**
 * 格式化 TRON 地址用于显示
 */
export function formatTronAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 验证 TRON 地址格式
 */
export function isValidTronAddress(address: string): boolean {
  return /^T[A-Za-z1-9]{33}$/.test(address);
}

/**
 * 获取 TRON 区块浏览器交易链接
 */
export function getTronTxLink(txHash: string, network: 'mainnet' | 'nile' = 'mainnet'): string {
  return `${TRON_EXPLORER[network]}/#/transaction/${txHash}`;
}

/**
 * 获取 TRON 区块浏览器地址链接
 */
export function getTronAddressLink(address: string, network: 'mainnet' | 'nile' = 'mainnet'): string {
  return `${TRON_EXPLORER[network]}/#/address/${address}`;
}
