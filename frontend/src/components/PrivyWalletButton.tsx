import React from 'react';
import { Box, Button, Typography, Menu, MenuItem, Avatar } from '@mui/material';
import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { FaWallet, FaSignOutAlt, FaEthereum } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';

const PrivyWalletButton: React.FC = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await login();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await logout();
      handleMenuClose();
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (user?.email?.address) return user.email.address;
    if (user?.phone?.number) return user.phone.number;
    if (user?.google?.name) return user.google.name;
    if (user?.twitter?.username) return `@${user.twitter.username}`;
    return 'User';
  };

  // Get wallet info for display
  const getWalletInfo = () => {
    if (!wallets.length) return null;
    
    const ethWallet = wallets.find(w => w.address.startsWith('0x'));
    const solWallet = wallets.find(w => !w.address.startsWith('0x') && w.address.length > 40);
    
    return { ethWallet, solWallet };
  };

  if (!authenticated) {
    return (
      <Box>
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1, fontSize: '0.75rem' }}>
            {error}
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleLogin}
          startIcon={<FaWallet />}
          disabled={isLoading}
          sx={{ 
            textTransform: 'none',
            backgroundColor: '#dc2626',
            '&:hover': {
              backgroundColor: '#b91c1c',
            },
            '&:disabled': {
              backgroundColor: '#6b7280',
            }
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </Box>
    );
  }

  const walletInfo = getWalletInfo();
  const displayName = getUserDisplayName();

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleMenuOpen}
        sx={{ 
          textTransform: 'none',
          borderColor: '#dc2626',
          color: '#dc2626',
          '&:hover': {
            borderColor: '#b91c1c',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 20, height: 20, fontSize: 12 }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {displayName.length > 15 ? `${displayName.slice(0, 15)}...` : displayName}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {displayName}
          </Typography>
          
          {walletInfo?.ethWallet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FaEthereum color="#627eea" size={16} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {`${walletInfo.ethWallet.address.slice(0, 6)}...${walletInfo.ethWallet.address.slice(-4)}`}
              </Typography>
            </Box>
          )}
          
          {walletInfo?.solWallet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SiSolana color="#9945ff" size={16} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {`${walletInfo.solWallet.address.slice(0, 6)}...${walletInfo.solWallet.address.slice(-4)}`}
              </Typography>
            </Box>
          )}
        </Box>
        
        <MenuItem onClick={handleLogout} disabled={isLoading}>
          <FaSignOutAlt style={{ marginRight: 8 }} />
          {isLoading ? 'Logging out...' : 'Logout'}
        </MenuItem>
      </Menu>
    </>
  );
};

export default PrivyWalletButton;