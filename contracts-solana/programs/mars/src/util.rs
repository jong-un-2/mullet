use crate::*;
use anchor_lang::solana_program::program::{invoke, invoke_signed};
use anchor_spl::token::{self, TokenAccount};

// transfer sol from PDA
pub fn sol_transfer_with_signer<'a>(
    source: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    signers: &[&[&[u8]]; 1],
    amount: u64,
) -> Result<()> {
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        source.key,
        destination.key,
        amount,
    );
    invoke_signed(&ix, &[source, destination, system_program], signers)?;
    Ok(())
}

//  transfer sol from user
pub fn sol_transfer_user<'a>(
    source: AccountInfo<'a>,
    destination: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        source.key,
        destination.key,
        amount,
    );
    invoke(&ix, &[source, destination, system_program])?;
    Ok(())
}

// Helper function to unwrap SOL and transfer to receiver
pub fn unwrap_and_transfer_sol<'a>(
    token_account: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    receiver: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    // First, close the wSOL account and reclaim SOL (unwrapping)
    let close_ix = anchor_spl::token::CloseAccount {
        account: token_account,
        destination: authority.clone(),
        authority: authority.clone(),
    };

    anchor_spl::token::close_account(CpiContext::new(token_program, close_ix))?;

    // Then transfer the SOL to receiver
    let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
        &authority.key(),
        &receiver.key(),
        amount,
    );

    // Execute the transfer
    invoke(&transfer_ix, &[authority, receiver, system_program])?;

    Ok(())
}

//  transfer token from user
pub fn token_transfer_user<'a>(
    from: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    to: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new(
        token_program,
        token::Transfer {
            from,
            authority,
            to,
        },
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

//  transfer token from PDA
pub fn token_transfer_with_signer<'a>(
    from: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    to: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    signers: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
        token_program,
        token::Transfer {
            from,
            authority,
            to,
        },
        signers,
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

//  check whether balance is within the threshold
pub fn balance_within_threshold(
    _balance_now: u64,
    balance_after: u64,
    _rebalance_threshold: u16,
    unclaimed_fee: u64,
) -> bool {
    // Rebalance threshold will be used when we enable staking

    return balance_after >= unclaimed_fee;
}

pub fn get_vault_balance(ata_vault: &Account<TokenAccount>) -> Result<u64> {
    Ok(ata_vault.amount)
}

pub struct RefundAmounts {
    pub refund_amount: u64,
    pub protocol_fee: u64,
}

pub fn calculate_refund_amount(amount: u64, fee: u64, cross_chain_fee_bps: u16) -> RefundAmounts {
    let swap_fee = ((amount as u128 * cross_chain_fee_bps as u128) / 10_000) as u64;
    let protocol_fee = fee - swap_fee;
    let refund_amount = amount - protocol_fee;

    return RefundAmounts {
        refund_amount,
        protocol_fee,
    };
}

#[inline]
pub fn now() -> i64 {
    msg!("Current timestamp: {:?}", Clock::get().unwrap().unix_timestamp);
    Clock::get().unwrap().unix_timestamp
}
