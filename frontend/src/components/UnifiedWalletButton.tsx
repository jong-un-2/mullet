import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  Chip,
  Divider 
} from '@mui/material';
import { 
  usePrivy, 
  useWallets, 
  useConnectWallet
} from '@privy-io/react-auth';
import { FaWallet, FaEthereum, FaSignOutAlt } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';

const UnifiedWalletButton: React.FC = () => {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  
  // Separate the connectWallet function without callbacks first
  const { connectWallet } = useConnectWallet();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Monitor wallet changes for debugging (reduced logging)
  useEffect(() => {
    if (wallets.length > 0) {
      console.log(`🔗 ${wallets.length} wallet(s) connected`);
    }
  }, [authenticated, wallets.length]);

  // Monitor authentication changes (reduced logging)
  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      console.log('🎉 Wallet connected successfully');
    } else if (!authenticated && wallets.length === 0) {
      console.log('🔴 All wallets disconnected');
    }
  }, [authenticated, wallets.length]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!authenticated) {
      // Show connection options
      setAnchorEl(event.currentTarget);
    } else {
      // Show wallet details
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleConnectEthereum = () => {
    connectWallet({
      walletChainType: 'ethereum-only'
    });
    handleClose();
  };

  const handleConnectSolana = () => {
    console.log('=== Starting Solana Connection ===');
    console.log('Connecting to Solana wallet with Privy...');
    
    // Check if Phantom is available and what networks it supports
    const phantom = (window as any).phantom;
    if (phantom?.solana) {
      console.log('✅ Phantom Solana detected:', phantom.solana);
    }
    if (phantom?.ethereum) {
      console.log('⚠️ Phantom Ethereum detected:', phantom.ethereum);
    }
    
    // According to Privy docs, use 'solana-only' to force Solana network
    connectWallet({
      walletChainType: 'solana-only',
      // Try Solana-native wallets first to avoid Phantom's ETH interface
      walletList: ['solflare', 'backpack', 'phantom', 'detected_solana_wallets']
    });
    
    console.log('connectWallet() called - check wallet state changes');
    handleClose();
  };

  const handleConnectBoth = () => {
    connectWallet({
      walletChainType: 'ethereum-and-solana'
    });
    handleClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Add a delay to prevent immediate reconnection
      setTimeout(() => {
        console.log('Logout completed - wallets should stay disconnected');
      }, 2000);
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleClose();
  };

  // Show loading state
  if (!ready) {
    return (
      <Button variant="outlined" disabled>
        Loading...
      </Button>
    );
  }

  // Helper function to check if wallet is Solana using proper Privy wallet types
  const isSolanaWallet = (wallet: any) => {
    // Check if it's actually a Solana wallet (not Ethereum through Phantom)
    const isSolanaAddress = wallet.address && !wallet.address.startsWith('0x');
    const isSolanaClient = ['phantom', 'solflare', 'backpack'].includes(wallet.walletClientType);
    const isSolanaConnector = wallet.connectorType?.toLowerCase().includes('solana');
    
    return isSolanaAddress && (isSolanaClient || isSolanaConnector);
  };

  // Get wallet display info using proper Privy wallet types
  const getWalletInfo = () => {
    if (!authenticated || wallets.length === 0) {
      return { displayText: 'Connect Wallet', hasWallet: false };
    }

    const solanaWallets = wallets.filter(w => isSolanaWallet(w));
    const evmWallets = wallets.filter(w => !isSolanaWallet(w));

    console.log('Wallet analysis:', { 
      total: wallets.length, 
      solana: solanaWallets.length, 
      evm: evmWallets.length,
      wallets: wallets.map(w => ({ 
        address: w.address, 
        connectorType: w.connectorType,
        walletClientType: w.walletClientType,
        chainId: w.chainId
      }))
    });

    if (solanaWallets.length > 0 && evmWallets.length > 0) {
      return { 
        displayText: `${solanaWallets.length + evmWallets.length} Wallets`, 
        hasWallet: true,
        chains: ['solana', 'ethereum']
      };
    } else if (solanaWallets.length > 0) {
      const wallet = solanaWallets[0];
      return { 
        displayText: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`, 
        hasWallet: true,
        chains: ['solana']
      };
    } else if (evmWallets.length > 0) {
      const wallet = evmWallets[0];
      return { 
        displayText: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`, 
        hasWallet: true,
        chains: ['ethereum']
      };
    }

    return { displayText: 'Connect Wallet', hasWallet: false };
  };

  const walletInfo = getWalletInfo();

  return (
    <>
      <Button
        variant={walletInfo.hasWallet ? "contained" : "outlined"}
        startIcon={<FaWallet />}
        onClick={handleClick}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          minWidth: 140,
          bgcolor: walletInfo.hasWallet ? 'primary.main' : 'transparent',
          '&:hover': {
            bgcolor: walletInfo.hasWallet ? 'primary.dark' : 'action.hover',
          }
        }}
      >
        {walletInfo.displayText}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            minWidth: 280,
          }
        }}
      >
        {!authenticated ? (
          // Connection options
          <>
            <MenuItem onClick={handleConnectSolana}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <SiSolana color="#9945ff" size={20} />
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    Connect Solana Wallet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Phantom, Solflare, etc.
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            
            <MenuItem onClick={handleConnectEthereum}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <FaEthereum color="#627eea" size={20} />
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    Connect Ethereum Wallet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    MetaMask, Coinbase, etc.
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <Divider sx={{ my: 1 }} />
            
            <MenuItem onClick={handleConnectBoth}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <FaWallet color="#3b82f6" size={20} />
                <Box>
                  <Typography variant="body2" fontWeight="600">
                    Connect Multi-Chain
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Both Solana & Ethereum
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          </>
        ) : (
          // Wallet details
          <>
            {wallets.map((wallet, index) => (
              <MenuItem key={index} disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  {isSolanaWallet(wallet) ? (
                    <SiSolana color="#9945ff" size={20} />
                  ) : (
                    <FaEthereum color="#627eea" size={20} />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="600">
                      {isSolanaWallet(wallet) ? 'Solana' : 'Ethereum'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </Typography>
                  </Box>
                  <Chip 
                    label={wallet.walletClientType || 'Connected'} 
                    size="small" 
                    color="success"
                    variant="outlined"
                  />
                </Box>
              </MenuItem>
            ))}
            
            {wallets.length > 0 && <Divider sx={{ my: 1 }} />}
            
            <MenuItem onClick={handleLogout}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <FaSignOutAlt color="#ef4444" size={18} />
                <Typography variant="body2" color="error.main">
                  Disconnect All
                </Typography>
              </Box>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default UnifiedWalletButton;