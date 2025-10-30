use anchor_lang::prelude::*;
// use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
// use pythnet_sdk::messages::Message;

/// Pyth 价格预言机工具模块
///
/// 功能：
/// - 从 Pyth Pull Oracle 获取实时价格
/// - 价格验证和过期检查
/// - 支持多种代币价格查询
/// - 置信区间检查

/// 价格数据结构
#[derive(Debug, Clone)]
pub struct PriceData {
    /// 价格（经过指数调整后的实际价格）
    pub price: i64,

    /// 置信区间
    pub confidence: u64,

    /// 指数（价格 = price * 10^exponent）
    pub exponent: i32,

    /// 发布时间
    pub publish_time: i64,
}

impl PriceData {
    /// 计算实际价格（转换为u64，精度为6位小数）
    pub fn to_ui_price(&self) -> Option<u64> {
        // 将价格转换为6位小数精度的u64
        // 例如：如果 price = 1.5 USD，返回 1_500_000

        let price_i128 = self.price as i128;
        let exponent = self.exponent;

        // 目标精度为 10^6（6位小数）
        let target_exponent = 6;
        let exponent_diff = target_exponent - exponent;

        if exponent_diff >= 0 {
            // 需要放大
            let multiplier = 10i128.pow(exponent_diff as u32);
            price_i128.checked_mul(multiplier).and_then(|v| u64::try_from(v).ok())
        } else {
            // 需要缩小
            let divisor = 10i128.pow((-exponent_diff) as u32);
            price_i128.checked_div(divisor).and_then(|v| u64::try_from(v).ok())
        }
    }

    /// 检查价格是否在置信区间内
    pub fn is_price_reliable(&self, max_confidence_bps: u64) -> bool {
        // max_confidence_bps: 最大允许的置信区间（基点）
        // 例如：200 = 2% 的价格不确定性

        if self.price <= 0 {
            return false;
        }

        let confidence_bps = (self.confidence as u128)
            .checked_mul(10_000)
            .and_then(|v| v.checked_div(self.price.abs() as u128))
            .and_then(|v| u64::try_from(v).ok())
            .unwrap_or(u64::MAX);

        confidence_bps <= max_confidence_bps
    }

    /// 检查价格是否过期
    pub fn is_stale(&self, max_staleness_seconds: i64) -> Result<bool> {
        let current_time = Clock::get()?.unix_timestamp;
        let age = current_time.saturating_sub(self.publish_time);
        Ok(age > max_staleness_seconds)
    }
}

/// Pyth Oracle 帮助函数
pub struct PythOracle;

impl PythOracle {
    /// 从 Pyth PriceUpdateV2 账户获取价格
    ///
    /// 注意：这是一个占位实现。实际使用时需要集成 Pyth SDK。
    ///
    /// 实际实现示例：
    /// ```ignore
    /// use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;
    /// let price_update = PriceUpdateV2::try_from_slice(&price_update_account.data.borrow())?;
    /// ```
    pub fn get_price_from_account(
        _price_update_account: &AccountInfo,
        _feed_id: &str,
    ) -> Result<PriceData> {
        // TODO: 实际项目中应该使用 Pyth SDK 解析价格数据
        // 当前返回占位错误，提示需要完整实现
        msg!("Warning: PythOracle::get_price_from_account is a placeholder. Implement with pyth-solana-receiver-sdk.");
        Err(error!(crate::error::CustomError::PriceOracleError))
    }

    /// 验证价格数据的有效性
    pub fn validate_price(
        price_data: &PriceData,
        max_staleness_seconds: i64,
        max_confidence_bps: u64,
    ) -> Result<()> {
        // 1. 检查价格是否为正数
        require!(price_data.price > 0, crate::error::CustomError::PriceOracleError);

        // 2. 检查价格是否过期
        require!(
            !price_data.is_stale(max_staleness_seconds)?,
            crate::error::CustomError::PriceOracleError
        );

        // 3. 检查置信区间
        require!(
            price_data.is_price_reliable(max_confidence_bps),
            crate::error::CustomError::PriceOracleError
        );

        Ok(())
    }

