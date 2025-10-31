import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Menu, 
  Chip,
  Divider,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { FaSignOutAlt, FaEthereum, FaCopy, FaExternalLinkAlt, FaStar, FaRegStar } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';
import { useWalletContext } from '../contexts/WalletContext';
import { TokenTransfer } from './TokenTransfer';
import { EthTokenTransfer } from './EthTokenTransfer';
import { TronTokenTransfer } from './TronTokenTransfer';
import TronWalletButton from './TronWalletButton';
import { useTronWallet } from '../hooks/useTronWallet';

import { useAccount, useDisconnect } from 'wagmi';
import { useWallet as useSolanaAdapterWallet } from '@solana/wallet-adapter-react';

// Add pixel avatar animations
const avatarStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes pixelGlow {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(78, 205, 196, 0.5)); }
    50% { filter: drop-shadow(0 0 12px rgba(78, 205, 196, 0.8)) drop-shadow(0 0 20px rgba(255, 107, 107, 0.3)); }
  }
`;

// Generate a deterministic pixel avatar based on user data
const generatePixelAvatar = (seed: string): string => {
  const size = 8; // 8x8 pixel grid
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
  
  // Create a simple hash function for deterministic generation
  const hash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };
  
  const seedHash = hash(seed || 'User');
  const pixels: string[] = [];
  
  for (let i = 0; i < size * size; i++) {
    const pixelHash = hash(seed + i.toString());
    // Create symmetric pattern (left half mirrors right half)
    const x = i % size;
    const y = Math.floor(i / size);
    
    if (x < size / 2) {
      // Left half - generate random
      const shouldFill = (pixelHash + seedHash) % 3 !== 0; // 66% fill rate
      if (shouldFill) {
        const colorIndex = (pixelHash + seedHash + i) % colors.length;
        pixels[i] = colors[colorIndex];
      } else {
        pixels[i] = 'transparent';
      }
    } else {
      // Right half - mirror left half
      const mirrorX = size - 1 - x;
      const mirrorIndex = y * size + mirrorX;
      pixels[i] = pixels[mirrorIndex];
    }
  }
  
  // Generate SVG
  const pixelSize = 4;
  const svgSize = size * pixelSize;
  
  let svg = `<svg width="${svgSize}" height="${svgSize}" xmlns="http://www.w3.org/2000/svg">`;
  
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] !== 'transparent') {
      const x = (i % size) * pixelSize;
      const y = Math.floor(i / size) * pixelSize;
      svg += `<rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}" fill="${pixels[i]}" />`;
    }
  }
  
  svg += '</svg>';
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

interface WalletInfo {
  ethWallet?: any;
  solWallet?: any;
  externalEthConnected?: boolean;
  externalSolConnected?: boolean;
  primaryWalletType?: 'eth' | 'sol' | null;
}

