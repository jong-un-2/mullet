/**
 * Token Icon URLs Configuration
 * 统一管理所有代币的图标 CDN 地址
 */

export const TOKEN_ICONS = {
  // Solana Tokens
  SOL: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  USDC_SOLANA: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  USDT_SOLANA: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  PYUSD_SOLANA: 'https://coin-images.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png',
  
  // Ethereum Tokens
  ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  USDC_ETHEREUM: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT_ETHEREUM: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  PYUSD_ETHEREUM: 'https://coin-images.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png',
  
  // Generic (可用于任何链的 USDC/USDT/PYUSD)
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  PYUSD: 'https://coin-images.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png',
} as const;

/**
 * 根据代币符号和链获取图标 URL
 */
export function getTokenIcon(symbol: string, chain?: 'solana' | 'ethereum'): string {
  const key = `${symbol}_${chain?.toUpperCase()}` as keyof typeof TOKEN_ICONS;
  
  // 尝试链特定的图标
  if (chain && key in TOKEN_ICONS) {
    return TOKEN_ICONS[key];
  }
  
  // 回退到通用图标
  if (symbol in TOKEN_ICONS) {
    return TOKEN_ICONS[symbol as keyof typeof TOKEN_ICONS];
  }
  
  // 默认返回一个占位符
  return '';
}

/**
 * 代币符号标准化
 */
export function normalizeTokenSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[-_\s]/g, '');
}
