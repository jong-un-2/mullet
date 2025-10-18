// Mars 项目主网常量配置
// 最后更新: 2025-10-18 (New deployment with TransferChecked for Token-2022)

import { PublicKey } from "@solana/web3.js";

// Mars Program ID
// Mars Program ID （TransferChecked for Token-2022 platform fees + init with platform_fee_wallet）
export const MARS_PROGRAM_ID = "6uwR1ALH4peF5Xs1AMYEmmuPX9Wz5PaTqiNXZA2TKuXD";

// Kamino 集成
export const KAMINO_V2_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
export const KLEND_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

// 代币 Mints
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const PYUSD_MINT = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// Kamino Vaults (示例)
export const USDC_VAULT_ADDRESS = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");

// RPC URLs
export const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3";

// 旧程序ID (已废弃，仅供参考)
export const KAMINO_V1_PROGRAM = "Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE"; // V1已废弃
