import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import WalletManager from '../components/WalletManager';
import Navigation from '../components/Navigation';

const WalletPage: React.FC = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    }}>
      <Navigation />
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}>
            Connect Your Wallet
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4 }}>
            Choose your preferred wallet connection method
          </Typography>
        </Box>
        
        <WalletManager />
      </Container>
    </Box>
  );
};

export default WalletPage;