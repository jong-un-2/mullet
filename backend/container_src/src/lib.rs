mod pb;

use pb::mars::vaults::v1::{Events, VaultEvent};
use substreams::prelude::*;
use substreams::Hex;
use substreams_solana::pb::sf::solana::r#type::v1::Block;

const MARS_PROGRAM_ID: &str = "G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy";

// Kamino Vaults Program ID (V2 - Current Mainnet Version)
// V1 (Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE) is deprecated
// Kept for potential future cross-program analysis
#[allow(dead_code)]
const KAMINO_PROGRAM_ID: &str = "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd";

// Jupiter Aggregator Program ID
// Kept for potential future DEX integration tracking
#[allow(dead_code)]
const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

// ============================================================
// Anchor Instruction Discriminators (extracted from IDL)
// ============================================================

// Core Vault Operations
const VAULT_DEPOSIT_DISCRIMINATOR: [u8; 8] = [231, 150, 41, 113, 180, 104, 162, 120];
const VAULT_WITHDRAW_DISCRIMINATOR: [u8; 8] = [98, 28, 187, 98, 87, 69, 46, 64];

// Kamino Integration Operations
const KAMINO_DEPOSIT_DISCRIMINATOR: [u8; 8] = [237, 8, 188, 187, 115, 99, 49, 85];
const KAMINO_WITHDRAW_DISCRIMINATOR: [u8; 8] = [199, 101, 41, 45, 213, 98, 224, 200];
const KAMINO_STAKE_IN_FARM_DISCRIMINATOR: [u8; 8] = [24, 191, 24, 158, 110, 190, 234, 15];
const KAMINO_START_UNSTAKE_DISCRIMINATOR: [u8; 8] = [69, 169, 100, 27, 224, 93, 160, 125];
const KAMINO_UNSTAKE_FROM_FARM_DISCRIMINATOR: [u8; 8] = [147, 182, 155, 59, 74, 113, 23, 203];
const KAMINO_DEPOSIT_AND_STAKE_DISCRIMINATOR: [u8; 8] = [42, 143, 36, 40, 74, 180, 200, 42];
// Farm rewards are tracked via event logs, not instruction discriminator
#[allow(dead_code)]
const CLAIM_FARM_REWARDS_DISCRIMINATOR: [u8; 8] = [102, 40, 223, 149, 90, 81, 228, 23];

// Admin Operations (for future comprehensive tracking)
// These are kept for potential future use in tracking admin activities
#[allow(dead_code)]
const INITIALIZE_DISCRIMINATOR: [u8; 8] = [175, 175, 109, 31, 13, 152, 155, 237];
#[allow(dead_code)]
const NOMINATE_AUTHORITY_DISCRIMINATOR: [u8; 8] = [148, 182, 144, 91, 186, 12, 118, 18];
#[allow(dead_code)]
const ACCEPT_AUTHORITY_DISCRIMINATOR: [u8; 8] = [107, 86, 198, 91, 33, 12, 107, 160];
#[allow(dead_code)]
const FREEZE_GLOBAL_STATE_DISCRIMINATOR: [u8; 8] = [34, 7, 180, 252, 211, 157, 15, 159];
#[allow(dead_code)]
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
                
                // Parse Anchor event logs (for events emitted by emit! macro)
                for log in &meta.log_messages {
                    if log.starts_with("Program data: ") {
                        if let Some(event) = parse_anchor_event_log(
                            log,
                            &signature,
                            slot,
                            block_timestamp,
                        ) {
                            events.push(event);
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
                    platform_fee_bps: 2500,  // 默认 25%
                    total_rewards_claimed: 0,
                    total_platform_fee_collected: 0,
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
            Some(pb::mars::vaults::v1::vault_event::Event::FarmRewardsClaimed(farm_reward)) => {
                let id = format!("{}-farm-reward", event.signature);
                
                tables
                    .create_row("farmrewardsclaimedevent", &id)
                    .set("id", &id)
                    .set("signature", &event.signature)
                    .set("user", &farm_reward.user)
                    .set("vault_mint", &farm_reward.vault_mint)
                    .set("farm_state", &farm_reward.farm_state)
                    .set("reward_mint", &farm_reward.reward_mint)
                    .set("reward_amount", farm_reward.reward_amount)
                    .set("platform_fee", farm_reward.platform_fee)
                    .set("total_rewards_claimed", farm_reward.total_rewards_claimed)
                    .set("timestamp", farm_reward.timestamp)
                    .set("slot", event.slot);
            }
            _ => {}
        }
    }

    Ok(tables.to_database_changes())
}

