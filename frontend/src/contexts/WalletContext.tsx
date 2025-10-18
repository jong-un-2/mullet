import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

interface WalletContextType {
  primaryWallet: 'eth' | 'sol' | null;
  setPrimaryWallet: (wallet: 'eth' | 'sol' | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const [primaryWallet, setPrimaryWallet] = useState<'eth' | 'sol' | null>(null);

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
        solanaWalletsLength: solanaWallets.length
      });

      // Determine primary based on which wallet was connected
      if (info.externalSolConnected && !info.externalEthConnected) {
        console.log('✅ WalletContext - Setting primary wallet: SOL (external)');
        setPrimaryWallet('sol');
      } else if (info.externalEthConnected && !info.externalSolConnected) {
        console.log('✅ WalletContext - Setting primary wallet: ETH (external)');
        setPrimaryWallet('eth');
      } else if (info.solWallet && !info.ethWallet) {
        console.log('✅ WalletContext - Setting primary wallet: SOL (embedded)');
        setPrimaryWallet('sol');
      } else if (info.ethWallet && !info.solWallet) {
        console.log('✅ WalletContext - Setting primary wallet: ETH (embedded)');
        setPrimaryWallet('eth');
      } else if (wallets.length === 1) {
        // Only one wallet total, determine by address format
        const wallet = wallets[0];
        if (wallet.address.startsWith('0x')) {
          console.log('✅ WalletContext - Setting primary wallet: ETH (single wallet)');
          setPrimaryWallet('eth');
        } else {
          console.log('✅ WalletContext - Setting primary wallet: SOL (single wallet)');
          setPrimaryWallet('sol');
        }
      }
      // If both exist, check linked accounts order
      else if (user?.linkedAccounts && user.linkedAccounts.length > 0) {
        const firstAccount = user.linkedAccounts[0];
        if (firstAccount.type === 'wallet') {
          const firstAddress = (firstAccount as any).address;
          if (firstAddress?.startsWith('0x')) {
            console.log('✅ WalletContext - Setting primary wallet: ETH (first linked account)');
            setPrimaryWallet('eth');
          } else {
            console.log('✅ WalletContext - Setting primary wallet: SOL (first linked account)');
            setPrimaryWallet('sol');
          }
        }
      }
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
