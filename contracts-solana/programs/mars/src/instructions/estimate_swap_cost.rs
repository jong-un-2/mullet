use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct EstimateSwapCost<'info> {
    /// Mars Vault 状态账户（只读）
    #[account(
        seeds = [b"vault-state", vault_state.vault_id.as_ref()],
        bump = vault_state.bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// Jupiter 程序（用于查询价格）
    /// CHECK: Jupiter 程序验证
    pub jupiter_program: AccountInfo<'info>,
    
    /// Price Oracle 账户
    /// CHECK: 价格预言机验证
    pub price_oracle: AccountInfo<'info>,
}

impl EstimateSwapCost<'_> {
    pub fn process_instruction(
        ctx: Context<Self>,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
    ) -> Result<SwapEstimate> {
        msg!(
            "Estimating swap cost: {} {} -> {}",
            amount,
            from_token,
            to_token
        );
        
        // 1. 获取当前市场价格
        let market_price = Self::get_market_price(&ctx, from_token, to_token)?;
        
        // 2. 估算 Jupiter 路由的最佳价格
        let jupiter_estimate = Self::get_jupiter_estimate(
            &ctx,
            from_token,
            to_token,
            amount,
        )?;
        
        // 3. 计算费用组成
        let fees = Self::calculate_fees(&ctx, amount, jupiter_estimate.output_amount)?;
        
        // 4. 计算价格影响
        let price_impact = Self::calculate_price_impact(
            market_price,
            jupiter_estimate.execution_price,
            amount,
        )?;
        
        let estimate = SwapEstimate {
            input_amount: amount,
            output_amount: jupiter_estimate.output_amount,
            minimum_output_amount: jupiter_estimate.output_amount * 95 / 100, // 5% 滑点保护
            price_impact_bps: price_impact,
            fees,
            route: jupiter_estimate.route,
            execution_price: jupiter_estimate.execution_price,
            market_price,
        };
        
        msg!("Swap estimate completed: output={}, impact={} bps", 
             estimate.output_amount, 
             estimate.price_impact_bps);
        
        Ok(estimate)
    }
    
    fn get_market_price(
        ctx: &Context<Self>,
        from_token: Pubkey,
        to_token: Pubkey,
    ) -> Result<u64> {
        // 从价格预言机获取市场价格
        // 这里可以集成 Pyth, Switchboard 等
        
        msg!("Fetching market price from oracle");
        
        // 暂时返回模拟价格（实际需要从预言机获取）
        Ok(100_000) // 1.0 的定点数表示
    }
    
    fn get_jupiter_estimate(
        ctx: &Context<Self>,
        from_token: Pubkey,
        to_token: Pubkey,
        amount: u64,
    ) -> Result<JupiterQuote> {
        // 调用 Jupiter API 获取最佳路由
        // 这里需要使用 Jupiter 的 quote API
        
        msg!("Getting Jupiter route quote");
        
        // 暂时返回模拟报价
        Ok(JupiterQuote {
            output_amount: amount * 99 / 100, // 假设 1% 滑点
            execution_price: 99_000, // 0.99 的定点数表示
            route: vec![from_token, to_token], // 简单的直接路由
        })
    }
    
    fn calculate_fees(
        ctx: &Context<Self>,
        input_amount: u64,
        output_amount: u64,
    ) -> Result<SwapFees> {
        let vault_state = &ctx.accounts.vault_state;
        
        // 计算各种费用
        let platform_fee = input_amount * vault_state.platform_fee_bps as u64 / 10_000;
        let jupiter_fee = input_amount * 25 / 10_000; // Jupiter 典型费用 0.25%
        let gas_estimate = 50_000; // 估算的 gas 费用（lamports）
        
        Ok(SwapFees {
            platform_fee,
            dex_fee: jupiter_fee,
            gas_fee: gas_estimate,
            total_fee: platform_fee + jupiter_fee + gas_estimate,
        })
    }
    
    fn calculate_price_impact(
        market_price: u64,
        execution_price: u64,
        amount: u64,
    ) -> Result<u16> {
        // 计算价格影响（以基点为单位）
        if market_price == 0 {
            return Ok(0);
        }
        
        let price_diff = if execution_price > market_price {
            execution_price - market_price
        } else {
            market_price - execution_price
        };
        
        let impact_bps = (price_diff * 10_000) / market_price;
        
        Ok(impact_bps as u16)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapEstimate {
    pub input_amount: u64,
    pub output_amount: u64,
    pub minimum_output_amount: u64,
    pub price_impact_bps: u16,
    pub fees: SwapFees,
    pub route: Vec<Pubkey>,
    pub execution_price: u64,
    pub market_price: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapFees {
    pub platform_fee: u64,
    pub dex_fee: u64,
    pub gas_fee: u64,
    pub total_fee: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct JupiterQuote {
    pub output_amount: u64,
    pub execution_price: u64,
    pub route: Vec<Pubkey>,
}