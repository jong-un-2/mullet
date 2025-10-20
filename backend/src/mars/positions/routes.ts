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
    const positions = await sql`
      SELECT * FROM mars_user_positions
      WHERE user_address = ${userAddress}
      AND status = 'active'
      ORDER BY last_fetch_time DESC
    `;

    if (positions.length === 0) {
      return c.json({
        success: true,
        data: {
          positions: [],
          message: 'No positions found. Data will be available after next sync.'
        }
      });
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
      totalSupplied: row.total_deposited, // TODO: Update schema to use totalSupplied
      totalSuppliedUSD: row.current_value,
      
      interestEarned: row.unrealized_pnl,
      dailyInterestUSD: '0', // Calculate from APY
      
      lendingAPY: parseFloat(row.apr || '0'),
      incentivesAPY: 0, // Parse from metadata
      totalAPY: parseFloat(row.apy || row.apr || '0'),
      
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

    const firstPosition = transformedPositions[0];
    
    return c.json({
      success: true,
      data: {
        positions: transformedPositions,
        lastUpdate: firstPosition ? firstPosition.lastFetchTime : new Date(),
        cached: true
      }
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
    
    for (const position of positions) {
      await sql`
        INSERT INTO mars_user_positions (
          id, user_address, vault_address, protocol, strategy_address, strategy_name,
          base_token, base_token_mint,
          total_shares, total_deposited, total_withdrawn, realized_pnl,
          current_value, unrealized_pnl,
          apr, apy,
          tvl, liquidity_depth,
          reward_tokens, pending_rewards, total_rewards_claimed, last_reward_claim,
          risk_level, status,
          first_deposit_time, last_activity_time, last_fetch_time, updated_at
        ) VALUES (
          ${position.id}, ${position.userAddress}, ${position.vaultAddress},
          ${position.protocol}, ${position.strategyAddress}, ${position.strategyName},
          ${position.baseToken}, ${position.baseTokenMint},
          ${position.totalShares}, ${position.totalSupplied}, '0', '0',
          ${position.currentValue}, ${position.unrealizedPnl},
          ${position.totalAPY}, ${position.totalAPY},
          ${position.tvl}, ${position.liquidityDepth},
          ${JSON.stringify(position.rewards)}, 
          ${JSON.stringify(position.pendingRewards)}, 
          ${JSON.stringify(position.totalRewardsClaimed)},
          ${position.lastRewardClaim},
          ${position.riskLevel}, ${position.status},
          ${position.firstDepositTime}, ${position.lastActivityTime},
          ${position.lastFetchTime}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          total_shares = EXCLUDED.total_shares,
          current_value = EXCLUDED.current_value,
          unrealized_pnl = EXCLUDED.unrealized_pnl,
          apr = EXCLUDED.apr,
          apy = EXCLUDED.apy,
          tvl = EXCLUDED.tvl,
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
