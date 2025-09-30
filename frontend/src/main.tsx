// Polyfills for wallet libraries
import { Buffer } from 'buffer';

globalThis.Buffer = Buffer;
// Add minimal process polyfill
globalThis.process = globalThis.process || {
  env: {},
  browser: true,
  nextTick: (fn: Function) => setTimeout(fn, 0),
};

import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import theme from './theme';

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import TransactionStatusWidget from "./components/TransactionStatusWidget";
import MarsWalletTracker from "./components/MarsWalletTracker";
import WalletErrorBoundary from "./components/WalletErrorBoundary";

import PoolPage from "./pages/Pool";
import PortfolioPage from "./pages/Portfolio";
import SwapPage from "./pages/Swap";
import WalletPage from "./pages/WalletPage";
import AddLiquidityPage from "./pages/AddLiquidity";
import XFundPage from "./pages/XFund";
import XStockPage from "./pages/XStock";
import XLiquidPage from "./pages/XLiquid";
import MorePage from "./pages/More";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./dex/wagmiConfig.ts";

// Privy imports
import { PrivyProvider } from "@privy-io/react-auth";
import { privyConfig } from "./config/privyConfig.ts";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

// Solana Wallet imports
import { SolanaWalletProvider } from "./config/solanaWalletConfig.tsx";

// Debug: Log Solana connectors on app start
console.log('Privy mounted with Solana connectors:', toSolanaWalletConnectors());
console.log('Full Privy config:', privyConfig);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/xfund" replace />,
  },
  {
    path: "/xfund",
    element: <XFundPage />,
  },
  {
    path: "/xstock",
    element: <XStockPage />,
  },
  {
    path: "/xliquid",
    element: <XLiquidPage />,
  },
  {
    path: "/portfolio",
    element: <PortfolioPage />,
  },
  {
    path: "/more",
    element: <MorePage />,
  },
  {
    path: "/swap",
    element: <SwapPage />,
  },
  {
    path: "/pool",
    element: <PoolPage />,
  },
  {
    path: "/pool/add-liquidity",
    element: <AddLiquidityPage />,
  },
  {
    path: "/wallet",
    element: <WalletPage />,
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletErrorBoundary>
      <PrivyProvider
        appId={privyConfig.appId}
        clientId={import.meta.env.VITE_PRIVY_CLIENT_ID || 'client-WY6QkdiKEsy279udGtAua3iZpfeTyfWwcUdsZMGpuGFS9'}
        config={privyConfig.config}
      >
        <SolanaWalletProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <RainbowKitProvider locale="en">
                  <Toaster richColors position="top-center" />
                  <RouterProvider router={router} />
                  <TransactionStatusWidget />
                  <MarsWalletTracker />
                </RainbowKitProvider>
              </QueryClientProvider>
            </WagmiProvider>
          </ThemeProvider>
        </SolanaWalletProvider>
      </PrivyProvider>
    </WalletErrorBoundary>
  </StrictMode>
);
