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
    
    // Container returns plain text "Healthy", wrap it in JSON
    const text = await response.text();
    return {
      healthy: response.ok,
      status: response.status,
      message: text.trim(),
      timestamp: Date.now()
    };
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
}
