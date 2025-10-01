// Mars 项目主网常量配置
// 最后更新: 2025-10-01 21:45

import { PublicKey } from "@solana/web3.js";

// Mars 程序 V4 (最新部署 - 支持 Token-2022 + Kamino remaining_accounts + Withdraw)
export const MARS_PROGRAM_ID = new PublicKey("9A2JwsP3yrP4TPAoRa2kqmBWwtfKfT73syPqSaSCLPXJ");

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
export const MARS_PROGRAM_ID_V1 = "FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY"; // 已关闭
export const MARS_PROGRAM_ID_V0 = "5j75RWGLHdj8UL3rtrinkBt4iHz5pE7rqo5hp4gvmWF"; // 已关闭
export const KAMINO_V1_PROGRAM = "Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE"; // V1已废弃
