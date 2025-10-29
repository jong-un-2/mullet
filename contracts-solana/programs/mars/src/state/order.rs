use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct TargetChainMinFee {
    // chain id
    pub dest_chain_id: u32,

    // mint of token_in (corresponding to bytes32 in Solidity)
    pub token_in: [u8; 32],

    // minimum fee
    pub min_fee: u64,
}

/**
 * State of an order
 */
#[derive(
    Default,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    anchor_lang::AnchorDeserialize,
    anchor_lang::AnchorSerialize,
)]
#[repr(u16)]
pub enum OrderStatus {
    #[default]
    Unexistant,
    Created,
    Filled,
    Reverted,
}

/**
 * Stores state of an order
 */
#[account]
#[derive(Default, Debug)]
pub struct Order {
    pub seed: [u8; 32],

    // amount of token_in
    pub amount_in: u64,

    // 32-byte trader public key on the source chain (corresponding to bytes32 in Solidity)
    pub trader: [u8; 32],

    // 32-byte trader public key on the destination chain (corresponding to bytes32 in Solidity)
    pub receiver: [u8; 32],

    // chain id of the source chain
    pub src_chain_id: u32,

    // chain id of the destination chain
    pub dest_chain_id: u32,

    // unused i64, will be removed if we do data migration
    pub unused_i64_1: i64,

    // mint of token_in (corresponding to bytes32 in Solidity)
    pub token_in: [u8; 32],

    // status of the order
    pub status: OrderStatus,

    // fee associated with the order
    pub fee: u64,

    // minimum amount out the receiver expects
    pub min_amount_out: String,

    // mint of token out (corresponding to bytes32 in Solidity)
    pub token_out: [u8; 32],

    // uinique identifier of the order outside the chain
    pub order_hash: [u8; 32],
}
