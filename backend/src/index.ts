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

import { createIndexerRoutes } from './containers';
import { createMarsRoutes } from './mars/routes';
import { runIncrementalSync, getIndexerHealth } from './services/substreamsIndexer';
import { collectVaultHistoricalData } from './services/vaultHistoricalCollector';

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
				case "*/1 * * * *": // Every 1 minute - Substreams batch indexing & cache warming
					console.log("� Running Substreams incremental sync...");
					try {
						const stats = await runIncrementalSync(env);
						console.log(`✅ Synced ${stats.blocksProcessed} blocks, ${stats.eventsIndexed} events in ${stats.duration}ms`);
					} catch (error) {
						console.error("❌ Incremental sync failed:", error);
					}
					
					console.log("🔥 Running cache warming...");
					await runCacheWarming(env);
					break;

				case "0 * * * *": // Hourly - Collect vault historical data & metrics
					console.log("📊 Collecting vault historical data...");
					try {
						// 使用环境变量中的 Solana RPC URL
						const rpcUrl = env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
						
						// 使用 Hyperdrive 连接 Neon PostgreSQL
						const dbConnectionString = env.HYPERDRIVE?.connectionString;
						
						const result = await collectVaultHistoricalData(rpcUrl, dbConnectionString);
						
						if (result.success && result.snapshot) {
							console.log(`✅ Vault data collected: Total APY ${(result.snapshot.totalApy * 100).toFixed(2)}% (Lending: ${(result.snapshot.lendingApy * 100).toFixed(2)}%, Incentives: ${(result.snapshot.incentivesApy * 100).toFixed(2)}%), TVL $${(result.snapshot.totalSuppliedUsd / 1_000_000).toFixed(2)}M in ${result.duration}ms`);
						} else {
							console.error(`❌ Vault data collection failed: ${result.error}`);
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

