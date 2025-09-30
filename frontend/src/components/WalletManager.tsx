import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useDisconnect } from 'wagmi';

enum WalletType {
  NONE = 'none',
  ETHEREUM = 'ethereum', 
  SOLANA = 'solana',
  PRIVY = 'privy'
}

const WalletManager: React.FC = () => {
  const [activeWallet, setActiveWallet] = useState<WalletType>(WalletType.NONE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Privy hooks
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  
  // Ethereum hooks
  const { address: ethAddress, isConnected: ethConnected } = useAccount();
  const { disconnect: disconnectEth } = useDisconnect();
  
  // Solana hooks
  const { publicKey: solPublicKey, connected: solConnected, disconnect: disconnectSol } = useWallet();

  const handleWalletConnect = useCallback(async (walletType: WalletType) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Disconnect other wallets first to prevent conflicts
      if (activeWallet !== WalletType.NONE && activeWallet !== walletType) {
        await handleDisconnectAll();
        // Add small delay to prevent rapid successive calls
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setActiveWallet(walletType);
      
      switch (walletType) {
        case WalletType.PRIVY:
          if (!authenticated) {
            try {
              await login();
              // Wait a bit for Privy to initialize wallets
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (privyError) {
              console.error('Privy login failed:', privyError);
              setError('Could not log in with wallet. Please try connecting again.');
              throw new Error('Privy login failed. Please try again.');
            }
          }
          break;
        case WalletType.ETHEREUM:
          // RainbowKit ConnectButton handles this - just set state
          break;
        case WalletType.SOLANA:
          // Solana WalletMultiButton handles this - just set state
          break;
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setActiveWallet(WalletType.NONE);
      if (!error) {
        setError('Wallet connection failed. Please try again.');
      }
    } finally {
      // Add delay before allowing next connection
      setTimeout(() => setIsConnecting(false), 1000);
    }
  }, [activeWallet, authenticated, login, isConnecting]);

  const handleDisconnectAll = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Disconnect Ethereum
      if (ethConnected) {
        disconnectEth();
      }
      
      // Disconnect Solana
      if (solConnected) {
        await disconnectSol();
      }
      
      // Disconnect Privy
      if (authenticated) {
        await logout();
      }
      
      setActiveWallet(WalletType.NONE);
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Disconnect failed. Please refresh the page.');
    } finally {
      setIsConnecting(false);
    }
  }, [ethConnected, solConnected, authenticated, disconnectEth, disconnectSol, logout]);

  // Auto-detect active wallet
  React.useEffect(() => {
    if (authenticated && wallets.length > 0) {
      setActiveWallet(WalletType.PRIVY);
    } else if (ethConnected) {
      setActiveWallet(WalletType.ETHEREUM);
    } else if (solConnected) {
      setActiveWallet(WalletType.SOLANA);
    } else {
      setActiveWallet(WalletType.NONE);
    }
  }, [authenticated, wallets.length, ethConnected, solConnected]);

  const getConnectionStatus = () => {
    switch (activeWallet) {
      case WalletType.PRIVY:
        return {
          connected: authenticated,
          address: user?.email?.address || user?.phone?.number || 'Anonymous',
          type: 'Privy Multi-Chain'
        };
      case WalletType.ETHEREUM:
        return {
          connected: ethConnected,
          address: ethAddress,
          type: 'Ethereum'
        };
      case WalletType.SOLANA:
        return {
          connected: solConnected,
          address: solPublicKey?.toString(),
          type: 'Solana'
        };
      default:
        return {
          connected: false,
          address: null,
          type: 'None'
        };
    }
  };

  const status = getConnectionStatus();

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Wallet Manager
        </Typography>
        
        {/* Current Status */}
        {status.connected && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Connected:</strong> {status.type}
            </Typography>
            {status.address && (
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {status.address}
              </Typography>
            )}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {isConnecting && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Connecting wallet...</Typography>
            </Box>
          </Alert>
        )}
        
        <Stack spacing={3}>
          {/* Ethereum - Priority #1 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#3b82f6' }}>
              🔷 Ethereum Network (Priority)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Direct wallet connection (MetaMask, Trust, etc.) - Fastest for DeFi
            </Typography>
            
            {activeWallet === WalletType.ETHEREUM ? (
              <Box>
                <ConnectButton />
                <Button
                  variant="outlined"
                  onClick={handleDisconnectAll}
                  size="small"
                  disabled={isConnecting}
                  sx={{ mt: 1, ml: 1 }}
                >
                  Disconnect All
                </Button>
              </Box>
            ) : (
              <Box 
                onClick={() => !status.connected && handleWalletConnect(WalletType.ETHEREUM)}
                sx={{ 
                  pointerEvents: status.connected || isConnecting ? 'none' : 'auto',
                  opacity: status.connected || isConnecting ? 0.5 : 1
                }}
              >
                <ConnectButton />
              </Box>
            )}
          </Box>

          {/* Solana - Priority #2 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#9945ff' }}>
              ⚡ Solana Network (Priority)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Direct wallet connection (Phantom, Solflare, etc.) - Best for Solana DeFi
            </Typography>
            
            {activeWallet === WalletType.SOLANA ? (
              <Box>
                <WalletMultiButton />
                <Button
                  variant="outlined"
                  onClick={handleDisconnectAll}
                  size="small"
                  disabled={isConnecting}
                  sx={{ mt: 1, ml: 1 }}
                >
                  Disconnect All
                </Button>
              </Box>
            ) : (
              <Box 
                onClick={() => !status.connected && handleWalletConnect(WalletType.SOLANA)}
                sx={{ 
                  pointerEvents: status.connected || isConnecting ? 'none' : 'auto',
                  opacity: status.connected || isConnecting ? 0.5 : 1
                }}
              >
                <WalletMultiButton />
              </Box>
            )}
          </Box>

          {/* Privy Multi-Chain - Alternative */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#f59e0b' }}>
              🔐 Privy Multi-Chain (Alternative)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Email/Social login + Auto-created wallets (if you don't have a wallet)
            </Typography>
            
            {activeWallet === WalletType.PRIVY ? (
              <Box>
                {wallets.length > 0 ? (
                  <>
                    {wallets.map((wallet, index) => {
                      const isSolanaWallet = wallet.address.length > 40 && !wallet.address.startsWith('0x');
                      const chainIcon = isSolanaWallet ? '⚡' : '🔷';
                      const chainName = isSolanaWallet ? 'Solana' : 'Ethereum';
                      
                      return (
                        <Typography key={index} variant="body2" sx={{ mb: 0.5, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {chainIcon} {chainName}: {wallet.address}
                        </Typography>
                      );
                    })}
                    <Button
                      variant="outlined"
                      onClick={handleDisconnectAll}
                      size="small"
                      disabled={isConnecting}
                      sx={{ mt: 1 }}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : authenticated ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, color: 'warning.main' }}>
                      ⚠️ No embedded wallets found
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleDisconnectAll}
                      size="small"
                      disabled={isConnecting}
                      sx={{ mt: 1 }}
                    >
                      Disconnect
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={() => handleWalletConnect(WalletType.PRIVY)}
                disabled={isConnecting || status.connected}
                sx={{ 
                  backgroundColor: '#f59e0b',
                  '&:hover': { backgroundColor: '#d97706' }
                }}
              >
                {isConnecting ? 'Connecting...' : 'Connect with Privy'}
              </Button>
            )}
          </Box>
        </Stack>

        {/* Disconnect All Button */}
        {status.connected && (
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnectAll}
              disabled={isConnecting}
              fullWidth
            >
              Disconnect All Wallets
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default WalletManager;