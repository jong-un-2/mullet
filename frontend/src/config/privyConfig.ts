import { mainnet, sepolia } from 'wagmi/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { networkConfig } from './networkConfig';

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
      // Top wallets for Solana ecosystem
      walletList: [
        'phantom',          // #1 - Most popular Solana & Ethereum wallet
        'metamask',         // #2 - Most popular Ethereum wallet
        'solflare',         // #3 - Popular Solana-native wallet
        'wallet_connect',   // WalletConnect support for mobile wallets
      ],
      // WalletConnect configuration
      walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '', // Get WalletConnect Project ID from https://cloud.walletconnect.com
      disableWalletConnect: false,
    },
    
    // Solana configuration
    solana: {
      rpcs: {
        'solana:mainnet': {
          rpc: networkConfig.getSolanaMainnet().rpcUrl,
          rpcSubscriptions: networkConfig.getSolanaMainnet().wsUrl || ''
        },
        'solana:devnet': {
          rpc: networkConfig.getSolanaDevnet().rpcUrl,
          rpcSubscriptions: networkConfig.getSolanaDevnet().wsUrl || ''
        }
      }
    },
    
    // MFA configuration
    mfaConfig: {
      noPromptOnMfaRequired: true, // Simplified flow
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
    
    // Embedded wallet settings - Disable all embedded wallets, only use external wallets
    embeddedWallets: {
      ethereum: {
        createOnLogin: 'off', // Completely disable ETH wallet creation
      },
      solana: {
        createOnLogin: 'off', // Completely disable Solana wallet creation - only use external wallets
      },
    },
    
    // Legal URLs
    legal: {
      termsAndConditionsUrl: 'https://mars-liquid.com/terms',
      privacyPolicyUrl: 'https://mars-liquid.com/privacy',
    },
  } as any as PrivyClientConfig,
};