    /// 计算两个代币之间的兑换率
    /// 返回：from_token 价格 / to_token 价格（6位小数精度）
    pub fn calculate_exchange_rate(from_price: &PriceData, to_price: &PriceData) -> Option<u64> {
        let from_ui_price = from_price.to_ui_price()?;
        let to_ui_price = to_price.to_ui_price()?;

        if to_ui_price == 0 {
            return None;
        }

        // 兑换率 = from_price / to_price * 10^6（保持6位小数精度）
        (from_ui_price as u128)
            .checked_mul(1_000_000)
            .and_then(|v| v.checked_div(to_ui_price as u128))
            .and_then(|v| u64::try_from(v).ok())
    }

    /// 使用价格预言机计算兑换金额（带滑点保护）
    pub fn calculate_swap_amount(
        input_amount: u64,
        from_price: &PriceData,
        to_price: &PriceData,
        slippage_bps: u16,
    ) -> Result<u64> {
        // 1. 计算兑换率
        let exchange_rate = Self::calculate_exchange_rate(from_price, to_price)
            .ok_or(error!(crate::error::CustomError::PriceOracleError))?;

        // 2. 计算理论输出金额
        let theoretical_output = (input_amount as u128)
            .checked_mul(exchange_rate as u128)
            .and_then(|v| v.checked_div(1_000_000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        // 3. 应用滑点保护
        let slippage_multiplier = 10_000u128.saturating_sub(slippage_bps as u128);
        let min_output = (theoretical_output as u128)
            .checked_mul(slippage_multiplier)
            .and_then(|v| v.checked_div(10_000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(error!(crate::error::CustomError::MathOverflow))?;

        Ok(min_output)
    }
}

/// 常用代币的 Pyth Price Feed IDs
pub mod feed_ids {
    /// USDC/USD
    pub const USDC_USD: &str = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";

    /// USDT/USD
    pub const USDT_USD: &str = "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b";

    /// SOL/USD
    pub const SOL_USD: &str = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

    /// PYUSD/USD
    pub const PYUSD_USD: &str =
        "0x6b23ac71a7408c083319bbd582e294ea0fae30c9bce53c099e94b66f02c63e23";

    /// BTC/USD
    pub const BTC_USD: &str = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

    /// ETH/USD
    pub const ETH_USD: &str = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_price_to_ui() {
        // 测试价格转换
        let price_data = PriceData {
            price: 150000, // 1.5 USD
            confidence: 100,
            exponent: -5, // 价格实际为 150000 * 10^-5 = 1.5
            publish_time: 0,
        };

        let ui_price = price_data.to_ui_price().unwrap();
        assert_eq!(ui_price, 1_500_000); // 1.5 USD = 1,500,000 (6位小数)
    }

    #[test]
    fn test_confidence_check() {
        let price_data = PriceData {
            price: 100_000_000,    // $100
            confidence: 1_000_000, // $1 置信区间
            exponent: -6,
            publish_time: 0,
        };

        // 1% 置信区间应该通过 200 bps (2%) 的检查
        assert!(price_data.is_price_reliable(200));

        // 但不应该通过 50 bps (0.5%) 的检查
        assert!(!price_data.is_price_reliable(50));
    }

    #[test]
    fn test_exchange_rate() {
        let usdc_price = PriceData {
            price: 100000000, // $1.00
            confidence: 10000,
            exponent: -8,
            publish_time: 0,
        };

        let sol_price = PriceData {
            price: 10000000000, // $100.00
            confidence: 100000,
            exponent: -8,
            publish_time: 0,
        };

        // 1 SOL = 100 USDC
        let rate = PythOracle::calculate_exchange_rate(&sol_price, &usdc_price).unwrap();
        assert_eq!(rate, 100_000_000); // 100.0 (6位小数)
    }
}
