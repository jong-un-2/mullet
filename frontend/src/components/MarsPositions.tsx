import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Button,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMarsUserPositions, formatCurrency, formatPercentage, formatTokenAmount } from '../hooks/useMarsApi';

interface MarsPositionsProps {
  userAddress?: string;
}

const MarsPositions = ({ userAddress }: MarsPositionsProps) => {
  const { positions, loading, error, refetch } = useMarsUserPositions(userAddress);

  if (!userAddress) {
    return (
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
              Mars Positions
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>
            Connect your wallet to view Mars DeFi positions
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
              Mars Positions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: 300, borderRadius: 2 }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
              Mars Positions
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: '#ef4444', textAlign: 'center', mb: 2 }}>
            Error loading Mars positions
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', mb: 3 }}>
            {error}
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button onClick={refetch} variant="outlined" size="small">
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!positions || (positions.summary.totalPositions === 0)) {
    return (
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
              Mars Positions (0)
            </Typography>
          </Box>
          
          <Card 
            elevation={0} 
            sx={{ 
              textAlign: 'center', 
              py: 8, 
              border: '2px dashed rgba(255, 255, 255, 0.2)', 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <CardContent>
              <Typography variant="h5" sx={{ color: '#94a3b8', mb: 2 }} fontWeight={600}>
                No Mars positions found
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 4, maxWidth: 400, mx: 'auto' }}>
                Start earning with Jupiter Lend and Kamino through our unified Mars platform
              </Typography>
              <Button
                variant="contained"
                size="large"
                href="/xfund"
                sx={{ 
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #f59e0b 0%, #d97706 100%)',
                  color: '#ffffff',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #d97706 0%, #b45309 100%)',
                  }
                }}
              >
                Start Earning with Mars
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      elevation={0}
      sx={{ 
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff' }}>
            Mars Positions ({positions.summary.totalPositions})
          </Typography>
          <IconButton onClick={refetch} size="small" sx={{ color: '#94a3b8' }}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Summary Card */}
        <Card sx={{ 
          p: 3, 
          mb: 4,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}>
          <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#34d399' }}>
                {formatCurrency(positions.summary.totalValue)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Total Value
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#60a5fa' }}>
                {formatPercentage(positions.summary.avgAPY)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Avg APY
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff' }}>
                {positions.summary.totalPositions}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Positions
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#f59e0b' }}>
                {positions.summary.totalProtocols}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Protocols
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

        {/* Jupiter Positions */}
        {positions.jupiter.totalPositions > 0 && (
          <Card sx={{ 
          p: 3, 
          mb: 3,
          background: 'rgba(96, 165, 250, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 3,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }}>
                Jupiter Lend
              </Typography>
              <Typography variant="body2" sx={{ color: '#60a5fa' }}>
                {positions.jupiter.totalPositions} positions • {formatCurrency(positions.jupiter.totalValue)} • {formatPercentage(positions.jupiter.avgAPY)} APY
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {positions.jupiter.positions.map((position) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={position.id}>
                <Card sx={{
                  p: 2,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#ffffff' }}>
                      {position.asset}
                    </Typography>
                    <Chip 
                      label={`${formatPercentage(position.entryAPY)} APY`}
                      size="small"
                      sx={{ 
                        background: 'rgba(96, 165, 250, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(96, 165, 250, 0.3)'
                      }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#34d399', mb: 0.5 }}>
                    {formatCurrency(position.currentValue)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Amount: {formatTokenAmount(position.asset, position.amount)} {position.asset}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
        )}

        {/* Kamino Positions */}
        {positions.kamino.totalPositions > 0 && (
        <Card sx={{ 
          p: 3,
          background: 'rgba(52, 211, 153, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: 3,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }}>
                Kamino Earn
              </Typography>
              <Typography variant="body2" sx={{ color: '#34d399' }}>
                {positions.kamino.totalPositions} positions • {formatCurrency(positions.kamino.totalValue)} • {formatPercentage(positions.kamino.avgAPY)} APY
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {positions.kamino.positions.map((position) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={position.id}>
                <Card sx={{
                  p: 2,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#ffffff' }}>
                      {position.asset}
                    </Typography>
                    <Chip 
                      label={`${formatPercentage(position.entryAPY)} APY`}
                      size="small"
                      sx={{ 
                        background: 'rgba(52, 211, 153, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(52, 211, 153, 0.3)'
                      }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#34d399', mb: 0.5 }}>
                    {formatCurrency(position.currentValue)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Amount: {formatTokenAmount(position.asset, position.amount)} {position.asset}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default MarsPositions;