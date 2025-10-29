use anchor_lang::prelude::*;

// ============================================================
// 外部协议程序 IDs 和指令识别码
// ============================================================

// === Kamino Protocol ===
pub mod kamino {
    use super::*;

    /// Kamino Vaults Program ID (V2 - Current Mainnet Version)
    /// 注意: 这是Kamino V2程序，主网上所有活跃的vault都使用这个版本
    /// V1程序 (Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE) 已废弃
    pub const PROGRAM_ID: Pubkey = pubkey!("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");

    /// Kamino Lend (Klend) Program ID
    pub const LEND_PROGRAM_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

    /// Kamino Multisig
    pub const MULTISIG: &str = "8ksXVE6SMSjQ9sPbj2XQ4Uxx6b7aXh9kHeq4nXMD2tDn";

    /// Kamino IDL Account
    pub const IDL_ACCOUNT: &str = "6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc";

    // === Instruction Discriminators ===
    pub const DEPOSIT_IX: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];
    pub const WITHDRAW_IX: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];
    pub const REDEEM_IX: [u8; 8] = [184, 12, 86, 149, 70, 196, 97, 225];
    pub const BORROW_IX: [u8; 8] = [228, 253, 131, 202, 207, 116, 89, 18];
    pub const REPAY_IX: [u8; 8] = [234, 103, 67, 82, 208, 234, 219, 166];
    pub const HARVEST_IX: [u8; 8] = [37, 144, 78, 123, 45, 78, 90, 12];
}

// === Jupiter Protocol ===
pub mod jupiter {
    use super::*;

    /// Jupiter DEX Aggregator Program ID
    pub const DEX_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

    /// Jupiter Lend Program ID
    pub const LEND_PROGRAM_ID: Pubkey = pubkey!("jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9");

    // === Jupiter Lend Instruction Discriminators ===
    pub const LEND_DEPOSIT_IX: [u8; 8] = [242, 35, 198, 137, 82, 225, 242, 182];
    pub const LEND_WITHDRAW_IX: [u8; 8] = [183, 18, 70, 156, 148, 109, 161, 34];
}

// === Protocol Type IDs ===
pub const PROTOCOL_KAMINO: u8 = 1;
pub const PROTOCOL_LIDO: u8 = 2;
pub const PROTOCOL_MARINADE: u8 = 3;
pub const PROTOCOL_JITO: u8 = 4;
pub const PROTOCOL_JUPITER_LEND: u8 = 5;
