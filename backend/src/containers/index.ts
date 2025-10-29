/**
 * ============================================================
 * Cloudflare Containers - Substreams Indexer
 * ============================================================
 */

import { Hono } from 'hono';
import { getContainer } from '@cloudflare/containers';
import { SubstreamsIndexerContainer, type SubstreamsIndexerEnv } from './substreams-indexer';
import { createAuthMiddleware } from '../middleware/auth';

export { SubstreamsIndexerContainer } from './substreams-indexer';

/**
 * Create routes for managing the Substreams Indexer Container
 */
export function createIndexerRoutes() {
  const app = new Hono<{ Bindings: SubstreamsIndexerEnv }>();
  
  // Apply authentication middleware
  app.use('*', createAuthMiddleware());

  /**
   * Get the Substreams indexer container instance stub
   */
  function getIndexerContainer(env: SubstreamsIndexerEnv) {
    return getContainer<SubstreamsIndexerContainer>(
      env.SUBSTREAMS_INDEXER_CONTAINER,
      'main-indexer'
    );
  }

  /**
   * Start the Substreams indexer
   * POST /api/indexer/start
   */
  app.post('/start', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      
      // Get database URL from Hyperdrive
      const databaseUrl = c.env.HYPERDRIVE.connectionString;
      
      const result = await container.startIndexer({
        databaseUrl,
        endpoint: c.env.SUBSTREAMS_ENDPOINT || 'mainnet.sol.streamingfast.io:443',
        jwtToken: c.env.SUBSTREAMS_JWT_TOKEN || '',
        startBlock: 376601697
      });
      
      return c.json({
        success: true,
        message: 'Indexer started successfully',
        result
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Stop the Substreams indexer
   * POST /api/indexer/stop
   */
  app.post('/stop', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      const result = await container.stopIndexer();
      
      return c.json({
        success: true,
        message: 'Indexer stopped successfully',
        result
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Get indexer status
   * GET /api/indexer/status
   */
  app.get('/status', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      const status = await container.getStatus();
      
      return c.json({
        success: true,
        status
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Health check
   * GET /api/indexer/health
   */
  app.get('/health', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      const status = await container.getStatus();
      
      return c.json({
        healthy: true,
        status
      });
    } catch (error) {
      return c.json({
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Get indexer metrics (Prometheus format)
   * GET /api/indexer/metrics
   */
  app.get('/metrics', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      const metrics = await container.getMetrics();

      return c.text(metrics, 200, {
        'Content-Type': 'text/plain; version=0.0.4'
      });
    } catch (error) {
      return c.text('# Error fetching metrics', 500);
    }
  });

  /**
   * Get container logs
   * GET /api/indexer/logs?lines=100
   */
  app.get('/logs', async (c) => {
    try {
      const container = getIndexerContainer(c.env);
      const lines = parseInt(c.req.query('lines') || '100');
      const logs = await container.getLogs(lines);

      return c.json({
        success: true,
        logs
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  /**
   * Run a command in the container (debugging)
   * POST /api/indexer/command
   * Body: { "command": "ps aux", "cwd": "/app" }
   */
  app.post('/command', async (c) => {
    try {
      const { command, cwd } = await c.req.json();
      
      if (!command) {
        return c.json({
          success: false,
          error: 'Command is required'
        }, 400);
      }

      const container = getIndexerContainer(c.env);
      const result = await container.runCommand(command, cwd || '/app');

      return c.json({
        success: true,
        result
      });
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  return app;
}