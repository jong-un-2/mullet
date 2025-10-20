/**
 * 费率配置
 * 与 Solana 链上配置保持同步
 */

export const FEE_CONFIG = {
  // Protocol Fee (全局协议费率)
  // 链上配置: numerator/denominator
  PROTOCOL_FEE_NUMERATOR: 0,
  PROTOCOL_FEE_DENOMINATOR: 100,
  
  // Platform Fee (Vault 平台费率)
  // 链上配置: platform_fee_bps (basis points, 1 bps = 0.01%)
  PLATFORM_FEE_BPS: 2500, // 25%
  
  // Cross Chain Fee (跨链手续费)
  CROSS_CHAIN_FEE_BPS: 30, // 0.3%
};

/**
 * 获取协议费率百分比
 */
export function getProtocolFeeRate(): number {
  if (FEE_CONFIG.PROTOCOL_FEE_DENOMINATOR === 0) {
    return 0;
  }
  return (FEE_CONFIG.PROTOCOL_FEE_NUMERATOR / FEE_CONFIG.PROTOCOL_FEE_DENOMINATOR) * 100;
}

/**
 * 获取平台费率百分比
 */
export function getPlatformFeeRate(): number {
  return FEE_CONFIG.PLATFORM_FEE_BPS / 100; // bps to percentage
}

/**
 * 获取跨链费率百分比
 */
export function getCrossChainFeeRate(): number {
  return FEE_CONFIG.CROSS_CHAIN_FEE_BPS / 100; // bps to percentage
}

/**
 * 当前生效的费率（用于显示）
 * 目前使用协议费率
 */
export function getCurrentFeeRate(): number {
  return getProtocolFeeRate();
}
