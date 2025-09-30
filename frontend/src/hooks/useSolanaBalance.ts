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
  const SOL_DECIMALS = 9;
  const USDC_DECIMALS = 6;
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