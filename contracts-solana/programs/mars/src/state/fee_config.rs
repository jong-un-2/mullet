use crate::constants::*;
use anchor_lang::prelude::*;

#[derive(Default, Clone, Debug, AnchorDeserialize, AnchorSerialize)]
pub struct FeeTier {
    pub threshold_amount: u64,
    pub bps_fee: u64,
}

/**
 * Stores fee tiers to be levied
 */
#[account]
#[derive(Default, Debug)]
pub struct FeeTiers {
    pub length: u16,
    pub fee_tiers: Vec<FeeTier>,
}

/**
 * Stores insurance fee fraction
 * This is the fee that will be levied on the order amount
 * to cover the insurance cost
 * This is a fraction, so the numerator and denominator must be specified
 * e.g. 1/10000 = 0.01% fee
 * e.g. 1/1000 = 0.1% fee
 * e.g. 1/100 = 1% fee
 */
#[account]
#[derive(Default, Debug)]
pub struct ProtocolFeeFraction {
    pub numerator: u64,
    pub denominator: u64,
}

#[derive(Default, Clone, Debug, AnchorDeserialize, AnchorSerialize)]
pub struct InsuranceFeeTier {
    pub threshold_amount: u64,
    pub insurance_fee: u64,
}

/**
 * Stores fee tiers to be levied
 */
#[account]
#[derive(Default, Debug)]
pub struct InsuranceFeeTiers {
    pub length: u16,
    pub insurance_fee_tiers: Vec<InsuranceFeeTier>,
}

/// 费用类型枚举
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum FeeType {
    Deposit,
    Withdraw,
    Management,
    Performance,
}

impl FeeTiers {
    pub fn space() -> usize {
        // 10 fee tiers max can be stored
        return 8
            + std::mem::size_of::<Self>()
            + (std::mem::size_of::<u64>() * 2 * MAX_FEE_TIERS_LENGTH);
    }

    /// Determines the basis points fee based on order size.
    /// Returns the bps fee for the appropriate tier.
    /// If no tiers are set or amount is below the first tier, returns 0.
    pub fn get_bps_fee_for_amount(fee_tiers: &Vec<FeeTier>, amount: u64) -> u64 {
        if fee_tiers.is_empty() {
            return 0;
        }

        // Default to the lowest tier fee
        let mut bps_fee = fee_tiers[0].bps_fee;

        // Find the appropriate tier based on amount
        for tier in fee_tiers.iter() {
            if amount >= tier.threshold_amount {
                bps_fee = tier.bps_fee;
            } else {
                // Once we've found a tier with a threshold higher than the amount, stop
                break;
            }
        }

        bps_fee
    }
}

impl InsuranceFeeTiers {
    pub fn space() -> usize {
        // 10 fee tiers max can be stored
        return 8
            + std::mem::size_of::<Self>()
            + (std::mem::size_of::<u64>() * 2 * MAX_FEE_TIERS_LENGTH);
    }

    /// Determines the insurance fee based on order size.
    /// Returns the insurance fee for the appropriate tier.
    /// If no tiers are set or amount is below the first tier, returns 0.
    pub fn get_insurance_fee_for_amount(fee_tiers: &Vec<InsuranceFeeTier>, amount: u64) -> u64 {
        if fee_tiers.is_empty() {
            return 0;
        }

        // Default to the lowest tier fee
        let mut insurance_fee = fee_tiers[0].insurance_fee;

        // Find the appropriate tier based on amount
        for tier in fee_tiers.iter() {
            if amount >= tier.threshold_amount {
                insurance_fee = tier.insurance_fee;
            } else {
                // Once we've found a tier with a threshold higher than the amount, stop
                break;
            }
        }

        insurance_fee
    }
}

impl ProtocolFeeFraction {
    pub fn get_protocol_fee(&self, bps_amount: u64) -> u64 {
        let numerator_u128 = self.numerator as u128;
        let denominator_u128 = self.denominator as u128;
        let fee = numerator_u128 * bps_amount as u128 / denominator_u128;

        fee as u64
    }
}
