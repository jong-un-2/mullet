use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::*;
use std::mem::size_of;

// USDC/USD id, details here: https://www.pyth.network/developers/price-feed-ids
pub const MAXIMUM_AGE: u64 = 60; // One minute
pub const FEED_ID: &str = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";

#[derive(Accounts)]
#[instruction(
    amount: u64,
    seed: [u8; 32],
    order_hash: [u8; 32],
    receiver: [u8; 32],
    src_chain_id: u32,
    dest_chain_id: u32,
    token_in: [u8; 32],
    fee: u64,
    min_amount_out: String,
    token_out: [u8; 32],
)]
pub struct CreateOrder<'info> {
    //  need this to check the deposit amount is correct
    #[account(mut)]
    pub trader: Signer<'info>,

    //  Global state
    #[account(
        seeds = [GLOBAL_SEED],
        bump,
        constraint = global_state.frozen == false @MarsError::GlobalStateFrozen
    )]
    pub global_state: Box<Account<'info, GlobalState>>,

    //  Asset
    #[account(
        mut,
        seeds = [ASSET_SEED],
        bump,
    )]
    pub asset: Box<Account<'info, Asset>>,

    //  USDC token account of the trader
    #[account(
        init_if_needed,
        payer = trader,
        associated_token::mint = usdc_mint,
        associated_token::authority = trader,
    )]
    pub ata_trader: Box<Account<'info, TokenAccount>>,

    //  Needed to check vault authority
    #[account(	
        seeds = [VAULT_SEED],	
        bump,	
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,

    //  USDC ata of vault
    #[account(
        mut, 
        associated_token::mint = usdc_mint, 
        
        //  Authority is set to vault
        associated_token::authority = vault,
    )]
    pub ata_vault: Box<Account<'info, TokenAccount>>,

    // The mint of $USDC because it's needed from above ⬆ token::mint = ...
    #[account(
        address = global_state.base_mint,
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = trader,
        seeds = [&order_hash, ORDER_SEED],
        bump,
        space = 2 * size_of::<Order>() + 8,
    )]
    pub order: Box<Account<'info, Order>>,

    //  Stores fee tiers info
    #[account(
        seeds = [FEE_TIERS_SEED],
        bump,
    )]
    pub fee_tiers: Box<Account<'info, FeeTiers>>,

    //  Stores fee tiers info
    #[account(
        seeds = [INSURANCE_FEE_TIERS_SEED],
        bump,
    )]
    pub insurance_fee_tiers: Box<Account<'info, InsuranceFeeTiers>>,

    //  Stores target_chain_min_fee info
    #[account(
        seeds = [PROTOCOL_FEE_FRACTION_SEED],
        bump,
    )]
    pub protocol_fee_fraction: Box<Account<'info, ProtocolFeeFraction>>,

    //  Stores target_chain_min_fee info
    #[account(
        seeds = [dest_chain_id.to_le_bytes().as_ref(), usdc_mint.key().as_ref(), TARGET_CHAIN_MIN_FEE_SEED],
        bump,
    )]
    pub target_chain_min_fee: Box<Account<'info, TargetChainMinFee>>,

    // Add this account to any instruction Context that needs price data.
    pub price_update: Account<'info, PriceUpdateV2>,

    //  Needed to transfer tokens
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    //  Needed to init new account
    pub system_program: Program<'info, System>,
}

