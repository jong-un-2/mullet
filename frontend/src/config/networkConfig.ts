/**
 * Network Configuration Manager
 * Centralized configuration for all blockchain networks and RPC endpoints
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface SolanaConfig {
  cluster: string;
  rpcUrl: string;
  wsUrl?: string;
}

export interface TronConfig {
  chainId: number;
  name: string;
  fullHost: string;
  solidityNode?: string;
  eventServer?: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

class NetworkConfigManager {
  // Solana Networks
  getSolanaMainnet(): SolanaConfig {
    return {
      cluster: 'mainnet-beta',
      rpcUrl: import.meta.env.VITE_SOLANA_MAINNET_RPC || 'https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
      wsUrl: import.meta.env.VITE_SOLANA_MAINNET_WS || 'wss://rpc.ankr.com/solana/ws/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3'
    };
  }

  getSolanaDevnet(): SolanaConfig {
    return {
      cluster: 'devnet',
      rpcUrl: import.meta.env.VITE_SOLANA_DEVNET_RPC || 'https://rpc.ankr.com/solana_devnet/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3',
      wsUrl: import.meta.env.VITE_SOLANA_DEVNET_WS || 'wss://rpc.ankr.com/solana_devnet/ws/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3'
    };
  }

  // BSC Networks
  getBSCMainnet(): NetworkConfig {
    return {
      chainId: 56,
      name: 'BNB Smart Chain',
      rpcUrl: import.meta.env.VITE_BSC_MAINNET_RPC || 'https://bsc-mainnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75',
      blockExplorer: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      }
    };
  }

  getBSCTestnet(): NetworkConfig {
    return {
      chainId: 97,
      name: 'BNB Smart Chain Testnet',
      rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC || 'https://bsc-testnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75',
      blockExplorer: 'https://testnet.bscscan.com',
      nativeCurrency: {
        name: 'tBNB',
        symbol: 'tBNB',
        decimals: 18
      }
    };
  }

  // Ethereum Networks
  getEthereum(): NetworkConfig {
    return {
      chainId: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
      wsUrl: `wss://eth-mainnet.alchemyapi.io/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`,
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    };
  }

  // Get network by chain ID
  getNetworkByChainId(chainId: number): NetworkConfig | null {
    switch (chainId) {
      case 1:
        return this.getEthereum();
      case 56:
        return this.getBSCMainnet();
      case 97:
        return this.getBSCTestnet();
      default:
        return null;
    }
  }

  // Get default network
  getDefaultNetwork(): NetworkConfig {
    const defaultChainId = parseInt(import.meta.env.VITE_DEFAULT_CHAIN_ID || '1');
    return this.getNetworkByChainId(defaultChainId) || this.getEthereum();
  }

  // Get current Solana network based on environment
  getCurrentSolanaNetwork(): SolanaConfig {
    // Always use mainnet for now (strategy/farm are on mainnet)
    return this.getSolanaMainnet();
  }
}

// Export singleton instance
export const networkConfig = new NetworkConfigManager();

// Export individual configs for convenience
export const solanaMainnet = networkConfig.getSolanaMainnet();
export const solanaDevnet = networkConfig.getSolanaDevnet();
export const bscMainnet = networkConfig.getBSCMainnet();
export const bscTestnet = networkConfig.getBSCTestnet();
export const ethereum = networkConfig.getEthereum();

// TRON 配置在 tronPrivyConfig.ts 中定义
// export const tronMainnet = ...
// export const tronNile = ...