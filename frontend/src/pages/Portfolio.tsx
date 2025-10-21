import {
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import Navigation from '../components/Navigation';

import { getUserWalletAddress, useMarsUserPositions } from '../hooks/useMarsApi';

const PortfolioPage = () => {
  const { address } = useAccount();

  // Wallet connection states for Mars integration
  const { authenticated, user } = usePrivy();
  const { wallets: solanaWallets } = useWallets();
  const { publicKey: solanaPublicKey } = useWallet();
  
  // Get user wallet address for Mars API (prioritize direct Solana connection)
  const userWalletAddress = getUserWalletAddress(address, solanaWallets, authenticated, user, solanaPublicKey);
  
  // Get Mars user positions
  const { positions, loading: isLoading } = useMarsUserPositions(userWalletAddress);

  // Calculate total net value from all positions
  const totalNetValue = positions?.summary?.totalValue || 0;
  const totalPositions = positions?.summary?.totalPositions || 0;
  const avgAPY = positions?.summary?.avgAPY || 0;

  // Calculate total interest earned (Fees & Interest)
  const allPositions = [
    ...(positions?.kamino?.positions || []),
    ...(positions?.jupiter?.positions || [])
  ];
  const totalInterest = allPositions.reduce((sum, pos: any) => {
    // unrealizedGain represents the interest/profit earned
    return sum + (pos.unrealizedGain || 0);
  }, 0);

  // Calculate total claimable rewards (use pendingRewards object, not rewards array)
  const totalClaimableRewards = allPositions.reduce((sum, pos: any) => {
    if (pos.pendingRewards && typeof pos.pendingRewards === 'object') {
      // pendingRewards is an object with tokenMint as key and amount as value
      const positionRewards = Object.values(pos.pendingRewards).reduce((rewardSum: number, amount: any) => {
        return rewardSum + (parseFloat(amount) || 0);
      }, 0);
      return sum + positionRewards;
    }
    return sum;
  }, 0);

  // Debug wallet connection status
  console.log('🔍 Portfolio Wallet Status:', {
    ethAddress: address,
    authenticated,
    solanaWalletsCount: solanaWallets.length,
    userWalletAddress,
    positions,
    totalNetValue,
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
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Portfolio Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography 
              variant="h3" 
              fontWeight={700} 
              sx={{ 
                mb: 1, 
                color: '#ffffff',
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              Portfolio
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#94a3b8',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
              }}
            >
              Track all your Mars positions in one place
            </Typography>
          </Box>

          {/* Stats Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
            gap: 2, 
            mb: 4 
          }}>
            {/* Net Value */}
            <Paper sx={{
              p: 2.5,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 2,
            }}>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>
                ${totalNetValue.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Net value
              </Typography>
            </Paper>

            {/* Average APY */}
            <Paper sx={{
              p: 2.5,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 2,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#10b981' }}>
                  {(avgAPY * 100).toFixed(2)}%
                </Typography>
                <TrendingUpIcon sx={{ color: '#10b981', fontSize: 24 }} />
              </Box>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Average APY
              </Typography>
            </Paper>

            {/* Fees & Interest */}
            <Paper sx={{
              p: 2.5,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 2,
            }}>
              <Typography variant="h3" fontWeight={700} sx={{ color: totalInterest >= 0 ? '#10b981' : '#ef4444', mb: 0.5 }}>
                {totalInterest >= 0 ? '+' : ''}${totalInterest.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Fees & Interest
              </Typography>
            </Paper>

            {/* Claimable Rewards */}
            <Paper sx={{
              p: 2.5,
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: 2,
            }}>
              <Typography variant="h3" fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>
                {totalClaimableRewards < 0.01 && totalClaimableRewards > 0 ? '<' : ''}${totalClaimableRewards < 0.01 && totalClaimableRewards > 0 ? '0.01' : totalClaimableRewards.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Claimable Rewards
              </Typography>
            </Paper>
          </Box>

          {/* Mars Positions Section */}
          {positions && totalPositions > 0 ? (
            <Box>
              <Typography variant="h5" fontWeight={600} sx={{ color: '#fff', mb: 3 }}>
                Mars Positions
              </Typography>

              {/* Kamino Positions */}
              {positions.kamino.totalPositions > 0 && (
                <Box sx={{ mb: 4 }}>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {positions.kamino.positions.map((position, index) => (
                      <Paper key={index} sx={{
                        p: 3,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': {
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          background: 'rgba(15, 23, 42, 0.8)',
                        }
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 2 }}>
                          <Box>
                            <Typography variant="h6" fontWeight={600} sx={{ color: '#fff', mb: 1 }}>
                              {position.asset || 'Unknown Asset'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={`${(position.entryAPY * 100).toFixed(2)}% APY`}
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  fontWeight: 500
                                }}
                              />
                              <Chip 
                                label={position.protocol}
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                  color: '#60a5fa',
                                  fontWeight: 500
                                }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>
                              ${position.currentValue.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: position.unrealizedGain >= 0 ? '#10b981' : '#ef4444' }}>
                              {position.unrealizedGain >= 0 ? '+' : ''}${position.unrealizedGain.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Jupiter Positions */}
              {positions.jupiter.totalPositions > 0 && (
                <Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {positions.jupiter.positions.map((position, index) => (
                      <Paper key={index} sx={{
                        p: 3,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': {
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          background: 'rgba(15, 23, 42, 0.8)',
                        }
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 2 }}>
                          <Box>
                            <Typography variant="h6" fontWeight={600} sx={{ color: '#fff', mb: 1 }}>
                              {position.asset || 'Unknown Asset'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={`${(position.entryAPY * 100).toFixed(2)}% APY`}
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  color: '#10b981',
                                  fontWeight: 500
                                }}
                              />
                              <Chip 
                                label={position.protocol}
                                size="small"
                                sx={{ 
                                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                  color: '#a855f7',
                                  fontWeight: 500
                                }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>
                              ${position.currentValue.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: position.unrealizedGain >= 0 ? '#10b981' : '#ef4444' }}>
                              {position.unrealizedGain >= 0 ? '+' : ''}${position.unrealizedGain.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              px: 3
            }}>
              <Typography 
                variant="h5" 
                fontWeight={600} 
                sx={{ 
                  mb: 2, 
                  color: '#94a3b8',
                }}
              >
                {isLoading ? 'Loading positions...' : 'No positions found'}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#64748b',
                }}
              >
                {isLoading ? 'Please wait while we fetch your data' : 'Start depositing to see your positions here'}
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default PortfolioPage;
