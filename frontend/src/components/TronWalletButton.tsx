/**
 * TRON 钱包连接按钮组件
 */

import React from 'react';
import { Box, Button, Typography, Paper, Stack, Chip, CircularProgress } from '@mui/material';
import { useTronWallet } from '../hooks/useTronWallet';

interface TronWalletButtonProps {
  onConnect?: (address: string) => void;
}

const TronWalletButton: React.FC<TronWalletButtonProps> = ({ onConnect }) => {
  const {
    walletInfo,
    balance,
    isConnecting,
    error,
    isTronLinkInstalled,
    isConnected,
    connect,
  } = useTronWallet();

  const handleConnect = async () => {
    try {
      const info = await connect();
      onConnect?.(info.address);
    } catch (err) {
      console.error('Failed to connect TRON wallet:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isTronLinkInstalled) {
    return (
      <Paper sx={{ p: 2, border: '1px solid #e53935' }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          🔴 TronLink Not Detected
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please install TronLink wallet extension to connect to TRON network.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          href="https://www.tronlink.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Install TronLink
        </Button>
      </Paper>
    );
  }

  if (isConnected && walletInfo) {
    return (
      <Paper sx={{ p: 2, border: '1px solid #c62828' }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#c62828' }}>
              🔴 TRON Network
            </Typography>
            <Chip
              label="Connected"
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              Address:
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {formatAddress(walletInfo.address)}
            </Typography>
          </Box>

          {balance && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Balances:
              </Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">TRX:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {parseFloat(balance.trx).toFixed(4)} TRX
                  </Typography>
                </Box>
                
                {Object.entries(balance.tokens).map(([address, token]) => (
                  <Box key={address} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{token.symbol}:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {parseFloat(token.balance).toFixed(4)} {token.symbol}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>

        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, border: '1px solid rgba(198, 40, 40, 0.3)' }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: '#c62828' }}>
        🔴 TRON Network
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect your TronLink wallet to access TRON network features.
      </Typography>
      
      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={handleConnect}
        disabled={isConnecting}
        startIcon={isConnecting ? <CircularProgress size={16} /> : null}
      >
        {isConnecting ? 'Connecting...' : 'Connect TronLink'}
      </Button>

      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Paper>
  );
};

export default TronWalletButton;
