import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

interface WalletContextType {
  primaryWallet: 'eth' | 'sol' | 'tron' | null;
  setPrimaryWallet: (wallet: 'eth' | 'sol' | 'tron' | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [primaryWallet, setPrimaryWalletState] = useState<'eth' | 'sol' | 'tron' | null>(null);

  // Wrapper function with logging
  const setPrimaryWallet = (wallet: 'eth' | 'sol' | 'tron' | null) => {
    console.log('WalletContext setPrimaryWallet called with:', wallet);
    console.log('Current primaryWallet:', primaryWallet);
    setPrimaryWalletState(wallet);
    console.log('After setPrimaryWallet, new value should be:', wallet);
  };

  // Helper function to get wallet info
  const getWalletInfo = () => {
    // Find EVM wallets
    let ethWallet = wallets.find(w => w.address.startsWith('0x') && w.walletClientType === 'phantom');
    if (!ethWallet) {
      ethWallet = wallets.find(w => w.address.startsWith('0x'));
    }
    const isEthExternal = ethWallet?.walletClientType !== 'privy' && ethWallet?.connectorType !== 'embedded';
    
    // Find Solana wallets
    const solWallet = solanaWallets?.[0];
    let solWalletFromGeneral = wallets.find(w => !w.address.startsWith('0x') && w.walletClientType === 'phantom');
    if (!solWalletFromGeneral) {
      solWalletFromGeneral = wallets.find(w => !w.address.startsWith('0x'));
    }
    const isSolExternal = solWalletFromGeneral?.walletClientType !== 'privy' && 
                          solWalletFromGeneral?.connectorType !== 'embedded';
    
    return { 
      ethWallet, 
      solWallet,
      externalEthConnected: !!ethWallet && isEthExternal,
      externalSolConnected: !!solWallet && isSolExternal
    };
  };

  // Track primary wallet on first connection
  useEffect(() => {
    if (!authenticated) {
      // Reset primary wallet when disconnected
      setPrimaryWallet(null);
      return;
    }

    // Only set primary wallet once on first connection
    if (primaryWallet === null) {
      const info = getWalletInfo();
      console.log('🎯 WalletContext - Detecting primary wallet:', {
        externalSolConnected: info.externalSolConnected,
        externalEthConnected: info.externalEthConnected,
        solWallet: info.solWallet?.address,
        ethWallet: info.ethWallet?.address,
        walletsLength: wallets.length,
        solanaWalletsLength: solanaWallets.length,
        linkedAccounts: user?.linkedAccounts
      });

      // PRIORITY 1: Check Privy linkedAccounts - this tells us what the user actually selected
      if (user?.linkedAccounts && user.linkedAccounts.length > 0) {
        // Find the first wallet account (skip email, phone, etc.)
        const firstWalletAccount = user.linkedAccounts.find(acc => acc.type === 'wallet');
        
        if (firstWalletAccount) {
          const firstAddress = (firstWalletAccount as any).address;
          console.log('🔍 First linked wallet address:', firstAddress);
          
          // Check if this address is a Solana address (not starting with 0x)
          if (firstAddress && !firstAddress.startsWith('0x')) {
            console.log('✅ WalletContext - Setting primary wallet: SOL (from linkedAccounts - user selected Solana)');
            setPrimaryWallet('sol');
            return;
          } else if (firstAddress && firstAddress.startsWith('0x')) {
            console.log('✅ WalletContext - Setting primary wallet: ETH (from linkedAccounts - user selected Ethereum)');
            setPrimaryWallet('eth');
            return;
          }
        }
      }

      // PRIORITY 2: Check if ONLY Solana wallet exists (no ETH wallet)
      if (info.solWallet && !info.ethWallet) {
        console.log('✅ WalletContext - Setting primary wallet: SOL (only Solana wallet exists)');
        setPrimaryWallet('sol');
        return;
      }
      
      // PRIORITY 3: Check if ONLY ETH wallet exists (no Solana wallet)
      if (info.ethWallet && !info.solWallet) {
        console.log('✅ WalletContext - Setting primary wallet: ETH (only ETH wallet exists)');
        setPrimaryWallet('eth');
        return;
      }

      // PRIORITY 4: Check dedicated solanaWallets array (stronger signal for Solana)
      if (solanaWallets.length > 0 && wallets.length > 0) {
        console.log('✅ WalletContext - Setting primary wallet: SOL (solanaWallets array has entries)');
        setPrimaryWallet('sol');
        return;
      }

      // PRIORITY 5: Single wallet - determine by address format
      if (wallets.length === 1) {
        const wallet = wallets[0];
        if (wallet.address.startsWith('0x')) {
          console.log('✅ WalletContext - Setting primary wallet: ETH (single wallet, ETH address)');
          setPrimaryWallet('eth');
        } else {
          console.log('✅ WalletContext - Setting primary wallet: SOL (single wallet, Solana address)');
          setPrimaryWallet('sol');
        }
        return;
      }

      // FALLBACK: Default to Solana (as per privyConfig.walletChainType)
      console.log('⚠️ WalletContext - Defaulting to SOL (fallback)');
      setPrimaryWallet('sol');
    }
  }, [authenticated, wallets, solanaWallets, primaryWallet, user?.linkedAccounts]);

  return (
    <WalletContext.Provider value={{ primaryWallet, setPrimaryWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};
