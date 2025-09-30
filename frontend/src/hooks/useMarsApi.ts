import { useState, useEffect } from 'react';
import { marsApiService, type MarsOpportunity, type MarsPositionsResponse, type MarsDepositRequest, type MarsDepositResponse, type MarsWithdrawRequest, type MarsWithdrawResponse } from '../services/marsApiService';

// Hook for Mars opportunities
export const useMarsOpportunities = () => {
  const [opportunities, setOpportunities] = useState<MarsOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marsApiService.getOpportunities();
      
      if (response.success && response.data) {
        setOpportunities(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch opportunities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchOpportunities,
  };
};

// Hook for Mars user positions
export const useMarsUserPositions = (userAddress?: string) => {
  const [positions, setPositions] = useState<MarsPositionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = async () => {
    if (!userAddress) {
      setPositions(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await marsApiService.getUserPositions(userAddress);
      
      if (response.success && response.data) {
        setPositions(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchPositions();
    }
  }, [userAddress]);

  return {
    positions,
    loading,
    error,
    refetch: fetchPositions,
  };
};

// Hook for Mars deposit operations
export const useMarsDeposit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = async (request: MarsDepositRequest): Promise<MarsDepositResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await marsApiService.createDeposit(request);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to create deposit');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    deposit,
    loading,
    error,
  };
};

// Hook for Mars withdraw operations
export const useMarsWithdraw = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = async (request: MarsWithdrawRequest): Promise<MarsWithdrawResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await marsApiService.createWithdraw(request);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error?.message || 'Failed to create withdrawal');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    withdraw,
    loading,
    error,
  };
};

// Hook for Mars health status
export const useMarsHealth = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marsApiService.getHealth();
      
      if (response.success) {
        setHealthStatus(response.data);
      } else {
        setError('Health check failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return {
    healthStatus,
    loading,
    error,
    refetch: fetchHealth,
  };
};

// Utility function to format currency  
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  // Convert from microunits to dollars (divide by 1e6)
  const dollarAmount = amount / 1e6;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(dollarAmount);
};

// Utility function to format percentage
export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatTokenAmount = (asset: string, rawAmount: number | string): string => {
  const upper = asset.toUpperCase();
  const n = typeof rawAmount === 'string' ? Number(rawAmount) : rawAmount;
  if (!Number.isFinite(n) || n === 0) return '0';

  if (upper === 'USDC' || upper === 'USDT') {
    const value = n / 1e9; // 9 decimals
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (upper === 'SOL' || upper === 'WSOL') {
    const value = n / 1e9; // 9 decimals
    if (value >= 1) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    }
    // <1 SOL show more precision, trim trailing zeros
    const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    return formatted.replace(/\.?0+$/, '');
  }

  // Other tokens: display as-is with thousand separators
  return n.toLocaleString();
};

// Utility function to get user wallet address
export const getUserWalletAddress = (
  ethAddress?: string, 
  solanaWallets?: any[], 
  authenticated?: boolean,
  user?: any,
  solanaPublicKey?: any  // Direct Solana wallet adapter public key
): string | undefined => {
  // Priority: Direct Solana wallet > Privy Solana wallet > ETH wallet > Privy user
  if (solanaPublicKey) {
    return solanaPublicKey.toString();
  }
  
  if (solanaWallets && solanaWallets.length > 0) {
    return solanaWallets[0].address;
  }
  
  if (ethAddress) {
    return ethAddress;
  }
  
  if (authenticated && user?.wallet?.address) {
    return user.wallet.address;
  }
  
  return undefined;
};