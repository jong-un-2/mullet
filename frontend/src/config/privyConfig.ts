import { mainnet, sepolia } from 'wagmi/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

export const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID || 'cmfw7skmh00lfjx0cg4zompxp', // Your actual Privy App ID
  config: {
    // Appearance customization
    appearance: {
      theme: 'dark',
      accentColor: '#3b82f6', // Updated to match system theme
      logo: '/mars-logo.svg',
      showWalletLoginFirst: true,
      walletChainType: 'solana', // Prioritize Solana globally
      // Top wallets - 包含 TRON 兼容钱包
      walletList: [
        'phantom',          // #1 - Most popular Solana & Ethereum wallet
        'metamask',         // #2 - Most popular Ethereum wallet
        'wallet_connect',   // #3 - WalletConnect - 支持 TRON 移动端钱包 (imToken, TokenPocket, Trust Wallet, Klever)
        'coinbase_wallet',  // #4 - Coinbase Wallet - 支持多链
        'okx_wallet',       // #5 - OKX Wallet - 支持 TRON + 多链
      ],
      // WalletConnect configuration - 支持 TRON
      walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '', // Get WalletConnect Project ID from https://cloud.walletconnect.com
      disableWalletConnect: false,
    },
    
    // MFA configuration
    mfaConfig: {
      noPromptOnMfaRequired: true, // Simplified flow
    },
    
    // Solana RPC configuration
    solana: {
      rpcs: {
        'solana:mainnet': {
          rpc: createSolanaRpc(
            import.meta.env.VITE_SOLANA_MAINNET_RPC || 
            'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3'
          ),
          rpcSubscriptions: createSolanaRpcSubscriptions(
            import.meta.env.VITE_SOLANA_MAINNET_WS || 
            'wss://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3'
          ),
          blockExplorerUrl: 'https://explorer.solana.com',
        },
        'solana:devnet': {
          rpc: createSolanaRpc(
            import.meta.env.VITE_SOLANA_DEVNET_RPC || 
            'https://api.devnet.solana.com'
          ),
          rpcSubscriptions: createSolanaRpcSubscriptions(
            import.meta.env.VITE_SOLANA_DEVNET_WS || 
            'wss://api.devnet.solana.com'
          ),
          blockExplorerUrl: 'https://explorer.solana.com/?cluster=devnet',
        },
      },
    },
    
    // External wallet configuration - Essential wallets only
    externalWallets: {
      solana: {
        connectors: toSolanaWalletConnectors({
          shouldAutoConnect: false, // Disable auto-connect
        })
      },
    },

    // Social login configuration
    google: {
      enabled: true,
    },

    telegram: {
      enabled: true,
    },
    
    // Login methods - wallet first, then social logins
    loginMethods: ['wallet', 'google', 'telegram', 'email'],
    
    // Supported chains - Only include Ethereum chains here, Solana is handled separately
    supportedChains: [mainnet, sepolia],
    defaultChain: mainnet,
    
    // Embedded wallet settings
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'off', // Disable ETH wallet creation
      },
      solana: {
        createOnLogin: 'users-without-wallets', // Enable Solana embedded wallet for users without external wallets
      },
    },
    
    // Legal URLs
    legal: {
      termsAndConditionsUrl: 'https://mars-liquid.com/terms',
      privacyPolicyUrl: 'https://mars-liquid.com/privacy',
    },
  } as any as PrivyClientConfig,
};