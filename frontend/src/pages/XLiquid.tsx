import { Box, Container, Typography, Button, Chip, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { useState, useMemo } from 'react';
import Navigation from '../components/Navigation';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useKaminoStrategies, DEX_ICONS } from '../hooks/useKaminoStrategies';

const XLiquidPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { strategies, loading, totalDeposits, feesGenerated } = useKaminoStrategies();

  // 格式化金额
  const formatCurrency = (amount: number) => {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  // 过滤策略
  const filteredStrategies = useMemo(() => {
    if (!searchQuery) return strategies;
    const query = searchQuery.toLowerCase();
    return strategies.filter(
      (strategy) =>
        strategy.name.toLowerCase().includes(query) ||
        strategy.dex.toLowerCase().includes(query) ||
        strategy.tokenA.symbol.toLowerCase().includes(query) ||
        strategy.tokenB.symbol.toLowerCase().includes(query)
    );
  }, [strategies, searchQuery]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

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
                  Total Deposits
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {formatCurrency(totalDeposits)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 0.5 }}>
                  Fees Generated
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {formatCurrency(feesGenerated)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Loading & Error States */}
          {loading && (
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
                  <TableCell sx={{ color: '#64748b', borderBottom: '1px solid rgba(59, 130, 246, 0.1)', py: 2 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && filteredStrategies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      No strategies found
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredStrategies.map((strategy) => {
                  const dexIcon = DEX_ICONS[strategy.dex] || '🌊';
                  return (
                    <TableRow 
                      key={strategy.address}
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ fontSize: 24 }}>{dexIcon}</Typography>
                          <Typography sx={{ color: '#ffffff', fontWeight: 500 }}>
                            {strategy.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {strategy.apy > 5 && (
                            <Box sx={{ 
                              color: '#fbbf24',
                              fontSize: 16
                            }}>⚡</Box>
                          )}
                          <Typography sx={{ color: '#3b82f6', fontWeight: 600 }}>
                            {strategy.apy.toFixed(2)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        {formatCurrency(strategy.volume24h)}
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        {formatCurrency(strategy.tvl)}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.05)', py: 2.5 }}>
                        <Chip 
                          label={strategy.dex}
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
                          sx={{ 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                              boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                            }
                          }}
                        >
                          Deposit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>
    </Box>
  );
};

export default XLiquidPage;