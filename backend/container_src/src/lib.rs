mod pb;

use pb::mars::vaults::v1::{Events, VaultEvent};
use substreams::prelude::*;
use substreams::Hex;
use substreams_solana::pb::sf::solana::r#type::v1::{Block, ConfirmedTransaction};

// Mars V2 Program ID (from deployment: AEK6WoTp7vY6LM1ZDmedxXHoCkpJL1i86KD2qWzsaJx4)
const MARS_PROGRAM_ID: &str = "AEK6WoTp7vY6LM1ZDmedxXHoCkpJL1i86KD2qWzsaJx4";

// Kamino Vaults Program ID (V2 - Current Mainnet Version)
// V1 (Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE) is deprecated
const KAMINO_PROGRAM_ID: &str = "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd";

// Jupiter Aggregator Program ID
const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

// ============================================================
// Anchor Instruction Discriminators (extracted from IDL)
// ============================================================

// Core Vault Operations
const VAULT_DEPOSIT_DISCRIMINATOR: [u8; 8] = [231, 150, 41, 113, 180, 104, 162, 120];
const VAULT_WITHDRAW_DISCRIMINATOR: [u8; 8] = [98, 28, 187, 98, 87, 69, 46, 64];
const SWAP_AND_DEPOSIT_DISCRIMINATOR: [u8; 8] = [50, 21, 140, 74, 249, 6, 205, 24];
const WITHDRAW_WITH_SWAP_DISCRIMINATOR: [u8; 8] = [190, 187, 37, 126, 6, 142, 207, 219];
const REBALANCE_WITH_SWAP_DISCRIMINATOR: [u8; 8] = [79, 169, 67, 48, 112, 17, 34, 112];
const ESTIMATE_SWAP_COST_DISCRIMINATOR: [u8; 8] = [169, 64, 98, 153, 217, 56, 220, 111];

// Kamino Integration Operations
const KAMINO_DEPOSIT_DISCRIMINATOR: [u8; 8] = [237, 8, 188, 187, 115, 99, 49, 85];
const KAMINO_WITHDRAW_DISCRIMINATOR: [u8; 8] = [199, 101, 41, 45, 213, 98, 224, 200];
const KAMINO_STAKE_IN_FARM_DISCRIMINATOR: [u8; 8] = [24, 191, 24, 158, 110, 190, 234, 15];
const KAMINO_START_UNSTAKE_DISCRIMINATOR: [u8; 8] = [69, 169, 100, 27, 224, 93, 160, 125];
const KAMINO_UNSTAKE_FROM_FARM_DISCRIMINATOR: [u8; 8] = [147, 182, 155, 59, 74, 113, 23, 203];
const KAMINO_DEPOSIT_AND_STAKE_DISCRIMINATOR: [u8; 8] = [42, 143, 36, 40, 74, 180, 200, 42];

// Admin Operations (optional, for comprehensive tracking)
const INITIALIZE_DISCRIMINATOR: [u8; 8] = [175, 175, 109, 31, 13, 152, 155, 237];
const NOMINATE_AUTHORITY_DISCRIMINATOR: [u8; 8] = [148, 182, 144, 91, 186, 12, 118, 18];
const ACCEPT_AUTHORITY_DISCRIMINATOR: [u8; 8] = [107, 86, 198, 91, 33, 12, 107, 160];
const FREEZE_GLOBAL_STATE_DISCRIMINATOR: [u8; 8] = [34, 7, 180, 252, 211, 157, 15, 159];
const THAW_GLOBAL_STATE_DISCRIMINATOR: [u8; 8] = [4, 19, 152, 159, 108, 253, 65, 170];

