/**
 * ============================================================
 * Substreams Indexer - Cloudflare Container Implementation
 * ============================================================
 * 
 * This container runs the Substreams Sink to continuously index
 * Mars vault events from Solana into PostgreSQL.
 * 
 * Based on Cloudflare Containers API pattern
 */

import { Container, getContainer } from '@cloudflare/containers';

export interface SubstreamsIndexerEnv {
  SUBSTREAMS_INDEXER_CONTAINER: any;
  HYPERDRIVE: Hyperdrive;
  SUBSTREAMS_ENDPOINT?: string;
  SUBSTREAMS_JWT_TOKEN?: string;
}

/**
 * Substreams Indexer Container Class
 * 
 * This extends Cloudflare's Container class to manage the
 * Substreams sink process
 */
export class SubstreamsIndexerContainer extends Container {
  // Default HTTP port for health checks and metrics
  defaultPort = 9102;
  
  // Keep container running for a very long time (1 year)
  // For continuous indexing service that should never automatically sleep
  sleepAfter = '8760h';  // 365 days

  /**
   * Start the indexer with specific configuration
   */
  async startIndexer(config: {
    databaseUrl: string;
    endpoint: string;
    jwtToken: string;
    startBlock?: number;
  }) {
    const response = await this.containerFetch("https://container/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "substreams-sink-postgres",
        args: [
          "run",
          config.databaseUrl,
          "mars-vaults-substreams-graph-v1.0.0.spkg",
          `--endpoint=${config.endpoint}`,
          "--plaintext=false",
          "--final-blocks-only",
          "--on-module-hash-mistmatch=warn",
          "--undo-buffer-size=12",
          `--start-block=${config.startBlock || 370500000}`,
          "graph_out"
        ],
        env: {
          SUBSTREAMS_JWT_TOKEN: config.jwtToken,
          RUST_LOG: "info"
        }
      })
    });
    
    return await response.json();
  }

  /**
   * Stop the indexer gracefully
   */
  async stopIndexer() {
    const response = await this.containerFetch("https://container/stop", {
      method: "POST"
    });
    
    return await response.json();
  }

  /**
   * Get indexer status and metrics
   */
  async getStatus() {
    const response = await this.containerFetch("https://container/status", {
      method: "GET"
    });
    
    // Container now returns JSON format
    if (response.ok) {
      const data = await response.json() as { status?: string; service?: string };
      return {
        healthy: true,
        status: response.status,
        message: data.status || 'healthy',
        service: data.service || 'substreams-indexer',
        timestamp: Date.now()
      };
    } else {
      return {
        healthy: false,
        status: response.status,
        message: 'Container unhealthy',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics() {
    const response = await this.containerFetch("https://container:9102/metrics", {
      method: "GET"
    });
    
    return await response.text();
  }

  /**
   * Execute a command in the container (for debugging)
   */
  async runCommand(command: string, cwd: string = "/app") {
    const response = await this.containerFetch("https://container/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ command, cwd })
    });
    
    return await response.json();
  }

  /**
   * Get logs from the container
   */
  async getLogs(lines: number = 100) {
    const response = await this.containerFetch("https://container/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: `tail -n ${lines} /app/logs/*.log`,
        cwd: "/app"
      })
    });
    
    return await response.json();
  }

  /**
   * Alarm handler for periodic health checks
   * This is called when a Durable Object alarm fires
   */
  async alarm() {
    try {
      // Perform health check
      console.log('[Container Alarm] Running periodic health check...');
      const status = await this.getStatus();
      console.log('[Container Alarm] Health check result:', status);
      
      // If container is unhealthy, log it
      if (!status.healthy) {
        console.error('[Container Alarm] Container is unhealthy:', status);
      }
      
      // Schedule next alarm in 5 minutes
      const nextAlarm = Date.now() + 5 * 60 * 1000;
      await this.ctx.storage.setAlarm(nextAlarm);
      console.log('[Container Alarm] Next alarm scheduled for:', new Date(nextAlarm).toISOString());
    } catch (error) {
      console.error('[Container Alarm] Error during alarm execution:', error);
      // Still try to schedule next alarm even if there was an error
      try {
        const nextAlarm = Date.now() + 5 * 60 * 1000;
        await this.ctx.storage.setAlarm(nextAlarm);
      } catch (scheduleError) {
        console.error('[Container Alarm] Failed to schedule next alarm:', scheduleError);
      }
    }
  }
}
