import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';
import { createDexRoutes } from './dex/routes';
import { D1Agent } from './mcp/routes';
import { createDBRoutes } from './database/routes';
import { createCacheRoutes } from './cache/routes';
import { runCacheWarming } from './cache/warmer';
import { getUserPositionsCollector } from './services/userPositionsCollector';
import { neon } from '@neondatabase/serverless';

import { createIndexerRoutes } from './containers';
import { createMarsRoutes } from './mars/routes';
import { createNeonCommissionRoutes } from './neon/commission-routes';
import { runIncrementalSync, getIndexerHealth } from './services/substreamsIndexer';
import { collectVaultHistoricalData } from './services/vaultHistoricalCollector';
import tronWalletRoutes from './routes/tron-wallet';

export interface Env {
	D1_DATABASE?: D1Database;
	KV?: KVNamespace;
	HYPERDRIVE?: Hyperdrive;
	KEY: string;
	NODE_ENV?: string;
	// GraphQL configuration  
	SUBGRAPH_URL?: string;
	// Substreams configuration
	SUBSTREAMS_INDEXER_CONTAINER?: any;
	SUBSTREAMS_ENDPOINT?: string;
	SUBSTREAMS_JWT_TOKEN?: string;
	// Solana RPC
	SOLANA_RPC_URL?: string;
	SOLANA_CLUSTER?: string;
	// Neon Database direct connection (fallback)
	NEON_DATABASE_URL?: string;
}

// Export Durable Objects for wrangler
export { D1Agent } from './mcp/routes';
export { SubstreamsIndexerContainer } from './containers';

// Create main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', timing());
app.use('*', prettyJSON());
app.use('*', cors({
	origin: '*',
	allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Root endpoint
app.get('/', (c) => {
	return c.json({
		message: 'DEX Backend API - Powered by Hono',
		status: 'ok',
		timestamp: new Date().toISOString(),
		version: '2.0.0',
		framework: 'hono',
		architecture: 'pure-graphql'
	});
});

// Health check endpoint  
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		services: ['d1', 'kv', 'dex-graphql', 'mars-lifi'],
		architecture: 'pure-graphql',
		framework: 'hono',
		cache: {
			kvAvailable: !!c.env.KV,
			strategies: ['STATIC', 'POOLS', 'PRICE', 'USER', 'ANALYTICS', 'HEALTH', 'METADATA']
		}
	});
});

// Mount sub-routes
app.route('/dex', createDexRoutes());
app.route('/mcp', createDBRoutes());
app.route('/cache', createCacheRoutes());
app.route('/mars', createMarsRoutes());
app.route('/v1/api/mars', createMarsRoutes()); // V1 API compatibility
app.route('/api/neon', createNeonCommissionRoutes());
app.route('/api/tron-wallet', tronWalletRoutes); // TRON wallet creation (Privy Tier 2)

// Mount indexer routes (Durable Object container control)
app.route('/indexer', createIndexerRoutes());

// Substreams sync API
app.get('/api/sync/status', async (c) => {
	const health = await getIndexerHealth(c.env);
	return c.json(health);
});

app.post('/api/sync/trigger', async (c) => {
	try {
		const stats = await runIncrementalSync(c.env);
		return c.json({
			success: true,
			stats
		});
	} catch (error: any) {
		return c.json({
			success: false,
			error: error.message
		}, 500);
	}
});

// Debug endpoint to check if D1Agent is working
app.get("/debug", async (c) => {
  return c.json({
    message: 'MCP Agent debug endpoint',
    timestamp: new Date().toISOString(),
    agent: 'D1Agent',
    availableMethods: ['serveSSE', 'serve']
  });
});

// Create routes for database and cache
// These routes are designed to be used with the Model Context Protocol (MCP)
// and provide a unified interface for database and cache operations.
app.route('/v1/api/d1', createDBRoutes());
app.route('/v1/api/cache', createCacheRoutes());

// Substreams Indexer routes
app.route('/v1/api/indexer', createIndexerRoutes());

// 404 handler
app.notFound((c) => {
	return c.json({ 
		error: 'Not Found',
		message: `Route ${c.req.method} ${c.req.path} not found`,
		timestamp: new Date().toISOString()
	}, 404);
});

// Error handler
app.onError((err, c) => {
	console.error('Unhandled error:', err);
	return c.json({
		error: 'Internal Server Error',
		message: err.message,
		timestamp: new Date().toISOString()
	}, 500);
});