#[substreams::handlers::map]
fn map_blocks(block: Block) -> Result<Events, substreams::errors::Error> {
    let mut events = Vec::new();
    
    let slot = block.slot;
    let block_timestamp = block.block_time
        .as_ref()
        .map(|t| t.timestamp)
        .unwrap_or(0);

    for transaction in block.transactions {
        if let Some(tx) = transaction.transaction {
            if let Some(meta) = transaction.meta {
                // Skip failed transactions
                if meta.err.is_some() {
                    continue;
                }

                let signature = bs58::encode(&tx.signatures[0]).into_string();
                
                // Parse instructions
                if let Some(message) = tx.message {
                    for (idx, instruction) in message.instructions.iter().enumerate() {
                        let program_id_index = instruction.program_id_index as usize;
                        if program_id_index >= message.account_keys.len() {
                            continue;
                        }
                        
                        let program_id = bs58::encode(&message.account_keys[program_id_index]).into_string();
                        
                        // Only process Mars program instructions
                        if program_id == MARS_PROGRAM_ID {
                            if let Some(event) = parse_mars_instruction(
                                &instruction.data,
                                &signature,
                                slot,
                                block_timestamp,
                                idx as u32,
                                &message.account_keys,
                                &instruction.accounts,
                            ) {
                                events.push(event);
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(Events { events })
}

fn parse_mars_instruction(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    _instruction_index: u32,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 8 {
        return None;
    }

    // Extract discriminator
    let discriminator: [u8; 8] = data[0..8].try_into().ok()?;

    match discriminator {
        VAULT_DEPOSIT_DISCRIMINATOR => {
            parse_vault_deposit(data, signature, slot, timestamp, account_keys, accounts)
        }
        VAULT_WITHDRAW_DISCRIMINATOR => {
            parse_vault_withdraw(data, signature, slot, timestamp, account_keys, accounts)
        }
        SWAP_AND_DEPOSIT_DISCRIMINATOR => {
            parse_swap_and_deposit(data, signature, slot, timestamp, account_keys, accounts)
        }
        WITHDRAW_WITH_SWAP_DISCRIMINATOR => {
            parse_withdraw_with_swap(data, signature, slot, timestamp, account_keys, accounts)
        }
        REBALANCE_WITH_SWAP_DISCRIMINATOR => {
            parse_rebalance_event(data, signature, slot, timestamp, account_keys, accounts)
        }
        KAMINO_DEPOSIT_DISCRIMINATOR => {
            parse_kamino_deposit(data, signature, slot, timestamp, account_keys, accounts)
        }
        KAMINO_WITHDRAW_DISCRIMINATOR => {
            parse_kamino_withdraw(data, signature, slot, timestamp, account_keys, accounts)
        }
        KAMINO_STAKE_IN_FARM_DISCRIMINATOR => {
            parse_kamino_stake(data, signature, slot, timestamp, account_keys, accounts)
        }
        KAMINO_START_UNSTAKE_DISCRIMINATOR => {
            parse_kamino_unstake(data, signature, slot, timestamp, account_keys, accounts, true)
        }
        KAMINO_UNSTAKE_FROM_FARM_DISCRIMINATOR => {
            parse_kamino_unstake(data, signature, slot, timestamp, account_keys, accounts, false)
        }
        KAMINO_DEPOSIT_AND_STAKE_DISCRIMINATOR => {
            parse_kamino_deposit_and_stake(data, signature, slot, timestamp, account_keys, accounts)
        }
        _ => None, // Unknown instruction
    }
}

fn parse_vault_deposit(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    // Anchor instruction format: [discriminator(8)] + [amount(8)]
    if data.len() < 16 {
        return None;
    }

    let amount = u64::from_le_bytes(data[8..16].try_into().ok()?);
    
    // Account 0 = user (signer)
    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    // Account 3 = vault_state
    let vault_id = if accounts.len() > 3 && (accounts[3] as usize) < account_keys.len() {
        account_keys[accounts[3] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(
            pb::mars::vaults::v1::VaultDepositEvent {
                user,
                vault_id,
                amount,
                shares_received: amount, // Simplified 1:1
                protocol_id: 1, // Kamino
                timestamp,
            },
        )),
    })
}

fn parse_vault_withdraw(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 16 {
        return None;
    }

    let shares_amount = u64::from_le_bytes(data[8..16].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 3 && (accounts[3] as usize) < account_keys.len() {
        account_keys[accounts[3] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(
            pb::mars::vaults::v1::VaultWithdrawEvent {
                user,
                vault_id,
                shares_burned: shares_amount,
                amount_received: shares_amount,
                protocol_id: 1,
                timestamp,
            },
        )),
    })
}

#[substreams::handlers::map]
fn map_vault_events(events: Events) -> Result<Events, substreams::errors::Error> {
    Ok(events)
}

#[substreams::handlers::store]
fn store_vault_states(
    events: Events,
    store: substreams::store::StoreSetProto<pb::mars::vaults::v1::VaultSnapshot>,
) {
    for event in events.events {
        match event.event {
            Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(ref deposit)) => {
                let vault_key = format!("vault:{}", Hex::encode(&deposit.vault_id));
                
                let vault_snapshot = pb::mars::vaults::v1::VaultSnapshot {
                    vault_id: deposit.vault_id.clone(),
                    admin: String::new(),
                    base_token_mint: String::new(),
                    shares_mint: String::new(),
                    total_deposits: deposit.amount,
                    total_shares: deposit.shares_received,
                    apy: 500,
                    status: pb::mars::vaults::v1::VaultStatus::Active as i32,
                    protocols: vec![],
                    users: vec![],
                    fee_config: None,
                    created_at: deposit.timestamp,
                    last_updated: deposit.timestamp,
                };
                
                store.set(0, &vault_key, &vault_snapshot);
            }
            _ => {}
        }
    }
}

#[substreams::handlers::map]
fn db_out(
    events: Events,
) -> Result<substreams_database_change::pb::database::DatabaseChanges, substreams::errors::Error> {
    use substreams_database_change::tables::Tables;

    let mut tables = Tables::new();

    for event in events.events {
        match event.event {
            Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(deposit)) => {
                let vault_id = Hex::encode(&deposit.vault_id);
                let id = format!("{}-{}", event.signature, vault_id);
                
                tables
                    .create_row("mars_vault_deposits", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &deposit.user)
                    .set("vault_address", &vault_id)
                    .set("amount", deposit.amount)
                    .set("shares_received", deposit.shares_received)
                    .set("protocol_id", deposit.protocol_id as i32)
                    .set("timestamp", deposit.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", deposit.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(withdraw)) => {
                let vault_id = Hex::encode(&withdraw.vault_id);
                let id = format!("{}-{}", event.signature, vault_id);
                
                tables
                    .create_row("mars_vault_withdrawals", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &withdraw.user)
                    .set("vault_address", &vault_id)
                    .set("shares_burned", withdraw.shares_burned)
                    .set("amount_received", withdraw.amount_received)
                    .set("protocol_id", withdraw.protocol_id as i32)
                    .set("timestamp", withdraw.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", withdraw.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::SwapAndDeposit(swap)) => {
                let vault_id = Hex::encode(&swap.vault_id);
                let id = format!("{}-swap-deposit", event.signature);
                
                tables
                    .create_row("mars_vault_swaps", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &swap.user)
                    .set("vault_address", &vault_id)
                    .set("from_token", &swap.from_token)
                    .set("to_token", &swap.to_token)
                    .set("amount_in", swap.amount_in)
                    .set("amount_out", swap.amount_out)
                    .set("shares_received", swap.shares_received)
                    .set("protocol_id", swap.protocol_id as i32)
                    .set("swap_type", "swap_and_deposit")
                    .set("slippage_bps", 0)
                    .set("timestamp", swap.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", swap.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::WithdrawWithSwap(swap)) => {
                let vault_id = Hex::encode(&swap.vault_id);
                let id = format!("{}-withdraw-swap", event.signature);
                
                tables
                    .create_row("mars_vault_swaps", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &swap.user)
                    .set("vault_address", &vault_id)
                    .set("from_token", "")
                    .set("to_token", &swap.target_token)
                    .set("amount_in", swap.shares_burned)
                    .set("amount_out", swap.amount_received)
                    .set("shares_received", 0)
                    .set("protocol_id", 0)
                    .set("swap_type", "withdraw_with_swap")
                    .set("slippage_bps", swap.slippage_bps as i32)
                    .set("timestamp", swap.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", swap.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::Rebalance(rebalance)) => {
                let vault_id = Hex::encode(&rebalance.vault_id);
                let id = format!("{}-rebalance", event.signature);
                
                tables
                    .create_row("mars_vault_rebalances", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("vault_address", &vault_id)
                    .set("protocol_from", rebalance.protocol_from as i32)
                    .set("protocol_to", rebalance.protocol_to as i32)
                    .set("amount_in", rebalance.amount_in)
                    .set("amount_out", rebalance.amount_out)
                    .set("executor", &rebalance.executor)
                    .set("reason", &rebalance.reason)
                    .set("timestamp", rebalance.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", rebalance.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::KaminoDeposit(kamino)) => {
                let vault_id = Hex::encode(&kamino.vault_id);
                let id = format!("{}-kamino-deposit", event.signature);
                
                tables
                    .create_row("mars_vault_deposits", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &kamino.user)
                    .set("vault_address", &vault_id)
                    .set("amount", kamino.amount)
                    .set("shares_received", kamino.shares_received)
                    .set("protocol_id", 1) // Kamino
                    .set("timestamp", kamino.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", kamino.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::KaminoWithdraw(kamino)) => {
                let vault_id = Hex::encode(&kamino.vault_id);
                let id = format!("{}-kamino-withdraw", event.signature);
                
                tables
                    .create_row("mars_vault_withdrawals", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user_address", &kamino.user)
                    .set("vault_address", &vault_id)
                    .set("shares_burned", kamino.shares_burned)
                    .set("amount_received", kamino.amount_received)
                    .set("protocol_id", 1) // Kamino
                    .set("timestamp", kamino.timestamp)
                    .set("slot", event.slot)
                    .set("created_at", kamino.timestamp);
            }
            _ => {}
        }
    }

    Ok(tables.to_database_changes())
}

// ============================================================
// Additional Parser Functions
// ============================================================

fn parse_swap_and_deposit(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    // [disc(8)] + [protocol_id(1)] + [from_token(32)] + [to_token(32)] + [amount(8)] + [min_out(8)] + [swap_data...]
    if data.len() < 89 {
        return None;
    }

    let protocol_id = data[8];
    let from_token = bs58::encode(&data[9..41]).into_string();
    let to_token = bs58::encode(&data[41..73]).into_string();
    let amount_in = u64::from_le_bytes(data[73..81].try_into().ok()?);
    let minimum_out = u64::from_le_bytes(data[81..89].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        account_keys[accounts[2] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::SwapAndDeposit(
            pb::mars::vaults::v1::SwapAndDepositEvent {
                user,
                vault_id,
                from_token,
                to_token,
                amount_in,
                amount_out: minimum_out,
                shares_received: minimum_out,
                protocol_id: protocol_id as u32,
                timestamp,
            },
        )),
    })
}

fn parse_withdraw_with_swap(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 56 {
        return None;
    }

    let amount = u64::from_le_bytes(data[8..16].try_into().ok()?);
    let target_token = bs58::encode(&data[16..48]).into_string();
    let minimum_out = u64::from_le_bytes(data[48..56].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        account_keys[accounts[2] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::WithdrawWithSwap(
            pb::mars::vaults::v1::WithdrawWithSwapEvent {
                user,
                vault_id,
                shares_burned: amount,
                target_token,
                amount_received: minimum_out,
                slippage_bps: 100,
                timestamp,
            },
        )),
    })
}

fn parse_rebalance_event(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 18 {
        return None;
    }

    let protocol_from = data[8];
    let protocol_to = data[9];
    let amount_in = u64::from_le_bytes(data[10..18].try_into().ok()?);

    let vault_id = if accounts.len() > 1 && (accounts[1] as usize) < account_keys.len() {
        account_keys[accounts[1] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let executor = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::Rebalance(
            pb::mars::vaults::v1::RebalanceEvent {
                vault_id,
                protocol_from: protocol_from as u32,
                protocol_to: protocol_to as u32,
                amount_in,
                amount_out: amount_in,
                executor,
                timestamp,
                reason: String::from("protocol_rebalance"),
            },
        )),
    })
}

fn parse_kamino_deposit(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 16 {
        return None;
    }

    let max_amount = u64::from_le_bytes(data[8..16].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        account_keys[accounts[2] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let kamino_vault = if accounts.len() > 3 && (accounts[3] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[3] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::KaminoDeposit(
            pb::mars::vaults::v1::KaminoDepositEvent {
                user,
                vault_id,
                amount: max_amount,
                shares_received: max_amount,
                kamino_vault,
                timestamp,
            },
        )),
    })
}

fn parse_kamino_withdraw(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 16 {
        return None;
    }

    let max_amount = u64::from_le_bytes(data[8..16].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        account_keys[accounts[2] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let kamino_vault = if accounts.len() > 3 && (accounts[3] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[3] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::KaminoWithdraw(
            pb::mars::vaults::v1::KaminoWithdrawEvent {
                user,
                vault_id,
                shares_burned: max_amount,
                amount_received: max_amount,
                kamino_vault,
                timestamp,
            },
        )),
    })
}

fn parse_kamino_stake(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    if data.len() < 16 {
        return None;
    }

    let shares_amount = u64::from_le_bytes(data[8..16].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 1 && (accounts[1] as usize) < account_keys.len() {
        account_keys[accounts[1] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let farm_address = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[2] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::KaminoStake(
            pb::mars::vaults::v1::KaminoStakeEvent {
                user,
                vault_id,
                shares_amount,
                farm_address,
                timestamp,
            },
        )),
    })
}

fn parse_kamino_unstake(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
    is_start: bool,
) -> Option<VaultEvent> {
    let shares_amount = if is_start && data.len() >= 24 {
        u64::from_le_bytes(data[8..16].try_into().ok()?)
    } else {
        0
    };

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 1 && (accounts[1] as usize) < account_keys.len() {
        account_keys[accounts[1] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let farm_address = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[2] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::KaminoUnstake(
            pb::mars::vaults::v1::KaminoUnstakeEvent {
                user,
                vault_id,
                shares_amount,
                farm_address,
                is_start,
                slot,
                timestamp,
            },
        )),
    })
}

fn parse_kamino_deposit_and_stake(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
    account_keys: &[Vec<u8>],
    accounts: &[u8],
) -> Option<VaultEvent> {
    // Similar to kamino_deposit + kamino_stake
    if data.len() < 16 {
        return None;
    }

    let max_amount = u64::from_le_bytes(data[8..16].try_into().ok()?);

    let user = if !accounts.is_empty() && (accounts[0] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[0] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    let vault_id = if accounts.len() > 2 && (accounts[2] as usize) < account_keys.len() {
        account_keys[accounts[2] as usize][..32].to_vec()
    } else {
        vec![0u8; 32]
    };

    let kamino_vault = if accounts.len() > 3 && (accounts[3] as usize) < account_keys.len() {
        bs58::encode(&account_keys[accounts[3] as usize]).into_string()
    } else {
        String::from("unknown")
    };

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::KaminoDeposit(
            pb::mars::vaults::v1::KaminoDepositEvent {
                user,
                vault_id,
                amount: max_amount,
                shares_received: max_amount,
                kamino_vault,
                timestamp,
            },
        )),
    })
}

// ============================================================
// The Graph Protocol Output Handler  
// ============================================================

use substreams_entity_change::pb::entity::EntityChanges;

#[substreams::handlers::map]
pub fn graph_out(
    events: Events,
    vault_states_deltas: substreams::store::Deltas<substreams::store::DeltaProto<pb::mars::vaults::v1::VaultSnapshot>>
) -> Result<EntityChanges, substreams::errors::Error> {
    let mut entity_changes = EntityChanges::default();

    // Process all vault events into Graph entities
    for event in events.events {
        match &event.event {
            // 1. Vault Deposit Event
            Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(deposit)) => {
                let deposit_id = format!("{}:{}", event.signature, bs58::encode(&deposit.vault_id).into_string());
                entity_changes.push_change(
                    "VaultDeposit",
                    &deposit_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &deposit_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &deposit.user)
                .change("vault", bs58::encode(&deposit.vault_id).into_string())
                .change("amount", deposit.amount.to_string())
                .change("sharesReceived", deposit.shares_received.to_string())
                .change("protocolId", deposit.protocol_id.to_string());
            }

            // 2. Vault Withdrawal Event
            Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(withdrawal)) => {
                let withdrawal_id = format!("{}:{}", event.signature, bs58::encode(&withdrawal.vault_id).into_string());
                entity_changes.push_change(
                    "VaultWithdrawal",
                    &withdrawal_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &withdrawal_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &withdrawal.user)
                .change("vault", bs58::encode(&withdrawal.vault_id).into_string())
                .change("amountReceived", withdrawal.amount_received.to_string())
                .change("sharesBurned", withdrawal.shares_burned.to_string())
                .change("protocolId", withdrawal.protocol_id.to_string());
            }

            // 3. Swap and Deposit Event
            Some(pb::mars::vaults::v1::vault_event::Event::SwapAndDeposit(swap)) => {
                let swap_id = format!("{}:{}", event.signature, bs58::encode(&swap.vault_id).into_string());
                entity_changes.push_change(
                    "SwapAndDeposit",
                    &swap_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &swap_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &swap.user)
                .change("vault", bs58::encode(&swap.vault_id).into_string())
                .change("fromToken", &swap.from_token)
                .change("toToken", &swap.to_token)
                .change("amountIn", swap.amount_in.to_string())
                .change("amountOut", swap.amount_out.to_string())
                .change("sharesReceived", swap.shares_received.to_string())
                .change("protocolId", swap.protocol_id.to_string());
            }

            // 4. Withdraw with Swap Event
            Some(pb::mars::vaults::v1::vault_event::Event::WithdrawWithSwap(swap)) => {
                let swap_id = format!("{}:{}", event.signature, bs58::encode(&swap.vault_id).into_string());
                entity_changes.push_change(
                    "WithdrawWithSwap",
                    &swap_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &swap_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &swap.user)
                .change("vault", bs58::encode(&swap.vault_id).into_string())
                .change("sharesBurned", swap.shares_burned.to_string())
                .change("targetToken", &swap.target_token)
                .change("amountReceived", swap.amount_received.to_string())
                .change("slippageBps", swap.slippage_bps.to_string());
            }

            // 5. Rebalance Event
            Some(pb::mars::vaults::v1::vault_event::Event::Rebalance(rebalance)) => {
                let rebalance_id = format!("{}:{}", event.signature, bs58::encode(&rebalance.vault_id).into_string());
                entity_changes.push_change(
                    "VaultRebalance",
                    &rebalance_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &rebalance_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("vault", bs58::encode(&rebalance.vault_id).into_string())
                .change("protocolFrom", rebalance.protocol_from.to_string())
                .change("protocolTo", rebalance.protocol_to.to_string())
                .change("amountIn", rebalance.amount_in.to_string())
                .change("amountOut", rebalance.amount_out.to_string())
                .change("executor", &rebalance.executor)
                .change("reason", &rebalance.reason);
            }

            // 6. Kamino Deposit Event
            Some(pb::mars::vaults::v1::vault_event::Event::KaminoDeposit(kamino)) => {
                let kamino_id = format!("{}:{}", event.signature, bs58::encode(&kamino.vault_id).into_string());
                entity_changes.push_change(
                    "KaminoDeposit",
                    &kamino_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &kamino_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &kamino.user)
                .change("vault", bs58::encode(&kamino.vault_id).into_string())
                .change("amount", kamino.amount.to_string())
                .change("sharesReceived", kamino.shares_received.to_string())
                .change("kaminoVault", &kamino.kamino_vault);
            }

            // 7. Kamino Withdrawal Event
            Some(pb::mars::vaults::v1::vault_event::Event::KaminoWithdraw(kamino)) => {
                let kamino_id = format!("{}:{}", event.signature, bs58::encode(&kamino.vault_id).into_string());
                entity_changes.push_change(
                    "KaminoWithdrawal",
                    &kamino_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &kamino_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &kamino.user)
                .change("vault", bs58::encode(&kamino.vault_id).into_string())
                .change("sharesBurned", kamino.shares_burned.to_string())
                .change("amountReceived", kamino.amount_received.to_string())
                .change("kaminoVault", &kamino.kamino_vault);
            }

            // 8. Vault State Updated Event
            Some(pb::mars::vaults::v1::vault_event::Event::VaultStateUpdated(state)) => {
                let state_id = format!("{}:{}", event.signature, bs58::encode(&state.vault_id).into_string());
                entity_changes.push_change(
                    "VaultStateUpdate",
                    &state_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &state_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("vault", bs58::encode(&state.vault_id).into_string())
                .change("totalDeposits", state.total_deposits.to_string())
                .change("totalShares", state.total_shares.to_string())
                .change("apy", state.apy.to_string())
                .change("activeProtocols", state.active_protocols.to_string())
                .change("totalUsers", state.total_users.to_string());
            }

            _ => {} // Skip other event types
        }
    }

    // Process vault state changes from store deltas
    for delta in vault_states_deltas.deltas {
        let vault_key = bs58::encode(&delta.key).into_string();
        
        // Use new_value directly (not Option wrapped)
        let vault_snapshot = &delta.new_value;
        
        entity_changes.push_change(
            "VaultState",
            &vault_key,
            delta.ordinal,
            substreams_entity_change::pb::entity::entity_change::Operation::Update,
        )
        .change("id", &vault_key)
        .change("vault", &vault_key)
        .change("totalDeposits", vault_snapshot.total_deposits.to_string())
        .change("totalShares", vault_snapshot.total_shares.to_string())
        .change("apy", vault_snapshot.apy.to_string())
        .change("lastUpdated", vault_snapshot.last_updated.to_string());
    }

    Ok(entity_changes)
}
