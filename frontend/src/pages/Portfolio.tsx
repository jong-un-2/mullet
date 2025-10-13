import {
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
} from '@mui/material';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import Navigation from '../components/Navigation';

import { getUserWalletAddress } from '../hooks/useMarsApi';

const PortfolioPage = () => {
  const { address } = useAccount();

  // Wallet connection states for Mars integration
  const { authenticated, user } = usePrivy();
  const { wallets: solanaWallets } = useWallets();
  const { publicKey: solanaPublicKey } = useWallet();
  
  // Get user wallet address for Mars API (prioritize direct Solana connection)
  const userWalletAddress = getUserWalletAddress(address, solanaWallets, authenticated, user, solanaPublicKey);

  // Debug wallet connection status
  console.log('🔍 Portfolio Wallet Status:', {
    ethAddress: address,
    authenticated,
    solanaWalletsCount: solanaWallets.length,
    userWalletAddress,
    isAnyWalletConnected: address || authenticated || solanaWallets.length > 0 || !!solanaPublicKey
  });

  // Check if ANY wallet is connected (ETH, Solana, or Privy)
  const isAnyWalletConnected = address || authenticated || solanaWallets.length > 0 || !!solanaPublicKey;

  if (!isAnyWalletConnected) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Tech background pattern */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.05) 50%, transparent 60%)
          `,
          zIndex: 0,
        }} />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Navigation />
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h4" fontWeight={600} sx={{ mb: 2, color: '#ffffff' }}>
                Portfolio
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, color: '#94a3b8' }}>
                Connect your wallet to view your portfolio and manage your assets.
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 2,
                p: 3,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: 400,
                mx: 'auto'
              }}>
                <WalletIcon sx={{ fontSize: 24, color: '#94a3b8' }} />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Please connect your wallet using the button in the top navigation
                </Typography>
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Tech background pattern */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
          linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.05) 50%, transparent 60%)
        `,
        zIndex: 0,
      }} />
      
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Coming Soon */}
          <Box sx={{ 
            textAlign: 'center', 
            py: 12,
            px: 3
          }}>
            <Typography 
              variant="h2" 
              fontWeight={700} 
              sx={{ 
                mb: 3, 
                color: '#ffffff',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                textShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
              }}
            >
              Portfolio
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight={600} 
              sx={{ 
                mb: 2, 
                color: '#60a5fa',
                fontSize: { xs: '1.5rem', md: '2rem' }
              }}
            >
              Coming Soon
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 4, 
                color: '#94a3b8',
                maxWidth: 600,
                mx: 'auto',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                lineHeight: 1.6
              }}
            >
              We're building a comprehensive portfolio management system. Track all your DeFi positions, earnings, and assets in one place.
            </Typography>
            <Box sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 2,
              p: 3,
              background: 'rgba(59, 130, 246, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: '2px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)'
            }}>
              <WalletIcon sx={{ fontSize: 32, color: '#60a5fa' }} />
              <Typography variant="body1" sx={{ color: '#e2e8f0', fontWeight: 500 }}>
                Stay tuned for updates
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PortfolioPage;