// ============================================================
// Kamino Integration Parser Functions
// ============================================================

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

            // 3. Kamino Deposit Event
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

            // 8. Farm Rewards Claimed Event (V18 - Token-2022 support)
            Some(pb::mars::vaults::v1::vault_event::Event::FarmRewardsClaimed(rewards)) => {
                let rewards_id = format!("{}:{}:{}", event.signature, &rewards.user, &rewards.reward_mint);
                entity_changes.push_change(
                    "FarmRewardsClaimed",
                    &rewards_id,
                    0,
                    substreams_entity_change::pb::entity::entity_change::Operation::Create,
                )
                .change("id", &rewards_id)
                .change("signature", &event.signature)
                .change("slot", event.slot.to_string())
                .change("timestamp", event.timestamp.to_string())
                .change("user", &rewards.user)
                .change("vaultMint", &rewards.vault_mint)
                .change("farmState", &rewards.farm_state)
                .change("rewardMint", &rewards.reward_mint)
                .change("rewardAmount", rewards.reward_amount.to_string())
                .change("totalRewardsClaimed", rewards.total_rewards_claimed.to_string());
            }

            // 9. Vault State Updated Event
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

/// Parse Anchor event logs (emitted by `emit!` macro)
/// 
/// Anchor events are logged as "Program data: <base64_encoded_data>"
/// Format: [8-byte event discriminator] + [Borsh-serialized event data]
fn parse_anchor_event_log(
    log: &str,
    signature: &str,
    slot: u64,
    timestamp: i64,
) -> Option<VaultEvent> {
    use base64::Engine;
    
    // Extract base64 data after "Program data: "
    let data_str = log.strip_prefix("Program data: ")?;
    let data = base64::engine::general_purpose::STANDARD.decode(data_str).ok()?;
    
    if data.len() < 8 {
        return None;
    }
    
    // Extract event discriminator (first 8 bytes)
    let discriminator: [u8; 8] = data[0..8].try_into().ok()?;
    
    // FarmRewardsClaimedEvent discriminator (from IDL)
    const FARM_REWARDS_CLAIMED_EVENT_DISC: [u8; 8] = [
        200, 44, 160, 155, 129, 16, 21, 151
    ];
    
    match discriminator {
        FARM_REWARDS_CLAIMED_EVENT_DISC => {
            parse_farm_rewards_claimed_event(&data[8..], signature, slot, timestamp)
        }
        _ => None,
    }
}

/// Parse FarmRewardsClaimedEvent from Borsh-serialized data
/// 
/// Event structure:
/// - user: Pubkey (32 bytes)
/// - vault_mint: Pubkey (32 bytes)  
/// - farm_state: Pubkey (32 bytes)
/// - reward_mint: Pubkey (32 bytes)
/// - reward_amount: u64 (8 bytes)
/// - platform_fee: u64 (8 bytes)
/// - total_rewards_claimed: u64 (8 bytes)
/// - timestamp: i64 (8 bytes)
fn parse_farm_rewards_claimed_event(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64,
) -> Option<VaultEvent> {
    if data.len() < 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 {
        return None;
    }
    
    let mut offset = 0;
    
    // Parse user (32 bytes)
    let user = bs58::encode(&data[offset..offset+32]).into_string();
    offset += 32;
    
    // Parse vault_mint (32 bytes)
    let vault_mint = bs58::encode(&data[offset..offset+32]).into_string();
    offset += 32;
    
    // Parse farm_state (32 bytes)
    let farm_state = bs58::encode(&data[offset..offset+32]).into_string();
    offset += 32;
    
    // Parse reward_mint (32 bytes)
    let reward_mint = bs58::encode(&data[offset..offset+32]).into_string();
    offset += 32;
    
    // Parse reward_amount (8 bytes)
    let reward_amount = u64::from_le_bytes(data[offset..offset+8].try_into().ok()?);
    offset += 8;
    
    // Parse platform_fee (8 bytes)
    let platform_fee = u64::from_le_bytes(data[offset..offset+8].try_into().ok()?);
    offset += 8;
    
    // Parse total_rewards_claimed (8 bytes)
    let total_rewards_claimed = u64::from_le_bytes(data[offset..offset+8].try_into().ok()?);
    offset += 8;
    
    // Parse timestamp (8 bytes) - use block timestamp
    let _event_timestamp = i64::from_le_bytes(data[offset..offset+8].try_into().ok()?);
    
    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::FarmRewardsClaimed(
            pb::mars::vaults::v1::FarmRewardsClaimedEvent {
                user,
                vault_mint,
                farm_state,
                reward_mint,
                reward_amount,
                platform_fee,
                total_rewards_claimed,
                timestamp,
            },
        )),
    })
}
