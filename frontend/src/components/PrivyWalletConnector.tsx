import React from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import PrivySolanaDemo from './PrivySolanaDemo';

const PrivyWalletConnector: React.FC = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Multi-Chain Wallet Connection
        </Typography>
        
        <Stack spacing={3}>
          {/* Ethereum Wallet Connection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#3b82f6' }}>
              🔷 Ethereum Network
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Connect to Ethereum mainnet and testnets (MetaMask, Trust, etc.)
            </Typography>
            <ConnectButton />
          </Box>

          {/* Solana Wallet Connection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#9945ff' }}>
              ⚡ Solana Network  
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Connect to Solana mainnet (Phantom, Solflare, etc.)
            </Typography>
            <WalletMultiButton />
          </Box>

          {/* Privy Authentication */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#f59e0b' }}>
              🔐 Privy Multi-Chain Authentication
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Email, Social, Phone login + Auto-created Ethereum & Solana wallets
            </Typography>
            
            {!authenticated ? (
              <Button
                variant="contained"
                color="primary"
                onClick={login}
                sx={{ mr: 1 }}
              >
                Login with Privy
              </Button>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Connected as: {user?.email?.address || user?.phone?.number || 'Anonymous'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Your Embedded Wallets:
                </Typography>
                
                {wallets.map((wallet, index) => {
                  // Check if it's a Solana wallet by checking the address format (Solana addresses are base58 and ~44 chars)
                  const isSolanaWallet = wallet.address.length > 40 && !wallet.address.startsWith('0x');
                  const chainIcon = isSolanaWallet ? '⚡' : '🔷';
                  const chainName = isSolanaWallet ? 'Solana' : 'Ethereum';
                  
                  return (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5, fontFamily: 'monospace' }}>
                      {chainIcon} {chainName} Wallet: {wallet.address}
                    </Typography>
                  );
                })}
                
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={logout}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Logout from Privy
                </Button>
              </Box>
            )}
          </Box>
        </Stack>
        
        {/* Privy Solana Demo */}
        <PrivySolanaDemo />
      </Paper>
    </Box>
  );
};

export default PrivyWalletConnector;