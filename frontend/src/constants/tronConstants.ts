/**
 * TRON 常量定义
 * 使用 OKX DEX 或其他桥接方案
 */

// TRON Chain ID (WalletConnect CAIP-2 标准使用字符串标识符)
export const TRON_CHAIN_ID = 'mainnet';

// TRON 代币地址
export const TRON_TOKENS = {
  USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', // USDC TRC20
  TRX: '', // Native TRX (原生代币，无合约地址)
} as const;
