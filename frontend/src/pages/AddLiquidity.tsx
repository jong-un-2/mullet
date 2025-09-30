import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useChainId } from 'wagmi';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import Navigation from '../components/Navigation';
import { useApiPoolData, ApiPool } from '../dex/hooks/useApiPoolData';

interface PoolData {
  id: string;
  token0: string;
  token1: string;
  icon0: string;
  icon1: string;
  tvl: string;
  apr: string;
  volume24h: string;
  fees24h: string;
  userLiquidity?: string;
  pairAddress?: string;
  binStep?: number;
  tokenXAddress?: string;
  tokenYAddress?: string;
}

// Import the AddLiquidity component content from the dialog
import AddLiquidityForm from '../components/pool/AddLiquidityForm';
import { PriceToggleProvider } from '../components/pool/add-liquidity';

const AddLiquidityPage: React.FC = () => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const [searchParams] = useSearchParams();
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  
  // Get pool data from backend API (same as Pool.tsx)
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    56: 'binance',
    97: 'binance',
    137: 'polygon',
    43114: 'avax',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    11155111: 'ethereum', // sepolia
  };
  const chainName = chainMap[chainId] || 'binance';
  // 统一转换API数据为页面PoolData结构
  const { pools: apiPools, loading: isLoading } = useApiPoolData({
    chain: chainName,
    pageSize: 10,
    orderBy: 'volume',
    filterBy: '1d',
    status: 'main',
    version: 'all',
    excludeLowVolumePools: true,
  });
  const mapApiPoolToPoolData = (pool: ApiPool): PoolData => ({
    id: pool.pairAddress,
    token0: pool.tokenX.symbol,
    token1: pool.tokenY.symbol,
    icon0: `/src/assets/${pool.tokenX.symbol.toLowerCase()}.svg`,
    icon1: `/src/assets/${pool.tokenY.symbol.toLowerCase()}.svg`,
    tvl: `$${Number(pool.liquidityUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    apr: pool.lbBaseFeePct ? `${pool.lbBaseFeePct.toFixed(2)}%` : '—',
    volume24h: pool.volumeUsd ? `$${Number(pool.volumeUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—',
    fees24h: pool.feesUsd ? `$${Number(pool.feesUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—',
    pairAddress: pool.pairAddress,
    binStep: pool.lbBinStep,
    tokenXAddress: pool.tokenX.address,
    tokenYAddress: pool.tokenY.address,
  });
  const realPoolData: PoolData[] = apiPools.map(mapApiPoolToPoolData);
  
  // Get pool ID from URL parameters
  const poolId = searchParams.get('poolId');
  
  useEffect(() => {
    if (poolId && realPoolData) {
      // Try exact match first
      let pool = realPoolData.find((p: PoolData) => p.id === poolId);
      // If not found, try case-insensitive match
      if (!pool) {
        pool = realPoolData.find((p: PoolData) => p.id.toLowerCase() === poolId.toLowerCase());
      }
      // If still not found, try decoded poolId
      if (!pool) {
        const decodedPoolId = decodeURIComponent(poolId);
        pool = realPoolData.find((p: PoolData) => p.id === decodedPoolId || p.id.toLowerCase() === decodedPoolId.toLowerCase());
      }
      // If still not found, try using pairAddress
      if (!pool) {
        pool = realPoolData.find((p: PoolData) => 
          p.pairAddress === poolId || 
          p.pairAddress?.toLowerCase() === poolId.toLowerCase()
        );
      }
      if (pool) {
        setSelectedPool(pool);
      } else {
        // Don't redirect immediately, let user see the error
      }
    } else if (!poolId) {
      // No pool ID provided, redirect back to pool list
      navigate('/pool');
    }
  }, [poolId, realPoolData, navigate]);

  const handleBack = () => {
    navigate('/pool');
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Navigation />
          <Container maxWidth="lg">
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Typography sx={{ color: '#ffffff' }}>Loading pool data...</Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    );
  }

  if (!selectedPool) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Navigation />
          <Container maxWidth="lg">
            <Box sx={{ mt: 4 }}>
              <Alert severity="error" sx={{ 
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ffffff'
              }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>Pool not found</Typography>
                <Typography variant="body2" sx={{ mb: 2, color: '#94a3b8' }}>
                  Pool ID from URL: {poolId}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: '#94a3b8' }}>
                  Available pools: {realPoolData?.length || 0}
                </Typography>
            {realPoolData && realPoolData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">Available Pool IDs:</Typography>
                <ul>
                  {realPoolData.slice(0, 5).map((pool: PoolData) => (
                    <li key={pool.id}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {pool.id} ({pool.token0}/{pool.token1})
                      </Typography>
                    </li>
                  ))}
                  {realPoolData.length > 5 && (
                    <li>
                      <Typography variant="caption">... and {realPoolData.length - 5} more</Typography>
                    </li>
                  )}
                </ul>
              </Box>
            )}
            <Button 
              variant="contained" 
              onClick={() => navigate('/pool')}
              sx={{ 
                mt: 2,
                background: 'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #2563eb 0%, #1e40af 100%)',
                }
              }}
            >
              Back to Pools
            </Button>
          </Alert>
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
        <PriceToggleProvider>
          <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <IconButton 
              onClick={handleBack} 
              sx={{ 
                mr: 2,
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#2563eb',
                }
              }}
              aria-label="back to pools"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight={600} sx={{ color: '#ffffff' }}>
              Add Liquidity to {selectedPool.token0}/{selectedPool.token1}
            </Typography>
          </Box>

          {/* Pool Info Card */}
          <Card sx={{ 
            mb: 4,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src={selectedPool.icon0}
                    alt={selectedPool.token0}
                    style={{ width: 32, height: 32, borderRadius: '50%' }}
                    onError={e => (e.currentTarget.src = '/src/assets/react.svg')}
                  />
                  <img
                    src={selectedPool.icon1}
                    alt={selectedPool.token1}
                    style={{ width: 32, height: 32, borderRadius: '50%', marginLeft: -8 }}
                    onError={e => (e.currentTarget.src = '/src/assets/react.svg')}
                  />
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff' }}>
                  {selectedPool.token0}/{selectedPool.token1}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  TVL: {selectedPool.tvl} • APR: {selectedPool.apr}
                </Typography>
                {selectedPool.binStep !== undefined && (
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Bin Step: {selectedPool.binStep}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Add Liquidity Form */}
          <AddLiquidityForm 
            selectedPool={selectedPool}
            chainId={chainId}
            onSuccess={handleBack}
          />
        </Box>
        </Container>
        </PriceToggleProvider>
      </Box>
    </Box>
  );
};

export default AddLiquidityPage;