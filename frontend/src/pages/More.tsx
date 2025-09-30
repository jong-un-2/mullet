import { Box, Container, Typography } from '@mui/material';
import Navigation from '../components/Navigation';

const MorePage = () => {
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
            <Typography variant="h3" component="h1" fontWeight={600} sx={{ mb: 2, color: '#ffffff' }}>
              More
            </Typography>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
              Discover additional Mars Liquid features and tools
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default MorePage;