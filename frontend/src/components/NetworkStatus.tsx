import { Box, Chip, Typography } from '@mui/material';
import { useChainId } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';

const NetworkStatus = () => {
  // Ethereum network info
  const chainId = useChainId();
  
  // Solana network info
  const { connected: solanaConnected } = useWallet();

  const getEthereumNetworkName = (id: number) => {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
    };
    return networks[id] || `Chain ${id}`;
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        Networks:
      </Typography>
      
      {/* Ethereum Network */}
      <Chip
        label={`🔷 ${getEthereumNetworkName(chainId)}`}
        color="primary"
        size="small"
        variant="outlined"
      />
      
      {/* Solana Network */}
      {solanaConnected && (
        <Chip
          label="⚡ Solana Mainnet"
          color="secondary"
          size="small"
          variant="outlined"
        />
      )}
    </Box>
  );
};

export default NetworkStatus;