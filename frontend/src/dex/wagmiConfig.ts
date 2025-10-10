import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

import {
  coinbaseWallet,
  walletConnectWallet,
  metaMaskWallet,
  rabbyWallet,
  trustWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";

const projectId = "09c1182f7b2cb58c98f0b8ed1f223d91";

// Multi-chain wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, trustWallet, injectedWallet],
    },
    {
      groupName: "Multi-Chain Wallets",
      wallets: [coinbaseWallet, rabbyWallet],
    },
    {
      groupName: "Wallet Connect",
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: "Mars Liquid",
    projectId: projectId,
  }
);

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors,
  transports: {
    // Use public RPC endpoints to avoid CORS issues
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: true,
});

// Network Constants (keeping for backward compatibility)
export const SUPPORTED_NETWORKS = {
  ethereum: {
    id: mainnet.id,
    name: mainnet.name,
    nativeCurrency: mainnet.nativeCurrency,
    rpcUrls: mainnet.rpcUrls,
    blockExplorers: mainnet.blockExplorers,
    contracts: {
      // Add your Ethereum mainnet contract addresses here
      uncToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      pairedToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      uncSwap: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      uncLiquidityToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
    }
  },
  sepolia: {
    id: sepolia.id,
    name: sepolia.name,
    nativeCurrency: sepolia.nativeCurrency,
    rpcUrls: sepolia.rpcUrls,
    blockExplorers: sepolia.blockExplorers,
    contracts: {
      // Add your Sepolia testnet contract addresses here
      uncToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      pairedToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      uncSwap: "0x0000000000000000000000000000000000000000", // Update with actual addresses
      uncLiquidityToken: "0x0000000000000000000000000000000000000000", // Update with actual addresses
    }
  },
};

export const DEFAULT_CHAIN = mainnet; // Use Ethereum mainnet as default
