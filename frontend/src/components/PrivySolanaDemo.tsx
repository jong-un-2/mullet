import React from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const PrivySolanaDemo: React.FC = () => {
  const { authenticated, user } = usePrivy();
  const { wallets, ready } = useWallets();

  if (!authenticated || !ready) {
    return null;
  }

  // Filter Solana wallets
  const solanaWallets = wallets.filter(wallet => {
    // Solana addresses are base58 encoded and typically 32-44 characters
    return wallet.address.length > 40 && !wallet.address.startsWith('0x');
  });

  if (solanaWallets.length === 0) {
    return null;
  }

  const handleSolanaOperation = async () => {
    try {
      // Example: Get Solana wallet for operations
      const solanaWallet = solanaWallets[0];
      console.log('Solana wallet ready:', solanaWallet.address);
      
      // Here you can add Solana-specific operations
      // For example: sending transactions, checking balance, etc.
      
    } catch (error) {
      console.error('Solana operation failed:', error);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2, backgroundColor: 'rgba(153, 69, 255, 0.1)' }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#9945ff' }}>
        ⚡ Privy Solana Integration Active
      </Typography>
      
      <Alert severity="success" sx={{ mb: 2 }}>
        Privy has automatically created {solanaWallets.length} Solana wallet(s) for your account!
      </Alert>
      
      {solanaWallets.map((wallet, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
            Solana Wallet {index + 1}: {wallet.address}
          </Typography>
          
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleSolanaOperation}
            sx={{ mr: 1 }}
          >
            Use Solana Wallet
          </Button>
        </Box>
      ))}
      
      <Typography variant="caption" color="text.secondary">
        These Solana wallets are automatically managed by Privy and linked to your {user?.email?.address || 'account'}.
      </Typography>
    </Paper>
  );
};

export default PrivySolanaDemo;