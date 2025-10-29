import { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { getUserPosition, JITOSOL_POOLS, PositionInfo } from '../services/kaminoLiquidity';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';

export interface KaminoPosition extends PositionInfo {
  poolName: string;
  dex: string;
  apy: number;
}

export function useKaminoPositions(userAddress: string | undefined) {
  const [positions, setPositions] = useState<KaminoPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setPositions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPositions = async () => {
      setLoading(true);
      setError(null);

      try {
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
        const positionPromises = JITOSOL_POOLS.map(async (pool) => {
          try {
            const position = await getUserPosition(pool.address, userAddress!, connection);
            if (position && (position.sharesStaked > 0 || parseFloat(position.lpTokens || '0') > 0)) {
              return {
                ...position,
                poolName: pool.name,
                dex: pool.dex,
                apy: pool.apy,
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching position for pool ${pool.name}:`, error);
            return null;
          }
        });

        const results = await Promise.all(positionPromises);
        const validPositions = results.filter((p): p is KaminoPosition => p !== null);

        if (isMounted) {
          setPositions(validPositions);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching Kamino positions:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch positions');
          setLoading(false);
        }
      }
    };

    fetchPositions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPositions, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userAddress]);

  return { positions, loading, error };
}
