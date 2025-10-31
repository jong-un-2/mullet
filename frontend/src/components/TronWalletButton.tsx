/**
 * TRON Wallet Button Component (Privy Integration)
 * Allows users to create/connect TRON wallets via Privy
 */

import React, { useState } from 'react';
import { Box, Button, Typography, Stack, Chip, CircularProgress, IconButton } from '@mui/material';
import { FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import { usePrivy } from '@privy-io/react-auth';
import { useTronWallet } from '../hooks/useTronWallet';

interface TronWalletButtonProps {
  onConnect?: (address: string) => void;
}

const TronWalletButton: React.FC<TronWalletButtonProps> = ({ onConnect }) => {
  const { authenticated, login } = usePrivy();
  const {
    walletInfo,
    balance,
    isConnecting,
    error,
    isConnected,
    connect,
  } = useTronWallet();

  const [copied, setCopied] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!authenticated) {
      // User must log in to Privy first
      await login();
      return;
    }

    try {
      const info = await connect();
      onConnect?.(info.address);
    } catch (err) {
      console.error('Failed to create TRON wallet:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Connected state - consistent styling with CustomUserProfile
  if (isConnected && walletInfo) {
    return (
      <Box
        sx={{
          border: '1px solid rgba(198, 40, 40, 0.3)',
          borderRadius: 2,
          p: 2,
          background: 'rgba(198, 40, 40, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c62828, #e53935)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white'
            }}
          >
            T
          </Box>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              color: '#c62828',
              fontFamily: 'monospace',
              flex: 1
            }}
          >
            TRON
          </Typography>
          <Chip 
            label={walletInfo.walletType === 'privy-embedded' ? 'embedded' : 'imported'} 
            size="small"
            sx={{ 
              fontSize: '0.65rem',
              height: 20,
              fontFamily: 'monospace',
              fontWeight: 600,
              backgroundColor: 'rgba(198, 40, 40, 0.2)',
              color: '#c62828',
              border: '1px solid rgba(198, 40, 40, 0.5)'
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              flex: 1,
              letterSpacing: '0.5px'
            }}
          >
            {`${walletInfo.address.slice(0, 8)}...${walletInfo.address.slice(-6)}`}
          </Typography>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(walletInfo.address, 'tron-wallet');
            }}
            sx={{ 
              color: copied === 'tron-wallet' ? '#4ecdc4' : 'rgba(255, 255, 255, 0.5)',
              '&:hover': { color: '#4ecdc4' }
            }}
          >
            <FaCopy size={12} />
          </IconButton>
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://tronscan.org/#/address/${walletInfo.address}`,
                '_blank',
                'noopener,noreferrer'
              );
            }}
            sx={{ 
              color: 'rgba(255, 255, 255, 0.5)',
              '&:hover': { color: '#c62828' }
            }}
          >
            <FaExternalLinkAlt size={12} />
          </IconButton>
        </Box>

        {/* Display TRON Balance */}
        {balance && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(198, 40, 40, 0.2)' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: 'monospace',
                display: 'block',
                mb: 0.5
              }}
            >
              Balances:
            </Typography>
            <Stack spacing={0.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.6)' }}>
                  TRX:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#c62828', fontWeight: 600 }}>
                  {parseFloat(balance.trx.toString()).toFixed(4)} TRX
                </Typography>
              </Box>
              {Object.entries(balance.tokens)
                .filter(([_, token]) => token.symbol === 'USDT')
                .map(([address, token]) => (
                <Box key={address} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {token.symbol}:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#c62828', fontWeight: 600 }}>
                    {parseFloat(token.balance.toString()).toFixed(4)} {token.symbol}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  // Not connected state
  return (
    <Box
      sx={{
        border: '1px solid rgba(198, 40, 40, 0.3)',
        borderRadius: 2,
        p: 2,
        background: 'rgba(198, 40, 40, 0.05)',
      }}
    >
      <Typography 
        variant="body2" 
        sx={{ 
          mb: 1, 
          color: '#c62828',
          fontWeight: 600,
          fontFamily: 'monospace'
        }}
      >
        🔴 TRON Network
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          display: 'block',
          mb: 2 
        }}
      >
        {!authenticated 
          ? 'Please log in to Privy to create a TRON wallet.'
          : 'Create a TRON wallet to access TRON network features.'}
      </Typography>
      
      <Button
        variant="outlined"
        fullWidth
        size="small"
        onClick={handleConnect}
        disabled={isConnecting}
        startIcon={isConnecting ? <CircularProgress size={16} /> : null}
        sx={{
          borderColor: 'rgba(198, 40, 40, 0.5)',
          color: '#c62828',
          fontSize: '0.75rem',
          fontWeight: 600,
          '&:hover': {
            borderColor: '#c62828',
            backgroundColor: 'rgba(198, 40, 40, 0.1)'
          },
          '&:disabled': {
            borderColor: 'rgba(198, 40, 40, 0.3)',
            color: 'rgba(198, 40, 40, 0.5)'
          }
        }}
      >
        {isConnecting 
          ? 'Creating...' 
          : !authenticated 
            ? 'Log In to Privy' 
            : 'Create TRON Wallet'}
      </Button>

      {error && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 1, 
            display: 'block',
            color: '#e53935',
            fontFamily: 'monospace'
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default TronWalletButton;