const CustomUserProfile: React.FC = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets(); // General wallets (ETH, etc.)
  const { wallets: solanaWallets } = useSolanaWallets(); // Dedicated Solana wallets
  const { primaryWallet, setPrimaryWallet } = useWalletContext(); // Get and set primary wallet
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCopySnackbar, setShowCopySnackbar] = useState(false);
  // Distinguish between connect and disconnect flows to avoid showing "Connecting..." after a disconnect
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Token Transfer dialog state
  const [showTokenTransfer, setShowTokenTransfer] = useState(false);
  const [showEthTokenTransfer, setShowEthTokenTransfer] = useState(false);
  const [showTronTokenTransfer, setShowTronTokenTransfer] = useState(false);
  const [transferMode, setTransferMode] = useState<'send' | 'receive'>('send');

  // External wallet states
  const { address: ethAddress, isConnected: ethConnected } = useAccount();
  const { disconnect: disconnectEth } = useDisconnect();
  // External (adapter) Solana wallet (Phantom, Solflare, etc.) outside Privy scope
  const { connected: adapterSolConnected, disconnect: adapterSolDisconnect } = useSolanaAdapterWallet();
  
  // TRON wallet state
  const { 
    walletInfo: tronWalletInfo, 
    balance: tronBalance, 
    isConnected: tronConnected,
  } = useTronWallet();
  
  // Use dedicated Solana wallets - this is the correct way
  const solanaWallet = solanaWallets?.[0]; // Get first Solana wallet
  
  // Final Solana wallet selection - prioritize dedicated Solana wallets
  const finalSolanaWallet = solanaWallet;
  const solConnected = !!finalSolanaWallet;

  // Helper functions (defined before hooks)
  const getWalletInfo = (): WalletInfo => {
    // Find external wallets (not embedded) from EVM wallets
    // 优先选择特定钱包类型，避免多钱包冲突
    let ethWallet = wallets.find(w => w.address.startsWith('0x') && w.walletClientType === 'phantom');
    if (!ethWallet) {
      ethWallet = wallets.find(w => w.address.startsWith('0x'));
    }
    const isEthExternal = ethWallet?.walletClientType !== 'privy' && ethWallet?.connectorType !== 'embedded';
    
    // For Solana wallets - use the dedicated solanaWallets from useSolanaWallets()
    const solWallet = finalSolanaWallet;
    
    // To check if Solana wallet is external, we need to look in the general wallets array
    // because it has the walletClientType property
    // 同样优先选择 phantom
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

  const getUserDisplayName = (walletInfo: WalletInfo, primary: 'eth' | 'sol' | 'tron' | null) => {
    // First check for social logins
    if (user?.email?.address) return user.email.address;
    if (user?.phone?.number) return user.phone.number;
    if (user?.google?.name) return user.google.name;
    if (user?.twitter?.username) return `@${user.twitter.username}`;
    
    // Use primary wallet to determine which to show first
    if (primary === 'sol') {
      // Solana is primary - show Solana first
      if (walletInfo.solWallet?.address) {
        return `${walletInfo.solWallet.address.slice(0, 4)}...${walletInfo.solWallet.address.slice(-4)}`;
      }
      if (walletInfo.ethWallet?.address) {
        return `${walletInfo.ethWallet.address.slice(0, 4)}...${walletInfo.ethWallet.address.slice(-4)}`;
      }
      if (tronWalletInfo?.address) {
        return `${tronWalletInfo.address.slice(0, 4)}...${tronWalletInfo.address.slice(-4)}`;
      }
    } else if (primary === 'eth') {
      // ETH is primary - show ETH first
      if (walletInfo.ethWallet?.address) {
        return `${walletInfo.ethWallet.address.slice(0, 4)}...${walletInfo.ethWallet.address.slice(-4)}`;
      }
      if (walletInfo.solWallet?.address) {
        return `${walletInfo.solWallet.address.slice(0, 4)}...${walletInfo.solWallet.address.slice(-4)}`;
      }
      if (tronWalletInfo?.address) {
        return `${tronWalletInfo.address.slice(0, 4)}...${tronWalletInfo.address.slice(-4)}`;
      }
    } else if (primary === 'tron') {
      // TRON is primary - show TRON first
      if (tronWalletInfo?.address) {
        return `${tronWalletInfo.address.slice(0, 4)}...${tronWalletInfo.address.slice(-4)}`;
      }
      if (walletInfo.ethWallet?.address) {
        return `${walletInfo.ethWallet.address.slice(0, 4)}...${walletInfo.ethWallet.address.slice(-4)}`;
      }
      if (walletInfo.solWallet?.address) {
        return `${walletInfo.solWallet.address.slice(0, 4)}...${walletInfo.solWallet.address.slice(-4)}`;
      }
    }
    
    // Fallback: Check for external wallet connections first
    if (walletInfo.externalEthConnected && walletInfo.ethWallet?.address) {
      return `${walletInfo.ethWallet.address.slice(0, 4)}...${walletInfo.ethWallet.address.slice(-4)}`;
    }
    if (walletInfo.externalSolConnected && walletInfo.solWallet?.address) {
      return `${walletInfo.solWallet.address.slice(0, 4)}...${walletInfo.solWallet.address.slice(-4)}`;
    }
    if (tronConnected && tronWalletInfo?.address) {
      return `${tronWalletInfo.address.slice(0, 4)}...${tronWalletInfo.address.slice(-4)}`;
    }
    
    // Then check for embedded wallets
    if (walletInfo.ethWallet?.address) {
      return `${walletInfo.ethWallet.address.slice(0, 4)}...${walletInfo.ethWallet.address.slice(-4)}`;
    }
    
    const solanaAddress = solanaWallet?.address;
    if (solanaAddress) {
      return `${solanaAddress.slice(0, 4)}...${solanaAddress.slice(-4)}`;
    }
    
    if (tronWalletInfo?.address) {
      return `${tronWalletInfo.address.slice(0, 4)}...${tronWalletInfo.address.slice(-4)}`;
    }
    return 'User';
  };

  const getConnectionType = (primary: 'eth' | 'sol' | 'tron' | null) => {
    const walletInfo = getWalletInfo();
    
    // Use primary wallet to determine connection type
    if (primary === 'sol') {
      // Solana is primary
      if (walletInfo.externalSolConnected) return 'SOL_EXTERNAL';
      if (walletInfo.solWallet) return 'SOL_NEURAL';
    } else if (primary === 'eth') {
      // ETH is primary
      if (walletInfo.externalEthConnected) return 'ETH_EXTERNAL';
      if (walletInfo.ethWallet) return 'ETH_NEURAL';
    } else if (primary === 'tron') {
      // TRON is primary
      if (tronConnected) return 'TRON_EXTERNAL';
    }
    
    // Fallback: Priority: ETH external > Solana external > TRON > ETH embedded > Solana embedded
    if (walletInfo.externalEthConnected) {
      return 'ETH_EXTERNAL';
    }
    if (walletInfo.externalSolConnected) {
      return 'SOL_EXTERNAL';
    }
    if (tronConnected) {
      return 'TRON_EXTERNAL';
    }
    if (authenticated && wallets.length > 0) {
      // Check if we have ETH embedded wallet first
      if (walletInfo.ethWallet) {
        return 'ETH_NEURAL';
      }
      // Then check for Solana embedded wallet
      if (walletInfo.solWallet) {
        return 'SOL_NEURAL';
      }
      // Otherwise, it's other types
      return 'MULTI_NEURAL';
    }
    return 'OFFLINE';
  };

  const getConnectionDisplayText = (type: string) => {
    switch (type) {
      case 'ETH_EXTERNAL':
        return 'ETHEREUM LINKED';
      case 'SOL_EXTERNAL':
        return 'SOLANA LINKED';
      case 'TRON_EXTERNAL':
        return 'TRON LINKED';
      case 'ETH_NEURAL':
        return 'ETHEREUM SYNC';
      case 'SOL_NEURAL':
        return 'SOLANA SYNC';
      case 'MULTI_NEURAL':
        return 'CONNECTED';
      case 'OFFLINE':
        return 'OFFLINE';
      default:
        return 'CONNECTED';
    }
  };

  // Wallet info and display data - always calculate these
  const walletInfo = getWalletInfo();
  const displayName = getUserDisplayName(walletInfo, primaryWallet);
  const connectionType = getConnectionType(primaryWallet);
  
  // Generate pixel avatar based on user's actual login method
  // Use primaryWallet to determine which wallet to prioritize
  const avatarSeed = useMemo(() => {
    if (user?.id) return user.id;
    
    // Use primary wallet to determine seed
    if (primaryWallet === 'sol') {
      if (walletInfo.solWallet?.address) return walletInfo.solWallet.address;
      if (walletInfo.ethWallet?.address) return walletInfo.ethWallet.address;
      if (tronWalletInfo?.address) return tronWalletInfo.address;
    } else if (primaryWallet === 'eth') {
      if (walletInfo.ethWallet?.address) return walletInfo.ethWallet.address;
      if (walletInfo.solWallet?.address) return walletInfo.solWallet.address;
      if (tronWalletInfo?.address) return tronWalletInfo.address;
    } else if (primaryWallet === 'tron') {
      if (tronWalletInfo?.address) return tronWalletInfo.address;
      if (walletInfo.ethWallet?.address) return walletInfo.ethWallet.address;
      if (walletInfo.solWallet?.address) return walletInfo.solWallet.address;
    }
    
    // Fallback logic
    if (walletInfo.externalEthConnected && ethAddress) return ethAddress;
    if (walletInfo.externalSolConnected && solanaWallet) return solanaWallet.address;
    if (tronConnected && tronWalletInfo?.address) return tronWalletInfo.address;
    if (walletInfo.ethWallet?.address) return walletInfo.ethWallet.address;
    if (walletInfo.solWallet?.address) return walletInfo.solWallet.address;
    return displayName;
  }, [
    user?.id, 
    primaryWallet,
    walletInfo.externalEthConnected, 
    walletInfo.externalSolConnected, 
    tronConnected,
    ethAddress, 
    solanaWallet?.address, 
    tronWalletInfo?.address,
    walletInfo.ethWallet?.address, 
    walletInfo.solWallet?.address, 
    displayName
  ]);
  
  const pixelAvatar = useMemo(() => generatePixelAvatar(avatarSeed), [avatarSeed]);

  // Inject avatar animations
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = avatarStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogin = async () => {
    try {
      setIsDisconnecting(false); // ensure we are in a connect flow
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
    setIsDisconnecting(true);
    try {
      // Close menu & dialog
      handleMenuClose();
      setShowLogoutConfirm(false);

      // 1. Disconnect external Solana adapter wallet (Phantom / Solflare, etc.)
      if (adapterSolConnected) {
        try { await adapterSolDisconnect(); } catch (e) { console.warn('Solana adapter disconnect failed', e); }
      }

      // 2. Disconnect any Privy-provided Solana wallets explicitly (defensive)
      if (solanaWallets && solanaWallets.length) {
        for (const w of solanaWallets) {
          try { await (w as any)?.disconnect?.(); } catch (e) { /* ignore */ }
        }
      }

      // 3. Disconnect external Ethereum wallet
      if (ethConnected) {
        try { disconnectEth(); } catch (e) { console.warn('ETH disconnect failed', e); }
      }

      // 4. Privy logout (clears embedded wallets & session)
      if (authenticated) {
        await logout();
      }

      // 5. Delay to ensure providers settle before UI recalculates state
      await new Promise(r => setTimeout(r, 500));

      console.log('🔴 Logout completed - all wallets (ETH + SOL + Privy) disconnected');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsDisconnecting(false);
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setShowCopySnackbar(true);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openInExplorer = (address: string, network: 'ethereum' | 'solana') => {
    const url = network === 'ethereum'
      ? `https://etherscan.io/address/${address}`
      : `https://solscan.io/account/${address}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!authenticated && !ethConnected && !solConnected) {
    return (
      <Button
        variant="outlined"
        onClick={handleLogin}
        disabled={isLoading}
        sx={{ 
          textTransform: 'none',
          border: '1px solid rgba(78, 205, 196, 0.3)',
          color: '#4ecdc4',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          fontWeight: 600,
          '&:hover': {
            border: '1px solid rgba(78, 205, 196, 0.8)',
            background: 'rgba(78, 205, 196, 0.1)',
            boxShadow: '0 0 15px rgba(78, 205, 196, 0.3)',
          },
          '&:disabled': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          borderRadius: 1,
          px: 3,
          py: 1,
          minWidth: 180
        }}
      >
        {isDisconnecting ? 'Disconnecting...' : (isLoading ? 'Connecting...' : 'Connect Wallet')}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleMenuOpen}
        sx={{ 
          textTransform: 'none',
          border: '1px solid rgba(255, 107, 107, 0.5)',
          background: 'rgba(15, 15, 35, 0.8)',
          backdropFilter: 'blur(10px)',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          '&:hover': {
            border: '1px solid rgba(255, 107, 107, 0.8)',
            background: 'rgba(255, 107, 107, 0.1)',
            boxShadow: '0 0 15px rgba(255, 107, 107, 0.3)',
          },
          borderRadius: 1,
          px: 2,
          py: 1,
          minWidth: 180
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              background: '#0f0f23',
              border: '2px solid #4ecdc4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(45deg, transparent 30%, rgba(78, 205, 196, 0.1) 50%, transparent 70%)',
                animation: 'shimmer 2s infinite'
              }
            }}
          >
            <img 
              src={pixelAvatar} 
              alt="User Avatar"
              style={{
                width: '100%',
                height: '100%',
                imageRendering: 'pixelated',
                animation: 'pixelGlow 3s infinite'
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'left', flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700,
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#ff6b6b'
              }}
            >
              {displayName.length > 12 ? `${displayName.slice(0, 12)}...` : displayName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#4ecdc4',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}
            >
              {getConnectionDisplayText(connectionType)}
            </Typography>
          </Box>
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
        PaperProps={{
          sx: {
            minWidth: 380,
            mt: 1,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Neural Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                background: '#0f0f23',
                border: '3px solid #4ecdc4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: -3,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #ff6b6b)',
                  opacity: 0.5,
                  animation: 'pulse 2s infinite',
                  zIndex: -1
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, transparent 20%, rgba(78, 205, 196, 0.2) 50%, transparent 80%)',
                  animation: 'shimmer 3s infinite'
                }
              }}
            >
              <img 
                src={pixelAvatar} 
                alt="User Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated',
                  animation: 'pixelGlow 3s infinite'
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  color: '#ff6b6b',
                  fontFamily: 'monospace',
                  mb: 0.5
                }}
              >
                {displayName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#4ecdc4',
                    animation: 'pulse 1.5s infinite'
                  }}
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#4ecdc4',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    letterSpacing: '1px'
                  }}
                >
                  {getConnectionDisplayText(connectionType)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 107, 107, 0.2)', my: 2 }} />

          <Stack spacing={2}>
            {/* Display ALL Solana wallets */}
            {solanaWallets.length > 0 && (
              <Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    mb: 1,
                    display: 'block'
                  }}
                >
                  SOLANA WALLETS
                </Typography>
                <Stack spacing={1.5}>
                  {solanaWallets.map((solWallet, index) => {
                    // Extract wallet name from standardWallet object
                    const standardWallet = (solWallet as any).standardWallet;
                    const walletName = standardWallet?.name || 'privy';
                    const walletSource = walletName.toLowerCase();
                    
                    return (
                      <Box
                        key={solWallet.address}
                        onClick={() => {
                          console.log('Clicked Solana wallet, current primary:', primaryWallet);
                          const newPrimary = primaryWallet === 'sol' ? null : 'sol';
                          console.log('Setting primary to:', newPrimary);
                          setPrimaryWallet(newPrimary);
                        }}
                        sx={{
                          border: '1px solid rgba(153, 69, 255, 0.3)',
                          borderRadius: 2,
                          p: 2,
                          background: 'rgba(153, 69, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'rgba(153, 69, 255, 0.1)',
                            borderColor: 'rgba(153, 69, 255, 0.5)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(153, 69, 255, 0.2)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <SiSolana color="#9945ff" size={20} />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: '#9945ff',
                              fontFamily: 'monospace',
                              flex: 1
                            }}
                          >
                            Solana
                          </Typography>
                          <Chip 
                            label={walletSource} 
                            size="small"
                            sx={{ 
                              fontSize: '0.65rem',
                              height: 20,
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              backgroundColor: 'rgba(153, 69, 255, 0.2)',
                              color: '#9945ff',
                              border: '1px solid rgba(153, 69, 255, 0.5)'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            {`${solWallet.address.slice(0, 8)}...${solWallet.address.slice(-6)}`}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Clicked Solana star, current primary:', primaryWallet);
                              const newPrimary = primaryWallet === 'sol' ? null : 'sol';
                              console.log('Setting primary to:', newPrimary);
                              setPrimaryWallet(newPrimary);
                            }}
                            sx={{ 
                              color: primaryWallet === 'sol' ? '#ffd700' : 'rgba(255, 255, 255, 0.3)',
                              '&:hover': { color: '#ffd700' }
                            }}
                            title={primaryWallet === 'sol' ? '主钱包' : '设为主钱包'}
                          >
                            {primaryWallet === 'sol' ? <FaStar size={12} /> : <FaRegStar size={12} />}
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(solWallet.address, `sol-${index}`);
                            }}
                            sx={{ 
                              color: copied === `sol-${index}` ? '#4ecdc4' : 'rgba(255, 255, 255, 0.5)',
                              '&:hover': { color: '#4ecdc4' }
                            }}
                          >
                            <FaCopy size={12} />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInExplorer(solWallet.address, 'solana');
                            }}
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.5)',
                              '&:hover': { color: '#9945ff' }
                            }}
                          >
                            <FaExternalLinkAlt size={12} />
                          </IconButton>
                        </Box>
                        
                        {/* Send/Receive buttons for Privy embedded wallets only */}
                        {walletSource === 'privy' && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setTransferMode('send');
                                setShowTokenTransfer(true);
                              }}
                              sx={{
                                flex: 1,
                                borderColor: 'rgba(153, 69, 255, 0.5)',
                                color: '#9945ff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: '#9945ff',
                                  backgroundColor: 'rgba(153, 69, 255, 0.1)'
                                }
                              }}
                            >
                              Send
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setTransferMode('receive');
                                setShowTokenTransfer(true);
                              }}
                              sx={{
                                flex: 1,
                                borderColor: 'rgba(153, 69, 255, 0.5)',
                                color: '#9945ff',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: '#9945ff',
                                  backgroundColor: 'rgba(153, 69, 255, 0.1)'
                                }
                              }}
                            >
                              Receive
                            </Button>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Display ALL Ethereum wallets */}
            {wallets.filter(w => w.address.startsWith('0x')).length > 0 && (
              <Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    mb: 1,
                    display: 'block'
                  }}
                >
                  ETHEREUM WALLETS
                </Typography>
                <Stack spacing={1.5}>
                  {wallets.filter(w => w.address.startsWith('0x')).map((ethWallet, index) => {
                    // Get wallet client type (privy, phantom, backpack, etc.)
                    const walletSource = ethWallet?.walletClientType || 'unknown';
                    
                    return (
                      <Box
                        key={ethWallet.address}
                        onClick={() => {
                          console.log('Clicked Ethereum wallet, current primary:', primaryWallet);
                          const newPrimary = primaryWallet === 'eth' ? null : 'eth';
                          console.log('Setting primary to:', newPrimary);
                          setPrimaryWallet(newPrimary);
                        }}
                        sx={{
                          border: '1px solid rgba(98, 126, 234, 0.3)',
                          borderRadius: 2,
                          p: 2,
                          background: 'rgba(98, 126, 234, 0.05)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'rgba(98, 126, 234, 0.1)',
                            borderColor: 'rgba(98, 126, 234, 0.5)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(98, 126, 234, 0.2)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <FaEthereum color="#627eea" size={20} />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: '#627eea',
                              fontFamily: 'monospace',
                              flex: 1
                            }}
                          >
                            Ethereum
                          </Typography>
                          <Chip 
                            label={walletSource} 
                            size="small"
                            sx={{ 
                              fontSize: '0.65rem',
                              height: 20,
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              backgroundColor: 'rgba(98, 126, 234, 0.2)',
                              color: '#627eea',
                              border: '1px solid rgba(98, 126, 234, 0.5)'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            {`${ethWallet.address.slice(0, 8)}...${ethWallet.address.slice(-6)}`}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Clicked Ethereum star, current primary:', primaryWallet);
                              const newPrimary = primaryWallet === 'eth' ? null : 'eth';
                              console.log('Setting primary to:', newPrimary);
                              setPrimaryWallet(newPrimary);
                            }}
                            sx={{ 
                              color: primaryWallet === 'eth' ? '#ffd700' : 'rgba(255, 255, 255, 0.3)',
                              '&:hover': { color: '#ffd700' }
                            }}
                            title={primaryWallet === 'eth' ? '主钱包' : '设为主钱包'}
                          >
                            {primaryWallet === 'eth' ? <FaStar size={12} /> : <FaRegStar size={12} />}
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(ethWallet.address, `eth-${index}`);
                            }}
                            sx={{ 
                              color: copied === `eth-${index}` ? '#4ecdc4' : 'rgba(255, 255, 255, 0.5)',
                              '&:hover': { color: '#4ecdc4' }
                            }}
                          >
                            <FaCopy size={12} />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInExplorer(ethWallet.address, 'ethereum');
                            }}
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.5)',
                              '&:hover': { color: '#627eea' }
                            }}
                          >
                            <FaExternalLinkAlt size={12} />
                          </IconButton>
                        </Box>
                        
                        {/* Send/Receive buttons for Privy embedded Ethereum wallets only */}
                        {walletSource === 'privy' && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setTransferMode('send');
                                setShowEthTokenTransfer(true);
                              }}
                              sx={{
                                flex: 1,
                                borderColor: 'rgba(98, 126, 234, 0.5)',
                                color: '#627eea',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: '#627eea',
                                  backgroundColor: 'rgba(98, 126, 234, 0.1)'
                                }
                              }}
                            >
                              Send
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setTransferMode('receive');
                                setShowEthTokenTransfer(true);
                              }}
                              sx={{
                                flex: 1,
                                borderColor: 'rgba(98, 126, 234, 0.5)',
                                color: '#627eea',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: '#627eea',
                                  backgroundColor: 'rgba(98, 126, 234, 0.1)'
                                }
                              }}
                            >
                              Receive
                            </Button>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* TRON Wallet Section */}
            {tronConnected && tronWalletInfo && (
              <>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    mb: 1,
                    display: 'block'
                  }}
                >
                  TRON WALLETS
                </Typography>
                <Box
                  onClick={() => {
                    console.log('Clicked TRON wallet, current primary:', primaryWallet);
                    const newPrimary = primaryWallet === 'tron' ? null : 'tron';
                    console.log('Setting primary to:', newPrimary);
                    setPrimaryWallet(newPrimary);
                  }}
                  sx={{
                    border: '1px solid rgba(198, 40, 40, 0.3)',
                    borderRadius: 2,
                    p: 2,
                    background: 'rgba(198, 40, 40, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(198, 40, 40, 0.1)',
                      borderColor: 'rgba(198, 40, 40, 0.5)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(198, 40, 40, 0.2)'
                    }
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
                      label={tronWalletInfo.walletType === 'privy-embedded' ? 'embedded' : 'imported'} 
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
                      {`${tronWalletInfo.address.slice(0, 8)}...${tronWalletInfo.address.slice(-6)}`}
                    </Typography>
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Clicked TRON star, current primary:', primaryWallet);
                        const newPrimary = primaryWallet === 'tron' ? null : 'tron';
                        console.log('Setting primary to:', newPrimary);
                        setPrimaryWallet(newPrimary);
                      }}
                      sx={{ 
                        color: primaryWallet === 'tron' ? '#ffd700' : 'rgba(255, 255, 255, 0.3)',
                        '&:hover': { 
                          color: '#ffd700',
                          transform: 'scale(1.1)' 
                        },
                        transition: 'all 0.2s ease'
                      }}
                      title={primaryWallet === 'tron' ? 'Unset as primary wallet' : 'Set as primary wallet'}
                    >
                      {primaryWallet === 'tron' ? <FaStar size={14} /> : <FaRegStar size={14} />}
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(tronWalletInfo.address, 'tron-wallet');
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
                          `https://tronscan.org/#/address/${tronWalletInfo.address}`,
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
                  {tronBalance && (
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
                            {parseFloat(tronBalance.trx.toString()).toFixed(4)} TRX
                          </Typography>
                        </Box>
                        {Object.entries(tronBalance.tokens)
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

                  {/* Send/Receive buttons for TRON embedded wallet */}
                  {tronWalletInfo.walletType === 'privy-embedded' && (
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferMode('send');
                          setShowTronTokenTransfer(true);
                        }}
                        sx={{
                          borderColor: 'rgba(198, 40, 40, 0.5)',
                          color: '#c62828',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          py: 1,
                          '&:hover': {
                            borderColor: '#c62828',
                            backgroundColor: 'rgba(198, 40, 40, 0.1)'
                          }
                        }}
                      >
                        Send
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferMode('receive');
                          setShowTronTokenTransfer(true);
                        }}
                        sx={{
                          borderColor: 'rgba(198, 40, 40, 0.5)',
                          color: '#c62828',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          py: 1,
                          '&:hover': {
                            borderColor: '#c62828',
                            backgroundColor: 'rgba(198, 40, 40, 0.1)'
                          }
                        }}
                      >
                        Receive
                      </Button>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {/* TRON Wallet Button - Show only if not connected */}
            {!tronConnected && (
              <TronWalletButton />
            )}
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255, 107, 107, 0.2)', my: 2 }} />

          {/* Terminate Connection */}
          <Button
            variant="contained"
            fullWidth
            startIcon={<FaSignOutAlt />}
            onClick={() => setShowLogoutConfirm(true)}
            disabled={isLoading}
            sx={{ 
              textTransform: 'none',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #ff6b6b, #dc2626)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)'
              },
              '&:disabled': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect Wallet'}
          </Button>
        </Box>
      </Menu>

      {/* Logout Confirmation Dialog */}
      <Dialog 
        open={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: 2,
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontFamily: 'monospace', 
          color: '#ff6b6b',
          fontWeight: 700,
          fontSize: '1.1rem'
        }}>
          Disconnect Wallet
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ 
            fontFamily: 'monospace', 
            color: 'rgba(255, 255, 255, 0.8)',
            mb: 2
          }}>
            This will disconnect all wallet connections.
          </Typography>
          <Typography sx={{ 
            fontFamily: 'monospace', 
            color: '#4ecdc4',
            fontSize: '0.85rem'
          }}>
            You will need to reconnect to continue.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setShowLogoutConfirm(false)}
            sx={{ 
              fontFamily: 'monospace',
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: '#4ecdc4' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLogout}
            variant="contained"
            disabled={isLoading}
            sx={{ 
              fontFamily: 'monospace',
              background: 'linear-gradient(135deg, #ff6b6b, #dc2626)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              }
            }}
          >
            {isLoading ? 'Disconnecting...' : 'Confirm Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={showCopySnackbar}
        autoHideDuration={2000}
        onClose={() => setShowCopySnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowCopySnackbar(false)} 
          severity="success"
          sx={{ 
            fontFamily: 'monospace',
            backgroundColor: '#1a1a2e',
            color: '#4ecdc4',
            border: '1px solid #4ecdc4',
            '& .MuiAlert-icon': {
              color: '#4ecdc4'
            }
          }}
        >
          Address copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Token Transfer Dialog */}
      <TokenTransfer
        open={showTokenTransfer}
        onClose={() => setShowTokenTransfer(false)}
        mode={transferMode}
      />

      {/* Ethereum Token Transfer Dialog */}
      <EthTokenTransfer
        open={showEthTokenTransfer}
        onClose={() => setShowEthTokenTransfer(false)}
        mode={transferMode}
      />

      {/* TRON Token Transfer Dialog */}
      <TronTokenTransfer
        open={showTronTokenTransfer}
        onClose={() => setShowTronTokenTransfer(false)}
        mode={transferMode}
      />

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default CustomUserProfile;