mod pb;

use pb::mars::vaults::v1::{Events, VaultEvent};
use substreams::prelude::*;
use substreams_solana::pb::sf::solana::r#type::v1::{Block, ConfirmedTransaction};

const MARS_PROGRAM_ID: &str = "5Yxrh62n36maX6u8nePs2ztWfKTWA9pJLXCNd1tzo1kP";
const KAMINO_PROGRAM_ID: &str = "Cyjb5r4P1j1YPEyUemWxMZKbTpBiyNQML1S1YpPvi9xE";
const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

#[substreams::handlers::map]
fn map_blocks(block: Block) -> Result<Events, substreams::errors::Error> {
    let mut events = Vec::new();
    
    let slot = block.slot;
    let block_timestamp = block.block_time.as_ref().map(|t| t.timestamp).unwrap_or(0);

    for transaction in block.transactions {
        if let Some(tx) = transaction.transaction {
            if let Some(meta) = transaction.meta {
                // Skip failed transactions
                if meta.err.is_some() {
                    continue;
                }

                let signature = bs58::encode(&tx.signatures[0]).into_string();
                
                // Parse instructions for Mars vault events
                for (idx, instruction) in tx.message.as_ref().unwrap().instructions.iter().enumerate() {
                    let program_id = bs58::encode(&tx.message.as_ref().unwrap().account_keys[instruction.program_id_index as usize]).into_string();
                    
                    if program_id == MARS_PROGRAM_ID {
                        if let Some(event) = parse_mars_instruction(&instruction.data, &signature, slot, block_timestamp, idx as u32) {
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
    instruction_index: u32
) -> Option<VaultEvent> {
    if data.is_empty() {
        return None;
    }

    // Parse instruction discriminator (first 8 bytes)
    let discriminator = u64::from_le_bytes([
        data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]
    ]);

    match discriminator {
        // VaultDeposit instruction discriminator
        0x242077468fb47324 => parse_vault_deposit(data, signature, slot, timestamp),
        // VaultWithdraw instruction discriminator  
        0x2087c8967c80a71b => parse_vault_withdraw(data, signature, slot, timestamp),
        // SwapAndDeposit instruction discriminator
        0x3c8c9e2b7f5d6e4a => parse_swap_and_deposit(data, signature, slot, timestamp),
        // WithdrawWithSwap instruction discriminator
        0x7f8e9d5c4b3a2918 => parse_withdraw_with_swap(data, signature, slot, timestamp),
        // RebalanceWithSwap instruction discriminator
        0x9a8f7e6d5c4b3a21 => parse_rebalance_event(data, signature, slot, timestamp),
        _ => None,
    }
}

fn parse_vault_deposit(
    data: &[u8],
    signature: &str,
    slot: u64, 
    timestamp: i64
) -> Option<VaultEvent> {
    if data.len() < 48 { // 8 (discriminator) + 32 (vault_id) + 8 (amount)
        return None;
    }

    let vault_id = data[8..40].to_vec();
    let amount = u64::from_le_bytes([
        data[40], data[41], data[42], data[43], data[44], data[45], data[46], data[47]
    ]);
    
    // For now, we'll extract basic info - in real implementation, 
    // we'd parse the full instruction accounts and data
    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp: timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(
            pb::mars::vaults::v1::VaultDepositEvent {
                user: "".to_string(), // Would be parsed from accounts
                vault_id,
                amount,
                shares_received: 0, // Would be calculated
                protocol_id: 1, // Kamino
                timestamp,
            }
        )),
    })
}

fn parse_vault_withdraw(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64
) -> Option<VaultEvent> {
    if data.len() < 48 {
        return None;
    }

    let vault_id = data[8..40].to_vec();
    let shares_burned = u64::from_le_bytes([
        data[40], data[41], data[42], data[43], data[44], data[45], data[46], data[47]
    ]);

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(
            pb::mars::vaults::v1::VaultWithdrawEvent {
                user: "".to_string(),
                vault_id,
                shares_burned,
                amount_received: 0, // Would be calculated
                protocol_id: 1,
                timestamp,
            }
        )),
    })
}

fn parse_swap_and_deposit(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64
) -> Option<VaultEvent> {
    if data.len() < 88 { // 8 + 32 + 32 + 8 + 8 
        return None;
    }

    let vault_id = data[8..40].to_vec();
    let amount_in = u64::from_le_bytes([
        data[72], data[73], data[74], data[75], data[76], data[77], data[78], data[79]
    ]);
    let amount_out = u64::from_le_bytes([
        data[80], data[81], data[82], data[83], data[84], data[85], data[86], data[87]
    ]);

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::SwapAndDeposit(
            pb::mars::vaults::v1::SwapAndDepositEvent {
                user: "".to_string(),
                vault_id,
                from_token: "".to_string(), // Would be parsed from accounts
                to_token: "".to_string(),
                amount_in,
                amount_out,
                shares_received: 0,
                protocol_id: 1,
                timestamp,
            }
        )),
    })
}

fn parse_withdraw_with_swap(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64
) -> Option<VaultEvent> {
    if data.len() < 56 {
        return None;
    }

    let vault_id = data[8..40].to_vec();
    let shares_burned = u64::from_le_bytes([
        data[40], data[41], data[42], data[43], data[44], data[45], data[46], data[47]
    ]);
    let slippage_bps = u32::from_le_bytes([
        data[48], data[49], data[50], data[51]
    ]);

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::WithdrawWithSwap(
            pb::mars::vaults::v1::WithdrawWithSwapEvent {
                user: "".to_string(),
                vault_id,
                shares_burned,
                target_token: "".to_string(),
                amount_received: 0,
                slippage_bps,
                timestamp,
            }
        )),
    })
}

