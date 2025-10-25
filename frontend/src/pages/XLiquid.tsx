import { Box, Container, Typography, Button, Chip, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { JITOSOL_POOLS, fetchJitoSOLPools } from '../services/kaminoLiquidity';
import { TOKEN_ICONS } from '../config/tokenIcons';

const XLiquidPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pools, setPools] = useState(JITOSOL_POOLS);
  const [poolsLoading, setPoolsLoading] = useState(true);

  // Fetch live pool data on mount
  useEffect(() => {
    const loadPools = async () => {
      setPoolsLoading(true);
      try {
        const livePools = await fetchJitoSOLPools();
        setPools(livePools);
      } catch (error) {
        console.error('Failed to fetch pools:', error);
      } finally {
        setPoolsLoading(false);
      }
    };
    
    loadPools();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadPools, 300000);
    return () => clearInterval(interval);
  }, []); // Remove connection dependency

  // 格式化金额
  const formatCurrency = (amount: number) => {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  // 过滤策略 - 现在只显示JitoSOL池子
  const filteredPools = useMemo(() => {
    if (!searchQuery) return pools;
    const query = searchQuery.toLowerCase();
    return pools.filter(
      (pool) =>
        pool.name.toLowerCase().includes(query) ||
        pool.dex.toLowerCase().includes(query)
    );
  }, [searchQuery, pools]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const totalTVL = JITOSOL_POOLS.reduce((sum, pool) => sum + pool.tvl, 0);
  const avgAPY = JITOSOL_POOLS.reduce((sum, pool) => sum + pool.apy, 0) / JITOSOL_POOLS.length;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#0a1628',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)
        `,
        zIndex: 0,
      }} />
      
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Navigation />
        
        <Container maxWidth="xl" sx={{ py: 6 }}>
          {/* Header Section */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" fontWeight={700} sx={{ 
              color: '#ffffff',
              mb: 2
            }}>
              Liquidity
            </Typography>
            <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4 }}>
              Earn automated fees & rewards by deploying assets into liquidity vaults
            </Typography>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 4, mb: 6, justifyContent: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                  Total TVL
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {formatCurrency(totalTVL)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                  Average APY
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {(avgAPY * 100).toFixed(2)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                  Active Pools
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {JITOSOL_POOLS.length}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Loading State */}
          {poolsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
          )}

          {/* Filter Tabs and Search */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              flexWrap: 'wrap',
              borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
            }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                sx={{
                  flex: 1,
                  minHeight: 48,
                  '& .MuiTab-root': {
                    color: '#64748b',
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    minHeight: 48,
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
                <Tab label="All Vaults" value="all" />
              </Tabs>
              <TextField
                size="small"
                placeholder="Search vaults..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: 200,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 2,
                    '& fieldset': {
                      border: 'none'
                    },
                    '&:hover': {
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                    },
                    '& input': {
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }
                  }
                }}
              />
            </Box>
          </Box>

          {/* Vaults Table */}
          <TableContainer sx={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.3)',
            borderRadius: 3,
            border: '1px solid rgba(59, 130, 246, 0.1)'
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}>Vault</TableCell>
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 16 }} />
                      7D Fees APY
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}>7D Volume</TableCell>
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}>TVL</TableCell>
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}>DEX</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poolsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={32} />
                      <Typography sx={{ color: '#64748b', mt: 2 }}>
                        Loading pools...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredPools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      No pools found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPools.map((pool) => {
                  return (
                    <TableRow 
                      key={pool.address}
                      onClick={() => navigate(`/xliquid/${pool.address}`)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { 
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {/* Token Pair Icons */}
                          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Box
                              component="img"
                              src="https://storage.googleapis.com/token-metadata/JitoSOL-256.png"
                              alt="JitoSOL"
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%',
                                border: '2px solid #0f172a',
                                zIndex: 2
                              }}
                            />
                            <Box
                              component="img"
                              src={TOKEN_ICONS.SOL}
                              alt="SOL"
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%',
                                border: '2px solid #0f172a',
                                marginLeft: '-12px',
                                zIndex: 1
                              }}
                            />
                          </Box>
                          <Box>
                            <Typography sx={{ color: '#ffffff', fontWeight: 500 }}>
                              {pool.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {pool.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {pool.feesApy > 0.02 && (
                            <Box sx={{ 
                              color: '#fbbf24',
                              fontSize: 16
                            }}>⚡</Box>
                          )}
                          <Typography sx={{ color: '#3b82f6', fontWeight: 600 }}>
                            {(pool.feesApy * 100).toFixed(2)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        {formatCurrency(pool.volume7d)}
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        {formatCurrency(pool.tvl)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Chip 
                          label={pool.dex}
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            fontWeight: 500,
                            borderRadius: 2
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/xliquid/${pool.address}`);
                          }}
                          sx={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            },
                            transition: 'background 0.15s ease'
                          }}
                        >
                          Deposit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  );
};

export default XLiquidPage;