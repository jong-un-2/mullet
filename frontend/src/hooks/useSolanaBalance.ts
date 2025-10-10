import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { networkConfig } from '../config/networkConfig';

interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
}

interface BalanceResult {
  success: boolean;
  data?: TokenBalance;
  error?: string;
}

export const useSolanaBalance = (walletAddress?: string) => {
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constants
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const PYUSD_MINT = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'; // Token-2022
  const SOL_DECIMALS = 9;
  const USDC_DECIMALS = 6;
  const PYUSD_DECIMALS = 6;
  const REQUEST_TIMEOUT = 8000;

  // Helper functions
  const getRpcConnection = () => {
    const rpcEndpoint = networkConfig.getCurrentSolanaNetwork().rpcUrl;
    return new Connection(rpcEndpoint, 'confirmed');
  };

  const createDefaultBalance = (symbol: string, decimals: number): TokenBalance => ({
    symbol,
    balance: '0.00',
    decimals,
  });

  const isValidPublicKey = (address: string): boolean => {
    if (!address || address.length !== 44) return false;
    
    const result = PublicKey.isOnCurve(address);
    return result;
  };

  const fetchSOLBalance = async (walletPublicKey: PublicKey): Promise<BalanceResult> => {
    const rpcEndpoint = networkConfig.getCurrentSolanaNetwork().rpcUrl;
    
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletPublicKey.toString()]
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `RPC request failed: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    
    if (data.error) {
      return {
        success: false,
        error: `RPC error: ${data.error.message}`
      };
    }

    const balance = data.result?.value || 0;
    const solAmount = balance / Math.pow(10, SOL_DECIMALS);
    
    console.log('💰 SOL balance:', solAmount.toFixed(4));
    
    return {
      success: true,
      data: {
        symbol: 'SOL',
        balance: solAmount.toFixed(4),
        decimals: SOL_DECIMALS,
      }
    };
  };

  const fetchUSDCBalance = async (walletPublicKey: PublicKey): Promise<BalanceResult> => {
    const connection = getRpcConnection();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    const usdcPromise = connection.getTokenAccountsByOwner(walletPublicKey, {
      mint: new PublicKey(USDC_MINT)
    });

    const tokenAccountsResult = await Promise.race([usdcPromise, timeoutPromise]);

    if (!tokenAccountsResult.value || tokenAccountsResult.value.length === 0) {
      console.log('💰 USDC balance: 0.00 (no token account)');
      return {
        success: true,
        data: createDefaultBalance('USDC', USDC_DECIMALS)
      };
    }

    const accountInfo = await connection.getTokenAccountBalance(
      tokenAccountsResult.value[0].pubkey
    );
    
    const usdcBalance = accountInfo.value.uiAmountString || '0';
    console.log('💰 USDC balance:', usdcBalance);

    return {
      success: true,
      data: {
        symbol: 'USDC',
        balance: usdcBalance,
        decimals: USDC_DECIMALS,
      }
    };
  };

  const fetchPYUSDBalance = async (walletPublicKey: PublicKey): Promise<BalanceResult> => {
    const connection = getRpcConnection();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );

    // PYUSD uses Token-2022 program
    const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    
    const pyusdPromise = connection.getTokenAccountsByOwner(walletPublicKey, {
      mint: new PublicKey(PYUSD_MINT),
      programId: TOKEN_2022_PROGRAM_ID
    });

    const tokenAccountsResult = await Promise.race([pyusdPromise, timeoutPromise]);

    if (!tokenAccountsResult.value || tokenAccountsResult.value.length === 0) {
      console.log('💰 PYUSD balance: 0.00 (no token account)');
      return {
        success: true,
        data: createDefaultBalance('PYUSD', PYUSD_DECIMALS)
      };
    }

    const accountInfo = await connection.getTokenAccountBalance(
      tokenAccountsResult.value[0].pubkey
    );
    
    const pyusdBalance = accountInfo.value.uiAmountString || '0';
    console.log('💰 PYUSD balance:', pyusdBalance);

    return {
      success: true,
      data: {
        symbol: 'PYUSD',
        balance: pyusdBalance,
        decimals: PYUSD_DECIMALS,
      }
    };
  };

  const fetchAllBalances = async () => {
    if (!walletAddress) {
      setBalances({});
      return;
    }

    console.log('🔍 Starting balance fetch for wallet:', walletAddress);

    if (!isValidPublicKey(walletAddress)) {
      const errorMsg = 'Invalid wallet address format';
      console.error('❌', errorMsg, 'Address:', walletAddress);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    const walletPublicKey = new PublicKey(walletAddress);
    const newBalances: Record<string, TokenBalance> = {};

    console.log('📊 Fetching SOL balance...');
    // Fetch SOL balance
    const solResult = await fetchSOLBalance(walletPublicKey).catch(err => ({
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to fetch SOL balance'
    }));

    if (solResult.success && solResult.data) {
      newBalances[solResult.data.symbol] = solResult.data;
      console.log('✅ SOL balance loaded successfully');
    } else {
      console.error('❌ SOL balance error:', solResult.error);
      newBalances['SOL'] = createDefaultBalance('SOL', SOL_DECIMALS);
    }

    console.log('💵 Fetching USDC balance...');
    // Fetch USDC balance
    const usdcResult = await fetchUSDCBalance(walletPublicKey).catch(err => ({
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to fetch USDC balance'
    }));

    if (usdcResult.success && usdcResult.data) {
      newBalances[usdcResult.data.symbol] = usdcResult.data;
      console.log('✅ USDC balance loaded successfully');
    } else {
      console.error('❌ USDC balance error:', usdcResult.error);
      newBalances['USDC'] = createDefaultBalance('USDC', USDC_DECIMALS);
    }

    console.log('💰 Fetching PYUSD balance...');
    // Fetch PYUSD balance (Token-2022)
    const pyusdResult = await fetchPYUSDBalance(walletPublicKey).catch(err => ({
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to fetch PYUSD balance'
    }));

    if (pyusdResult.success && pyusdResult.data) {
      newBalances[pyusdResult.data.symbol] = pyusdResult.data;
      console.log('✅ PYUSD balance loaded successfully');
    } else {
      console.error('❌ PYUSD balance error:', pyusdResult.error);
      newBalances['PYUSD'] = createDefaultBalance('PYUSD', PYUSD_DECIMALS);
    }

    console.log('🎉 Balance fetch completed:', newBalances);
    setBalances(newBalances);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllBalances();
  }, [walletAddress]);

  const getBalance = (tokenSymbol: string): string => {
    return balances[tokenSymbol]?.balance || '0';
  };

  return {
    balances,
    loading,
    error,
    getBalance,
    refetch: fetchAllBalances,
  };
};