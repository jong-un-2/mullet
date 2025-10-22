import { useState, useEffect } from 'react';

export interface StrategyInfo {
  address: string;
  name: string;
  dex: 'Orca' | 'Raydium' | 'Meteora';
  apy: number;
  tvl: number;
  volume24h: number;
  tokenA: {
    mint: string;
    symbol: string;
  };
  tokenB: {
    mint: string;
    symbol: string;
  };
}

interface UseKaminoStrategiesResult {
  strategies: StrategyInfo[];
  loading: boolean;
  error: string | null;
  totalDeposits: number;
  feesGenerated: number;
  refetch: () => Promise<void>;
}

const DEX_MAP: Record<number, 'Orca' | 'Raydium' | 'Meteora'> = {
  0: 'Orca',
  1: 'Raydium',
  2: 'Meteora',
};

const DEX_ICONS: Record<string, string> = {
  'Orca': '🌊',
  'Raydium': '🌈',
  'Meteora': '⚡',
};

// Token symbols mapping
const TOKEN_SYMBOLS: Record<string, string> = {
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jitoSOL',
  'So11111111111111111111111111111111111111112': 'SOL',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1': 'bSOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
};

export function useKaminoStrategies(): UseKaminoStrategiesResult {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [feesGenerated, setFeesGenerated] = useState(0);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching Kamino strategies from API...');

      // 直接使用 Kamino API，这个 API 有完整的数据
      const response = await fetch('https://api.hubbleprotocol.io/kamino-market/strategies?env=mainnet-beta');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Found ${data.length} strategies from API`);
      console.log('Sample strategy:', data[0]);

      // 计算总存款和费用
      let totalTvl = 0;
      let totalFees = 0;

      const strategiesInfo: StrategyInfo[] = data
        .filter((item: any) => {
          // 只显示 jitoSOL-SOL 池子
          const isLive = item.strategyCreationStatus === 'LIVE';
          const isNotCommunity = !item.isCommunity;
          const tokenASymbol = TOKEN_SYMBOLS[item.tokenAMint] || '';
          const tokenBSymbol = TOKEN_SYMBOLS[item.tokenBMint] || '';
          
          // 只要 jitoSOL-SOL 的组合
          const isJitoSOL = (tokenASymbol === 'jitoSOL' && tokenBSymbol === 'SOL') || 
                           (tokenASymbol === 'SOL' && tokenBSymbol === 'jitoSOL');
          
          return isLive && isNotCommunity && isJitoSOL;
        })
        .map((item: any) => {
          const dexNum = item.strategyDex;
          const dex = DEX_MAP[dexNum] || 'Orca';

          const tokenASymbol = TOKEN_SYMBOLS[item.tokenAMint] || item.tokenAMint?.slice(0, 6);
          const tokenBSymbol = TOKEN_SYMBOLS[item.tokenBMint] || item.tokenBMint?.slice(0, 6);

          // 从 API 获取真实的 TVL 和 APY 数据
          const shareData = item.shareData || {};
          
          // TVL (流动性总额 in USD)
          const tvl = shareData.totalLiquidityUSD || shareData.sharesOutstanding || 0;
          
          // APY (年化收益率)
          const apy = shareData.totalAPY || shareData.apr7d || shareData.rewardApr || 0;
          
          // Volume (24h 交易量)
          const volume24h = shareData.volume24h || tvl * 0.05;

          totalTvl += tvl;
          const annualFees = tvl * (apy / 100);
          totalFees += annualFees;

          return {
            address: item.address,
            name: `${tokenASymbol}-${tokenBSymbol}`,
            dex,
            apy,
            tvl,
            volume24h,
            tokenA: {
              mint: item.tokenAMint,
              symbol: tokenASymbol,
            },
            tokenB: {
              mint: item.tokenBMint,
              symbol: tokenBSymbol,
            },
          };
        })
        .filter((item: StrategyInfo) => item.tvl > 0); // 只显示有 TVL 的

      // 按 TVL 排序（从高到低）
      strategiesInfo.sort((a, b) => b.tvl - a.tvl);

      // jitoSOL-SOL 策略，显示所有找到的
      setStrategies(strategiesInfo);
      setTotalDeposits(totalTvl);
      setFeesGenerated(totalFees);

      console.log('jitoSOL-SOL Strategies loaded successfully:', {
        count: strategiesInfo.length,
        totalTvl,
        totalFees,
      });
    } catch (err) {
      console.error('Error fetching Kamino strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
      
      // 如果失败，使用 mock 数据
      const mockStrategies: StrategyInfo[] = [
        {
          address: 'BZY7RZ6FhRgoiinKcRK9EH9H8jJvP1Tr2e8GqYHCGJBJ',
          name: 'jitoSOL-SOL',
          dex: 'Orca',
          apy: 6.95,
          tvl: 28250000,
          volume24h: 125510000,
          tokenA: { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL' },
          tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
        },
        {
          address: 'EXnGBBSamqzd3uxEdRLUiYzjJkTwQyorAaFXdfteuGXe',
          name: 'jitoSOL-SOL',
          dex: 'Raydium',
          apy: 8.47,
          tvl: 10790000,
          volume24h: 53920000,
          tokenA: { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL' },
          tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
        },
        {
          address: '7JZpYi5c6iHeXEqJY9vt3q4nKJhqKzpqz8BhvLKKfLJF',
          name: 'jitoSOL-SOL',
          dex: 'Meteora',
          apy: 7.91,
          tvl: 6050000,
          volume24h: 32890000,
          tokenA: { mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'jitoSOL' },
          tokenB: { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
        },
      ];
      
      setStrategies(mockStrategies);
      setTotalDeposits(45090000);
      setFeesGenerated(3200000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  return {
    strategies,
    loading,
    error,
    totalDeposits,
    feesGenerated,
    refetch: fetchStrategies,
  };
}

export { DEX_ICONS };