fn parse_rebalance_event(
    data: &[u8],
    signature: &str,
    slot: u64,
    timestamp: i64
) -> Option<VaultEvent> {
    if data.len() < 64 {
        return None;
    }

    let vault_id = data[8..40].to_vec();
    let protocol_from = u32::from_le_bytes([data[40], data[41], data[42], data[43]]);
    let protocol_to = u32::from_le_bytes([data[44], data[45], data[46], data[47]]);
    let amount_in = u64::from_le_bytes([
        data[48], data[49], data[50], data[51], data[52], data[53], data[54], data[55]
    ]);
    let amount_out = u64::from_le_bytes([
        data[56], data[57], data[58], data[59], data[60], data[61], data[62], data[63]
    ]);

    Some(VaultEvent {
        signature: signature.to_string(),
        slot,
        timestamp,
        program_id: MARS_PROGRAM_ID.to_string(),
        event: Some(pb::mars::vaults::v1::vault_event::Event::Rebalance(
            pb::mars::vaults::v1::RebalanceEvent {
                vault_id,
                protocol_from,
                protocol_to,
                amount_in,
                amount_out,
                executor: "".to_string(),
                timestamp,
                reason: "".to_string(),
            }
        )),
    })
}

#[substreams::handlers::store]
fn store_vault_states(events: Events, store: StoreSetProto<pb::mars::vaults::v1::VaultSnapshot>) {
    for event in events.events {
        match event.event {
            Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(deposit)) => {
                let vault_key = format!("vault:{}", bs58::encode(&deposit.vault_id).into_string());
                
                // In a real implementation, we would:
                // 1. Load existing vault state
                // 2. Update totals based on the deposit
                // 3. Store updated state
                
                let vault_snapshot = pb::mars::vaults::v1::VaultSnapshot {
                    vault_id: deposit.vault_id,
                    admin: "".to_string(),
                    base_token_mint: "".to_string(),
                    shares_mint: "".to_string(),
                    total_deposits: deposit.amount, // In real implementation, add to existing
                    total_shares: deposit.shares_received,
                    apy: 0,
                    status: pb::mars::vaults::v1::VaultStatus::VaultStatusActive as i32,
                    protocols: vec![],
                    users: vec![],
                    fee_config: None,
                    created_at: deposit.timestamp,
                    last_updated: deposit.timestamp,
                };
                
                store.set(0, &vault_key, &vault_snapshot);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(withdraw)) => {
                let vault_key = format!("vault:{}", bs58::encode(&withdraw.vault_id).into_string());
                
                // Similar logic for withdrawals - update vault state
                let vault_snapshot = pb::mars::vaults::v1::VaultSnapshot {
                    vault_id: withdraw.vault_id,
                    admin: "".to_string(),
                    base_token_mint: "".to_string(),
                    shares_mint: "".to_string(),
                    total_deposits: 0, // Would subtract from existing
                    total_shares: 0, // Would subtract burned shares
                    apy: 0,
                    status: pb::mars::vaults::v1::VaultStatus::VaultStatusActive as i32,
                    protocols: vec![],
                    users: vec![],
                    fee_config: None,
                    created_at: 0,
                    last_updated: withdraw.timestamp,
                };
                
                store.set(0, &vault_key, &vault_snapshot);
            }
            _ => {} // Handle other event types
        }
    }
}

#[substreams::handlers::map]
fn graph_out(
    events: Events, 
    vault_states: StoreGetProto<pb::mars::vaults::v1::VaultSnapshot>
) -> Result<substreams_entity_change::pb::entity::EntityChanges, substreams::errors::Error> {
    use substreams_entity_change::pb::entity::{EntityChange, EntityChanges};
    use substreams_entity_change::tables::Tables;

    let mut tables = Tables::new();

    for event in events.events {
        match event.event {
            Some(pb::mars::vaults::v1::vault_event::Event::VaultDeposit(deposit)) => {
                let vault_id = bs58::encode(&deposit.vault_id).into_string();
                
                tables
                    .create_row("VaultDeposit", format!("{}-{}", event.signature, vault_id))
                    .set("id", format!("{}-{}", event.signature, vault_id))
                    .set("signature", &event.signature)
                    .set("user", &deposit.user)
                    .set("vault", &vault_id)
                    .set("amount", deposit.amount)
                    .set("sharesReceived", deposit.shares_received)
                    .set("protocolId", deposit.protocol_id)
                    .set("timestamp", deposit.timestamp)
                    .set("slot", event.slot);

                // Update vault entity
                tables
                    .update_row("Vault", &vault_id)
                    .set("id", &vault_id)
                    .set("lastUpdated", deposit.timestamp);
            }
            Some(pb::mars::vaults::v1::vault_event::Event::VaultWithdraw(withdraw)) => {
                let vault_id = bs58::encode(&withdraw.vault_id).into_string();
                
                tables
                    .create_row("VaultWithdraw", format!("{}-{}", event.signature, vault_id))
                    .set("id", format!("{}-{}", event.signature, vault_id))
                    .set("signature", &event.signature)
                    .set("user", &withdraw.user)
                    .set("vault", &vault_id)
                    .set("sharesBurned", withdraw.shares_burned)
                    .set("amountReceived", withdraw.amount_received)
                    .set("protocolId", withdraw.protocol_id)
                    .set("timestamp", withdraw.timestamp)
                    .set("slot", event.slot);
            }
            _ => {} // Handle other events
        }
    }

    Ok(EntityChanges {
        entity_changes: tables.to_entity_changes(),
    })
}