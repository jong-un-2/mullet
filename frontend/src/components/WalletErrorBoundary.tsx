import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Alert, AlertTitle, Button, Box } from '@mui/material';

interface WalletErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const WalletErrorFallback: React.FC<WalletErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle>Wallet Connection Error</AlertTitle>
        {error.message}
      </Alert>
      <Button variant="contained" onClick={resetErrorBoundary}>
        Retry Connection
      </Button>
    </Box>
  );
};

interface WalletErrorBoundaryProps {
  children: React.ReactNode;
}

const WalletErrorBoundary: React.FC<WalletErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={WalletErrorFallback}
      onError={(error: Error) => {
        console.error('Wallet connection error:', error);
        // Clear any pending wallet requests
        if (typeof window !== 'undefined' && window.ethereum) {
          // Reset MetaMask state if available
          try {
            (window.ethereum as any).request({
              method: 'wallet_requestPermissions',
              params: [],
            }).catch(() => {
              // Ignore errors, this is just cleanup
            });
          } catch {
            // Ignore cleanup errors
          }
        }
      }}
      onReset={() => {
        // Clear any error states and reload
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default WalletErrorBoundary;