export default {
	fetch: app.fetch,
	/**
	 * Handle Cloudflare Worker Cron triggers
	 * Lightweight task scheduling for pure GraphQL architecture
	 */
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const cronTimestamp = new Date(controller.scheduledTime).toISOString();
		
		console.log(`🕐 Cron job triggered: ${controller.cron} at ${cronTimestamp}`);

		try {
			// Lightweight tasks for pure GraphQL architecture
			switch (controller.cron) {
				case "*/1 * * * *": // Every 1 minute - Substreams batch indexing & cache warming & user positions sync
					console.log("🔄 Running Substreams incremental sync...");
					try {
						const stats = await runIncrementalSync(env);
						console.log(`✅ Synced ${stats.blocksProcessed} blocks, ${stats.eventsIndexed} events in ${stats.duration}ms`);
					} catch (error) {
						console.error("❌ Incremental sync failed:", error);
					}
					
// 					console.log("🔥 Running cache warming...");
// 					await runCacheWarming(env);
					
					// User positions sync (update positions for active users)
					console.log("📊 Syncing user positions...");
					try {
						const sql = neon(env.NEON_DATABASE_URL!);
						
						// Get list of active users from multiple sources:
						// 1. Users with existing positions (updated in last 7 days)
						// 2. Users with recent deposits (last 30 days)
						// 3. Users with recent withdrawals (last 30 days)
						const activeUsers = await sql`
							SELECT DISTINCT user_address FROM (
								-- Users with existing active positions
								SELECT DISTINCT user_address
								FROM mars_user_positions
								WHERE last_activity_time > NOW() - INTERVAL '7 days'
								AND status = 'active'
								
							UNION
							
							-- Users with recent deposits
							SELECT DISTINCT "user" as user_address
							FROM kaminodepositevent
							WHERE _block_timestamp_ > NOW() - INTERVAL '30 days'
							AND "user" IS NOT NULL
							AND "user" != ''
							AND "user" != 'neondb_owner'
							
							UNION
							
							-- Users with recent withdrawals
							SELECT DISTINCT "user" as user_address
							FROM kaminowithdrawevent
							WHERE _block_timestamp_ > NOW() - INTERVAL '30 days'
							AND "user" IS NOT NULL
							AND "user" != ''
							AND "user" != 'neondb_owner'
							) AS combined_users
							LIMIT 50
						`;
						
						if (activeUsers.length > 0) {
							const collector = await getUserPositionsCollector(env.SOLANA_RPC_URL);
							const userAddresses = activeUsers.map((row: any) => row.user_address);
							
							console.log(`🔄 Updating positions for ${userAddresses.length} active users...`);
							const results = await collector.batchUpdatePositions(userAddresses);
							
							// Save to database
							for (const [userAddress, positions] of results.entries()) {
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
							}
							
							console.log(`✅ Updated positions for ${results.size} users`);
						} else {
							console.log('ℹ️  No active users to update');
						}
					} catch (error) {
						console.error("❌ User positions sync failed:", error);
					}
					break;

				case "*/10 * * * *": // Every 10 minutes - Collect vault historical data
					console.log("📊 Collecting vault historical data...");
					try {
						// 使用环境变量中的 Solana RPC URL
						const rpcUrl = env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
						
						// 使用直连 Neon 数据库（不通过 Hyperdrive）
						const dbConnectionString = env.NEON_DATABASE_URL;
						
						if (!dbConnectionString) {
							console.error("❌ NEON_DATABASE_URL not configured");
							break;
						}
						
						console.log("🔗 Database connection: Direct Neon connection");
						
						// 带重试的数据收集
						let result;
						let retryCount = 0;
						const maxRetries = 2;
						
						while (retryCount <= maxRetries) {
							try {
								result = await collectVaultHistoricalData(rpcUrl, dbConnectionString);
								if (result.success) break;
								
								retryCount++;
								if (retryCount <= maxRetries) {
									console.log(`⚠️ Retry ${retryCount}/${maxRetries} after 2s...`);
									await new Promise(resolve => setTimeout(resolve, 2000));
								}
							} catch (error) {
								retryCount++;
								if (retryCount > maxRetries) throw error;
								console.log(`⚠️ Retry ${retryCount}/${maxRetries} after 2s...`);
								await new Promise(resolve => setTimeout(resolve, 2000));
							}
						}
						
						if (result?.success && result.snapshot) {
							console.log(`✅ Vault data collected: Total APY ${(result.snapshot.totalApy * 100).toFixed(2)}% (Lending: ${(result.snapshot.lendingApy * 100).toFixed(2)}%, Incentives: ${(result.snapshot.incentivesApy * 100).toFixed(2)}%), TVL $${(result.snapshot.totalSuppliedUsd / 1_000_000).toFixed(2)}M in ${result.duration}ms`);
						} else {
							console.error(`❌ Vault data collection failed after ${retryCount} retries: ${result?.error}`);
						}
					} catch (error) {
						console.error("❌ Vault historical collection failed:", error);
					}
					break;

				case "0 2 * * 0": // log-cleanup - Clean logs every Sunday at 2am
					console.log("🧹 Running log cleanup...");
					break;

				default:
					console.warn(`⚠️ Unknown cron pattern: ${controller.cron}`);
					break;
			}

		} catch (error) {
			console.error(`❌ Cron job failed for pattern ${controller.cron}:`, error);
			throw error;
		}
	},
} satisfies ExportedHandler<Env>;

