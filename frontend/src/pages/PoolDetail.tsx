import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { JITOSOL_POOLS, depositAndStake, getUserPosition } from '../services/kaminoLiquidity';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DEX_ICONS: Record<string, string> = {
  Orca: '🌊',
  Meteora: '☄️',
  Raydium: '⚡',
  Kamino: 'K',
};

export default function PoolDetail() {
  const { poolAddress } = useParams<{ poolAddress: string }>();
  const navigate = useNavigate();
  const wallet = useWallet();
  const { connection } = useConnection();

  const [activeTab, setActiveTab] = useState(0);
  const [pool, setPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Deposit states
  const [solAmount, setSolAmount] = useState('');
  const [jitosolAmount, setJitosolAmount] = useState('');
  const [singleAssetDeposit, setSingleAssetDeposit] = useState(true);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositTxSignature, setDepositTxSignature] = useState('');

  // Position states
  const [userPosition, setUserPosition] = useState<any>(null);
  const [positionLoading, setPositionLoading] = useState(false);

  useEffect(() => {
    const foundPool = JITOSOL_POOLS.find(p => p.address === poolAddress);
    setPool(foundPool);
    setLoading(false);

    if (wallet.connected && foundPool) {
      loadUserPosition(foundPool);
    }
  }, [poolAddress, wallet.connected]);

  const loadUserPosition = async (poolData: any) => {
    if (!wallet.publicKey) return;
    
    setPositionLoading(true);
    try {
      const position = await getUserPosition(
        poolData.address,
        wallet.publicKey.toString(),
        connection
      );
      setUserPosition(position);
    } catch (error) {
      console.error('Error loading position:', error);
    } finally {
      setPositionLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!wallet.publicKey || !pool) return;

    setDepositLoading(true);
    setDepositTxSignature('');

    try {
      const sol = parseFloat(solAmount) || 0;
      const jitosol = parseFloat(jitosolAmount) || 0;

      if (sol <= 0 && jitosol <= 0) {
        alert('Please enter an amount to deposit');
        return;
      }

      const signature = await depositAndStake({
        strategyAddress: pool.address,
        amountSOL: sol.toString(),
        amountJitoSOL: jitosol.toString(),
        wallet,
        connection
      });

      setDepositTxSignature(signature);
      setSolAmount('');
      setJitosolAmount('');

      // Reload position
      await loadUserPosition(pool);
    } catch (error: any) {
      console.error('Deposit error:', error);
      alert(`Deposit failed: ${error.message}`);
    } finally {
      setDepositLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!pool) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Pool not found</Typography>
        <Button onClick={() => navigate('/xliquid')}>Back to Liquidity</Button>
      </Box>
    );
  }

  const dexIcon = DEX_ICONS[pool.dex] || '🌊';

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      p: 4
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <IconButton 
          onClick={() => navigate('/xliquid')}
          sx={{ color: '#94a3b8', mb: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography sx={{ fontSize: 32 }}>{dexIcon}</Typography>
          <Box>
            <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 600 }}>
              {pool.name} Liquidity ⚡
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Chip 
                label={`DEX: ${pool.dex}`}
                sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
              />
              <Chip 
                label={`Fee Tier: 0.01%`}
                sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
              />
              <Chip 
                label={`7D Fees APY: ${(pool.feesApy * 100).toFixed(2)}%`}
                icon={<TrendingUpIcon />}
                sx={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_e, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: '#64748b',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            '&.Mui-selected': {
              color: '#3b82f6'
            }
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#3b82f6',
            height: 3
          }
        }}
      >
        <Tab label="Overview" />
        <Tab label="My Position" />
        <Tab label="Analytics" />
        <Tab label="Info & Risk" />
      </Tabs>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Stats Cards Row */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>TVL</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${(pool.tvl / 1000000).toFixed(2)}M
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 16 }} />
                7D Fees APY
              </Box>
            </Typography>
            <Typography sx={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 600 }}>
              {(pool.feesApy * 100).toFixed(2)}%
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>7D Volume</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${(pool.volume7d / 1000000).toFixed(2)}M
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>7D Fees Earned</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${((pool.tvl * pool.feesApy * 7) / 365 / 1000).toFixed(2)}K
            </Typography>
          </Card>
        </Box>

        {/* JTO Rewards Banner */}
        <Card sx={{ 
          p: 4,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 116, 139, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}>
              ⚡
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 600, mb: 1 }}>
                3 Months of $JTO Rewards!
              </Typography>
              <Typography sx={{ color: '#94a3b8', mb: 2 }}>
                Provide liquidity to the JitoSOL-SOL Vault to earn $JTO for the next three months. Claim your $JTO in real-time. Withdraw at any time.
              </Typography>
              <Button 
                sx={{ 
                  color: '#10b981',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                }}
              >
                Learn More →
              </Button>
            </Box>
            <IconButton 
              sx={{ 
                position: 'absolute',
                top: 16,
                right: 16,
                color: '#64748b'
              }}
            >
              ✕
            </IconButton>
          </Box>
        </Card>

        {/* Farm Info */}
        <Card sx={{ 
          p: 4, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label="Boosted Fees APY" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
            <Chip 
              label="Daily JTO Rewards" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 600 }}>
                {(pool.feesApy * 100 * 0.8).toFixed(2)}%
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 400, mb: 0.5 }}>
                24.83K JTO for past 7D
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Strategy Section */}
        <Card sx={{ 
          p: 4, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Typography sx={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: 500, mb: 2 }}>
            Drift
          </Typography>
          <Typography sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.7 }}>
            Earn staking yield and trading fees with SOL exposure. Kamino algorithms set and rebalance the trading range, and auto-compound fees and rewards.
          </Typography>
          <Button 
            sx={{ 
              color: '#3b82f6',
              textTransform: 'none',
              pl: 0,
              '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
            }}
          >
            Learn more →
          </Button>
        </Card>

        {/* Vault Info */}
        <Card sx={{ 
          p: 4,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label="Position Range" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
            <Chip 
              label="Asset Ratio" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 6, mb: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 600, mb: 1 }}>
                1.236-1.2387
              </Typography>
              <Typography sx={{ color: '#3b82f6', fontSize: '0.9rem' }}>
                1.2378 current
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 600, mb: 1 }}>
                <Box component="span" sx={{ color: '#94a3b8', fontSize: '1rem' }}>≈</Box> 67.43% / <Box component="span" sx={{ color: '#10b981' }}>🟢</Box> 32.57%
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6'
                  }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    102.46K
                  </Typography>
                </Box>
                <Typography sx={{ color: '#64748b' }}>/</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%',
                    backgroundColor: '#10b981'
                  }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    39.94K
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Farm Overview - Left Side */}
          <Box sx={{ flex: '1 1 600px', minWidth: 0 }}>
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Farm Overview</Typography>
              
              {positionLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {/* Top 3 Stats */}
                  <Box sx={{ display: 'flex', gap: 4, mb: 4, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Your Stake</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
                        ${userPosition?.stakeValue || '0.00'}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {userPosition?.stakeAmount || '0.00'} kJITOSOL-SOL
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Available to Claim</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
                        0 JTO
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {'<'}$0.01
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Incentives APY</Typography>
                      <Typography sx={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 600 }}>
                        4.93%
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small"
                        sx={{ 
                          mt: 2,
                          background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        Claim All
                      </Button>
                    </Box>
                  </Box>

                  {/* Bottom 4 Stats Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2 }}>
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>Net Value</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: 600 }}>
                        {'<'}$0.01
                      </Typography>
                    </Card>
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>PnL</Typography>
                      <Typography sx={{ color: '#ef4444', fontSize: '1.3rem', fontWeight: 600 }}>
                        -$0.001
                      </Typography>
                    </Card>
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>Fees Earned</Typography>
                      <Typography sx={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 600 }}>
                        {'<'}$0.01
                      </Typography>
                    </Card>
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mb: 1 }}>My Asset Ratio</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: 600 }}>
                        <Box component="span" sx={{ fontSize: '1rem' }}>≈</Box> 0.00 / <Box component="span" sx={{ color: '#10b981' }}>🟢</Box> 0.00
                      </Typography>
                    </Card>
                  </Box>
                </Box>
              )}
            </Card>

            {/* Performance Chart */}
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Performance</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label="USD" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#64748b' }} />
                  <Chip label="SOL" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }} />
                  <Chip label="7D" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' }} />
                  <Chip label="30D" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#64748b' }} />
                  <Chip label="3M" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#64748b' }} />
                </Box>
              </Box>
              
              {/* Simple Chart Placeholder */}
              <Box sx={{ 
                height: 250, 
                display: 'flex', 
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                px: 2,
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                {/* Simulated chart line */}
                <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                      points="0,20 10,18 20,22 30,19 40,21 50,18 60,20 70,17 80,19 90,16 100,15"
                    />
                    <polyline
                      fill="url(#gradient)"
                      stroke="none"
                      points="0,20 10,18 20,22 30,19 40,21 50,18 60,20 70,17 80,19 90,16 100,15 100,100 0,100"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </Box>
              </Box>
              
              {/* Chart Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox defaultChecked size="small" sx={{ color: '#3b82f6' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Position Value</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox defaultChecked size="small" sx={{ color: '#10b981' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Deposited (Cost Basis)</Typography>
                </Box>
              </Box>
            </Card>

            {/* Activity Log */}
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Activity Log</Typography>
              
              {/* Table Header */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 2fr 1fr',
                gap: 2,
                pb: 2,
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                mb: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Date</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Type</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Tokens</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Value</Typography>
              </Box>

              {/* Activity Rows */}
              {[
                { date: 'Oct 22 22:35', type: 'Withdraw', token1: '0.01', token2: '0.00', value: '$2.86' },
                { date: 'Oct 22 22:30', type: 'Deposit', token1: '0.01', token2: '0.00', value: '$2.86' },
              ].map((activity, idx) => (
                <Box 
                  key={idx}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 2fr 1fr',
                    gap: 2,
                    py: 2.5,
                    borderBottom: '1px solid rgba(59, 130, 246, 0.05)',
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
                    cursor: 'pointer'
                  }}
                >
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>{activity.date}</Typography>
                  <Chip 
                    label={activity.type}
                    size="small"
                    sx={{ 
                      width: 'fit-content',
                      backgroundColor: activity.type === 'Withdraw' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: activity.type === 'Withdraw' ? '#fbbf24' : '#10b981'
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                      {activity.token1} <Box component="span" sx={{ color: '#3b82f6' }}>≈</Box>
                    </Typography>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                      {activity.token2} <Box component="span" sx={{ color: '#10b981' }}>🟢</Box>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>{activity.value}</Typography>
                    <IconButton size="small" sx={{ color: '#64748b' }}>
                      <Box sx={{ fontSize: '1rem' }}>🔗</Box>
                    </IconButton>
                  </Box>
                </Box>
              ))}

              {wallet.connected && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                    No activity yet
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>

          {/* Manage Position - Right Side */}
          <Box sx={{ flex: '0 1 400px', minWidth: 320 }}>
            <Card sx={{ 
              p: 3, 
              position: 'sticky', 
              top: 20,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Manage Position</Typography>
                <Button 
                  size="small"
                  sx={{ 
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                  }}
                >
                  Deposit ▼
                </Button>
              </Box>

              {!wallet.connected ? (
                <Alert severity="warning">
                  Please connect your wallet to manage your position
                </Alert>
              ) : (
                <>
                  {/* You Deposit */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>You Deposit</Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>~$0.00</Typography>
                    </Box>
                    
                    <Box sx={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 2,
                      p: 2,
                      mb: 1
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          label="≈ SOL"
                          size="small"
                          icon={<Box sx={{ fontSize: '1rem', ml: 1 }}>▼</Box>}
                          sx={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: 600 }}
                        />
                        <Typography sx={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 600 }}>
                          0
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                          Available: 0.241439641 SOL
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}>
                            Half
                          </Button>
                          <Button size="small" sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}>
                            Max
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={singleAssetDeposit}
                          onChange={(e) => setSingleAssetDeposit(e.target.checked)}
                          sx={{ 
                            color: '#3b82f6',
                            '&.Mui-checked': { color: '#3b82f6' }
                          }}
                        />
                      }
                      label={
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                          Single Asset Deposit
                        </Typography>
                      }
                    />
                  </Box>

                  {/* Deposit Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleDeposit}
                    disabled={depositLoading || !wallet.connected}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      mb: 3,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(59, 130, 246, 0.3)',
                      }
                    }}
                  >
                    {depositLoading ? <CircularProgress size={24} /> : 'Deposit and Stake'}
                  </Button>

                  {depositTxSignature && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Success!{' '}
                      <a
                        href={`https://solscan.io/tx/${depositTxSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                      >
                        View Transaction
                      </a>
                    </Alert>
                  )}

                  {/* Transaction Settings */}
                  <Box sx={{ 
                    borderTop: '1px solid rgba(59, 130, 246, 0.1)', 
                    pt: 3 
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 500 }}>
                        Transaction Settings
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600 }}>
                          0.50%
                        </Typography>
                        <IconButton size="small" sx={{ color: '#64748b' }}>
                          <Box sx={{ fontSize: '0.9rem' }}>⚙️</Box>
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>SOL to be Deposited</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 SOL</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>JITOSOL to be Deposited</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 JITOSOL</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Lock-up Period</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0min</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Deposit Value</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>$0.00</Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Card>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Stats Cards */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>TVL</Typography>
              <Typography sx={{ color: '#ffffff', fontSize: '2rem', fontWeight: 600 }}>
                $27.67M
              </Typography>
            </Card>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>7D Fees APY</Typography>
              <Typography sx={{ color: '#10b981', fontSize: '2rem', fontWeight: 600 }}>
                1.96%
              </Typography>
            </Card>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>7D Volume</Typography>
              <Typography sx={{ color: '#ffffff', fontSize: '2rem', fontWeight: 600 }}>
                $120.01M
              </Typography>
            </Card>
          </Box>

          {/* Performance vs USD Chart */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff' }}>Performance vs USD</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="USD" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6', fontWeight: 600 }} />
                <Chip label="SOL" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#64748b' }} />
              </Box>
            </Box>

            {/* Chart Area */}
            <Box sx={{ 
              height: 350, 
              position: 'relative',
              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              mb: 3
            }}>
              {/* Y-axis labels */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>10.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>-10.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>-20.00%</Typography>
              </Box>

              {/* Chart SVG */}
              <Box sx={{ width: '100%', height: '100%', pr: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  
                  {/* Performance line - showing downward trend */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    points="0,45 5,43 10,40 15,38 20,35 25,33 30,30 35,28 40,25 45,27 50,26 55,24 60,30 65,45 70,55 75,52 80,50 85,52 90,60 95,65 100,70"
                  />
                  <polyline
                    fill="url(#performanceGradient)"
                    stroke="none"
                    points="0,45 5,43 10,40 15,38 20,35 25,33 30,30 35,28 40,25 45,27 50,26 55,24 60,30 65,45 70,55 75,52 80,50 85,52 90,60 95,65 100,70 100,100 0,100"
                  />
                  <defs>
                    <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 2
              }}>
                {['23/09', '26/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Kamino Strategy</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Token Pair HODL</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% SOL HODL</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#06b6d4', '&.Mui-checked': { color: '#06b6d4' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% JITOSOL HODL</Typography>
              </Box>
            </Box>

            {/* Performance Stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.41%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Kamino Strategy</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.54%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Token Pair HODL</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.63%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% SOL HODL</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.22%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#06b6d4' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% JITOSOL HODL</Typography>
                </Box>
              </Card>
            </Box>
          </Card>

          {/* APY & Fee Chart */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>APY & Fee</Typography>

            {/* Chart Area */}
            <Box sx={{ 
              height: 250, 
              position: 'relative',
              mb: 3
            }}>
              {/* Y-axis labels (left - APY %) */}
              <Box sx={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pl: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>12.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>10.0%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>7.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>5.0%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>2.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.0%</Typography>
              </Box>

              {/* Y-axis labels (right - Fees $) */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.04M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.03M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.02M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.01M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.00M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$990.00K</Typography>
              </Box>

              {/* Chart */}
              <Box sx={{ width: '100%', height: '100%', px: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Bar chart (APY) */}
                  {Array.from({ length: 50 }).map((_, i) => {
                    const height = Math.random() * 60 + 20;
                    return (
                      <rect
                        key={i}
                        x={i * 2}
                        y={100 - height}
                        width="1.5"
                        height={height}
                        fill="#3b82f6"
                        opacity="0.6"
                      />
                    );
                  })}
                  
                  {/* Cumulative line */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1"
                    points="0,85 10,82 20,80 30,77 40,75 50,73 60,71 70,68 80,65 90,63 100,60"
                  />
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 10
              }}>
                {['22/09', '25/09', '28/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#f97316', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cumulative Fees & Rewards</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>24h APY</Typography>
              </Box>
            </Box>
          </Card>

          {/* Historical Ranges & Rebalancing */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Historical Ranges & Rebalancing</Typography>

            {/* Chart Area */}
            <Box sx={{ 
              height: 250, 
              position: 'relative',
              mb: 2
            }}>
              {/* Y-axis labels */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8140</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8120</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8100</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8080</Typography>
              </Box>

              {/* Chart */}
              <Box sx={{ width: '100%', height: '100%', pr: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Strategy Range (green) */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    points="0,20 10,20 15,22 20,23 25,25 30,30 35,35 40,38 50,45 60,50 70,52 80,58 90,62 100,65"
                  />
                  
                  {/* Pool Price (blue) */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    points="0,25 10,27 15,28 20,30 25,32 30,35 35,38 40,42 50,48 60,53 70,56 80,62 90,67 100,70"
                  />
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 2
              }}>
                {['22/09', '25/09', '28/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#3b82f6', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Pool Price</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#10b981', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Strategy Range</Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* FAQ Section - Left Side */}
          <Box sx={{ flex: '1 1 600px', minWidth: 0 }}>
            <Card sx={{ 
              p: 0, 
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              {/* FAQ Items */}
              {[
                {
                  question: 'What does this vault do?',
                  answer: 'This vault automatically manages a concentrated liquidity position on Kamino Finance, optimizing yield through strategic rebalancing and fee collection.'
                },
                {
                  question: 'Where does the yield (APY) come from?',
                  answer: 'Yield comes from trading fees generated by the liquidity pool, plus any additional rewards from liquidity mining programs and JTO incentives.'
                },
                {
                  question: 'When is this vault profitable?',
                  answer: 'The vault is most profitable during periods of high trading volume and when the token pair price remains within the concentrated liquidity range.'
                },
                {
                  question: 'When does this vault perform sub-optimally?',
                  answer: 'Performance may be sub-optimal during extreme price volatility or when prices move significantly outside the liquidity range, resulting in impermanent loss.'
                },
                {
                  question: 'How is the APY calculated?',
                  answer: 'APY is calculated based on the fees earned over the past 7 days, annualized to project yearly returns. It includes both trading fees and reward incentives.'
                },
                {
                  question: 'Where does my yield go?',
                  answer: 'Yields are automatically compounded back into your position, increasing your share of the vault over time without requiring manual reinvestment.'
                },
                {
                  question: 'What should I do after depositing?',
                  answer: 'After depositing, your position will automatically earn yield. You can monitor performance in the "My Position" tab and claim rewards when available.'
                },
                {
                  question: 'Do I have to deposit both tokens?',
                  answer: 'No, you can deposit a single token. The vault will automatically swap and balance your deposit into the optimal ratio for the liquidity position.'
                },
                {
                  question: 'Can I withdraw at any time?',
                  answer: 'Yes, you can withdraw your liquidity at any time. Note that there may be a small lock-up period for certain reward programs.'
                },
                {
                  question: 'What is position range?',
                  answer: 'Position range defines the price boundaries where your liquidity is active. When prices stay within this range, you earn more fees but face impermanent loss risk.'
                },
                {
                  question: 'What are the risks?',
                  answer: 'Main risks include impermanent loss, smart contract risk, and potential losses if prices move outside the liquidity range. Always DYOR before investing.'
                }
              ].map((faq, idx) => (
                <Box
                  key={idx}
                  sx={{
                    borderBottom: idx < 10 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.05)'
                    }
                  }}
                >
                  <Button
                    fullWidth
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      color: '#ffffff',
                      textTransform: 'none',
                      py: 2.5,
                      px: 3,
                      fontSize: '0.95rem',
                      fontWeight: 400,
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                    <Box component="span" sx={{ mr: 2, color: '#64748b', fontSize: '1.2rem' }}>›</Box>
                    {faq.question}
                  </Button>
                </Box>
              ))}
            </Card>
          </Box>

          {/* Right Side - Vault Info & Asset Details */}
          <Box sx={{ flex: '0 1 400px', minWidth: 320 }}>
            {/* Vault Info */}
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Vault Info</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  size="small"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Strategy address
                </Button>
                <Button
                  size="small"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Pool address
                </Button>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                  Vault Capacity
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Current Deposit</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$27.67M</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Deposit Capacity per Transaction</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$1.50M</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Max Capacity</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$55.00M</Typography>
                </Box>

                <Button
                  fullWidth
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    justifyContent: 'flex-end',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box>▾</Box>}
                >
                  More Info
                </Button>
              </Box>
            </Card>

            {/* Asset Details */}
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Asset Details</Typography>
              
              <Typography sx={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
                SOL
              </Typography>

              <Button
                size="small"
                sx={{
                  color: '#3b82f6',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  mb: 2,
                  pl: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
                endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
              >
                Website
              </Button>

              <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                SOL is the native token of the Solana blockchain, and is the most widely circulating asset in the ecosystem.
              </Typography>

              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(59, 130, 246, 0.1)' }}>
                <Typography sx={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
                  JITOSOL
                </Typography>

                <Button
                  size="small"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    mb: 2,
                    pl: 0,
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Website
                </Button>

                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  JitoSOL is a liquid staking token that represents staked SOL on the Jito Network, earning staking rewards while maintaining liquidity.
                </Typography>
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>
    </Box>
  );
}
