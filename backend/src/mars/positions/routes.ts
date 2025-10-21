/**
 * User Positions API Routes
 * Provides cached user position data from PostgreSQL
 */

import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';
import { getUserPositionsCollector } from '../../services/userPositionsCollector';

type Bindings = {
  NEON_DATABASE_URL: string;
  SOLANA_RPC_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * GET /v1/api/mars/positions/:userAddress
 * Get cached user positions from database
 */
app.get('/:userAddress', async (c) => {
  try {
    const userAddress = c.req.param('userAddress');
    
    if (!userAddress) {
      return c.json({ 
        success: false, 
        error: 'User address is required' 
      }, 400);
    }

    // Get Neon database connection
    const sql = neon(c.env.NEON_DATABASE_URL);
    
    // Query cached positions from database
    let positions = await sql`
      SELECT * FROM mars_user_positions
      WHERE user_address = ${userAddress}
      AND status = 'active'
      ORDER BY last_fetch_time DESC
    `;

    // If no cached positions, fetch live from blockchain
    if (positions.length === 0) {
      console.log(`🔍 No cached positions for ${userAddress}, fetching live data...`);
      
      try {
        const collector = await getUserPositionsCollector(c.env.SOLANA_RPC_URL);
        const livePositions = await collector.fetchUserPositions(userAddress);
        
        if (livePositions.length === 0) {
          console.log(`ℹ️ No live positions found for ${userAddress}`);
          return c.json({
            success: true,
            data: {
              jupiter: {
                protocol: 'jupiter',
                totalPositions: 0,
                totalValue: 0,
                avgAPY: 0,
                positions: []
              },
              kamino: {
                protocol: 'kamino',
                totalPositions: 0,
                totalValue: 0,
                avgAPY: 0,
                positions: []
              },
              summary: {
                totalProtocols: 0,
                totalPositions: 0,
                totalValue: 0,
                avgAPY: 0
              }
            },
            timestamp: new Date().toISOString(),
            cached: false,
            message: 'No positions found for this user.'
          });
        }
        
        // Save to database for future requests
        for (const position of livePositions) {
          await sql`
            INSERT INTO mars_user_positions (
              id, user_address, vault_address, protocol, strategy_address, strategy_name,
              base_token, base_token_mint,
              total_shares, total_deposited, total_withdrawn, realized_pnl,
              current_value, unrealized_pnl, interest_earned, daily_interest_usd,
              apy, lending_apy, incentives_apy, total_apy,
              reward_tokens, pending_rewards, total_rewards_claimed, last_reward_claim,
              risk_level, status,
              first_deposit_time, last_activity_time, last_fetch_time, updated_at
            ) VALUES (
              ${position.id}, ${position.userAddress}, ${position.vaultAddress},
              ${position.protocol}, ${position.strategyAddress}, ${position.strategyName},
              ${position.baseToken}, ${position.baseTokenMint},
              ${position.totalShares}, ${position.totalSupplied}, '0', '0',
              ${position.currentValue}, ${position.unrealizedPnl}, ${position.interestEarned}, ${position.dailyInterestUSD},
              ${position.totalAPY}, ${position.lendingAPY}, ${position.incentivesAPY}, ${position.totalAPY},
              ${JSON.stringify(position.rewards)},
              ${JSON.stringify(position.pendingRewards)},
              ${JSON.stringify(position.totalRewardsClaimed)},
              ${position.lastRewardClaim},
              ${position.riskLevel}, ${position.status},
              ${position.firstDepositTime}, ${position.lastActivityTime},
              ${position.lastFetchTime}, NOW()
            )
          ON CONFLICT (user_address, vault_address) DO UPDATE SET
            total_shares = EXCLUDED.total_shares,
            total_deposited = EXCLUDED.total_deposited,
            current_value = EXCLUDED.current_value,
            unrealized_pnl = EXCLUDED.unrealized_pnl,
            interest_earned = EXCLUDED.interest_earned,
            daily_interest_usd = EXCLUDED.daily_interest_usd,
            apy = EXCLUDED.apy,
            lending_apy = EXCLUDED.lending_apy,
            incentives_apy = EXCLUDED.incentives_apy,
            total_apy = EXCLUDED.total_apy,
            reward_tokens = EXCLUDED.reward_tokens,
            pending_rewards = EXCLUDED.pending_rewards,
            base_token = EXCLUDED.base_token,
            base_token_mint = EXCLUDED.base_token_mint,
            strategy_name = EXCLUDED.strategy_name,
            last_activity_time = EXCLUDED.last_activity_time,
            last_fetch_time = EXCLUDED.last_fetch_time,
            updated_at = NOW()
        `;
        }
        
        console.log(`✅ Saved ${livePositions.length} live positions to database`);
        
        // Reload positions from database after saving
        positions = await sql`
          SELECT * FROM mars_user_positions
          WHERE user_address = ${userAddress}
          AND status = 'active'
          ORDER BY last_fetch_time DESC
        `;
      } catch (error) {
        console.error('Failed to fetch live positions:', error);
        return c.json({
          success: false,
          error: 'Failed to fetch live positions',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }

    // Transform database rows to API response format
    const transformedPositions = positions.map(row => ({
      id: row.id,
      userAddress: row.user_address,
      vaultAddress: row.vault_address,
      protocol: row.protocol,
      strategyAddress: row.strategy_address,
      strategyName: row.strategy_name,
      
      baseToken: row.base_token,
      baseTokenMint: row.base_token_mint,
      
      totalShares: row.total_shares,
      totalSupplied: row.total_deposited,
      totalSuppliedUSD: row.current_value,
      
      interestEarned: row.interest_earned,
      dailyInterestUSD: row.daily_interest_usd,
      
      lendingAPY: parseFloat(row.lending_apy || '0'),
      incentivesAPY: parseFloat(row.incentives_apy || '0'),
      totalAPY: parseFloat(row.total_apy || row.apy || '0'),
      
      tvl: row.tvl,
      liquidityDepth: row.liquidity_depth,
      
      rewards: row.reward_tokens ? JSON.parse(row.reward_tokens) : [],
      pendingRewards: row.pending_rewards ? JSON.parse(row.pending_rewards) : {},
      totalRewardsClaimed: row.total_rewards_claimed ? JSON.parse(row.total_rewards_claimed) : {},
      lastRewardClaim: row.last_reward_claim,
      
      riskLevel: row.risk_level,
      status: row.status,
      
      firstDepositTime: row.first_deposit_time,
      lastActivityTime: row.last_activity_time,
      lastFetchTime: row.last_fetch_time,
    }));

    // Group positions by protocol (jupiter, kamino, etc.)
    const jupiterPositions = transformedPositions.filter(p => p.protocol === 'jupiter');
    // Accept both 'mars-vault' and 'kamino-vault' for backward compatibility
    const kaminoPositions = transformedPositions.filter(p => 
      p.protocol === 'mars-vault' || p.protocol === 'kamino-vault'
    );
    
    // Format for frontend compatibility (matches mars/routes.ts format)
    const positionsData = {
      jupiter: {
        protocol: 'jupiter',
        totalPositions: jupiterPositions.length,
        totalValue: jupiterPositions.reduce((sum, p) => sum + parseFloat(p.totalSuppliedUSD || '0'), 0),
        avgAPY: jupiterPositions.length > 0
          ? jupiterPositions.reduce((sum, p) => sum + p.totalAPY, 0) / jupiterPositions.length
          : 0,
        positions: jupiterPositions.map(p => ({
          id: p.id,
          userAddress: p.userAddress,
          protocol: p.protocol,
          asset: p.baseToken,
          amount: parseFloat(p.totalSupplied || '0'),
          shares: parseFloat(p.totalShares || '0'),
          entryAPY: p.totalAPY,
          currentValue: parseFloat(p.totalSuppliedUSD || '0'),
          unrealizedGain: parseFloat(p.interestEarned || '0'),
          depositTime: p.firstDepositTime,
          lastUpdate: p.lastFetchTime
        }))
      },
      kamino: {
        protocol: 'kamino',
        totalPositions: kaminoPositions.length,
        totalValue: kaminoPositions.reduce((sum, p) => sum + parseFloat(p.totalSuppliedUSD || '0'), 0),
        avgAPY: kaminoPositions.length > 0
          ? kaminoPositions.reduce((sum, p) => sum + p.totalAPY, 0) / kaminoPositions.length
          : 0,
        positions: kaminoPositions.map(p => ({
          id: p.id,
          userAddress: p.userAddress,
          protocol: 'mars-vault', // Normalize protocol name
          asset: p.baseToken,
          amount: parseFloat(p.totalSupplied?.toString() || '0'),
          shares: parseFloat(p.totalShares?.toString() || '0'),
          entryAPY: p.totalAPY,
          lendingAPY: p.lendingAPY,
          incentivesAPY: p.incentivesAPY,
          currentValue: parseFloat(p.totalSuppliedUSD?.toString() || '0'),
          unrealizedGain: parseFloat(p.interestEarned?.toString() || '0'),
          interestEarned: parseFloat(p.interestEarned?.toString() || '0'),
          dailyInterestUSD: parseFloat(p.dailyInterestUSD?.toString() || '0'),
          rewards: p.rewards,
          pendingRewards: p.pendingRewards,
          depositTime: p.firstDepositTime,
          lastUpdate: p.lastFetchTime
        }))
      },
      summary: {
        totalProtocols: [jupiterPositions.length > 0, kaminoPositions.length > 0].filter(Boolean).length,
        totalPositions: jupiterPositions.length + kaminoPositions.length,
        totalValue: jupiterPositions.reduce((sum, p) => sum + parseFloat(p.totalSuppliedUSD || '0'), 0) +
                   kaminoPositions.reduce((sum, p) => sum + parseFloat(p.totalSuppliedUSD || '0'), 0),
        avgAPY: transformedPositions.length > 0
          ? transformedPositions.reduce((sum, p) => sum + p.totalAPY, 0) / transformedPositions.length
          : 0
      }
    };
    
    return c.json({
      success: true,
      data: positionsData,
      timestamp: new Date().toISOString(),
      cached: true
    });

  } catch (error) {
    console.error('Error fetching user positions:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /v1/api/mars/positions/:userAddress/refresh
 * Force refresh user positions from blockchain
 */
app.post('/:userAddress/refresh', async (c) => {
  try {
    const userAddress = c.req.param('userAddress');
    
    if (!userAddress) {
      return c.json({ 
        success: false, 
        error: 'User address is required' 
      }, 400);
    }

    // Get fresh data from blockchain
    const collector = await getUserPositionsCollector(c.env.SOLANA_RPC_URL);
    const positions = await collector.fetchUserPositions(userAddress);

    // Save to database
    const sql = neon(c.env.NEON_DATABASE_URL);
    
    // If no positions found on-chain, mark existing positions as inactive
    if (positions.length === 0) {
      console.log(`🗑️ No positions found on-chain for ${userAddress}, marking existing positions as inactive`);
      await sql`
        UPDATE mars_user_positions
        SET status = 'inactive', updated_at = NOW()
        WHERE user_address = ${userAddress}
        AND status = 'active'
      `;
      
      return c.json({
        success: true,
        data: {
          positions: [],
          refreshed: true,
          message: 'No active positions found on-chain. Existing positions marked as inactive.',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    for (const position of positions) {
      await sql`
        INSERT INTO mars_user_positions (
          id, user_address, vault_address, protocol, strategy_address, strategy_name,
          base_token, base_token_mint,
          total_shares, total_deposited, total_withdrawn, realized_pnl,
          current_value, unrealized_pnl, interest_earned, daily_interest_usd,
          apy, lending_apy, incentives_apy, total_apy,
          reward_tokens, pending_rewards, total_rewards_claimed, last_reward_claim,
          risk_level, status,
          first_deposit_time, last_activity_time, last_fetch_time, updated_at
        ) VALUES (
          ${position.id}, ${position.userAddress}, ${position.vaultAddress},
          ${position.protocol}, ${position.strategyAddress}, ${position.strategyName},
          ${position.baseToken}, ${position.baseTokenMint},
          ${position.totalShares}, ${position.totalSupplied}, '0', '0',
          ${position.currentValue}, ${position.unrealizedPnl}, ${position.interestEarned}, ${position.dailyInterestUSD},
          ${position.totalAPY}, ${position.lendingAPY}, ${position.incentivesAPY}, ${position.totalAPY},
          ${JSON.stringify(position.rewards)}, 
          ${JSON.stringify(position.pendingRewards)}, 
          ${JSON.stringify(position.totalRewardsClaimed)},
          ${position.lastRewardClaim},
          ${position.riskLevel}, ${position.status},
          ${position.firstDepositTime}, ${position.lastActivityTime},
          ${position.lastFetchTime}, NOW()
        )
        ON CONFLICT (user_address, vault_address) DO UPDATE SET
          total_shares = EXCLUDED.total_shares,
          current_value = EXCLUDED.current_value,
          unrealized_pnl = EXCLUDED.unrealized_pnl,
          interest_earned = EXCLUDED.interest_earned,
          daily_interest_usd = EXCLUDED.daily_interest_usd,
          apy = EXCLUDED.apy,
          lending_apy = EXCLUDED.lending_apy,
          incentives_apy = EXCLUDED.incentives_apy,
          total_apy = EXCLUDED.total_apy,
          pending_rewards = EXCLUDED.pending_rewards,
          last_fetch_time = EXCLUDED.last_fetch_time,
          updated_at = NOW()
      `;
    }

    return c.json({
      success: true,
      data: {
        positions,
        refreshed: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error refreshing user positions:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
