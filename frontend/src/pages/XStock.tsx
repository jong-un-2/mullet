import { Box, Container, Typography } from '@mui/material';
import Navigation from '../components/Navigation';

const XStockPage = () => {
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
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
              }}>
                <Box sx={{
                  width: 16,
                  height: 3,
                  backgroundColor: '#ffffff',
                  borderRadius: '1.5px',
                  transform: 'rotate(45deg)',
                }} />
              </Box>
              <Typography variant="h3" component="h1" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                X Stock
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
              Coming Soon - Trade tokenized stocks on the blockchain
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default XStockPage;