impl CreateOrder<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        amount: u64,
        seed: [u8; 32],
        order_hash: [u8; 32],
        receiver: [u8; 32],
        src_chain_id: u32,
        dest_chain_id: u32,
        token_in: [u8; 32],
        fee: u64,
        min_amount_out: String,
        token_out: [u8; 32],
    ) -> Result<()> {
        msg!("deposit USDC amount: {:?}", amount);

        let price_update = &mut ctx.accounts.price_update;
        let feed_id: [u8; 32] = get_feed_id_from_hex(FEED_ID)?;
        let price = price_update.get_price_no_older_than(&Clock::get()?, MAXIMUM_AGE, &feed_id)?;

        let lower_bound = (price.price - price.conf as i64) as f64 * 10f64.powi(price.exponent);
        let upper_bound = (price.price + price.conf as i64) as f64 * 10f64.powi(price.exponent);

        if lower_bound < 0.99 {
            msg!("Stable coin price too low: {}", lower_bound);
            return err!(MarsError::StableCoinPriceTooLow);
        }

        if upper_bound > 1.10 {
            msg!("Stable coin price too high: {}", upper_bound);
            return err!(MarsError::StableCoinPriceTooHigh);
        }

        require!(src_chain_id != dest_chain_id, MarsError::SameSourceAndDestinationChainIds);

        if ctx.accounts.order.status != OrderStatus::Unexistant {
            return err!(MarsError::OrderAlreadyExists);
        }

        require!(amount > 0, MarsError::ZeroAmount);
        require!(amount <= ctx.accounts.global_state.max_order_amount, MarsError::MaxOrderAmountExceeded);

        let min_fee: u64 = ctx.accounts.target_chain_min_fee.min_fee;
        
        let fee_tiers = ctx.accounts.fee_tiers.fee_tiers.clone();
        let fee_bps = FeeTiers::get_bps_fee_for_amount(&fee_tiers, amount);
        let bps_fee = (amount * fee_bps) / BASE_PERCENTAGE;

        let protocol_fee = ctx.accounts.protocol_fee_fraction.get_protocol_fee(bps_fee);
        let lp_fee = bps_fee - protocol_fee;

        let insurance_fee_tiers = ctx.accounts.insurance_fee_tiers.insurance_fee_tiers.clone();
        let insurance_fee_bps = InsuranceFeeTiers::get_insurance_fee_for_amount(&insurance_fee_tiers, amount);
        let insurance_fee = (amount * insurance_fee_bps) / BASE_PERCENTAGE;

        let required_fee = min_fee + bps_fee + insurance_fee;

        msg!("min_fee: {:?}, insurance_fee: {:?}, lp_fee: {:?}, protocol_fee: {:?}, required_fee: {:?}, fee_provided: {:?}", min_fee, insurance_fee, lp_fee, protocol_fee, required_fee, fee);

        if required_fee > fee {
            return err!(MarsError::InsufficientFees);
        }
        require!(fee < amount, MarsError::ExcessFee);

        ctx.accounts.asset.total_fee_collected += fee;
        ctx.accounts.asset.base_fee_collected += fee - (bps_fee + insurance_fee);
        ctx.accounts.asset.lp_fee_collected += lp_fee;
        ctx.accounts.asset.protocol_fee_collected += protocol_fee;
        ctx.accounts.asset.insurance_fee_collected += insurance_fee;
        ctx.accounts.asset.unclaimed_base_fee += fee - (bps_fee + insurance_fee);
        ctx.accounts.asset.unclaimed_lp_fee += lp_fee;
        ctx.accounts.asset.unclaimed_protocol_fee += protocol_fee;
        ctx.accounts.asset.unclaimed_insurance_fee += insurance_fee;

        // Convert trader key
        let trader_key_bytes: [u8; 32] = ctx.accounts.trader.key().to_bytes();
        let usdc_key_bytes: [u8; 32] = ctx.accounts.usdc_mint.key().to_bytes();
        require!(
            usdc_key_bytes == token_in,
            MarsError::InvalidTokenIn
        );

        ctx.accounts.order.amount_in = amount;
        ctx.accounts.order.seed = seed;
        ctx.accounts.order.trader = trader_key_bytes;
        ctx.accounts.order.receiver = receiver;
        ctx.accounts.order.src_chain_id = src_chain_id;
        ctx.accounts.order.dest_chain_id = dest_chain_id;
        ctx.accounts.order.token_in = token_in;
        ctx.accounts.order.fee = fee;
        ctx.accounts.order.status = OrderStatus::Created;
        ctx.accounts.order.min_amount_out = min_amount_out.clone();
        ctx.accounts.order.token_out = token_out;
        ctx.accounts.order.order_hash = order_hash;

        // Transfer USDC from orchestrator to vault
        token_transfer_user(
            ctx.accounts.ata_trader.to_account_info().clone(),
            ctx.accounts.trader.to_account_info().clone(),
            ctx.accounts.ata_vault.to_account_info().clone(),
            ctx.accounts.token_program.to_account_info().clone(),
            amount,
        )?;

        msg!(
            "OrderCreated: {{\
            \"seed\":\"{:?}\",\
            \"order_hash\":\"{:?}\",\
            \"trader\":\"{:?}\",\
            \"receiver\":\"{:?}\",\
            \"token_in\":\"{:?}\",\
            \"token_out\":\"{:?}\",\
            \"amount_in\":{},\
            \"min_amount_out\":{},\
            \"src_chain_id\":{},\
            \"dest_chain_id\":{},\
            \"fee\":{},\
            \"status\":\"{}\"\
            }}",
            seed,
            order_hash,
            trader_key_bytes,
            receiver,
            token_in,
            token_out,
            amount,
            min_amount_out,
            src_chain_id,
            dest_chain_id,
            fee,
            "Created"
        );

        Ok(())
    }
}
